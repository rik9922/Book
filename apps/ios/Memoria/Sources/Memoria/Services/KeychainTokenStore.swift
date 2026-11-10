import Foundation
import Security

/// Secure on-device storage for JWT access & refresh credentials using Apple Keychain.
/// Falls back to an in-memory map when running headless SwiftPM tests without keychain entitlement.
public final class KeychainTokenStore: @unchecked Sendable {
    public static let shared = KeychainTokenStore()

    private let service = "com.memoria.app.auth"
    private let lock = NSLock()
    private var memoryFallback: [String: String] = [:]

    private init() {}

    public func save(_ value: String, forKey key: String) {
        lock.lock()
        defer { lock.unlock() }
        memoryFallback[key] = value

        guard let data = value.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)

        var addQuery = query
        addQuery[kSecValueData as String] = data
        addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(addQuery as CFDictionary, nil)
    }

    public func read(forKey key: String) -> String? {
        lock.lock()
        defer { lock.unlock() }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecSuccess,
           let data = result as? Data,
           let str = String(data: data, encoding: .utf8) {
            return str
        }
        return memoryFallback[key]
    }

    public func delete(forKey key: String) {
        lock.lock()
        defer { lock.unlock() }
        memoryFallback.removeValue(forKey: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
