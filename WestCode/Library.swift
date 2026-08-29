import Foundation

enum AddonKind: String, Codable, CaseIterable {
    case skill, plugin, connector
}

struct Addon: Identifiable, Hashable, Codable {
    var id: String
    var kind: AddonKind
    var name: String
    var source: String
    var repo: String
    var summary: String
    var providers: [String]
    var install: String
    var custom: Bool?
}

enum LibraryCatalog {
    static let key = "helix-library-v1"
    static let defaultEnabled = [
        "skill-pdf", "skill-code-review", "skill-frontend-design", "mcp-github", "mcp-filesystem",
    ]

    static let all: [Addon] = [
        .init(id: "skill-pdf", kind: .skill, name: "PDF", source: "Anthropic", repo: "anthropics/skills",
              summary: "Extract and generate PDFs from the working tree.",
              providers: ["claude", "codex", "cursor", "grok"],
              install: "/plugin install document-skills@anthropic-agent-skills"),
        .init(id: "skill-pptx", kind: .skill, name: "PowerPoint", source: "Anthropic", repo: "anthropics/skills",
              summary: "Read and write PPTX decks.",
              providers: ["claude", "codex", "cursor"],
              install: "/plugin install document-skills@anthropic-agent-skills"),
        .init(id: "skill-xlsx", kind: .skill, name: "Excel", source: "Anthropic", repo: "anthropics/skills",
              summary: "Spreadsheet read/write and formulas.",
              providers: ["claude", "codex", "cursor"],
              install: "/plugin install document-skills@anthropic-agent-skills"),
        .init(id: "skill-docx", kind: .skill, name: "Word", source: "Anthropic", repo: "anthropics/skills",
              summary: "DOCX authoring with tracked structure.",
              providers: ["claude", "codex"],
              install: "/plugin install document-skills@anthropic-agent-skills"),
        .init(id: "skill-frontend-design", kind: .skill, name: "Frontend design", source: "Anthropic", repo: "anthropics/skills",
              summary: "Distinctive UI — type, color, motion — not template slop.",
              providers: ["claude", "cursor", "grok"],
              install: "/plugin install example-skills@anthropic-agent-skills"),
        .init(id: "skill-webapp-testing", kind: .skill, name: "Webapp testing", source: "Anthropic", repo: "anthropics/skills",
              summary: "Playwright flows, console, and visual checks.",
              providers: ["claude", "codex", "cursor"],
              install: "/plugin install example-skills@anthropic-agent-skills"),
        .init(id: "skill-mcp-builder", kind: .skill, name: "MCP builder", source: "Anthropic", repo: "anthropics/skills",
              summary: "Scaffold and evaluate MCP servers.",
              providers: ["claude", "codex"],
              install: "/plugin install example-skills@anthropic-agent-skills"),
        .init(id: "skill-skill-creator", kind: .skill, name: "Skill creator", source: "Anthropic", repo: "anthropics/skills",
              summary: "Author a SKILL.md the agent can load.",
              providers: ["claude", "codex", "cursor", "grok"],
              install: "/plugin install example-skills@anthropic-agent-skills"),
        .init(id: "skill-code-review", kind: .skill, name: "Code review", source: "Anthropic", repo: "anthropics/skills",
              summary: "Review diffs and PRs. Maps to /code-review.",
              providers: ["claude", "codex", "cursor"],
              install: "bundled · /code-review"),
        .init(id: "skill-debug", kind: .skill, name: "Debug", source: "Anthropic", repo: "anthropics/skills",
              summary: "Focused debugging pass with extra logging.",
              providers: ["claude"],
              install: "bundled · /debug"),
        .init(id: "plugin-document-skills", kind: .plugin, name: "Document skills", source: "Anthropic", repo: "anthropics/skills",
              summary: "PDF / PPTX / XLSX / DOCX as a Claude Code plugin.",
              providers: ["claude"],
              install: "/plugin marketplace add anthropics/skills"),
        .init(id: "plugin-example-skills", kind: .plugin, name: "Example skills", source: "Anthropic", repo: "anthropics/skills",
              summary: "Frontend design, MCP builder, webapp testing.",
              providers: ["claude"],
              install: "/plugin install example-skills@anthropic-agent-skills"),
        .init(id: "plugin-knowledge-finance", kind: .plugin, name: "Finance", source: "Anthropic",
              repo: "anthropics/knowledge-work-plugins",
              summary: "Knowledge-work plugin: models, connectors, slash commands.",
              providers: ["claude"],
              install: "claude plugin marketplace add anthropics/knowledge-work-plugins"),
        .init(id: "plugin-knowledge-research", kind: .plugin, name: "Research", source: "Anthropic",
              repo: "anthropics/knowledge-work-plugins",
              summary: "Deep research workflow with cited synthesis.",
              providers: ["claude"],
              install: "claude plugin marketplace add anthropics/knowledge-work-plugins"),
        .init(id: "plugin-community", kind: .plugin, name: "Community skills pack", source: "Community",
              repo: "alirezarezvani/claude-skills",
              summary: "Large community pack — also loads in Codex, Cursor, Gemini.",
              providers: ["claude", "codex", "cursor"],
              install: "/plugin marketplace add alirezarezvani/claude-skills"),
        .init(id: "mcp-github", kind: .connector, name: "GitHub", source: "GitHub", repo: "github/github-mcp-server",
              summary: "PRs, issues, checks. Tools namespace as /mcp__github__*.",
              providers: ["claude", "codex", "cursor", "grok"],
              install: "MCP · stdio github-mcp-server"),
        .init(id: "mcp-linear", kind: .connector, name: "Linear", source: "Linear", repo: "linear/linear-mcp",
              summary: "Issues, projects, cycles.",
              providers: ["claude", "cursor", "codex"],
              install: "MCP · Linear OAuth"),
        .init(id: "mcp-notion", kind: .connector, name: "Notion", source: "Notion", repo: "makenotion/notion-mcp-server",
              summary: "Pages, databases, comments.",
              providers: ["claude", "codex", "cursor", "grok"],
              install: "MCP · Notion integration"),
        .init(id: "mcp-slack", kind: .connector, name: "Slack", source: "Slack", repo: "modelcontextprotocol/servers",
              summary: "Channels, threads, search.",
              providers: ["claude", "cursor"],
              install: "MCP · Slack bot token"),
        .init(id: "mcp-postgres", kind: .connector, name: "Postgres", source: "MCP", repo: "modelcontextprotocol/servers",
              summary: "Read-only SQL against a database URL.",
              providers: ["claude", "codex", "cursor", "grok"],
              install: "MCP · DATABASE_URL"),
        .init(id: "mcp-sentry", kind: .connector, name: "Sentry", source: "Sentry", repo: "getsentry/sentry-mcp",
              summary: "Issues, stack traces, releases.",
              providers: ["claude", "codex", "cursor"],
              install: "MCP · Sentry auth token"),
        .init(id: "mcp-figma", kind: .connector, name: "Figma", source: "Figma", repo: "figma/mcp-server-guide",
              summary: "File structure, components, variables.",
              providers: ["claude", "cursor"],
              install: "MCP · Figma Dev Mode"),
        .init(id: "mcp-stripe", kind: .connector, name: "Stripe", source: "Stripe", repo: "stripe/agent-toolkit",
              summary: "Customers, invoices, payment intents.",
              providers: ["claude", "codex"],
              install: "MCP · Stripe restricted key"),
        .init(id: "mcp-playwright", kind: .connector, name: "Playwright", source: "Microsoft", repo: "microsoft/playwright-mcp",
              summary: "Drive a real browser from the agent.",
              providers: ["claude", "codex", "cursor", "grok"],
              install: "npx @playwright/mcp"),
        .init(id: "mcp-filesystem", kind: .connector, name: "Filesystem", source: "MCP", repo: "modelcontextprotocol/servers",
              summary: "Scoped file tools outside the project cwd.",
              providers: ["claude", "codex", "cursor", "grok"],
              install: "MCP · stdio filesystem"),
    ]

    static func combined(custom: [Addon]) -> [Addon] { all + custom }
}
