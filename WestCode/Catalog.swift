import Foundation

struct ModelOpt: Identifiable, Hashable {
    var id: String
    var label: String
}

struct EffortOpt: Identifiable, Hashable {
    var id: String
    var label: String
    var hint: String
}

struct SlashCmd: Identifiable, Hashable {
    var id: String { cmd }
    var cmd: String
    var args: String?
    var hint: String
    var kind: Kind
    enum Kind: String { case builtin, skill }
}

enum Catalog {
    static let models: [String: [ModelOpt]] = [
        "claude": [
            .init(id: "Opus 4.8", label: "Opus 4.8"),
            .init(id: "Opus 4.7", label: "Opus 4.7"),
            .init(id: "Sonnet 5", label: "Sonnet 5"),
            .init(id: "Sonnet 4.6", label: "Sonnet 4.6"),
            .init(id: "Haiku 4.5", label: "Haiku 4.5"),
            .init(id: "Fable 5", label: "Fable 5"),
        ],
        "codex": [
            .init(id: "GPT-5.4 Codex", label: "GPT-5.4 Codex"),
            .init(id: "GPT-5.4", label: "GPT-5.4"),
            .init(id: "GPT-5.4 Mini", label: "GPT-5.4 Mini"),
            .init(id: "GPT-5.3 Codex", label: "GPT-5.3 Codex"),
        ],
        "cursor": [
            .init(id: "Composer 2", label: "Composer 2"),
            .init(id: "Composer 1.5", label: "Composer 1.5"),
            .init(id: "Sonnet 4.6", label: "Sonnet 4.6"),
            .init(id: "Opus 4.6", label: "Opus 4.6"),
            .init(id: "GPT-5.4", label: "GPT-5.4"),
            .init(id: "Grok 4", label: "Grok 4"),
        ],
        "grok": [
            .init(id: "Grok 4.5", label: "Grok 4.5"),
            .init(id: "Grok 4", label: "Grok 4"),
        ],
    ]

    static let efforts: [String: [EffortOpt]] = [
        "claude": [
            .init(id: "low", label: "Low", hint: "Fast, light on limits"),
            .init(id: "medium", label: "Medium", hint: "Everyday coding"),
            .init(id: "high", label: "High", hint: "Default for Opus"),
            .init(id: "extra", label: "Extra", hint: "xhigh — long agentic work"),
            .init(id: "max", label: "Max", hint: "Single-pass maximum"),
            .init(id: "supercode", label: "Supercode", hint: "ultracode — session-only"),
        ],
        "codex": [
            .init(id: "minimal", label: "Minimal", hint: "CLI: cheapest thinking"),
            .init(id: "low", label: "Low", hint: "Desktop calls this Light"),
            .init(id: "medium", label: "Medium", hint: "Recommended default"),
            .init(id: "high", label: "High", hint: "Harder tasks"),
            .init(id: "xhigh", label: "Extra high", hint: "Long-horizon work"),
        ],
        "cursor": [
            .init(id: "low", label: "Low", hint: "Quick edits"),
            .init(id: "medium", label: "Medium", hint: "Default"),
            .init(id: "high", label: "High", hint: "Deeper reasoning"),
            .init(id: "xhigh", label: "Extra high", hint: "Hardest Composer turns"),
        ],
        "grok": [
            .init(id: "low", label: "Low", hint: "Snappy"),
            .init(id: "medium", label: "Medium", hint: "Default"),
            .init(id: "high", label: "High", hint: "More thinking"),
        ],
    ]

    static let defaultEffort: [String: String] = [
        "claude": "high", "codex": "medium", "cursor": "medium", "grok": "medium",
    ]

