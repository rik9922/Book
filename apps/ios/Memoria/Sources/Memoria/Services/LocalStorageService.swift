import Foundation
import CryptoKit

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

public enum MemorySyncState: String, Codable, Sendable {
    case savedLocally
    case waitingToSync
    case syncing
    case synchronized
    case syncFailed
    case conflict
}

public enum PendingMutationState: String, Codable, Sendable {
    case pending
    case inProgress
    case failed
    case conflict
    case cancelled
}

public struct LocalMediaAsset: Codable, Identifiable, Sendable, Equatable {
    public let id: String
    public let memoryId: String
    public let spaceId: String
    public var accountId: String?
    public let fileName: String
    public let mimeType: String
    public let fileSizeBytes: Int
    public let sha256: String
    public let relativePath: String
    public var remoteMediaId: String?
    public var uploadState: String
    public var lastError: String?
    public let createdAt: Date

    public init(
        id: String = UUID().uuidString,
        memoryId: String,
        spaceId: String,
        accountId: String? = nil,
        fileName: String,
        mimeType: String,
        fileSizeBytes: Int,
        sha256: String,
        relativePath: String,
        remoteMediaId: String? = nil,
        uploadState: String = "pending",
        lastError: String? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.memoryId = memoryId
        self.spaceId = spaceId
        self.accountId = accountId
        self.fileName = fileName
        self.mimeType = mimeType
        self.fileSizeBytes = fileSizeBytes
        self.sha256 = sha256
        self.relativePath = relativePath
        self.remoteMediaId = remoteMediaId
        self.uploadState = uploadState
        self.lastError = lastError
        self.createdAt = createdAt
    }
}

public struct DurableOfflineMemoryRecord: Codable, Identifiable, Sendable {
    public var id: String { memory.id }
    public var memory: Memory
    public var accountId: String?
    public var localMediaAssetIds: [String]
    public var syncState: MemorySyncState
    public var lastError: String?
    public var updatedAt: Date

    public init(
        memory: Memory,
        accountId: String? = nil,
        localMediaAssetIds: [String] = [],
        syncState: MemorySyncState = .savedLocally,
        lastError: String? = nil,
        updatedAt: Date = Date()
    ) {
        self.memory = memory
        self.accountId = accountId
        self.localMediaAssetIds = localMediaAssetIds
        self.syncState = syncState
        self.lastError = lastError
        self.updatedAt = updatedAt
    }
}

public struct SyncConflictRecord: Codable, Identifiable, Sendable {
    public let id: String
    public let memoryId: String
    public let spaceId: String
    public let accountId: String?
    public let localMemory: Memory
    public let serverMemory: Memory
    public let detectedAt: Date

    public init(
        id: String = UUID().uuidString,
        memoryId: String,
        spaceId: String,
        accountId: String? = nil,
        localMemory: Memory,
        serverMemory: Memory,
        detectedAt: Date = Date()
    ) {
        self.id = id
        self.memoryId = memoryId
        self.spaceId = spaceId
        self.accountId = accountId
        self.localMemory = localMemory
        self.serverMemory = serverMemory
        self.detectedAt = detectedAt
    }
}

public struct CreateMemoryMutationPayload: Codable, Sendable {
    public let memory: Memory
    public let localMediaAssetIds: [String]

    public init(memory: Memory, localMediaAssetIds: [String] = []) {
        self.memory = memory
        self.localMediaAssetIds = localMediaAssetIds
    }
}

public struct UpdateMemoryMutationPayload: Codable, Sendable {
    public let memoryId: String
    public let spaceId: String
    public let title: String?
    public let content: String?
    public let location: String?
    public let isFavorite: Bool?
    public let tags: [String]?
    public let expectedRevision: Int?
    public let expectedUpdatedAt: String?

    public init(
        memoryId: String,
        spaceId: String,
        title: String? = nil,
        content: String? = nil,
        location: String? = nil,
        isFavorite: Bool? = nil,
        tags: [String]? = nil,
        expectedRevision: Int? = nil,
        expectedUpdatedAt: String? = nil
    ) {
        self.memoryId = memoryId
        self.spaceId = spaceId
        self.title = title
        self.content = content
        self.location = location
        self.isFavorite = isFavorite
        self.tags = tags
        self.expectedRevision = expectedRevision
        self.expectedUpdatedAt = expectedUpdatedAt
    }
}

