import Foundation
import Combine

public enum SyncConflictResolution: String, Sendable {
    case keepLocal
    case keepServer
    case keepBoth
}

public struct SyncRunSummary: Sendable, Equatable {
    public var attempted: Int = 0
    public var succeeded: Int = 0
    public var failed: Int = 0
    public var conflicts: Int = 0
    public var skippedAccountMismatch: Int = 0
    public var skippedBackoff: Int = 0
    public var lastError: String?

    public init(
        attempted: Int = 0,
        succeeded: Int = 0,
        failed: Int = 0,
        conflicts: Int = 0,
        skippedAccountMismatch: Int = 0,
        skippedBackoff: Int = 0,
        lastError: String? = nil
    ) {
        self.attempted = attempted
        self.succeeded = succeeded
        self.failed = failed
        self.conflicts = conflicts
        self.skippedAccountMismatch = skippedAccountMismatch
        self.skippedBackoff = skippedBackoff
        self.lastError = lastError
    }
}

@MainActor
public final class OfflineSyncService: ObservableObject {
    public static let shared = OfflineSyncService()

    @Published public private(set) var isSyncing: Bool = false
    @Published public private(set) var pendingCount: Int = 0
    @Published public private(set) var failedCount: Int = 0
    @Published public private(set) var conflictCount: Int = 0
    @Published public private(set) var lastSyncSummary: SyncRunSummary?

    private let storage: LocalStorageService
    private let apiClient: MemoriaAPIClient

    public init(
        storage: LocalStorageService = .shared,
        apiClient: MemoriaAPIClient = .shared
    ) {
        self.storage = storage
        self.apiClient = apiClient
        try? storage.resetInterruptedInProgressMutations()
        refreshCounts()
    }

    public func refreshCounts() {
        let queue = storage.loadPendingMutations()
        pendingCount = queue.filter { $0.state == .pending || $0.state == .inProgress }.count
        failedCount = queue.filter { $0.state == .failed }.count
        conflictCount = storage.loadSyncConflicts().count
    }

    /// Durably saves a new memory and optional original media to Application Support and enqueues it for sync.
    /// Throws if durable persistence fails so the caller never reports a false success.
    @discardableResult
    public func saveOfflineMemory(
        spaceId: String,
        authorId: String,
        title: String,
        content: String?,
        format: MemoryFormat,
        location: String?,
        tags: [String],
        mediaData: Data? = nil,
        mediaFileName: String? = nil,
        mediaMimeType: String? = nil,
        accountId: String? = nil
    ) throws -> DurableOfflineMemoryRecord {
        let memoryId = UUID().uuidString
        let mutationId = UUID().uuidString
        let nowISO = ISO8601DateFormatter().string(from: Date())

        var localAssetIds: [String] = []
        if let mediaData, !mediaData.isEmpty {
            let assetId = UUID().uuidString
            let resolvedName = mediaFileName ?? "memory_\(assetId.prefix(8)).jpg"
            let resolvedMime = mediaMimeType ?? "image/jpeg"
            let asset = try storage.saveOriginalMedia(
                data: mediaData,
                assetId: assetId,
                memoryId: memoryId,
                spaceId: spaceId,
                accountId: accountId,
                fileName: resolvedName,
                mimeType: resolvedMime
            )
            localAssetIds.append(asset.id)
        }

        let memory = Memory(
            id: memoryId,
            spaceId: spaceId,
            authorId: authorId,
            title: title,
            content: content,
            format: format,
            capturedAt: nowISO,
            location: location,
            tags: tags,
            revision: 1,
            clientMutationId: mutationId,
            createdAt: nowISO,
            updatedAt: nowISO
        )

        try storage.saveDurableOfflineMemory(
            memory,
            accountId: accountId,
            localMediaAssetIds: localAssetIds,
            syncState: .waitingToSync
        )

        let payload = CreateMemoryMutationPayload(memory: memory, localMediaAssetIds: localAssetIds)
        let payloadData = try JSONEncoder().encode(payload)
        let mutation = PendingMutation(
            id: mutationId,
            idempotencyKey: mutationId,
            entityType: "memory",
            action: "create",
            payload: payloadData,
            ownerAccountId: accountId,
            state: .pending
        )
        try storage.enqueueMutation(mutation)
        refreshCounts()

        return DurableOfflineMemoryRecord(
            memory: memory,
            accountId: accountId,
            localMediaAssetIds: localAssetIds,
            syncState: .waitingToSync
        )
    }