    static let slash: [String: [SlashCmd]] = [
        "claude": [
            .init(cmd: "clear", hint: "Start a new conversation", kind: .builtin),
            .init(cmd: "compact", args: "[focus]", hint: "Summarize history to free context", kind: .builtin),
            .init(cmd: "model", args: "[name]", hint: "Switch model for this session", kind: .builtin),
            .init(cmd: "effort", args: "[level]", hint: "Set effort: low … supercode", kind: .builtin),
            .init(cmd: "plan", args: "[task]", hint: "Enter plan mode", kind: .builtin),
            .init(cmd: "fast", hint: "Toggle fast mode", kind: .builtin),
            .init(cmd: "context", hint: "Show context usage", kind: .builtin),
            .init(cmd: "cost", hint: "Session usage", kind: .builtin),
            .init(cmd: "permissions", hint: "Tool allowlist", kind: .builtin),
            .init(cmd: "mcp", hint: "Manage MCP connectors", kind: .builtin),
            .init(cmd: "plugin", hint: "Manage plugins", kind: .builtin),
            .init(cmd: "skills", hint: "List enabled skills", kind: .builtin),
            .init(cmd: "memory", hint: "Edit CLAUDE.md", kind: .builtin),
            .init(cmd: "init", hint: "Write CLAUDE.md for this repo", kind: .builtin),
            .init(cmd: "diff", hint: "Review working tree", kind: .builtin),
            .init(cmd: "code-review", args: "[path]", hint: "Review diff for bugs", kind: .skill),
            .init(cmd: "debug", args: "[issue]", hint: "Debug with extra logging", kind: .skill),
            .init(cmd: "doctor", hint: "Diagnose Claude Code setup", kind: .skill),
            .init(cmd: "batch", args: "[instruction]", hint: "Split work across subagents", kind: .skill),
            .init(cmd: "loop", args: "[prompt]", hint: "Repeat until done", kind: .skill),
            .init(cmd: "help", hint: "List commands for this provider", kind: .builtin),
        ],
        "codex": [
            .init(cmd: "clear", hint: "New thread", kind: .builtin),
            .init(cmd: "compact", hint: "Compact context", kind: .builtin),
            .init(cmd: "model", args: "[name]", hint: "Choose model and reasoning effort", kind: .builtin),
            .init(cmd: "fast", hint: "Toggle GPT-5.4 fast tier", kind: .builtin),
            .init(cmd: "plan", args: "[task]", hint: "Plan before editing", kind: .builtin),
            .init(cmd: "approvals", hint: "What Codex may do unattended", kind: .builtin),
            .init(cmd: "status", hint: "Runtime and auth", kind: .builtin),
            .init(cmd: "diff", hint: "Show uncommitted changes", kind: .builtin),
            .init(cmd: "undo", hint: "Revert last Codex turn", kind: .builtin),
            .init(cmd: "review", hint: "Review the current diff", kind: .builtin),
            .init(cmd: "mcp", hint: "MCP servers", kind: .builtin),
            .init(cmd: "skills", hint: "Enabled skills", kind: .builtin),
            .init(cmd: "init", hint: "Write AGENTS.md", kind: .builtin),
            .init(cmd: "help", hint: "List Codex commands", kind: .builtin),
        ],
        "cursor": [
            .init(cmd: "clear", hint: "Reset the agent thread", kind: .builtin),
            .init(cmd: "compress", hint: "Compress context", kind: .builtin),
            .init(cmd: "model", args: "[name]", hint: "Switch Composer / frontier model", kind: .builtin),
            .init(cmd: "plan", args: "[task]", hint: "Read-only plan mode", kind: .builtin),
            .init(cmd: "ask", args: "[q]", hint: "Q&A, no edits", kind: .builtin),
            .init(cmd: "mode", args: "[agent|plan|ask]", hint: "Set agent mode", kind: .builtin),
            .init(cmd: "rules", hint: "Project rules", kind: .builtin),
            .init(cmd: "mcp", hint: "MCP connectors", kind: .builtin),
            .init(cmd: "skills", hint: "Enabled skills", kind: .builtin),
            .init(cmd: "apply", hint: "Apply pending diffs", kind: .builtin),
            .init(cmd: "help", hint: "List Cursor commands", kind: .builtin),
        ],
        "grok": [
            .init(cmd: "clear", hint: "New conversation", kind: .builtin),
            .init(cmd: "compact", hint: "Summarize history", kind: .builtin),
            .init(cmd: "model", args: "[name]", hint: "Switch Grok model", kind: .builtin),
            .init(cmd: "effort", args: "[level]", hint: "low / medium / high", kind: .builtin),
            .init(cmd: "plan", args: "[task]", hint: "Plan first", kind: .builtin),
            .init(cmd: "mcp", hint: "Connectors", kind: .builtin),
            .init(cmd: "skills", hint: "Enabled skills", kind: .builtin),
            .init(cmd: "help", hint: "List Grok commands", kind: .builtin),
        ],
    ]

