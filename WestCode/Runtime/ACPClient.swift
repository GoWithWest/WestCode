import Foundation

/// JSON-RPC 2.0 ACP client over stdio.
/// Talks to `claude --acp`, `codex acp`, `agent acp`, `grok acp`.
/// Accepts both NDJSON (one object per line) and LSP-style Content-Length framing.
final class ACPClient {
    struct Capabilities {
        var fsRead = true
        var fsWrite = true
    }

    enum ACPError: LocalizedError {
        case notRunning
        case binaryMissing(String)
        case rpc(String)
        case cancelled
        var errorDescription: String? {
            switch self {
            case .notRunning: return "Agent process is not running."
            case .binaryMissing(let b): return "Could not find `\(b)` on PATH. Install the CLI and try again."
            case .rpc(let m): return m
            case .cancelled: return "Cancelled."
            }
        }
    }

    private var process: Process?
    private var stdin: FileHandle?
    private let stdoutPipe = Pipe()
    private let stderrPipe = Pipe()
    private var buffer = Data()
    private var nextId = 1
    private var pending: [Int: CheckedContinuation<[String: Any], Error>] = [:]
    private let lock = NSLock()
    private var onSessionUpdate: (([String: Any]) -> Void)?
    var sessionId: String?

    func start(binary: String, arguments: [String], extraPATH: [String] = []) throws {
        guard let url = which(binary, extra: extraPATH) else {
            throw ACPError.binaryMissing(binary)
        }
        let proc = Process()
        proc.executableURL = url
        proc.arguments = arguments
        var env = ProcessInfo.processInfo.environment
        let extras = extraPATH + defaultPathExtras()
        if let path = env["PATH"] {
            env["PATH"] = extras.joined(separator: ":") + ":" + path
        }
        proc.environment = env
        let inPipe = Pipe()
        proc.standardInput = inPipe
        proc.standardOutput = stdoutPipe
        proc.standardError = stderrPipe
        stdoutPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            if data.isEmpty { return }
            self?.consume(data)
        }
        try proc.run()
        process = proc
        stdin = inPipe.fileHandleForWriting
    }

    func stop() {
        stdoutPipe.fileHandleForReading.readabilityHandler = nil
        process?.terminate()
        process = nil
        stdin = nil
        lock.lock()
        let waiting = pending
        pending.removeAll()
        lock.unlock()
        for (_, c) in waiting { c.resume(throwing: ACPError.cancelled) }
    }

    deinit { stop() }

    func initialize() async throws -> [String: Any] {
        try await request("initialize", params: [
            "protocolVersion": 1,
            "clientInfo": ["name": "WestCode", "version": "1.0.0"],
            "capabilities": [
                "fs": ["readTextFile": true, "writeTextFile": true],
            ],
        ])
    }

    func newSession(cwd: String, mcpServers: [[String: Any]] = []) async throws -> String {
        let result = try await request("session/new", params: [
            "cwd": cwd,
            "mcpServers": mcpServers,
        ])
        let id = (result["sessionId"] as? String) ?? UUID().uuidString
        sessionId = id
        return id
    }

    func prompt(sessionId: String, text: String, onUpdate: @escaping ([String: Any]) -> Void) async throws {
        onSessionUpdate = onUpdate
        defer { onSessionUpdate = nil }
        _ = try await request("session/prompt", params: [
            "sessionId": sessionId,
            "prompt": [["type": "text", "text": text]],
        ])
    }

    func cancel(sessionId: String) {
        notify("session/cancel", params: ["sessionId": sessionId])
    }

    // MARK: - IO

    private func request(_ method: String, params: [String: Any]) async throws -> [String: Any] {
        let id = nextId
        nextId += 1
        return try await withCheckedThrowingContinuation { cont in
            lock.lock()
            pending[id] = cont
            lock.unlock()
            write(["jsonrpc": "2.0", "id": id, "method": method, "params": params])
        }
    }

    private func notify(_ method: String, params: [String: Any]) {
        write(["jsonrpc": "2.0", "method": method, "params": params])
    }

    private func reply(id: Any, result: Any) {
        write(["jsonrpc": "2.0", "id": id, "result": result])
    }

    private func write(_ obj: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: obj), let stdin else { return }
        var line = data
        line.append(0x0A)
        stdin.write(line)
    }

    private func consume(_ data: Data) {
        buffer.append(data)
        while let msg = popMessage() {
            handle(msg)
        }
    }

    private func popMessage() -> [String: Any]? {
        if let headerRange = buffer.range(of: Data("Content-Length:".utf8)) {
            if let sep = buffer.range(of: Data("\r\n\r\n".utf8), in: headerRange.lowerBound..<buffer.endIndex)
                ?? buffer.range(of: Data("\n\n".utf8), in: headerRange.lowerBound..<buffer.endIndex) {
                let header = String(data: buffer[headerRange.lowerBound..<sep.lowerBound], encoding: .utf8) ?? ""
                let len = header.split(separator: ":").last.flatMap { Int($0.trimmingCharacters(in: .whitespacesAndNewlines)) } ?? 0
                let start = sep.upperBound
                if buffer.distance(from: start, to: buffer.endIndex) >= len {
                    let payload = buffer.subdata(in: start..<buffer.index(start, offsetBy: len))
                    buffer.removeSubrange(buffer.startIndex..<buffer.index(start, offsetBy: len))
                    return (try? JSONSerialization.jsonObject(with: payload)) as? [String: Any]
                }
            }
            return nil
        }
        if let nl = buffer.firstIndex(of: 0x0A) {
            let line = buffer.subdata(in: buffer.startIndex..<nl)
            buffer.removeSubrange(buffer.startIndex...nl)
            let trimmed = line.filter { $0 != 0x0D }
            if trimmed.isEmpty { return popMessage() }
            return (try? JSONSerialization.jsonObject(with: Data(trimmed))) as? [String: Any]
        }
        return nil
    }

    private func handle(_ msg: [String: Any]) {
        if let id = msg["id"] as? Int, msg["method"] == nil {
            lock.lock()
            let cont = pending.removeValue(forKey: id)
            lock.unlock()
            if let err = msg["error"] as? [String: Any] {
                let text = (err["message"] as? String) ?? "ACP error"
                cont?.resume(throwing: ACPError.rpc(text))
            } else {
                cont?.resume(returning: (msg["result"] as? [String: Any]) ?? [:])
            }
            return
        }
        if let method = msg["method"] as? String {
            let params = msg["params"] as? [String: Any] ?? [:]
            if method == "session/update" {
                onSessionUpdate?(params)
                return
            }
            if let id = msg["id"] {
                handleClientMethod(method, params: params, id: id)
            }
        }
    }

    private func handleClientMethod(_ method: String, params: [String: Any], id: Any) {
        switch method {
        case "fs/read_text_file":
            let path = params["path"] as? String ?? ""
            if let text = try? String(contentsOfFile: path, encoding: .utf8) {
                reply(id: id, result: ["content": text])
            } else {
                write(["jsonrpc": "2.0", "id": id, "error": ["code": -32000, "message": "Unable to read \(path)"]])
            }
        case "fs/write_text_file":
            let path = params["path"] as? String ?? ""
            let content = params["content"] as? String ?? ""
            do {
                try FileManager.default.createDirectory(
                    at: URL(fileURLWithPath: path).deletingLastPathComponent(),
                    withIntermediateDirectories: true
                )
                try content.write(toFile: path, atomically: true, encoding: .utf8)
                reply(id: id, result: [:])
            } catch {
                write(["jsonrpc": "2.0", "id": id, "error": ["code": -32000, "message": error.localizedDescription]])
            }
        default:
            write(["jsonrpc": "2.0", "id": id, "error": ["code": -32601, "message": "Method not found: \(method)"]])
        }
    }

    static func extractText(from update: [String: Any]) -> String {
        let u = (update["update"] as? [String: Any]) ?? update
        let kind = (u["sessionUpdate"] as? String) ?? (u["session_update"] as? String) ?? ""
        if kind == "agent_message_chunk" || kind == "agent_thought_chunk" {
            if let content = u["content"] as? [String: Any], let text = content["text"] as? String {
                if kind == "agent_thought_chunk" { return "<think>\(text)</think>" }
                return text
            }
            if let text = u["text"] as? String { return text }
        }
        if kind == "tool_call" {
            let name = (u["title"] as? String) ?? (u["toolName"] as? String) ?? (u["kind"] as? String) ?? "Tool"
            let path = (u["locations"] as? [[String: Any]])?.first?["path"] as? String
            let raw = (u["rawInput"] as? [String: Any])
            let command = raw?["command"] as? String
            let content = (u["content"] as? String) ?? ""
            var attrs = "name=\"\(name)\""
            if let path { attrs += " path=\"\(path)\"" }
            if let command { attrs += " command=\"\(command)\"" }
            return "<tool \(attrs)>\(content)</tool>"
        }
        if let text = u["text"] as? String { return text }
        return ""
    }

    private func which(_ binary: String, extra: [String]) -> URL? {
        if binary.contains("/") {
            let u = URL(fileURLWithPath: NSString(string: binary).expandingTildeInPath)
            return FileManager.default.isExecutableFile(atPath: u.path) ? u : nil
        }
        let path = ProcessInfo.processInfo.environment["PATH"] ?? ""
        let parts = extra + defaultPathExtras() + path.split(separator: ":").map(String.init)
        var seen = Set<String>()
        for dir in parts where seen.insert(dir).inserted {
            let candidate = URL(fileURLWithPath: dir).appendingPathComponent(binary)
            if FileManager.default.isExecutableFile(atPath: candidate.path) { return candidate }
        }
        return nil
    }

    private func defaultPathExtras() -> [String] {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        return [
            "/opt/homebrew/bin",
            "/usr/local/bin",
            "\(home)/.local/bin",
            "\(home)/.npm-global/bin",
            "\(home)/.nvm/current/bin",
            "/opt/homebrew/opt/node/bin",
        ]
    }
}
