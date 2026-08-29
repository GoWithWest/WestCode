import AppKit
import UniformTypeIdentifiers

enum FilePicking {
    static let maxFiles = 8
    static let maxText = 80_000

    @MainActor
    static func pickFiles() -> [Attachment] {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = true
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.allowedContentTypes = [.item]
        panel.message = "Attach files to this WestCode session"
        guard panel.runModal() == .OK else { return [] }
        return panel.urls.prefix(maxFiles).compactMap(readURL)
    }

    @MainActor
    static func pickDirectory() -> URL? {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.canCreateDirectories = true
        panel.message = "Choose a project folder"
        panel.prompt = "Open"
        guard panel.runModal() == .OK else { return nil }
        return panel.url
    }

    @MainActor
    static func pickExecutable() -> URL? {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.message = "Choose the provider CLI binary"
        panel.prompt = "Select"
        guard panel.runModal() == .OK else { return nil }
        return panel.url
    }

    static func readURL(_ url: URL) -> Attachment? {
        let name = url.lastPathComponent
        let ext = url.pathExtension.lowercased()
        let imageExt = Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"])
        let textExt = Set([
            "swift", "ts", "tsx", "js", "jsx", "json", "md", "txt", "css", "html", "py", "rs",
            "go", "rb", "sh", "yml", "yaml", "toml", "xml", "sql", "kt", "java", "c", "h", "cpp",
            "m", "mm", "gradle", "plist", "entitlements", "pbxproj",
        ])
        guard let data = try? Data(contentsOf: url) else { return nil }
        if imageExt.contains(ext) {
            return Attachment(id: UID.make("att"), name: name, size: data.count, mime: "image/\(ext)", kind: .image, text: nil)
        }
        if textExt.contains(ext) || (data.count < maxText && String(data: data, encoding: .utf8) != nil) {
            var text = String(data: data, encoding: .utf8)
            if let t = text, t.count > maxText { text = String(t.prefix(maxText)) + "\n…truncated" }
            return Attachment(id: UID.make("att"), name: name, size: data.count, mime: "text/plain", kind: .text, text: text)
        }
        return Attachment(id: UID.make("att"), name: name, size: data.count, mime: "application/octet-stream", kind: .binary, text: nil)
    }

    static func formatOutgoing(_ text: String, _ attachments: [Attachment]) -> String {
        var parts: [String] = []
        if !text.isEmpty { parts.append(text) }
        for a in attachments {
            if let body = a.text, a.kind == .text {
                parts.append("<attached name=\"\(a.name)\">\n\(body)\n</attached>")
            } else {
                parts.append("<attached name=\"\(a.name)\" kind=\"\(a.kind.rawValue)\" size=\"\(a.size)\" />")
            }
        }
        return parts.joined(separator: "\n\n")
    }

    static func language(for url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "swift": return "Swift"
        case "ts", "tsx": return "TypeScript"
        case "js", "jsx": return "JavaScript"
        case "go": return "Go"
        case "rs": return "Rust"
        case "py": return "Python"
        default:
            if FileManager.default.fileExists(atPath: url.appendingPathComponent("Package.swift").path) { return "Swift" }
            if FileManager.default.fileExists(atPath: url.appendingPathComponent("package.json").path) { return "TypeScript" }
            if FileManager.default.fileExists(atPath: url.appendingPathComponent("go.mod").path) { return "Go" }
            if FileManager.default.fileExists(atPath: url.appendingPathComponent("Cargo.toml").path) { return "Rust" }
            return "Mixed"
        }
    }

    static func expandHome(_ path: String) -> String {
        if path.hasPrefix("~/") {
            return (FileManager.default.homeDirectoryForCurrentUser.path as NSString)
                .appendingPathComponent(String(path.dropFirst(2)))
        }
        return path
    }

    static func prettyPath(_ path: String) -> String {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        if path.hasPrefix(home) {
            return "~" + path.dropFirst(home.count)
        }
        return path
    }
}
