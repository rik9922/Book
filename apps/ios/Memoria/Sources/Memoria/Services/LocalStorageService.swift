import Foundation

public enum MemoryReactionKind: String, Codable, CaseIterable, Identifiable, Sendable {
    case heart
    case warmth
    case tearsOfJoy
    case gratitude

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .heart: return "Heart"
        case .warmth: return "Warmth"
        case .tearsOfJoy: return "Tears of Joy"
        case .gratitude: return "Gratitude"
        }
    }

    public var symbolName: String {
        switch self {
        case .heart: return "heart.fill"
        case .warmth: return "sun.max.fill"
        case .tearsOfJoy: return "sparkles"
        case .gratitude: return "hands.sparkles.fill"
        }
    }
}

public struct MemoryReactionState: Codable, Sendable, Equatable {
    public var counts: [String: Int]
    public var selectedKinds: [String]

    public init(counts: [String: Int] = [:], selectedKinds: [String] = []) {
        self.counts = counts
        self.selectedKinds = selectedKinds
    }

    public func count(for kind: MemoryReactionKind) -> Int {
        counts[kind.rawValue] ?? 0
    }

    public func isSelected(_ kind: MemoryReactionKind) -> Bool {
        selectedKinds.contains(kind.rawValue)
    }

    public mutating func toggle(_ kind: MemoryReactionKind) {
        let key = kind.rawValue
        if let idx = selectedKinds.firstIndex(of: key) {
            selectedKinds.remove(at: idx)
            counts[key] = max(0, (counts[key] ?? 1) - 1)
        } else {
            selectedKinds.append(key)
            counts[key] = (counts[key] ?? 0) + 1
        }
    }
}

public struct MediaEditParameters: Codable, Sendable, Equatable {
    public var rotateDegrees: Int
    public var warmth: Double
    public var cropPreset: String
    public var filterPreset: String

    public init(
        rotateDegrees: Int = 0,
        warmth: Double = 0.0,
        cropPreset: String = "original",
        filterPreset: String = "Original"
    ) {
        self.rotateDegrees = rotateDegrees
        self.warmth = warmth
        self.cropPreset = cropPreset
        self.filterPreset = filterPreset
    }
}

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

    public func upsertLocalMemory(_ memory: Memory) throws {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = cacheDirectory.appendingPathComponent("memories_\(memory.spaceId).json")
        var current: [Memory] = []
        if let data = try? Data(contentsOf: fileURL),
           let decoded = try? JSONDecoder().decode([Memory].self, from: data) {
            current = decoded
        }
        if let idx = current.firstIndex(where: { $0.id == memory.id }) {
            current[idx] = memory
        } else {
            current.insert(memory, at: 0)
        }
        let encoded = try JSONEncoder().encode(current)
        try writeProtected(encoded, to: fileURL)
    }

    // MARK: - Collections, Profiles, Comments & Emotional Reactions Local Persistence

    public func saveCollectionsLocally(_ collections: [CollectionDTO], forSpaceId spaceId: String) throws {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = cacheDirectory.appendingPathComponent("collections_\(spaceId).json")
        let data = try JSONEncoder().encode(collections)
        try writeProtected(data, to: fileURL)
    }

    public func loadLocalCollections(forSpaceId spaceId: String) -> [CollectionDTO] {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = cacheDirectory.appendingPathComponent("collections_\(spaceId).json")
        if let data = try? Data(contentsOf: fileURL),
           let decoded = try? JSONDecoder().decode([CollectionDTO].self, from: data) {
            return decoded
        }
        return []
    }

    public func saveProfilesLocally(_ profiles: [SpaceProfileDTO], forSpaceId spaceId: String) throws {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = cacheDirectory.appendingPathComponent("profiles_\(spaceId).json")
        let data = try JSONEncoder().encode(profiles)
        try writeProtected(data, to: fileURL)
    }

    public func loadLocalProfiles(forSpaceId spaceId: String) -> [SpaceProfileDTO] {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = cacheDirectory.appendingPathComponent("profiles_\(spaceId).json")
        if let data = try? Data(contentsOf: fileURL),
           let decoded = try? JSONDecoder().decode([SpaceProfileDTO].self, from: data) {
            return decoded
        }
        return []
    }

    public func saveCommentsLocally(_ comments: [MemoryCommentDTO], forMemoryId memoryId: String) throws {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = cacheDirectory.appendingPathComponent("comments_\(memoryId).json")
        let data = try JSONEncoder().encode(comments)
        try writeProtected(data, to: fileURL)
    }

    public func loadLocalComments(forMemoryId memoryId: String) -> [MemoryCommentDTO] {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = cacheDirectory.appendingPathComponent("comments_\(memoryId).json")
        if let data = try? Data(contentsOf: fileURL),
           let decoded = try? JSONDecoder().decode([MemoryCommentDTO].self, from: data) {
            return decoded
        }
        return []
    }

    public func saveReactionsLocally(_ state: MemoryReactionState, forMemoryId memoryId: String) throws {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = archiveDirectory.appendingPathComponent("reactions_\(memoryId).json")
        let data = try JSONEncoder().encode(state)
        try writeProtected(data, to: fileURL)
    }

    public func loadLocalReactions(forMemoryId memoryId: String) -> MemoryReactionState {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = archiveDirectory.appendingPathComponent("reactions_\(memoryId).json")
        if let data = try? Data(contentsOf: fileURL),
           let decoded = try? JSONDecoder().decode(MemoryReactionState.self, from: data) {
            return decoded
        }
        return MemoryReactionState()
    }

    public func saveMediaEditsLocally(_ edits: MediaEditParameters, forMediaId mediaId: String) throws {
        lock.lock()
        defer { lock.unlock() }
        let sanitized = mediaId.replacingOccurrences(of: "/", with: "_")
        let fileURL = archiveDirectory.appendingPathComponent("media_edits_\(sanitized).json")
        let data = try JSONEncoder().encode(edits)
        try writeProtected(data, to: fileURL)
    }

    public func loadLocalMediaEdits(forMediaId mediaId: String) -> MediaEditParameters? {
        lock.lock()
        defer { lock.unlock() }
        let sanitized = mediaId.replacingOccurrences(of: "/", with: "_")
        let fileURL = archiveDirectory.appendingPathComponent("media_edits_\(sanitized).json")
        if let data = try? Data(contentsOf: fileURL),
           let decoded = try? JSONDecoder().decode(MediaEditParameters.self, from: data) {
            return decoded
        }
        return nil
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
