import Foundation

struct Provider: Identifiable, Hashable {
    var id: String
    var name: String
    var short: String
    var vendor: String
    var binary: String
    var protocolLabel: String
    var auth: AuthKind
    var authLabel: String
    var models: [String]
    var defaultModel: String
    var sessionStore: String
    var how: String
    var live: Bool
    var connected: Bool
    var builtin: Bool
    var endpoint: String?
    var acpArgs: [String]
}

struct CustomProvider: Identifiable, Hashable, Codable {
    var id: String
    var name: String
    var vendor: String
    var auth: AuthKind
    var authLabel: String
    var endpoint: String
    var models: [String]
    var defaultModel: String
    var connected: Bool
}

enum BuiltinProviders {
    static let claude = Provider(
        id: "claude", name: "Claude Code", short: "Claude", vendor: "Anthropic",
        binary: "claude", protocolLabel: "ACP · Agent SDK",
        auth: .subscription, authLabel: "Claude Pro / Max",
        models: ["Opus 4.8", "Opus 4.7", "Sonnet 5", "Sonnet 4.6", "Haiku 4.5"],
        defaultModel: "Opus 4.7", sessionStore: "~/.claude/projects",
        how: "Spawns the local Claude Code CLI. Claude owns token lifecycle — WestCode never stores a key.",
        live: false, connected: true, builtin: true, endpoint: nil,
        acpArgs: ["--acp"]
    )
    static let codex = Provider(
        id: "codex", name: "Codex", short: "Codex", vendor: "OpenAI",
        binary: "codex", protocolLabel: "ACP · app-server",
        auth: .subscription, authLabel: "ChatGPT Plus / Pro",
        models: ["GPT-5.4 Codex", "GPT-5.4", "GPT-5.4 Mini"],
        defaultModel: "GPT-5.4 Codex", sessionStore: "~/.codex",
        how: "Signs in with ChatGPT OAuth through the Codex CLI. Usage draws from the subscription, not API credits.",
        live: false, connected: true, builtin: true, endpoint: nil,
        acpArgs: ["acp"]
    )
    static let cursor = Provider(
        id: "cursor", name: "Cursor Agent", short: "Cursor", vendor: "Anysphere",
        binary: "agent", protocolLabel: "ACP · stdio JSON-RPC",
        auth: .subscription, authLabel: "Cursor Pro / Ultra",
        models: ["Composer 2", "Sonnet 4.6", "GPT-5.4"],
        defaultModel: "Composer 2", sessionStore: "~/.cursor",
        how: "Connects to Cursor CLI in ACP mode (`agent acp`). Editor login is reused; no Cursor API key.",
        live: false, connected: true, builtin: true, endpoint: nil,
        acpArgs: ["acp"]
    )
    static let grok = Provider(
        id: "grok", name: "Grok Build", short: "Grok", vendor: "xAI",
        binary: "grok", protocolLabel: "ACP · xAI",
        auth: .api, authLabel: "xAI",
        models: ["Grok 4.5", "Grok 4"],
        defaultModel: "Grok 4.5", sessionStore: "~/.grok",
        how: "Spawns the Grok Build CLI over ACP when installed, otherwise the xAI HTTP API.",
        live: true, connected: true, builtin: true, endpoint: "https://api.x.ai/v1",
        acpArgs: ["acp"]
    )

    static let order = ["claude", "codex", "cursor", "grok"]
    static let map: [String: Provider] = [
        "claude": claude, "codex": codex, "cursor": cursor, "grok": grok,
    ]
}

struct AvailableToAdd: Identifiable, Hashable {
    var id: String
    var name: String
    var vendor: String
    var subscription: String
    var apiHint: String
    var endpoint: String
    var models: [String]
}

enum CatalogProviders {
    static let available: [AvailableToAdd] = [
        .init(
            id: "gemini", name: "Gemini CLI", vendor: "Google",
            subscription: "Gemini CLI login", apiHint: "Google AI Studio key",
            endpoint: "https://generativelanguage.googleapis.com/v1beta",
            models: ["Gemini 2.5 Pro", "Gemini 2.5 Flash"]
        ),
        .init(
            id: "openrouter", name: "OpenRouter", vendor: "OpenRouter",
            subscription: "", apiHint: "OpenRouter key — any model",
            endpoint: "https://openrouter.ai/api/v1",
            models: ["anthropic/claude-sonnet-4.6", "openai/gpt-5.4", "x-ai/grok-4"]
        ),
    ]

    static func customToProvider(_ c: CustomProvider) -> Provider {
        Provider(
            id: c.id, name: c.name, short: c.name, vendor: c.vendor,
            binary: c.auth == .subscription ? c.id : "openai-compat",
            protocolLabel: c.auth == .subscription ? "ACP · stdio JSON-RPC" : "HTTP · OpenAI-compatible",
            auth: c.auth, authLabel: c.authLabel, models: c.models,
            defaultModel: c.defaultModel, sessionStore: "~/.westcode/providers",
            how: c.auth == .api
                ? "Calls \(c.endpoint.isEmpty ? "a custom endpoint" : c.endpoint) with a key stored in Keychain."
                : "Subscription login on the host CLI.",
            live: false, connected: c.connected, builtin: false, endpoint: c.endpoint,
            acpArgs: ["acp"]
        )
    }

    static func resolve(_ id: String, custom: [CustomProvider] = []) -> Provider {
        if let p = BuiltinProviders.map[id] { return p }
        if let c = custom.first(where: { $0.id == id }) { return customToProvider(c) }
        return Provider(
            id: id, name: id, short: id, vendor: "Custom", binary: "openai-compat",
            protocolLabel: "HTTP · OpenAI-compatible", auth: .api, authLabel: "API",
            models: [], defaultModel: "default", sessionStore: "~/.westcode/providers",
            how: "Custom provider.", live: false, connected: true, builtin: false,
            endpoint: nil, acpArgs: []
        )
    }

    static func all(_ custom: [CustomProvider] = []) -> [Provider] {
        BuiltinProviders.order.compactMap { BuiltinProviders.map[$0] } + custom.map(customToProvider)
    }
}