    @discardableResult
    public func enqueueMemoryUpdate(
        memory: Memory,
        title: String? = nil,
        content: String? = nil,
        location: String? = nil,
        isFavorite: Bool? = nil,
        tags: [String]? = nil,
        accountId: String? = nil
    ) throws -> PendingMutation {
        let nowISO = ISO8601DateFormatter().string(from: Date())
        let updatedLocal = Memory(
            id: memory.id,
            spaceId: memory.spaceId,
            authorId: memory.authorId,
            title: title ?? memory.title,
            content: content ?? memory.content,
            format: memory.format,
            capturedAt: memory.capturedAt,
            location: location ?? memory.location,
            latitude: memory.latitude,
            longitude: memory.longitude,
            isFavorite: isFavorite ?? memory.isFavorite,
            associatedProfileIds: memory.associatedProfileIds,
            mediaIds: memory.mediaIds,
            tags: tags ?? memory.tags,
            revision: memory.revision,
            clientMutationId: memory.clientMutationId,
            createdAt: memory.createdAt,
            updatedAt: nowISO
        )

        try storage.saveDurableOfflineMemory(
            updatedLocal,
            accountId: accountId,
            syncState: .waitingToSync
        )

        let payload = UpdateMemoryMutationPayload(
            memoryId: memory.id,
            spaceId: memory.spaceId,
            title: title,
            content: content,
            location: location,
            isFavorite: isFavorite,
            tags: tags,
            expectedRevision: memory.revision,
            expectedUpdatedAt: memory.updatedAt
        )
        let payloadData = try JSONEncoder().encode(payload)
        let mutation = PendingMutation(
            entityType: "memory",
            action: "update",
            payload: payloadData,
            ownerAccountId: accountId,
            state: .pending
        )
        try storage.enqueueMutation(mutation)
        refreshCounts()
        return mutation
    }

    public static func backoffInterval(retryCount: Int) -> TimeInterval {
        let base = min(300.0, pow(2.0, Double(max(0, retryCount))) * 2.0)
        let jitter = Double.random(in: 0...1.5)
        return base + jitter
    }

    public static func isConnectivityError(_ error: Error) -> Bool {
        let ns = error as NSError
        if ns.domain == NSURLErrorDomain {
            return true
        }
        return false
    }

