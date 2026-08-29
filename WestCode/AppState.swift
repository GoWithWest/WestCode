import Foundation
import Observation

struct InboxItem {
    var text: String
    var incoming: Incoming
}

struct BusLog {
    var from: String
    var to: String
    var at: Date
    var hash: String
}

@MainActor
@Observable
final class AppState {
    var sessions: [Session] = []
    var activeId: String? = nil
    var splitIds: [String] = []
    var view: LayoutView = .mosaic
    var onboarding = true
    var clock = Date()
    var newOpen = false
    var enabledAddons: [String] = LibraryCatalog.defaultEnabled
    var customAddons: [Addon] = []
    var customProviders: [CustomProvider] = []
    var recentFolders: [RecentFolder] = []
    var settingsOpen = false
    var connections: [String: ConnectionRecord] = [:]

    private var inbox: [String: [InboxItem]] = [:]
    private var hopBySession: [String: Int] = [:]
    private var busLog: [BusLog] = []
    private var runningTasks: [String: Task<Void, Never>] = [:]
    private let maxHop = 3

    var active: Session? {
        sessions.first { $0.id == activeId } ?? sessions.first
    }

    func restore() {
        onboarding = Disk.string(StoreKeys.onboard) != "1"
        struct Lib: Codable { var enabled: [String]?; var custom: [Addon]? }
        let lib = Disk.readJSON(StoreKeys.library, as: Lib.self, fallback: Lib(enabled: nil, custom: nil))
        enabledAddons = lib.enabled ?? LibraryCatalog.defaultEnabled
        customAddons = lib.custom ?? []
        customProviders = Disk.readJSON(StoreKeys.providers, as: [CustomProvider].self, fallback: [])
        recentFolders = Disk.readJSON(StoreKeys.folders, as: [RecentFolder].self, fallback: [])
        let saved = Disk.readJSON(StoreKeys.connections, as: [ConnectionRecord].self, fallback: [])
        connections = Dictionary(uniqueKeysWithValues: saved.map { ($0.id, $0) })
        sessions = Disk.readJSON(StoreKeys.sessions, as: [Session].self, fallback: []).map { s in
            var copy = s
            if copy.status == .running { copy.status = .waiting }
            copy.messages = copy.messages.map { m in
                var c = m
                c.streaming = false
                return c
            }
            return copy
        }
        if let id = activeId, sessions.contains(where: { $0.id == id }) {
            // keep
        } else {
            activeId = sessions.first?.id
        }
        if sessions.isEmpty { view = .mosaic }
    }

    func dismissOnboarding() {
        Disk.setString(StoreKeys.onboard, "1")
        onboarding = false
        view = .providers
    }

    func deleteAllSessions() {
        for s in sessions { stop(s.id) }
        sessions = []
        activeId = nil
        splitIds = []
        view = .mosaic
        persistSessions()
    }

    func deleteSession(_ id: String) {
        stop(id)
        sessions.removeAll { $0.id == id }
        splitIds.removeAll { $0 == id }
        if activeId == id {
            activeId = sessions.first?.id
            view = sessions.isEmpty ? .mosaic : .focus
        }
        persistSessions()
    }

    func persistSessions() {
        Disk.writeJSON(StoreKeys.sessions, sessions)
    }

    func persistConnections() {
        Disk.writeJSON(StoreKeys.connections, Array(connections.values))
    }

    var providers: [Provider] {
        CatalogProviders.all(customProviders).map(hydrate)
    }

    func provider(_ id: String) -> Provider {
        hydrate(CatalogProviders.resolve(id, custom: customProviders))
    }

    func hydrate(_ p: Provider) -> Provider {
        var out = p
        if let rec = connections[p.id] {
            out.connected = rec.enabled
            if !rec.binaryPath.isEmpty { out.binary = rec.binaryPath }
            if !rec.endpoint.isEmpty { out.endpoint = rec.endpoint }
        } else {
            out.connected = p.builtin ? false : p.connected
        }
        return out
    }

    func isReady(_ id: String) -> Bool {
        let p = provider(id)
        guard p.connected else { return false }
        if BinaryProbe.locate(p.binary) != nil { return true }
        if p.auth == .api && KeychainStore.hasAPIKey(for: id) { return true }
        return false
    }

