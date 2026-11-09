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
    private let storageDirectory: URL
    private let queueFileURL: URL
    private let lock = NSLock()

    private init() {
        // Use Application Support for durable, non-ephemeral offline storage
        let paths = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)
        self.storageDirectory = paths[0].appendingPathComponent("MemoriaArchive", isDirectory: true)
        self.queueFileURL = storageDirectory.appendingPathComponent("pending_mutations.json")
        try? fileManager.createDirectory(at: storageDirectory, withIntermediateDirectories: true)
    }

    // MARK: - Memories Persistence

    public func saveMemoriesLocally(_ memories: [Memory], forSpaceId spaceId: String) throws {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = storageDirectory.appendingPathComponent("memories_\(spaceId).json")
        let data = try JSONEncoder().encode(memories)
        try data.write(to: fileURL, options: .atomic)
    }

    public func loadLocalMemories(forSpaceId spaceId: String) -> [Memory] {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = storageDirectory.appendingPathComponent("memories_\(spaceId).json")
        guard let data = try? Data(contentsOf: fileURL),
              let memories = try? JSONDecoder().decode([Memory].self, from: data) else {
            return []
        }
        return memories
    }

    // MARK: - Durable Offline Pending Mutation Queue

    public func enqueueMutation(_ mutation: PendingMutation) throws {
        lock.lock()
        defer { lock.unlock() }
        var queue = loadPendingMutationsInternal()
        queue.append(mutation)
        let data = try JSONEncoder().encode(queue)
        try data.write(to: queueFileURL, options: .atomic)
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
        try data.write(to: queueFileURL, options: .atomic)
    }

    public func clearArchive() {
        lock.lock()
        defer { lock.unlock() }
        try? fileManager.removeItem(at: storageDirectory)
        try? fileManager.createDirectory(at: storageDirectory, withIntermediateDirectories: true)
    }

    public func clearCache() {
        clearArchive()
    }
}