    @discardableResult
    public func syncPendingMutations(accountId: String? = nil, force: Bool = false) async -> SyncRunSummary {
        guard !isSyncing else { return lastSyncSummary ?? SyncRunSummary() }
        guard await apiClient.getAuthToken() != nil else {
            refreshCounts()
            return SyncRunSummary()
        }

        isSyncing = true
        defer {
            isSyncing = false
            refreshCounts()
        }

        try? storage.resetInterruptedInProgressMutations()
        let activeAccountId: String?
        if let accountId {
            activeAccountId = accountId
        } else {
            activeAccountId = await apiClient.getCurrentUserId()
        }
        let queue = storage.loadPendingMutations()
        var summary = SyncRunSummary()
        let now = Date()

        for var mutation in queue {
            if mutation.state == .cancelled || mutation.state == .conflict {
                continue
            }
            if let owner = mutation.ownerAccountId, let activeAccountId, owner != activeAccountId {
                summary.skippedAccountMismatch += 1
                continue
            }
            if !force, let nextRetry = mutation.nextRetryAt, nextRetry > now {
                summary.skippedBackoff += 1
                continue
            }

            summary.attempted += 1
            mutation.state = .inProgress
            try? storage.updateMutation(mutation)

            if mutation.entityType == "memory" && mutation.action == "create" {
                do {
                    let payload = try JSONDecoder().decode(CreateMemoryMutationPayload.self, from: mutation.payload)
                    try? storage.updateOfflineMemorySyncState(memoryId: payload.memory.id, syncState: .syncing)

                    var uploadedMediaIds = payload.memory.mediaIds
                    for assetId in payload.localMediaAssetIds {
                        let existingAssets = storage.listLocalMediaAssets(forMemoryId: payload.memory.id)
                        if let existingAsset = existingAssets.first(where: { $0.id == assetId }),
                           let alreadyUploadedId = existingAsset.remoteMediaId {
                            if !uploadedMediaIds.contains(alreadyUploadedId) {
                                uploadedMediaIds.append(alreadyUploadedId)
                            }
                            continue
                        }

                        let (asset, data) = try storage.loadOriginalMediaData(assetId: assetId)
                        let remoteId = try await apiClient.uploadMedia(
                            spaceId: asset.spaceId,
                            fileName: asset.fileName,
                            mimeType: asset.mimeType,
                            data: data,
                            idempotencyKey: asset.id,
                            sha256: asset.sha256
                        )
                        try storage.markLocalMediaUploaded(assetId: asset.id, remoteMediaId: remoteId)
                        if !uploadedMediaIds.contains(remoteId) {
                            uploadedMediaIds.append(remoteId)
                        }
                    }

                    let syncedMemory = try await apiClient.createMemory(
                        spaceId: payload.memory.spaceId,
                        title: payload.memory.title,
                        content: payload.memory.content,
                        format: payload.memory.format.rawValue,
                        location: payload.memory.location,
                        tags: payload.memory.tags,
                        mediaIds: uploadedMediaIds,
                        id: payload.memory.id,
                        clientMutationId: mutation.idempotencyKey,
                        capturedAt: payload.memory.capturedAt
                    )

                    try? storage.updateOfflineMemorySyncState(
                        memoryId: payload.memory.id,
                        syncState: .synchronized,
                        serverMemory: syncedMemory,
                        lastError: nil
                    )
                    try? storage.removeMutation(id: mutation.id)
                    summary.succeeded += 1
                } catch {
                    mutation.retryCount += 1
                    mutation.state = .failed
                    mutation.lastError = error.localizedDescription
                    mutation.nextRetryAt = Date().addingTimeInterval(Self.backoffInterval(retryCount: mutation.retryCount))
                    try? storage.updateMutation(mutation)
                    if let payload = try? JSONDecoder().decode(CreateMemoryMutationPayload.self, from: mutation.payload) {
                        try? storage.updateOfflineMemorySyncState(
                            memoryId: payload.memory.id,
                            syncState: .syncFailed,
                            lastError: error.localizedDescription
                        )
                    }
                    summary.failed += 1
                    summary.lastError = error.localizedDescription
                }
            } else if mutation.entityType == "memory" && mutation.action == "update" {
                do {
                    let payload = try JSONDecoder().decode(UpdateMemoryMutationPayload.self, from: mutation.payload)
                    try? storage.updateOfflineMemorySyncState(memoryId: payload.memoryId, syncState: .syncing)

                    let updated = try await apiClient.updateMemory(
                        memoryId: payload.memoryId,
                        title: payload.title,
                        content: payload.content,
                        location: payload.location,
                        isFavorite: payload.isFavorite,
                        tags: payload.tags,
                        expectedRevision: payload.expectedRevision,
                        expectedUpdatedAt: payload.expectedUpdatedAt
                    )

                    try? storage.updateOfflineMemorySyncState(
                        memoryId: payload.memoryId,
                        syncState: .synchronized,
                        serverMemory: updated,
                        lastError: nil
                    )
                    try? storage.removeMutation(id: mutation.id)
                    summary.succeeded += 1
                } catch MemoriaAPIError.versionConflict(let serverMem) {
                    mutation.state = .conflict
                    mutation.lastError = "Modified on another device"
                    try? storage.updateMutation(mutation)

                    if let payload = try? JSONDecoder().decode(UpdateMemoryMutationPayload.self, from: mutation.payload),
                       let serverMem {
                        let localRec = storage.loadDurableOfflineMemories(forSpaceId: payload.spaceId)
                            .first(where: { $0.memory.id == payload.memoryId })
                        let localMem = localRec?.memory ?? serverMem
                        let conflict = SyncConflictRecord(
                            memoryId: payload.memoryId,
                            spaceId: payload.spaceId,
                            accountId: activeAccountId,
                            localMemory: localMem,
                            serverMemory: serverMem
                        )
                        try? storage.saveSyncConflict(conflict)
                        try? storage.updateOfflineMemorySyncState(
                            memoryId: payload.memoryId,
                            syncState: .conflict,
                            lastError: "Sync conflict detected"
                        )
                    }
                    summary.conflicts += 1
                } catch {
                    mutation.retryCount += 1
                    mutation.state = .failed
                    mutation.lastError = error.localizedDescription
                    mutation.nextRetryAt = Date().addingTimeInterval(Self.backoffInterval(retryCount: mutation.retryCount))
                    try? storage.updateMutation(mutation)
                    if let payload = try? JSONDecoder().decode(UpdateMemoryMutationPayload.self, from: mutation.payload) {
                        try? storage.updateOfflineMemorySyncState(
                            memoryId: payload.memoryId,
                            syncState: .syncFailed,
                            lastError: error.localizedDescription
                        )
                    }
                    summary.failed += 1
                    summary.lastError = error.localizedDescription
                }
            }
        }

        lastSyncSummary = summary
        return summary
    }