    func detectedBinary(for id: String) -> URL? {
        let p = provider(id)
        return BinaryProbe.locate(p.binary)
    }

    func saveConnection(_ rec: ConnectionRecord, apiKey: String?) {
        var next = rec
        if next.binaryPath.isEmpty, let url = BinaryProbe.locate(CatalogProviders.resolve(next.id, custom: customProviders).binary) {
            next.binaryPath = url.path
        }
        connections[next.id] = next
        persistConnections()
        if let apiKey { KeychainStore.setAPIKey(apiKey, for: next.id) }
    }

    func connectProvider(_ id: String) {
        let p = CatalogProviders.resolve(id, custom: customProviders)
        var rec = connections[id] ?? ConnectionRecord(id: id, enabled: true, binaryPath: "", endpoint: p.endpoint ?? "")
        rec.enabled = true
        if rec.binaryPath.isEmpty, let url = BinaryProbe.locate(p.binary) {
            rec.binaryPath = url.path
        }
        connections[id] = rec
        persistConnections()
    }

    func disconnectProvider(_ id: String) {
        if var rec = connections[id] {
            rec.enabled = false
            connections[id] = rec
        } else {
            connections[id] = ConnectionRecord(id: id, enabled: false, binaryPath: "", endpoint: "")
        }
        persistConnections()
    }

    func setView(_ v: LayoutView) { view = v }

    func setActive(_ id: String) {
        activeId = id
        view = .focus
    }

    func setSplit(_ a: String, _ b: String) {
        splitIds = [a, b]
        view = .split
    }

    func rememberFolder(_ folder: RecentFolder) {
        recentFolders = [folder] + recentFolders.filter { $0.path != folder.path }
        recentFolders = Array(recentFolders.prefix(6))
        Disk.writeJSON(StoreKeys.folders, recentFolders)
    }

    func setSessionModel(_ id: String, _ model: String) {
        patch(id) { $0.model = model; $0.updatedAt = Date() }
    }

    func setSessionEffort(_ id: String, _ effort: String) {
        patch(id) { $0.effort = effort; $0.updatedAt = Date() }
    }

    func toggleAddon(_ id: String) {
        if enabledAddons.contains(id) {
            enabledAddons.removeAll { $0 == id }
        } else {
            enabledAddons.append(id)
        }
        persistLibrary()
    }

    func importAddon(_ addon: Addon) {
        var item = addon
        item.id = UID.make("addon")
        item.custom = true
        customAddons.append(item)
        enabledAddons.append(item.id)
        persistLibrary()
    }

    func removeAddon(_ id: String) {
        customAddons.removeAll { $0.id == id }
        enabledAddons.removeAll { $0 == id }
        persistLibrary()
    }

    func addCustomProvider(_ p: CustomProvider, apiKey: String) {
        var next = p
        next.connected = true
        if next.models.isEmpty { next.models = ["default"] }
        if next.defaultModel.isEmpty { next.defaultModel = next.models[0] }
        customProviders.removeAll { $0.id == next.id }
        customProviders.append(next)
        Disk.writeJSON(StoreKeys.providers, customProviders)
        if !apiKey.isEmpty { KeychainStore.setAPIKey(apiKey, for: next.id) }
        saveConnection(
            ConnectionRecord(id: next.id, enabled: true, binaryPath: "", endpoint: next.endpoint),
            apiKey: apiKey.isEmpty ? nil : apiKey
        )
    }

    func removeCustomProvider(_ id: String) {
        customProviders.removeAll { $0.id == id }
        connections.removeValue(forKey: id)
        Disk.writeJSON(StoreKeys.providers, customProviders)
        persistConnections()
        KeychainStore.setAPIKey("", for: id)
    }

    func createSession(providerId: String, projectId: String, prompt: String, model: String?, effort: String?, cwd: String?, attachments: [Attachment]) {
        guard isReady(providerId) else { return }
        let p = self.provider(providerId)
        let project = Projects.byId(projectId)
        let session = Session(
            id: UID.make("ses"),
            title: Prompts.titleFromPrompt(prompt),
            providerId: providerId,
            projectId: projectId,
            cwd: (cwd?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false ? cwd! : project.path),
            model: model ?? p.defaultModel,
            effort: effort ?? Catalog.defaultEffortFor(providerId),
            status: .idle,
            createdAt: Date(),
            updatedAt: Date(),
            messages: [],
            turns: 0
        )
        sessions.insert(session, at: 0)
        activeId = session.id
        view = .focus
        newOpen = false
        persistSessions()
        Task { await send(session.id, prompt, attachments: attachments) }
    }

