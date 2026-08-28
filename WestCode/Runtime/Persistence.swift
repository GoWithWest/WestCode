import Foundation
import Security

enum StoreKeys {
    static let onboard = "helix-onboarding-v1"
    static let library = "helix-library-v1"
    static let providers = "helix-providers-v1"
    static let folders = "helix-folders-v1"
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
}