    public func resolveConflict(conflictId: String, resolution: SyncConflictResolution) async throws {
        let conflicts = storage.loadSyncConflicts()
        guard let conflict = conflicts.first(where: { $0.id == conflictId }) else { return }

        switch resolution {
        case .keepServer:
            try storage.updateOfflineMemorySyncState(
                memoryId: conflict.memoryId,
                syncState: .synchronized,
                serverMemory: conflict.serverMemory,
                lastError: nil
            )
            for m in storage.loadPendingMutations() where m.state == .conflict {
                if let p = try? JSONDecoder().decode(UpdateMemoryMutationPayload.self, from: m.payload),
                   p.memoryId == conflict.memoryId {
                    try? storage.removeMutation(id: m.id)
                }
            }
            try storage.resolveSyncConflict(id: conflictId)

        case .keepLocal:
            let updated = try await apiClient.updateMemory(
                memoryId: conflict.memoryId,
                title: conflict.localMemory.title,
                content: conflict.localMemory.content,
                location: conflict.localMemory.location,
                isFavorite: conflict.localMemory.isFavorite,
                tags: conflict.localMemory.tags,
                expectedRevision: conflict.serverMemory.revision
            )
            try storage.updateOfflineMemorySyncState(
                memoryId: conflict.memoryId,
                syncState: .synchronized,
                serverMemory: updated,
                lastError: nil
            )
            for m in storage.loadPendingMutations() where m.state == .conflict {
                if let p = try? JSONDecoder().decode(UpdateMemoryMutationPayload.self, from: m.payload),
                   p.memoryId == conflict.memoryId {
                    try? storage.removeMutation(id: m.id)
                }
            }
            try storage.resolveSyncConflict(id: conflictId)

        case .keepBoth:
            let copyTitle = "\(conflict.localMemory.title) (Offline Copy)"
            let createdCopy = try await apiClient.createMemory(
                spaceId: conflict.spaceId,
                title: copyTitle,
                content: conflict.localMemory.content,
                format: conflict.localMemory.format.rawValue,
                location: conflict.localMemory.location,
                tags: conflict.localMemory.tags,
                mediaIds: conflict.localMemory.mediaIds,
                clientMutationId: UUID().uuidString
            )
            try storage.saveDurableOfflineMemory(createdCopy, accountId: conflict.accountId, syncState: .synchronized)
            try storage.updateOfflineMemorySyncState(
                memoryId: conflict.memoryId,
                syncState: .synchronized,
                serverMemory: conflict.serverMemory,
                lastError: nil
            )
            for m in storage.loadPendingMutations() where m.state == .conflict {
                if let p = try? JSONDecoder().decode(UpdateMemoryMutationPayload.self, from: m.payload),
                   p.memoryId == conflict.memoryId {
                    try? storage.removeMutation(id: m.id)
                }
            }
            try storage.resolveSyncConflict(id: conflictId)
        }
        refreshCounts()
    }
}
