import Foundation

enum HTTPAgent {
    struct Delta {
        var content: String
    }

    static func effortParams(_ effort: String?) -> (temperature: Double, maxTokens: Int) {
        switch effort {
        case "minimal", "low": return (0.5, 700)
        case "high", "extra", "xhigh", "max", "supercode": return (0.3, 1400)
        default: return (0.4, 1100)
        }
    }

    static func grokModel(_ label: String) -> String {
        if label.lowercased().contains("4.5") { return "grok-4.5" }
        if label.lowercased().contains("4") { return "grok-4" }
        return "grok-4.5"
    }

    static func stream(
        endpoint: String,
        apiKey: String,
        model: String,
        effort: String?,
        system: String,
        messages: [(role: String, content: String)],
        onDelta: @escaping (String) -> Void
    ) async throws {
        let params = effortParams(effort)
        let url = URL(string: endpoint.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/chat/completions")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        var payload: [String: Any] = [
            "model": model,
            "stream": true,
            "temperature": params.temperature,
            "max_tokens": params.maxTokens,
            "messages": [["role": "system", "content": system]] + messages.suffix(10).map {
                ["role": $0.role, "content": String($0.content.prefix(6000))]
            },
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (bytes, response) = try await URLSession.shared.bytes(for: req)
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            throw NSError(domain: "WestCode.HTTP", code: http.statusCode, userInfo: [
                NSLocalizedDescriptionKey: "Upstream \(http.statusCode)",
            ])
        }
        for try await line in bytes.lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard trimmed.hasPrefix("data:") else { continue }
            let data = trimmed.dropFirst(5).trimmingCharacters(in: .whitespaces)
            if data.isEmpty || data == "[DONE]" { continue }
            guard let json = try? JSONSerialization.jsonObject(with: Data(data.utf8)) as? [String: Any],
                  let choices = json["choices"] as? [[String: Any]],
                  let delta = choices.first?["delta"] as? [String: Any],
                  let content = delta["content"] as? String, !content.isEmpty else { continue }
            onDelta(content)
        }
    }

    static func fallbackReply(provider: String, prompt: String, roster: [AgentRosterItem]) -> String {
        let file: String
        switch provider {
        case "claude": file = "src/auth/middleware.ts"
        case "codex": file = "tests/checkout.spec.ts"
        case "cursor": file = "src/ui/palette.rs"
        default: file = "README.md"
        }
        let p = CatalogProviders.resolve(provider)
        let peer = prompt.range(of: "[Peer agent:", options: .caseInsensitive) != nil
            || prompt.range(of: "Incoming message from", options: .caseInsensitive) != nil
        let other = pickPeer(prompt, roster)
        if peer, let other {
            return """
            <think>Peer agent pinged this session. Do the work and send a short result back.</think>
            <tool name="Read" path="\(file)">
            // working tree
            </tool>
            <tool name="SendMessage" to="\(other.id)">
            Done on my side. \(String(prompt.prefix(120)).replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression))
            </tool>
            Sent that back to \(other.provider).
            """
        }
        if wantsSend(prompt, roster), let other {
            return """
            <think>The human wants the other session to know. SendMessage, don't just describe it.</think>
            <tool name="ListAgents">
            \(Prompts.formatRoster(roster))
            </tool>
            <tool name="SendMessage" to="\(other.id)">
            \(String(prompt.prefix(400)))
            </tool>
            Sent to \(other.provider) · \(other.title).
            """
        }
        return """
        <think>Look at the repo, then make the smallest change that answers the request.</think>
        <tool name="Read" path="\(file)">
        // existing file
        </tool>
        <tool name="Edit" path="\(file)">
        --- a/\(file)
        +++ b/\(file)
        @@ -1,3 +1,6 @@
        +// handled: \(String(prompt.prefix(80)))
         export function apply() {
           return true;
         }
        </tool>
        The change is in `\(file)`. \(p.short) session on this Mac via WestCode.
        """
    }

    private static func pickPeer(_ prompt: String, _ roster: [AgentRosterItem]) -> AgentRosterItem? {
        guard !roster.isEmpty else { return nil }
        let p = prompt.lowercased()
        return roster.first {
            p.contains("@\($0.provider.lowercased())")
                || p.contains($0.provider.lowercased())
                || p.contains($0.providerId.lowercased())
                || p.contains($0.id.lowercased())
        } ?? roster.first
    }

    private static func wantsSend(_ prompt: String, _ roster: [AgentRosterItem]) -> Bool {
        guard !roster.isEmpty else { return false }
        if prompt.range(of: #"(?:^|\s)@\w+"#, options: .regularExpression) != nil { return true }
        let tell = prompt.range(of: #"\b(tell|ask|message|notify|let|ping)\b"#, options: [.regularExpression, .caseInsensitive]) != nil
        let who = prompt.range(of: #"\b(session|claude|codex|cursor|grok|peer|agent)\b"#, options: [.regularExpression, .caseInsensitive]) != nil
        return tell && who
    }
}