public struct PendingMutation: Codable, Identifiable, Sendable {
    public let id: String
    public let idempotencyKey: String
    public let entityType: String
    public let action: String // "create", "update", "delete"
    public let payload: Data
    public var ownerAccountId: String?
    public var state: PendingMutationState
    public let createdAt: Date
    public var retryCount: Int
    public var nextRetryAt: Date?
    public var lastError: String?

    public init(
        id: String = UUID().uuidString,
        idempotencyKey: String? = nil,
        entityType: String,
        action: String,
        payload: Data,
        ownerAccountId: String? = nil,
        state: PendingMutationState = .pending,
        createdAt: Date = Date(),
        retryCount: Int = 0,
        nextRetryAt: Date? = nil,
        lastError: String? = nil
    ) {
        self.id = id
        self.idempotencyKey = idempotencyKey ?? id
        self.entityType = entityType
        self.action = action
        self.payload = payload
        self.ownerAccountId = ownerAccountId
        self.state = state
        self.createdAt = createdAt
        self.retryCount = retryCount
        self.nextRetryAt = nextRetryAt
        self.lastError = lastError
    }

    private enum CodingKeys: String, CodingKey {
        case id, idempotencyKey, entityType, action, payload, ownerAccountId, state, createdAt, retryCount, nextRetryAt, lastError
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let decodedId = try c.decode(String.self, forKey: .id)
        self.id = decodedId
        self.idempotencyKey = try c.decodeIfPresent(String.self, forKey: .idempotencyKey) ?? decodedId
        self.entityType = try c.decode(String.self, forKey: .entityType)
        self.action = try c.decode(String.self, forKey: .action)
        self.payload = try c.decode(Data.self, forKey: .payload)
        self.ownerAccountId = try c.decodeIfPresent(String.self, forKey: .ownerAccountId)
        self.state = try c.decodeIfPresent(PendingMutationState.self, forKey: .state) ?? .pending
        self.createdAt = try c.decode(Date.self, forKey: .createdAt)
        self.retryCount = try c.decodeIfPresent(Int.self, forKey: .retryCount) ?? 0
        self.nextRetryAt = try c.decodeIfPresent(Date.self, forKey: .nextRetryAt)
        self.lastError = try c.decodeIfPresent(String.self, forKey: .lastError)
    }
}

public enum LocalStorageError: LocalizedError {
    case directoryCreationFailed(String)
    case mediaFileMissing(String)
    case mediaChecksumMismatch(expected: String, actual: String)
    case mediaAssetNotFound(String)

    public var errorDescription: String? {
        switch self {
        case .directoryCreationFailed(let path):
            return "Unable to initialize durable storage directory at \(path)."
        case .mediaFileMissing(let path):
            return "Original media file is missing at \(path)."
        case .mediaChecksumMismatch(let expected, let actual):
            return "Original media file failed integrity check (expected \(expected.prefix(8)), got \(actual.prefix(8)))."
        case .mediaAssetNotFound(let id):
            return "Local media asset metadata missing for \(id)."
        }
    }
}

public final class LocalStorageService: @unchecked Sendable {
    public static let shared = LocalStorageService()

    private let fileManager = FileManager.default
    /// Durable user state, offline memories, original media & pending offline mutations (never wiped by clearCache)
    public let archiveDirectory: URL
    public let originalsDirectory: URL
    /// Disposable read cache (feed snapshots, thumbnails) safely cleared by clearCache()
    public let cacheDirectory: URL
    private let queueFileURL: URL
    private let offlineMemoriesFileURL: URL
    private let mediaAssetsFileURL: URL
    private let conflictsFileURL: URL
    private let lock = NSLock()

    public init(baseArchiveURL: URL? = nil, baseCacheURL: URL? = nil) {
        if let baseArchiveURL {
            self.archiveDirectory = baseArchiveURL
        } else {
            let appSupportPaths = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)
            self.archiveDirectory = appSupportPaths[0].appendingPathComponent("MemoriaArchive", isDirectory: true)
        }
        self.originalsDirectory = archiveDirectory.appendingPathComponent("Originals", isDirectory: true)
        self.queueFileURL = archiveDirectory.appendingPathComponent("pending_mutations.json")
        self.offlineMemoriesFileURL = archiveDirectory.appendingPathComponent("offline_memories.json")
        self.mediaAssetsFileURL = archiveDirectory.appendingPathComponent("media_assets.json")
        self.conflictsFileURL = archiveDirectory.appendingPathComponent("sync_conflicts.json")