    func stop(_ sessionId: String) {
        runningTasks[sessionId]?.cancel()
        runningTasks[sessionId] = nil
        AgentRuntime.shared.cancel(sessionId)
        patch(sessionId) { s in
            s.status = .waiting
            s.updatedAt = Date()
            s.messages = s.messages.map { m in
                var c = m
                c.streaming = false
                return c
            }
        }
    }

    @discardableResult
    func messageSession(fromId: String, toQuery: String, text: String, echo: Bool = false) -> Bool {
        guard let from = sessions.first(where: { $0.id == fromId }) else { return false }
        guard let target = resolveTarget(fromId: fromId, query: toQuery) else { return false }
        let hop = (hopBySession[fromId] ?? 0) + 1
        if let blocked = busAllowed(from: fromId, to: target.id, text: text, hop: hop) {
            note(fromId, blocked)
            return true
        }
        let toShort = CatalogProviders.resolve(target.providerId, custom: customProviders).short
        if echo {
            patch(fromId) { s in
                s.updatedAt = Date()
                s.messages.append(ChatMessage(
                    id: UID.make("m"), role: .assistant, createdAt: Date(),
                    blocks: [.tool(.init(name: "SendMessage", to: "\(toShort) · \(target.title)", content: text, status: .done))],
                    streaming: false
                ))
            }
        }
        let incoming = Incoming(
            fromSessionId: fromId, fromProviderId: from.providerId,
            fromTitle: from.title, hop: hop
        )
        Task { await send(target.id, text, incoming: incoming) }
        return true
    }

    func send(_ sessionId: String, _ text: String, attachments: [Attachment] = [], incoming: Incoming? = nil) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty && attachments.isEmpty { return }

        if incoming == nil, trimmed.hasPrefix("/") {
            if runSlash(sessionId, trimmed) { return }
        }

        guard var session = sessions.first(where: { $0.id == sessionId }) else { return }
        if session.status == .running {
            if let incoming {
                var q = inbox[sessionId] ?? []
                if q.count < 8 { q.append(InboxItem(text: trimmed, incoming: incoming)); inbox[sessionId] = q }
            }
            return
        }

        runningTasks[sessionId]?.cancel()
        hopBySession[sessionId] = incoming?.hop ?? 0
        let outgoing = FilePicking.formatOutgoing(trimmed, attachments)
        let userMsg: ChatMessage
        if let incoming {
            userMsg = ChatMessage(
                id: UID.make("m"), role: .agent, createdAt: Date(),
                blocks: [.text(trimmed)], streaming: false,
                fromSessionId: incoming.fromSessionId,
                fromProviderId: incoming.fromProviderId,
                fromTitle: incoming.fromTitle,
                hop: incoming.hop
            )
        } else {
            userMsg = ChatMessage(
                id: UID.make("m"), role: .user, createdAt: Date(),
                blocks: [.text(trimmed.isEmpty ? "Attached files" : trimmed)],
                streaming: false,
                attachments: attachments.isEmpty ? nil : attachments
            )
        }
        let asstId = UID.make("m")
        let asst = ChatMessage(id: asstId, role: .assistant, createdAt: Date(), blocks: [], raw: "", streaming: true)

        patch(sessionId) { s in
            if s.turns == 0 && s.messages.isEmpty {
                s.title = Prompts.titleFromPrompt(trimmed.isEmpty ? (attachments.first?.name ?? "Session") : trimmed)
            }
            s.status = .running
            s.updatedAt = Date()
            s.turns += 1
            s.messages.append(contentsOf: [userMsg, asst])
        }

