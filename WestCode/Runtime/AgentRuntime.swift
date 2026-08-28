import Foundation

@MainActor
final class AgentRuntime {
    static let shared = AgentRuntime()

    private var clients: [String: ACPClient] = [:]
    private var tasks: [String: Task<Void, Never>] = [:]

    func cancel(_ sessionId: String) {
        tasks[sessionId]?.cancel()
        tasks[sessionId] = nil
        if let client = clients[sessionId], let acp = client.sessionId {
            client.cancel(sessionId: acp)
        }
    }

    func prompt(
        session: Session,
        provider: Provider,
        system: String,
        history: [(role: String, content: String)],
        userText: String,
        custom: [CustomProvider],
        roster: [AgentRosterItem] = [],
        onDelta: @escaping (String) -> Void
    ) async throws {
        if Task.isCancelled { throw ACPClient.ACPError.cancelled }

        if let client = try await ensureACP(session: session, provider: provider) {
            let cwd = FilePicking.expandHome(session.cwd)
            let acpId: String
            if let existing = session.acpSessionId ?? client.sessionId {
                acpId = existing
            } else {
                acpId = try await client.newSession(cwd: cwd)
            }
            var acc = ""
            try await client.prompt(sessionId: acpId, text: userText) { update in
                let chunk = ACPClient.extractText(from: update)
                if !chunk.isEmpty {
                    acc += chunk
                    onDelta(acc)
                }
            }
            return
        }

        if provider.auth == .api, let endpoint = resolvedEndpoint(provider),
           let key = KeychainStore.apiKey(for: provider.id), !key.isEmpty {
            let model = provider.id == "grok" ? HTTPAgent.grokModel(session.model) : session.model
            var acc = ""
            try await HTTPAgent.stream(
                endpoint: endpoint,
                apiKey: key,
                model: model,
                effort: session.effort,
                system: system,
                messages: history
            ) { chunk in
                acc += chunk
                onDelta(acc)
            }
            return
        }

        let reply = HTTPAgent.fallbackReply(provider: session.providerId, prompt: userText, roster: roster)
        var acc = ""
        for chunk in stride(from: 0, to: reply.count, by: 24) {
            if Task.isCancelled { throw ACPClient.ACPError.cancelled }
            let i = reply.index(reply.startIndex, offsetBy: chunk)
            let j = reply.index(i, offsetBy: min(24, reply.distance(from: i, to: reply.endIndex)))
            acc += String(reply[i..<j])
            onDelta(acc)
            try await Task.sleep(nanoseconds: 12_000_000)
        }
    }

    func promptFallback(
        session: Session,
        prompt: String,
        roster: [AgentRosterItem],
        onDelta: @escaping (String) -> Void
    ) async throws {
        let reply = HTTPAgent.fallbackReply(provider: session.providerId, prompt: prompt, roster: roster)
        var acc = ""
        for chunk in stride(from: 0, to: reply.count, by: 24) {
            if Task.isCancelled { throw ACPClient.ACPError.cancelled }
            let i = reply.index(reply.startIndex, offsetBy: chunk)
            let j = reply.index(i, offsetBy: min(24, reply.distance(from: i, to: reply.endIndex)))
            acc += String(reply[i..<j])
            onDelta(acc)
            try await Task.sleep(nanoseconds: 12_000_000)
        }
    }

    func track(_ sessionId: String, _ task: Task<Void, Never>) {
        tasks[sessionId] = task
    }

    func rememberACPSession(_ westId: String, acpId: String) {
        clients[westId]?.sessionId = acpId
    }

    private func ensureACP(session: Session, provider: Provider) async throws -> ACPClient? {
        if provider.auth == .api, provider.id == "grok" {
            if which(provider.binary) == nil { return nil }
        }
        if provider.binary == "openai-compat" { return nil }
        if which(provider.binary) == nil { return nil }
        if let existing = clients[session.id] { return existing }
        let client = ACPClient()
        do {
            try client.start(binary: provider.binary, arguments: provider.acpArgs)
            _ = try await client.initialize()
            clients[session.id] = client
            return client
        } catch {
            client.stop()
            return nil
        }
    }

    private func resolvedEndpoint(_ provider: Provider) -> String? {
        provider.endpoint
    }

    private func which(_ binary: String) -> URL? {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        let extras = [
            "/opt/homebrew/bin", "/usr/local/bin", "\(home)/.local/bin", "\(home)/.npm-global/bin",
        ]
        let path = ProcessInfo.processInfo.environment["PATH"] ?? ""
        for dir in extras + path.split(separator: ":").map(String.init) {
            let candidate = URL(fileURLWithPath: dir).appendingPathComponent(binary)
            if FileManager.default.isExecutableFile(atPath: candidate.path) { return candidate }
        }
        return nil
    }
}
