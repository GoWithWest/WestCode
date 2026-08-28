import Foundation

enum AgentError: LocalizedError {
    case notConnected(String)
    var errorDescription: String? {
        switch self {
        case .notConnected(let message): return message
        }
    }
}

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
            let cwd = BinaryProbe.expandHome(session.cwd)
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

        throw AgentError.notConnected(CatalogProviders.connectHint(provider))
    }

    func rememberACPSession(_ westId: String, acpId: String) {
        clients[westId]?.sessionId = acpId
    }

    private func ensureACP(session: Session, provider: Provider) async throws -> ACPClient? {
        if provider.binary == "openai-compat" { return nil }
        guard BinaryProbe.locate(provider.binary) != nil else {
            if provider.auth == .api { return nil }
            throw AgentError.notConnected(CatalogProviders.connectHint(provider))
        }
        if let existing = clients[session.id] { return existing }
        let client = ACPClient()
        do {
            try client.start(binary: provider.binary, arguments: provider.acpArgs)
            _ = try await client.initialize()
            clients[session.id] = client
            return client
        } catch {
            client.stop()
            throw error
        }
    }

    private func resolvedEndpoint(_ provider: Provider) -> String? {
        provider.endpoint
    }
}