        session = sessions.first { $0.id == sessionId } ?? session
        let resolved = self.provider(session.providerId)
        let history = transcript(session, asstId: asstId, outgoing: outgoing, attachments: attachments, incoming: incoming)
        let roster = rosterFor(selfId: sessionId)
        let system = Prompts.systemPrompt(
            providerId: session.providerId, projectId: session.projectId, cwd: session.cwd,
            model: session.model, effort: session.effort,
            skills: addonNames(.skill, session.providerId),
            connectors: addonNames(.connector, session.providerId),
            providerName: resolved.name, vendor: resolved.vendor,
            roster: roster, selfId: session.id
        )

        let task = Task { @MainActor in
            do {
                try await AgentRuntime.shared.prompt(
                    session: session, provider: resolved, system: system,
                    history: history, userText: incoming == nil ? outgoing : trimmed,
                    custom: customProviders, roster: roster
                ) { raw in
                    Task { @MainActor in
                        self.patch(sessionId) { s in
                            s.updatedAt = Date()
                            s.messages = s.messages.map { m in
                                guard m.id == asstId else { return m }
                                var c = m
                                c.raw = raw
                                c.blocks = ParseAgent.parse(raw)
                                c.streaming = true
                                return c
                            }
                        }
                    }
                }
                let rosterText = Prompts.formatRoster(roster)
                let raw = sessions.first { $0.id == sessionId }?.messages.first { $0.id == asstId }?.raw ?? ""
                let finalBlocks = ParseAgent.fillListAgents(ParseAgent.parse(raw), roster: rosterText)
                patch(sessionId) { s in
                    s.status = .waiting
                    s.updatedAt = Date()
                    s.messages = s.messages.map { m in
                        guard m.id == asstId else { return m }
                        var c = m
                        c.streaming = false
                        c.blocks = finalBlocks
                        return c
                    }
                }
                for msg in ParseAgent.extractSendMessages(finalBlocks) {
                    _ = messageSession(fromId: sessionId, toQuery: msg.to, text: msg.text)
                }
                persistSessions()
            } catch is CancellationError {
                persistSessions()
                return
            } catch {
                if (error as NSError).domain == NSURLErrorDomain && (error as NSError).code == NSURLErrorCancelled {
                    persistSessions()
                    return
                }
                if let acp = error as? ACPClient.ACPError, case .cancelled = acp {
                    persistSessions()
                    return
                }
                patch(sessionId) { s in
                    s.status = .error
                    s.updatedAt = Date()
                    s.messages = s.messages.map { m in
                        guard m.id == asstId else { return m }
                        var c = m
                        c.streaming = false
                        c.blocks = [.text(error.localizedDescription)]
                        return c
                    }
                }
                persistSessions()
            }
            runningTasks[sessionId] = nil
            if var q = inbox[sessionId], !q.isEmpty {
                let next = q.removeFirst()
                inbox[sessionId] = q
                Task { await send(sessionId, next.text, incoming: next.incoming) }
            }
        }
        runningTasks[sessionId] = task
        await task.value
    }

    // MARK: - slash

    func runSlash(_ sessionId: String, _ raw: String) -> Bool {
        guard let session = sessions.first(where: { $0.id == sessionId }) else { return true }
        let parts = raw.drop(while: { $0 == "/" })
        let cmd: String
        let arg: String
        if let sp = parts.firstIndex(of: " ") {
            cmd = String(parts[..<sp]).lowercased()
            arg = String(parts[parts.index(after: sp)...]).trimmingCharacters(in: .whitespacesAndNewlines)
        } else {
            cmd = String(parts).lowercased()
            arg = ""
        }
        let known = Catalog.slashFor(session.providerId)
        let spec = known.first { $0.cmd == cmd }
        let local: Set<String> = [
            "help", "clear", "compact", "compress", "model", "effort", "skills", "mcp",
            "plugin", "cost", "status", "permissions", "context", "fast", "approvals",
            "rules", "agents", "peers", "list-agents", "msg",
        ]
        if spec == nil && !local.contains(cmd) { return false }
        if let spec, spec.kind == .skill { return false }
        if !local.contains(cmd) { return false }

        if cmd == "help" {
            let lines = known.map { "/\($0.cmd)\($0.args.map { " \($0)" } ?? "")  — \($0.hint)" }.joined(separator: "\n")
            note(sessionId, "\(CatalogProviders.resolve(session.providerId, custom: customProviders).short) commands\n\n\(lines)")
            return true
        }
        if cmd == "agents" || cmd == "peers" || cmd == "list-agents" {
            note(sessionId, "WestCode desk roster\n\n\(Prompts.formatRoster(rosterFor(selfId: sessionId)))")
            return true
        }
        if cmd == "msg" {
            let bits = arg.split(separator: " ", maxSplits: 1, omittingEmptySubsequences: true)
            if bits.count < 2 {
                note(sessionId, "Usage: /msg <session> <text>\nTry /agents for the roster.")
                return true
            }
            let ok = messageSession(fromId: sessionId, toQuery: String(bits[0]), text: String(bits[1]), echo: true)
            if !ok { note(sessionId, "No session matching “\(bits[0])”. Try /agents.") }
            return true
        }
        if cmd == "clear" {
            patch(sessionId) { s in
                s.messages = [systemNote("Conversation cleared.")]
                s.turns = 0
                s.updatedAt = Date()
                s.status = .idle
            }
            return true
        }
        if cmd == "compact" || cmd == "compress" {
            patch(sessionId) { s in
                let kept = s.messages.filter { $0.role != .system }.suffix(4)
                let focus = arg.isEmpty ? "" : " Focus: \(arg)."
                s.messages = [systemNote("Context compacted.\(focus) Last turns kept.")] + Array(kept)
                s.updatedAt = Date()
            }
            return true
        }
        if cmd == "model" {
            let extras = CatalogProviders.resolve(session.providerId, custom: customProviders).models
            if arg.isEmpty {
                let list = Catalog.modelsFor(session.providerId, extras: extras).map {
                    $0.id == session.model ? "• \($0.label)  (current)" : "  \($0.label)"
                }.joined(separator: "\n")
                note(sessionId, "Models for this provider\n\n\(list)")
                return true
            }
            guard let found = Catalog.matchModel(session.providerId, query: arg, extras: extras) else {
                note(sessionId, "Unknown model “\(arg)”. Try /model for the list.")
                return true
            }
            patch(sessionId) { s in
                s.model = found.id
                s.updatedAt = Date()
                s.messages.append(systemNote("Model set to \(found.label)."))
            }
            return true
        }
        if cmd == "effort" {
            if arg.isEmpty {
                let list = Catalog.effortsFor(session.providerId).map {
                    $0.id == session.effort
                        ? "• \($0.label)  (\($0.id)) — \($0.hint)  (current)"
                        : "  \($0.label)  (\($0.id)) — \($0.hint)"
                }.joined(separator: "\n")
                note(sessionId, "Effort for this provider\n\n\(list)")
                return true
            }
            guard let found = Catalog.matchEffort(session.providerId, query: arg) else {
                note(sessionId, "Unknown effort “\(arg)”. Try /effort for the list.")
                return true
            }
            patch(sessionId) { s in
                s.effort = found.id
                s.updatedAt = Date()
                s.messages.append(systemNote("Effort set to \(found.label)."))
            }
            return true
        }
        if cmd == "fast" {
            let low = session.effort == "low" || session.effort == "minimal"
            let next = low ? Catalog.defaultEffortFor(session.providerId) : (session.providerId == "codex" ? "minimal" : "low")
            patch(sessionId) { s in
                s.effort = next
                s.updatedAt = Date()
                s.messages.append(systemNote("Effort set to \(Catalog.effortLabel(session.providerId, effort: next))."))
            }
            return true
        }
        if cmd == "skills" {
            let names = addonNames(.skill, session.providerId)
            note(sessionId, names.isEmpty ? "No skills enabled. Open Library to add some." : "Enabled skills\n\n" + names.map { "• \($0)" }.joined(separator: "\n"))
            return true
        }
        if cmd == "mcp" || cmd == "plugin" {
            let names = addonNames(cmd == "mcp" ? .connector : .plugin, session.providerId)
            note(sessionId, names.isEmpty ? "None enabled. Open Library." : names.map { "• \($0)" }.joined(separator: "\n"))
            return true
        }
        if ["cost", "status", "permissions", "context", "approvals", "rules"].contains(cmd) {
            note(sessionId, "\(cmd) is handled by the local CLI when this session is on ACP. Open Connections if the binary is missing.")
            return true
        }
        return false
    }

    // MARK: - helpers

    func rosterFor(selfId: String) -> [AgentRosterItem] {
        sessions.filter { $0.id != selfId }.map {
            AgentRosterItem(
                id: $0.id, title: $0.title, providerId: $0.providerId,
                provider: CatalogProviders.resolve($0.providerId, custom: customProviders).short,
                cwd: $0.cwd, model: $0.model, status: $0.status
            )
        }
    }

    private func addonNames(_ kind: AddonKind, _ providerId: String) -> [String] {
        LibraryCatalog.combined(custom: customAddons).filter { a in
            a.kind == kind && enabledAddons.contains(a.id)
                && (a.providers.contains(providerId) || a.providers.contains("*") || a.custom == true)
        }.map(\.name)
    }

    private func persistLibrary() {
        struct Lib: Codable { var enabled: [String]; var custom: [Addon] }
        Disk.writeJSON(StoreKeys.library, Lib(enabled: enabledAddons, custom: customAddons))
    }

    private func systemNote(_ text: String) -> ChatMessage {
        ChatMessage(id: UID.make("m"), role: .system, createdAt: Date(), blocks: [.text(text)], streaming: false)
    }

    func note(_ sessionId: String, _ text: String) {
        patch(sessionId) { s in
            s.updatedAt = Date()
            s.messages.append(systemNote(text))
        }
    }

    func patch(_ id: String, _ fn: (inout Session) -> Void) {
        guard let i = sessions.firstIndex(where: { $0.id == id }) else { return }
        fn(&sessions[i])
    }

    private func resolveTarget(fromId: String, query: String) -> Session? {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if q.isEmpty { return nil }
        let others = sessions.filter { $0.id != fromId }
        let scored = others.map { s -> (Session, Int) in
            let short = CatalogProviders.resolve(s.providerId, custom: customProviders).short.lowercased()
            let title = s.title.lowercased()
            let id = s.id.lowercased()
            var score = 0
            if id == q || short == q { score = 100 }
            else if id.hasPrefix(q) || short.hasPrefix(q) { score = 80 }
            else if id.contains(q) || short.contains(q) || title.contains(q) { score = 50 }
            else if s.providerId.lowercased() == q { score = 70 }
            return (s, score)
        }.filter { $0.1 > 0 }.sorted { a, b in
            if a.1 != b.1 { return a.1 > b.1 }
            return a.0.updatedAt > b.0.updatedAt
        }
        return scored.first?.0
    }

    private func hashText(_ s: String) -> String {
        String(s.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines).lowercased().prefix(240))
    }

    private func busAllowed(from: String, to: String, text: String, hop: Int) -> String? {
        if from == to { return "Cannot message this session." }
        if hop > maxHop { return "Desk bus stopped the loop (hop limit)." }
        let now = Date()
        busLog = busLog.filter { now.timeIntervalSince($0.at) < 90 }
        if busLog.filter({ $0.from == from && $0.to == to }).count >= 4 {
            return "Desk bus rate-limited this pair."
        }
        let h = hashText(text)
        if busLog.contains(where: { $0.from == from && $0.to == to && $0.hash == h }) {
            return "Dropped a duplicate message."
        }
        busLog.append(BusLog(from: from, to: to, at: now, hash: h))
        return nil
    }

    private func transcript(_ session: Session, asstId: String, outgoing: String, attachments: [Attachment], incoming: Incoming?) -> [(role: String, content: String)] {
        session.messages.filter { $0.role == .user || $0.role == .assistant || $0.role == .agent }.filter { $0.id != asstId }.map { m -> (String, String) in
            if m.role == .agent {
                let who = CatalogProviders.resolve(m.fromProviderId ?? "", custom: customProviders).short
                let body = """
                [Peer agent: \(who) · \(m.fromTitle ?? "session")]
                Incoming message from another WestCode session. Act on it. SendMessage a result back if they need one.

                \(ParseAgent.blocksToPlain(m.blocks))
                """
                return ("user", String(body.prefix(6000)))
            }
            let content = m.role == .user
                ? FilePicking.formatOutgoing(ParseAgent.blocksToPlain(m.blocks), m.attachments ?? [])
                : ParseAgent.blocksToPlain(m.blocks)
            return (m.role.rawValue, String(content.prefix(6000)))
        }
    }
}
