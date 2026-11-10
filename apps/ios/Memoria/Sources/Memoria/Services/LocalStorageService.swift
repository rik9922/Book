import Foundation

public struct PendingMutation: Codable, Identifiable, Sendable {
    public let id: String
    public let entityType: String
    public let action: String // "create", "update", "delete"
    public let payload: Data
    public let createdAt: Date
    public var retryCount: Int
    public var lastError: String?

    public init(id: String = UUID().uuidString, entityType: String, action: String, payload: Data, createdAt: Date = Date(), retryCount: Int = 0, lastError: String? = nil) {
        self.id = id
        self.entityType = entityType
        self.action = action
        self.payload = payload
        self.createdAt = createdAt
        self.retryCount = retryCount
        self.lastError = lastError
    }
}

public final class LocalStorageService: @unchecked Sendable {
    public static let shared = LocalStorageService()

    private let fileManager = FileManager.default
    /// Durable user state & pending offline mutations (never wiped by clearCache)
    private let archiveDirectory: URL
    /// Disposable read cache (feed snapshots, thumbnails) safely cleared by clearCache()
    private let cacheDirectory: URL
    private let queueFileURL: URL
    private let lock = NSLock()

    private init() {
        let appSupportPaths = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)
        self.archiveDirectory = appSupportPaths[0].appendingPathComponent("MemoriaArchive", isDirectory: true)
        self.queueFileURL = archiveDirectory.appendingPathComponent("pending_mutations.json")

        let cachePaths = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)
        self.cacheDirectory = cachePaths[0].appendingPathComponent("MemoriaCache", isDirectory: true)

        try? fileManager.createDirectory(at: archiveDirectory, withIntermediateDirectories: true)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    private func writeProtected(_ data: Data, to url: URL) throws {
        #if os(iOS)
        try data.write(to: url, options: [.atomic, .completeFileProtection])
        #else
        try data.write(to: url, options: .atomic)
        #endif
    }

    // MARK: - Memories Cache (Disposable)

    public func saveMemoriesLocally(_ memories: [Memory], forSpaceId spaceId: String) throws {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = cacheDirectory.appendingPathComponent("memories_\(spaceId).json")
        let data = try JSONEncoder().encode(memories)
        try writeProtected(data, to: fileURL)
    }

    public func loadLocalMemories(forSpaceId spaceId: String) -> [Memory] {
        lock.lock()
        defer { lock.unlock() }
        let cacheURL = cacheDirectory.appendingPathComponent("memories_\(spaceId).json")
        if let data = try? Data(contentsOf: cacheURL),
           let memories = try? JSONDecoder().decode([Memory].self, from: data) {
            return memories
        }
        return []
    }

    // MARK: - Durable Offline Pending Mutation Queue (Never deleted by clearCache)

    public func enqueueMutation(_ mutation: PendingMutation) throws {
        lock.lock()
        defer { lock.unlock() }
        var queue = loadPendingMutationsInternal()
        queue.append(mutation)
        let data = try JSONEncoder().encode(queue)
        try writeProtected(data, to: queueFileURL)
    }

    public func loadPendingMutations() -> [PendingMutation] {
        lock.lock()
        defer { lock.unlock() }
        return loadPendingMutationsInternal()
    }

    private func loadPendingMutationsInternal() -> [PendingMutation] {
        guard let data = try? Data(contentsOf: queueFileURL),
              let queue = try? JSONDecoder().decode([PendingMutation].self, from: data) else {
            return []
        }
        return queue
    }

    public func removeMutation(id: String) throws {
        lock.lock()
        defer { lock.unlock() }
        var queue = loadPendingMutationsInternal()
        queue.removeAll { $0.id == id }
        let data = try JSONEncoder().encode(queue)
        try writeProtected(data, to: queueFileURL)
    }

    /// Clears only disposable read caches; preserves durable pending_mutations.json and book_states.json.
    public func clearCache() {
        lock.lock()
        defer { lock.unlock() }
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    /// Destructive full reset (e.g. account sign-out / delete account).
    public func clearArchive() {
        lock.lock()
        defer { lock.unlock() }
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.removeItem(at: archiveDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        try? fileManager.createDirectory(at: archiveDirectory, withIntermediateDirectories: true)
    }
}
