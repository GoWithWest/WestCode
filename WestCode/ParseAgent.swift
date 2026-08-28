import Foundation

enum ParseAgent {
    static func parse(_ raw: String) -> [Block] {
        var thinks: [String] = []
        let thinkRe = try! NSRegularExpression(pattern: "<think>([\\s\\S]*?)</think>", options: .caseInsensitive)
        var ns = raw as NSString
        let full = NSRange(location: 0, length: ns.length)
        thinkRe.enumerateMatches(in: raw, options: [], range: full) { m, _, _ in
            guard let m, m.numberOfRanges > 1 else { return }
            thinks.append(ns.substring(with: m.range(at: 1)).trimmingCharacters(in: .whitespacesAndNewlines))
        }
        var text = thinkRe.stringByReplacingMatches(in: raw, options: [], range: full, withTemplate: "")

        var blocks: [Block] = thinks.filter { !$0.isEmpty }.map { .think($0) }
        let toolRe = try! NSRegularExpression(
            pattern: "<tool\\s+name=\"([^\"]+)\"([^>]*)>([\\s\\S]*?)</tool>",
            options: .caseInsensitive
        )
        ns = text as NSString
        var last = 0
        toolRe.enumerateMatches(in: text, options: [], range: NSRange(location: 0, length: ns.length)) { m, _, _ in
            guard let m else { return }
            pushText(&blocks, ns.substring(with: NSRange(location: last, length: m.range.location - last)))
            let name = ns.substring(with: m.range(at: 1))
            let attr = ns.substring(with: m.range(at: 2))
            let body = ns.substring(with: m.range(at: 3)).trimmingCharacters(in: .whitespacesAndNewlines)
            let a = attrs(attr)
            blocks.append(.tool(.init(
                name: name, path: a.path, command: a.command,
                to: name.lowercased() == "sendmessage" ? a.to : nil,
                content: body, status: .done
            )))
            last = m.range.location + m.range.length
        }
        let rest = ns.substring(from: last)
        if let open = rest.range(of: #"<tool\s+name="([^"]+)"([^>]*)>([\s\S]*)$"#, options: .regularExpression),
           rest.range(of: "</tool>", options: .caseInsensitive) == nil {
            let before = String(rest[..<open.lowerBound])
            pushText(&blocks, before)
            let snippet = String(rest[open])
            let nameRe = try! NSRegularExpression(pattern: "name=\"([^\"]+)\"")
            let ns2 = snippet as NSString
            let name = nameRe.firstMatch(in: snippet, range: NSRange(location: 0, length: ns2.length))
                .map { ns2.substring(with: $0.range(at: 1)) } ?? "Tool"
            let a = attrs(snippet)
            let bodyStart = snippet.range(of: ">")?.upperBound
            let body = bodyStart.map { String(snippet[$0...]) }?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            blocks.append(.tool(.init(
                name: name, path: a.path, command: a.command,
                to: name.lowercased() == "sendmessage" ? a.to : nil,
                content: body, status: .running
            )))
        } else {
            pushText(&blocks, rest)
        }
        return blocks.isEmpty ? [.text(raw.trimmingCharacters(in: .whitespacesAndNewlines))] : blocks
    }

    static func blocksToPlain(_ blocks: [Block]) -> String {
        blocks.map { b -> String in
            switch b {
            case .text(let t), .think(let t): return t
            case .tool(let t) where t.name.lowercased() == "sendmessage":
                return "SendMessage → \(t.to ?? "")\n\(t.content)".trimmingCharacters(in: .whitespacesAndNewlines)
            case .tool(let t):
                return "\(t.name) \(t.path ?? t.command ?? "")\n\(t.content)".trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }.joined(separator: "\n\n")
    }

    static func lastSnippet(_ blocks: [Block], max: Int = 140) -> String {
        for b in blocks.reversed() {
            switch b {
            case .text(let t) where !t.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty:
                let s = t.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                return s.count > max ? String(s.prefix(max)) + "…" : s
            case .tool(let t) where t.name.lowercased() == "sendmessage":
                return "SendMessage · \(t.to ?? "session")"
            case .tool(let t):
                return "\(t.name) · \(t.path ?? t.command ?? t.name)"
            default: continue
            }
        }
        return "No output yet"
    }

    static func extractSendMessages(_ blocks: [Block]) -> [(to: String, text: String)] {
        let fromTools: [(to: String, text: String)] = blocks.compactMap { b in
            if case .tool(let t) = b, t.name.lowercased() == "sendmessage" {
                let to = (t.to ?? t.path ?? "").trimmingCharacters(in: .whitespaces)
                let text = t.content.trimmingCharacters(in: .whitespacesAndNewlines)
                if !to.isEmpty, !text.isEmpty { return (to, text) }
            }
            return nil
        }
        if !fromTools.isEmpty { return fromTools }
        let plain = blocksToPlain(blocks)
        let re = try! NSRegularExpression(
            pattern: #"SendMessage\s+(?:to[=:\s"]+)([a-z0-9._-]+)["']?\s*\n+([\s\S]+?)(?=\nSendMessage\s+to|\s*$)"#,
            options: .caseInsensitive
        )
        let ns = plain as NSString
        var out: [(to: String, text: String)] = []
        re.enumerateMatches(in: plain, range: NSRange(location: 0, length: ns.length)) { m, _, _ in
            guard let m, m.numberOfRanges > 2 else { return }
            let to = ns.substring(with: m.range(at: 1)).trimmingCharacters(in: .whitespaces)
            let text = ns.substring(with: m.range(at: 2)).trimmingCharacters(in: .whitespacesAndNewlines)
            if !to.isEmpty, !text.isEmpty { out.append((to, text)) }
        }
        return out
    }

    static func fillListAgents(_ blocks: [Block], roster: String) -> [Block] {
        blocks.map { b in
            if case .tool(let t) = b, t.name.lowercased() == "listagents" {
                return .tool(.init(name: t.name, path: t.path, command: t.command, to: t.to, content: roster, status: .done))
            }
            return b
        }
    }

    private static func pushText(_ blocks: inout [Block], _ text: String) {
        let t = text.replacingOccurrences(of: "\n{3,}", with: "\n\n", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if !t.isEmpty { blocks.append(.text(t)) }
    }

    private static func attrs(_ src: String) -> (path: String?, command: String?, to: String?) {
        func cap(_ pattern: String) -> String? {
            let re = try? NSRegularExpression(pattern: pattern)
            let ns = src as NSString
            guard let m = re?.firstMatch(in: src, range: NSRange(location: 0, length: ns.length)),
                  m.numberOfRanges > 1 else { return nil }
            return ns.substring(with: m.range(at: 1))
        }
        let path = cap("path=\"([^\"]*)\"")
        let command = cap("command=\"([^\"]*)\"")
        let to = cap("(?:\\bto|\\bsession|\\bagent)=\"([^\"]+)\"")
            ?? cap("(?:\\bto|\\bsession|\\bagent)=([^\\s>\"']+)")
            ?? path
        return (path, command, to)
    }
}
