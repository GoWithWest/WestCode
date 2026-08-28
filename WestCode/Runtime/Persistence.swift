import Foundation
import Security

enum StoreKeys {
    static let onboard = "westcode-onboarding-v1"
    static let library = "westcode-library-v1"
    static let providers = "westcode-providers-v1"
    static let folders = "westcode-folders-v1"
    static let sessions = "westcode-sessions-v1"
    static let connections = "westcode-connections-v1"
}

struct ConnectionRecord: Codable, Hashable, Identifiable {
    var id: String
    var enabled: Bool
    var binaryPath: String
    var endpoint: String
}

enum Disk {
    static func readJSON<T: Decodable>(_ key: String, as type: T.Type, fallback: T) -> T {
        guard let data = UserDefaults.standard.data(forKey: key) else { return fallback }
        return (try? JSONDecoder().decode(T.self, from: data)) ?? fallback
    }

    static func writeJSON<T: Encodable>(_ key: String, _ value: T) {
        if let data = try? JSONEncoder().encode(value) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    static func string(_ key: String) -> String? {
        UserDefaults.standard.string(forKey: key)
    }

    static func setString(_ key: String, _ value: String) {
        UserDefaults.standard.set(value, forKey: key)
    }
}

enum BinaryProbe {
    static func expandHome(_ path: String) -> String {
        if path.hasPrefix("~/") {
            return (FileManager.default.homeDirectoryForCurrentUser.path as NSString)
                .appendingPathComponent(String(path.dropFirst(2)))
        }
        return path
    }

    static func extras() -> [String] {
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

    static func locate(_ binary: String) -> URL? {
        let trimmed = binary.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        if trimmed.contains("/") {
            let u = URL(fileURLWithPath: expandHome(trimmed))
            return FileManager.default.isExecutableFile(atPath: u.path) ? u : nil
        }
        let path = ProcessInfo.processInfo.environment["PATH"] ?? ""
        var seen = Set<String>()
        for dir in extras() + path.split(separator: ":").map(String.init) where seen.insert(dir).inserted {
            let candidate = URL(fileURLWithPath: dir).appendingPathComponent(trimmed)
            if FileManager.default.isExecutableFile(atPath: candidate.path) { return candidate }
        }
        return nil
    }
}

enum KeychainStore {
    private static let service = "app.westcode.desktop"

    static func set(_ value: String, account: String) {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
        var add = query
        add[kSecValueData as String] = data
        SecItemAdd(add as CFDictionary, nil)
    }

    static func get(account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var out: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &out)
        guard status == errSecSuccess, let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }

    static func apiKey(for providerId: String) -> String? {
        get(account: "provider.\(providerId)")
            ?? ProcessInfo.processInfo.environment["XAI_API_KEY"].flatMap { providerId == "grok" ? $0 : nil }
    }

    static func setAPIKey(_ key: String, for providerId: String) {
        if key.isEmpty {
            delete(account: "provider.\(providerId)")
        } else {
            set(key, account: "provider.\(providerId)")
        }
    }

    static func hasAPIKey(for providerId: String) -> Bool {
        guard let k = apiKey(for: providerId) else { return false }
        return !k.isEmpty
    }
}
