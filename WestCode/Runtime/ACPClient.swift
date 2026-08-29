import Foundation

/// JSON-RPC 2.0 ACP client over stdio (NDJSON + Content-Length).
/// Talks to `claude --acp`, `codex acp`, `agent acp`, `grok acp`.
final class ACPClient {
    enum ACPError: LocalizedError {
        case notRunning
        case binaryMissing(String)
        case rpc(String)
        case cancelled
        case timeout(String)
        case exited(Int32, String)

        var errorDescription: String? {
            switch self {
            case .notRunning: return "Agent process is not running."
            case .binaryMissing(let b): return "Could not find `\(b)` on PATH. Install the CLI and try again."
            case .rpc(let m): return m
            case .cancelled: return "Cancelled."
            case .timeout(let extra):
                let tail = extra.trimmingCharacters(in: .whitespacesAndNewlines)
                if tail.isEmpty { return "The agent did not respond in time. Check that the CLI is logged in (`claude login` / `codex login`)." }
                return "The agent did not respond in time.\n\n\(tail)"
            case .exited(let code, let extra):
                let tail = extra.trimmingCharacters(in: .whitespacesAndNewlines)
                if tail.isEmpty { return "Agent exited (\(code)). If this is Claude/Codex/Cursor, run the CLI login in Terminal." }
                return "Agent exited (\(code)).\n\n\(tail)"
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
    private var stderrBytes = Data()
    var sessionId: String?
    var lastStderr: String {
        String(data: stderrBytes.suffix(4000), encoding: .utf8) ?? ""
    }

    func start(binary: String, arguments: [String], extraPATH: [String] = [], cwd: String? = nil) throws {
        guard let url = which(binary, extra: extraPATH) else {
            throw ACPError.binaryMissing(binary)
        }
        let proc = Process()
        proc.executableURL = url
        proc.arguments = arguments
        if let cwd, !cwd.isEmpty {
            let expanded = BinaryProbe.expandHome(cwd)
            if FileManager.default.fileExists(atPath: expanded) {
                proc.currentDirectoryURL = URL(fileURLWithPath: expanded)
            }
        }
        var env = ProcessInfo.processInfo.environment
        let extras = extraPATH + defaultPathExtras()
        let path = env["PATH"] ?? "/usr/bin:/bin"
        env["PATH"] = extras.joined(separator: ":") + ":" + path
        env["NO_COLOR"] = "1"
        env["TERM"] = "dumb"
        proc.environment = env
        let inPipe = Pipe()
        proc.standardInput = inPipe
        proc.standardOutput = stdoutPipe
        proc.standardError = stderrPipe
        stdoutPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            if data.isEmpty {
                // EOF or a spurious empty read. Never touch terminationStatus here —
                // NSTask throws if the child is still running (stdout can close first).
                handle.readabilityHandler = nil
                return
            }
            self?.consume(data)
        }
        stderrPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty else {
                handle.readabilityHandler = nil
                return
            }
            self?.lock.lock()
            self?.stderrBytes.append(data)
            if let s = self, s.stderrBytes.count > 16_000 {
                s.stderrBytes = s.stderrBytes.suffix(8_000)
            }
            self?.lock.unlock()
        }
        proc.terminationHandler = { [weak self] p in
            self?.failAll(.exited(p.terminationStatus, self?.lastStderr ?? ""))
        }
        try proc.run()
        process = proc
        stdin = inPipe.fileHandleForWriting
    }

    func stop() {
        stdoutPipe.fileHandleForReading.readabilityHandler = nil
        stderrPipe.fileHandleForReading.readabilityHandler = nil
        stdin = nil
        let proc = process
        process = nil
        proc?.terminationHandler = nil
        if let proc, proc.isRunning {
            proc.terminate()
        }
        failAll(.cancelled)
    }

    deinit { stop() }

    func initialize() async throws -> [String: Any] {
        try await request("initialize", params: [
            "protocolVersion": 1,
            "clientInfo": [
                "name": "westcode",
                "title": "WestCode",
                "version": "1.0.0",
            ],
            "clientCapabilities": [
                "fs": ["readTextFile": true, "writeTextFile": true],
                "terminal": false,
            ],
        ], timeout: 20)
    }