        if let baseCacheURL {
            self.cacheDirectory = baseCacheURL
        } else {
            let cachePaths = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)
            self.cacheDirectory = cachePaths[0].appendingPathComponent("MemoriaCache", isDirectory: true)
        }

        try? fileManager.createDirectory(at: archiveDirectory, withIntermediateDirectories: true)
        try? fileManager.createDirectory(at: originalsDirectory, withIntermediateDirectories: true)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    private func ensureArchiveDirectories() throws {
        if !fileManager.fileExists(atPath: archiveDirectory.path) {
            try fileManager.createDirectory(at: archiveDirectory, withIntermediateDirectories: true)
        }
        if !fileManager.fileExists(atPath: originalsDirectory.path) {
            try fileManager.createDirectory(at: originalsDirectory, withIntermediateDirectories: true)
        }
    }

    private func writeProtected(_ data: Data, to url: URL) throws {
        let parent = url.deletingLastPathComponent()
        if !fileManager.fileExists(atPath: parent.path) {
            try fileManager.createDirectory(at: parent, withIntermediateDirectories: true)
        }
        #if os(iOS)
        try data.write(to: url, options: [.atomic, .completeFileProtection])
        #else
        try data.write(to: url, options: .atomic)
        #endif
    }

    public static func sha256Hex(of data: Data) -> String {
        let digest = SHA256.hash(data: data)
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    // MARK: - Durable Original Media Storage (Application Support/MemoriaArchive/Originals)

    @discardableResult
    public func saveOriginalMedia(
        data: Data,
        assetId: String = UUID().uuidString,
        memoryId: String,
        spaceId: String,
        accountId: String? = nil,
        fileName: String,
        mimeType: String
    ) throws -> LocalMediaAsset {
        lock.lock()
        defer { lock.unlock() }
        try ensureArchiveDirectories()

        let sanitizedName = (fileName as NSString).lastPathComponent.replacingOccurrences(of: "/", with: "_")
        let safeFileName = sanitizedName.isEmpty ? "asset_\(assetId).bin" : sanitizedName
        let relativePath = "Originals/\(assetId)/\(safeFileName)"
        let targetURL = archiveDirectory.appendingPathComponent(relativePath)

        try writeProtected(data, to: targetURL)

        let checksum = Self.sha256Hex(of: data)
        let asset = LocalMediaAsset(
            id: assetId,
            memoryId: memoryId,
            spaceId: spaceId,
            accountId: accountId,
            fileName: safeFileName,
            mimeType: mimeType,
            fileSizeBytes: data.count,
            sha256: checksum,
            relativePath: relativePath
        )

        var assets = loadMediaAssetsInternal()
        if let idx = assets.firstIndex(where: { $0.id == asset.id }) {
            assets[idx] = asset
        } else {
            assets.append(asset)
        }
        let encoded = try JSONEncoder().encode(assets)
        try writeProtected(encoded, to: mediaAssetsFileURL)
        return asset
    }

    public func loadOriginalMediaData(assetId: String) throws -> (asset: LocalMediaAsset, data: Data) {
        lock.lock()
        let assets = loadMediaAssetsInternal()
        lock.unlock()

        guard let asset = assets.first(where: { $0.id == assetId }) else {
            throw LocalStorageError.mediaAssetNotFound(assetId)
        }
        let fileURL = archiveDirectory.appendingPathComponent(asset.relativePath)
        guard fileManager.fileExists(atPath: fileURL.path) else {
            throw LocalStorageError.mediaFileMissing(fileURL.path)
        }
        let data = try Data(contentsOf: fileURL)
        let actualSha = Self.sha256Hex(of: data)
        guard actualSha.lowercased() == asset.sha256.lowercased() else {
            throw LocalStorageError.mediaChecksumMismatch(expected: asset.sha256, actual: actualSha)
        }
        return (asset, data)
    }

    public func listLocalMediaAssets(forMemoryId memoryId: String? = nil) -> [LocalMediaAsset] {
        lock.lock()
        defer { lock.unlock() }
        let all = loadMediaAssetsInternal()
        if let memoryId {
            return all.filter { $0.memoryId == memoryId }
        }
        return all
    }

    public func markLocalMediaUploaded(assetId: String, remoteMediaId: String) throws {
        lock.lock()
        defer { lock.unlock() }
        var assets = loadMediaAssetsInternal()
        guard let idx = assets.firstIndex(where: { $0.id == assetId }) else { return }
        assets[idx].remoteMediaId = remoteMediaId
        assets[idx].uploadState = "uploaded"
        assets[idx].lastError = nil
        let encoded = try JSONEncoder().encode(assets)
        try writeProtected(encoded, to: mediaAssetsFileURL)
    }

    public func markLocalMediaFailed(assetId: String, error: String) throws {
        lock.lock()
        defer { lock.unlock() }
        var assets = loadMediaAssetsInternal()
        guard let idx = assets.firstIndex(where: { $0.id == assetId }) else { return }
        assets[idx].uploadState = "failed"
        assets[idx].lastError = error
        let encoded = try JSONEncoder().encode(assets)
        try writeProtected(encoded, to: mediaAssetsFileURL)
    }

    private func loadMediaAssetsInternal() -> [LocalMediaAsset] {
        guard let data = try? Data(contentsOf: mediaAssetsFileURL),
              let decoded = try? JSONDecoder().decode([LocalMediaAsset].self, from: data) else {
            return []
        }
        return decoded
    }

    // MARK: - Durable Offline Memory Records (Never wiped by clearCache)

    public func saveDurableOfflineMemory(
        _ memory: Memory,
        accountId: String? = nil,
        localMediaAssetIds: [String] = [],
        syncState: MemorySyncState = .waitingToSync,
        lastError: String? = nil
    ) throws {
        lock.lock()
        defer { lock.unlock() }
        try ensureArchiveDirectories()

        var records = loadDurableOfflineMemoriesInternal()
        let record = DurableOfflineMemoryRecord(
            memory: memory,
            accountId: accountId,
            localMediaAssetIds: localMediaAssetIds,
            syncState: syncState,
            lastError: lastError,
            updatedAt: Date()
        )
        if let idx = records.firstIndex(where: { $0.memory.id == memory.id }) {
            records[idx] = record
        } else {
            records.insert(record, at: 0)
        }
        let encoded = try JSONEncoder().encode(records)
        try writeProtected(encoded, to: offlineMemoriesFileURL)
    }

    public func loadDurableOfflineMemories(
        forSpaceId spaceId: String? = nil,
        accountId: String? = nil
    ) -> [DurableOfflineMemoryRecord] {
        lock.lock()
        defer { lock.unlock() }
        return loadDurableOfflineMemoriesInternal().filter { rec in
            let matchesSpace = spaceId == nil || rec.memory.spaceId == spaceId
            let matchesAccount: Bool
            if let accountId {
                matchesAccount = (rec.accountId == nil || rec.accountId == accountId)
            } else {
                matchesAccount = true
            }
            return matchesSpace && matchesAccount
        }
    }

    public func updateOfflineMemorySyncState(
        memoryId: String,
        syncState: MemorySyncState,
        serverMemory: Memory? = nil,
        lastError: String? = nil
    ) throws {
        lock.lock()
        defer { lock.unlock() }
        var records = loadDurableOfflineMemoriesInternal()
        guard let idx = records.firstIndex(where: { $0.memory.id == memoryId }) else { return }
        if let serverMemory {
            records[idx].memory = serverMemory
        }
        records[idx].syncState = syncState
        records[idx].lastError = lastError
        records[idx].updatedAt = Date()
        let encoded = try JSONEncoder().encode(records)
        try writeProtected(encoded, to: offlineMemoriesFileURL)
    }

    private func loadDurableOfflineMemoriesInternal() -> [DurableOfflineMemoryRecord] {
        guard let data = try? Data(contentsOf: offlineMemoriesFileURL),
              let decoded = try? JSONDecoder().decode([DurableOfflineMemoryRecord].self, from: data) else {
            return []
        }
        return decoded
    }

    public func mergedMemories(remote: [Memory], spaceId: String, accountId: String? = nil) -> [Memory] {
        let offline = loadDurableOfflineMemories(forSpaceId: spaceId, accountId: accountId)
        var byId: [String: Memory] = [:]
        var order: [String] = []

        // Pending/offline memories appear first if not yet synchronized or if locally modified
        for rec in offline where rec.syncState != .synchronized {
            if byId[rec.memory.id] == nil {
                order.append(rec.memory.id)
            }
            byId[rec.memory.id] = rec.memory
        }
        for m in remote {
            if byId[m.id] == nil {
                order.append(m.id)
                byId[m.id] = m
            }
        }
        return order.compactMap { byId[$0] }
    }

    // MARK: - Memories Cache (Disposable)

    public func saveMemoriesLocally(_ memories: [Memory], forSpaceId spaceId: String) throws {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = cacheDirectory.appendingPathComponent("memories_\(spaceId).json")
        let data = try JSONEncoder().encode(memories)
        try writeProtected(data, to: fileURL)
    }

    public func loadLocalMemories(forSpaceId spaceId: String, accountId: String? = nil) -> [Memory] {
        lock.lock()
        let cacheURL = cacheDirectory.appendingPathComponent("memories_\(spaceId).json")
        var cached: [Memory] = []
        if let data = try? Data(contentsOf: cacheURL),
           let memories = try? JSONDecoder().decode([Memory].self, from: data) {
            cached = memories
        }
        lock.unlock()
        return mergedMemories(remote: cached, spaceId: spaceId, accountId: accountId)
    }

    public func upsertLocalMemory(_ memory: Memory, accountId: String? = nil, syncState: MemorySyncState = .savedLocally) throws {
        try saveDurableOfflineMemory(memory, accountId: accountId, syncState: syncState)
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
        try ensureArchiveDirectories()
        var queue = loadPendingMutationsInternal()
        if queue.contains(where: { $0.id == mutation.id || $0.idempotencyKey == mutation.idempotencyKey }) {
            return
        }
        queue.append(mutation)
        let data = try JSONEncoder().encode(queue)
        try writeProtected(data, to: queueFileURL)
    }

    public func updateMutation(_ mutation: PendingMutation) throws {
        lock.lock()
        defer { lock.unlock() }
        var queue = loadPendingMutationsInternal()
        if let idx = queue.firstIndex(where: { $0.id == mutation.id }) {
            queue[idx] = mutation
            let data = try JSONEncoder().encode(queue)
            try writeProtected(data, to: queueFileURL)
        }
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

    public func cancelMutation(id: String) throws {
        lock.lock()
        defer { lock.unlock() }
        var queue = loadPendingMutationsInternal()
        if let idx = queue.firstIndex(where: { $0.id == id }) {
            queue[idx].state = .cancelled
            let data = try JSONEncoder().encode(queue)
            try writeProtected(data, to: queueFileURL)
        }
    }

    public func resetInterruptedInProgressMutations() throws {
        lock.lock()
        defer { lock.unlock() }
        var queue = loadPendingMutationsInternal()
        var changed = false
        for i in queue.indices where queue[i].state == .inProgress {
            queue[i].state = .pending
            changed = true
        }
        if changed {
            let data = try JSONEncoder().encode(queue)
            try writeProtected(data, to: queueFileURL)
        }
    }

    // MARK: - Sync Conflicts

    public func saveSyncConflict(_ conflict: SyncConflictRecord) throws {
        lock.lock()
        defer { lock.unlock() }
        try ensureArchiveDirectories()
        var conflicts = loadSyncConflictsInternal()
        if let idx = conflicts.firstIndex(where: { $0.memoryId == conflict.memoryId }) {
            conflicts[idx] = conflict
        } else {
            conflicts.insert(conflict, at: 0)
        }
        let data = try JSONEncoder().encode(conflicts)
        try writeProtected(data, to: conflictsFileURL)
    }

    public func loadSyncConflicts(accountId: String? = nil) -> [SyncConflictRecord] {
        lock.lock()
        defer { lock.unlock() }
        return loadSyncConflictsInternal().filter { c in
            guard let accountId else { return true }
            return c.accountId == nil || c.accountId == accountId
        }
    }

    public func resolveSyncConflict(id: String) throws {
        lock.lock()
        defer { lock.unlock() }
        var conflicts = loadSyncConflictsInternal()
        conflicts.removeAll { $0.id == id }
        let data = try JSONEncoder().encode(conflicts)
        try writeProtected(data, to: conflictsFileURL)
    }

    private func loadSyncConflictsInternal() -> [SyncConflictRecord] {
        guard let data = try? Data(contentsOf: conflictsFileURL),
              let decoded = try? JSONDecoder().decode([SyncConflictRecord].self, from: data) else {
            return []
        }
        return decoded
    }

    /// Clears only disposable read caches; preserves durable offline_memories.json, Originals/, pending_mutations.json, sync_conflicts.json and book_states.json.
    public func clearCache() {
        lock.lock()
        defer { lock.unlock() }
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    /// Destructive full reset (e.g. explicit delete account).
    public func clearArchive() {
        lock.lock()
        defer { lock.unlock() }
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.removeItem(at: archiveDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        try? fileManager.createDirectory(at: archiveDirectory, withIntermediateDirectories: true)
        try? fileManager.createDirectory(at: originalsDirectory, withIntermediateDirectories: true)
    }
}
