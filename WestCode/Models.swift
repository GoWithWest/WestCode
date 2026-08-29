import Foundation

enum SessionStatus: String, Codable, Hashable {
    case running, waiting, idle, error
}

enum LayoutView: String, Hashable {
    case mosaic, focus, split, providers, library
}

enum AuthKind: String, Codable {
    case subscription, api
}

struct Attachment: Identifiable, Hashable, Codable {
    var id: String
    var name: String
    var size: Int
    var mime: String
    var kind: Kind
    var text: String?

    enum Kind: String, Codable { case text, image, binary }
}

enum Block: Hashable, Codable {
    case text(String)
    case think(String)
    case tool(ToolBlock)

    struct ToolBlock: Hashable, Codable {
        var name: String
        var path: String? = nil
        var command: String? = nil
        var to: String? = nil
        var content: String
        var status: ToolStatus
    }

    enum ToolStatus: String, Codable { case running, done, error }
}

struct ChatMessage: Identifiable, Hashable, Codable {
    var id: String
    var role: Role
    var createdAt: Date
    var blocks: [Block]
    var raw: String? = nil
    var streaming: Bool = false
    var attachments: [Attachment]? = nil
    var fromSessionId: String? = nil
    var fromProviderId: String? = nil
    var fromTitle: String? = nil
    var hop: Int? = nil

    enum Role: String, Codable { case user, assistant, system, agent }
}

struct Project: Identifiable, Hashable {
    var id: String
    var name: String
    var path: String
    var language: String
    var hint: String
    var custom: Bool = false
}

struct Session: Identifiable, Hashable, Codable {
    var id: String
    var title: String
    var providerId: String
    var projectId: String
    var cwd: String
    var model: String
    var effort: String
    var status: SessionStatus
    var createdAt: Date
    var updatedAt: Date
    var messages: [ChatMessage]
    var turns: Int
    var acpSessionId: String? = nil
}

struct AgentRosterItem: Identifiable, Hashable {
    var id: String
    var title: String
    var providerId: String
    var provider: String
    var cwd: String
    var model: String
    var status: SessionStatus
}

struct RecentFolder: Identifiable, Hashable, Codable {
    var id: String { path }
    var name: String
    var path: String
    var language: String
    var hint: String
}

struct Incoming: Hashable {
    var fromSessionId: String
    var fromProviderId: String
    var fromTitle: String
    var hop: Int
}

enum Projects {
    static let all: [Project] = [
        .init(id: "harbor", name: "harbor", path: "~/src/harbor", language: "TypeScript", hint: "Checkout, auth, Playwright"),
        .init(id: "lumen", name: "lumen-api", path: "~/src/lumen-api", language: "Go", hint: "Payments service"),
        .init(id: "atlas", name: "atlas", path: "~/src/atlas", language: "Rust", hint: "CLI + TUI"),
        .init(id: "scratch", name: "scratch", path: "~/scratch", language: "Mixed", hint: "Unbound session"),
    ]

    static func byId(_ id: String) -> Project {
        all.first { $0.id == id } ?? all[3]
    }
}

enum UID {
    static func make(_ prefix: String) -> String {
        let n = UInt64.random(in: 0x100000...0xFFFFFF)
        return "\(prefix)-\(String(n, radix: 16))"
    }
}

enum RelTime {
    static func format(_ date: Date, now: Date = Date()) -> String {
        let s = now.timeIntervalSince(date)
        if s < 45 { return "just now" }
        if s < 3600 { return "\(Int(s / 60))m" }
        if s < 86_400 { return "\(Int(s / 3600))h" }
        return "\(Int(s / 86_400))d"
    }
}

enum Pretty {
    static func size(_ n: Int) -> String {
        if n < 1024 { return "\(n) B" }
        if n < 1024 * 1024 { return String(format: "%.1f KB", Double(n) / 1024) }
        return String(format: "%.1f MB", Double(n) / (1024 * 1024))
    }
}