    func newSession(cwd: String, mcpServers: [[String: Any]] = []) async throws -> String {
        let abs = (cwd as NSString).isAbsolutePath ? cwd : BinaryProbe.expandHome(cwd)
        let result = try await request("session/new", params: [
            "cwd": abs,
            "mcpServers": mcpServers,
        ], timeout: 20)
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
        ], timeout: 180)
    }

    func cancel(sessionId: String) {
        notify("session/cancel", params: ["sessionId": sessionId])
    }

    // MARK: - IO

    private func request(_ method: String, params: [String: Any], timeout: TimeInterval) async throws -> [String: Any] {
        try await withThrowingTaskGroup(of: [String: Any].self) { group in
            group.addTask { try await self.rawRequest(method, params: params) }
            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
                self.failAll(.timeout(self.lastStderr))
                throw ACPError.timeout(self.lastStderr)
            }
            let value = try await group.next()!
            group.cancelAll()
            return value
        }
    }

    private func rawRequest(_ method: String, params: [String: Any]) async throws -> [String: Any] {
        let id: Int = {
            lock.lock()
            let n = nextId
            nextId += 1
            lock.unlock()
            return n
        }()
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
        lock.lock()
        let handle = stdin
        lock.unlock()
        guard let data = try? JSONSerialization.data(withJSONObject: obj), let handle else { return }
        var line = data
        line.append(0x0A)
        handle.write(line)
    }

    private func consume(_ data: Data) {
        lock.lock()
        buffer.append(data)
        lock.unlock()
        while let msg = popMessage() {
            handle(msg)
        }
    }

    private func popMessage() -> [String: Any]? {
        lock.lock()
        defer { lock.unlock() }
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
        guard let nl = buffer.firstIndex(of: 0x0A) else { return nil }
        while let nl = buffer.firstIndex(of: 0x0A) {
            let line = buffer.subdata(in: buffer.startIndex..<nl)
            buffer.removeSubrange(buffer.startIndex...nl)
            let trimmed = Data(line.filter { $0 != 0x0D })
            if trimmed.isEmpty { continue }
            if let obj = try? JSONSerialization.jsonObject(with: trimmed) as? [String: Any] {
                return obj
            }
        }
        return nil
    }

    private func handle(_ msg: [String: Any]) {
        if msg["method"] == nil, let id = jsonId(msg["id"]) {
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
        case "session/request_permission":
            let options = params["options"] as? [[String: Any]] ?? []
            let allow = options.first(where: {
                let kind = ($0["kind"] as? String ?? "").lowercased()
                let oid = ($0["optionId"] as? String ?? "").lowercased()
                return kind.contains("allow") || oid.contains("allow")
            })
            let optionId = (allow?["optionId"] as? String) ?? (options.first?["optionId"] as? String) ?? "allow-once"
            reply(id: id, result: [
                "outcome": ["outcome": "selected", "optionId": optionId],
            ])
        case "fs/read_text_file":
            let path = BinaryProbe.expandHome(params["path"] as? String ?? "")
            if let text = try? String(contentsOfFile: path, encoding: .utf8) {
                reply(id: id, result: ["content": text])
            } else {
                write(["jsonrpc": "2.0", "id": id, "error": ["code": -32000, "message": "Unable to read \(path)"]])
            }
        case "fs/write_text_file":
            let path = BinaryProbe.expandHome(params["path"] as? String ?? "")
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

    private func failAll(_ error: ACPError) {
        lock.lock()
        let waiting = pending
        pending.removeAll()
        lock.unlock()
        for (_, c) in waiting { c.resume(throwing: error) }
    }

    private func jsonId(_ raw: Any?) -> Int? {
        if let i = raw as? Int { return i }
        if let n = raw as? NSNumber { return n.intValue }
        if let s = raw as? String { return Int(s) }
        return nil
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
        if kind == "tool_call" || kind == "tool_call_update" {
            let name = (u["title"] as? String) ?? (u["toolName"] as? String) ?? (u["kind"] as? String) ?? "Tool"
            let path = (u["locations"] as? [[String: Any]])?.first?["path"] as? String
            let raw = (u["rawInput"] as? [String: Any])
            let command = raw?["command"] as? String
            var content = ""
            if let blocks = u["content"] as? [[String: Any]] {
                content = blocks.compactMap { $0["text"] as? String }.joined(separator: "\n")
            } else if let s = u["content"] as? String {
                content = s
            }
            var attrs = "name=\"\(name)\""
            if let path { attrs += " path=\"\(path)\"" }
            if let command { attrs += " command=\"\(command)\"" }
            return "<tool \(attrs)>\(content)</tool>"
        }
        if let text = u["text"] as? String { return text }
        return ""
    }

    private func which(_ binary: String, extra: [String]) -> URL? {
        BinaryProbe.locate(binary) ?? {
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
        }()
    }

    private func defaultPathExtras() -> [String] {
        BinaryProbe.extras()
    }
}