    static let genericSlash: [SlashCmd] = [
        .init(cmd: "clear", hint: "New conversation", kind: .builtin),
        .init(cmd: "compact", hint: "Summarize history", kind: .builtin),
        .init(cmd: "model", args: "[name]", hint: "Switch model", kind: .builtin),
        .init(cmd: "effort", args: "[level]", hint: "low / medium / high", kind: .builtin),
        .init(cmd: "skills", hint: "Enabled skills", kind: .builtin),
        .init(cmd: "mcp", hint: "Connectors", kind: .builtin),
        .init(cmd: "help", hint: "List commands", kind: .builtin),
    ]

    static let busSlash: [SlashCmd] = [
        .init(cmd: "agents", hint: "List other sessions on this desk", kind: .builtin),
        .init(cmd: "msg", args: "<session> <text>", hint: "Message another WestCode session", kind: .builtin),
    ]

    static let genericEffort: [EffortOpt] = [
        .init(id: "low", label: "Low", hint: "Faster"),
        .init(id: "medium", label: "Medium", hint: "Default"),
        .init(id: "high", label: "High", hint: "Deeper"),
    ]

    static func isBuiltin(_ id: String) -> Bool {
        ["claude", "codex", "cursor", "grok"].contains(id)
    }

    static func modelsFor(_ id: String, extras: [String] = []) -> [ModelOpt] {
        if let m = models[id] { return m }
        return extras.map { ModelOpt(id: $0, label: $0) }
    }

    static func effortsFor(_ id: String) -> [EffortOpt] {
        efforts[id] ?? genericEffort
    }

    static func defaultEffortFor(_ id: String) -> String {
        defaultEffort[id] ?? "medium"
    }

    static func slashFor(_ id: String) -> [SlashCmd] {
        let base = slash[id] ?? genericSlash
        let help = base.filter { $0.cmd == "help" }
        let rest = base.filter { $0.cmd != "help" }
        return rest + busSlash + help
    }

    static func filterSlash(_ id: String, query: String) -> [SlashCmd] {
        let q = query.trimmingCharacters(in: CharacterSet(charactersIn: "/")).lowercased()
        return slashFor(id).filter { $0.cmd.hasPrefix(q) || $0.hint.lowercased().contains(q) }
    }

    static func matchModel(_ id: String, query: String, extras: [String] = []) -> ModelOpt? {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return nil }
        let list = modelsFor(id, extras: extras)
        return list.first { $0.id.lowercased() == q }
            ?? list.first { $0.label.lowercased() == q }
            ?? list.first { $0.id.lowercased().contains(q) || $0.label.lowercased().contains(q) }
    }

    static func matchEffort(_ id: String, query: String) -> EffortOpt? {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return nil }
        let list = effortsFor(id)
        return list.first { $0.id.lowercased() == q }
            ?? list.first { $0.label.lowercased() == q }
            ?? list.first { $0.id.lowercased().contains(q) || $0.label.lowercased().contains(q) }
    }

    static func effortLabel(_ id: String, effort: String) -> String {
        effortsFor(id).first { $0.id == effort }?.label ?? effort
    }
}
