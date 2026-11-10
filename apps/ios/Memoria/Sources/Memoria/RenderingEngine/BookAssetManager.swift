import Foundation

#if canImport(RealityKit) && os(iOS)
import RealityKit
#endif

public struct BookAssetCacheKey: Hashable, Sendable {
    public let modelId: String
    public let version: String
    public let variant: Book3DAssetVariant

    public init(
        modelId: String = "memoria_heirloom_book_v2",
        version: String = Book3DDimensions.modelVersion,
        variant: Book3DAssetVariant
    ) {
        self.modelId = modelId
        self.version = version
        self.variant = variant
    }

    public var cacheIdentifier: String {
        "\(modelId)@\(version)#\(variant.rawValue)"
    }
}

public struct AssetCacheEntryMetadata: Sendable, Equatable {
    public let key: BookAssetCacheKey
    public let estimatedBytes: Int
    public let loadDurationMs: Double
    public var lastAccessedAt: Date
    public var accessCount: Int

    public init(
        key: BookAssetCacheKey,
        estimatedBytes: Int,
        loadDurationMs: Double,
        lastAccessedAt: Date = Date(),
        accessCount: Int = 1
    ) {
        self.key = key
        self.estimatedBytes = estimatedBytes
        self.loadDurationMs = loadDurationMs
        self.lastAccessedAt = lastAccessedAt
        self.accessCount = accessCount
    }
}

@MainActor
public final class BookAssetCacheRegistry {
    private var entries: [BookAssetCacheKey: AssetCacheEntryMetadata] = [:]
    public private(set) var budgetBytes: Int
    public private(set) var evictionCount: Int = 0

    public init(budgetBytes: Int = 6 * 1024 * 1024) {
        self.budgetBytes = max(0, budgetBytes)
    }

    public var totalCachedBytes: Int {
        entries.values.reduce(0) { $0 + $1.estimatedBytes }
    }

    public var cachedKeys: [BookAssetCacheKey] {
        Array(entries.keys)
    }

    public func updateBudget(_ newBudgetBytes: Int) -> [BookAssetCacheKey] {
        budgetBytes = max(0, newBudgetBytes)
        return evictIfNeeded(excluding: nil)
    }

    public func recordAccess(key: BookAssetCacheKey, at date: Date = Date()) -> AssetCacheEntryMetadata? {
        guard var existing = entries[key] else { return nil }
        existing.lastAccessedAt = date
        existing.accessCount += 1
        entries[key] = existing
        return existing
    }

    @discardableResult
    public func insert(
        key: BookAssetCacheKey,
        estimatedBytes: Int,
        loadDurationMs: Double,
        at date: Date = Date(),
        protectedKey: BookAssetCacheKey? = nil
    ) -> [BookAssetCacheKey] {
        entries[key] = AssetCacheEntryMetadata(
            key: key,
            estimatedBytes: max(0, estimatedBytes),
            loadDurationMs: loadDurationMs,
            lastAccessedAt: date,
            accessCount: 1
        )
        return evictIfNeeded(excluding: protectedKey ?? key)
    }

    public func evict(key: BookAssetCacheKey) -> Bool {
        guard entries.removeValue(forKey: key) != nil else { return false }
        evictionCount += 1
        return true
    }

    public func evictInactive(keeping activeKey: BookAssetCacheKey?) -> [BookAssetCacheKey] {
        var removed: [BookAssetCacheKey] = []
        for key in Array(entries.keys) where key != activeKey {
            entries.removeValue(forKey: key)
            removed.append(key)
            evictionCount += 1
        }
        return removed
    }

    public func evictAll() -> [BookAssetCacheKey] {
        let removed = Array(entries.keys)
        if !removed.isEmpty {
            entries.removeAll()
            evictionCount += removed.count
        }
        return removed
    }

    private func evictIfNeeded(excluding protectedKey: BookAssetCacheKey?) -> [BookAssetCacheKey] {
        var evicted: [BookAssetCacheKey] = []
        while totalCachedBytes > budgetBytes {
            let candidates = entries.values
                .filter { $0.key != protectedKey }
                .sorted { $0.lastAccessedAt < $1.lastAccessedAt }

            guard let victim = candidates.first else {
                break
            }
            entries.removeValue(forKey: victim.key)
            evicted.append(victim.key)
            evictionCount += 1
        }
        return evicted
    }
}

@MainActor
public final class BookAssetManager {
    public static let shared = BookAssetManager()

    public let registry: BookAssetCacheRegistry
    public private(set) var consecutiveFailureCount: Int = 0
    public private(set) var lastFailureMessage: String?

    #if canImport(RealityKit) && os(iOS)
    private var templateCache: [BookAssetCacheKey: Entity] = [:]
    private var inFlightLoads: [BookAssetCacheKey: Task<Entity, Error>] = [:]
    #endif

    public init(budgetBytes: Int = 6 * 1024 * 1024) {
        self.registry = BookAssetCacheRegistry(budgetBytes: budgetBytes)
    }

    public func applyBudget(_ budgetBytes: Int) {
        let evicted = registry.updateBudget(budgetBytes)
        removeCachedTemplates(for: evicted)
    }

    public func handleMemoryPressure(_ level: MemoryPressureLevel, activeVariant: Book3DAssetVariant?) {
        let activeKey = activeVariant.map { BookAssetCacheKey(variant: $0) }
        switch level {
        case .normal:
            break
        case .warning:
            let evicted = registry.evictInactive(keeping: activeKey)
            removeCachedTemplates(for: evicted)
        case .critical:
            let evicted = registry.evictAll()
            removeCachedTemplates(for: evicted)
            cancelAllInFlightLoads()
        }
    }

    public func trimForBackground(keeping activeVariant: Book3DAssetVariant?) {
        let activeKey = activeVariant.map { BookAssetCacheKey(variant: $0) }
        let evicted = registry.evictInactive(keeping: activeKey)
        removeCachedTemplates(for: evicted)
    }

    public func resetFailureCounter() {
        consecutiveFailureCount = 0
        lastFailureMessage = nil
    }

    private func removeCachedTemplates(for keys: [BookAssetCacheKey]) {
        #if canImport(RealityKit) && os(iOS)
        for key in keys {
            templateCache.removeValue(forKey: key)
        }
        #endif
    }

    public func cancelAllInFlightLoads() {
        #if canImport(RealityKit) && os(iOS)
        for task in inFlightLoads.values {
            task.cancel()
        }
        inFlightLoads.removeAll()
        #endif
    }

    #if canImport(RealityKit) && os(iOS)
    public func loadBookSceneRoot(
        variant: Book3DAssetVariant,
        modelId: String = "memoria_heirloom_book_v2",
        version: String = Book3DDimensions.modelVersion
    ) async throws -> (entity: Entity, loadDurationMs: Double, cacheHit: Bool) {
        let key = BookAssetCacheKey(modelId: modelId, version: version, variant: variant)

        if let cachedTemplate = templateCache[key] {
            let start = ContinuousClock.now
            let cloned = cachedTemplate.clone(recursive: true)
            let elapsed = durationMs(since: start)
            _ = registry.recordAccess(key: key)
            resetFailureCounter()
            return (cloned, elapsed, true)
        }

        if let existingTask = inFlightLoads[key] {
            let start = ContinuousClock.now
            let template = try await existingTask.value
            let elapsed = durationMs(since: start)
            return (template.clone(recursive: true), elapsed, true)
        }

        let start = ContinuousClock.now
        let task = Task<Entity, Error> { @MainActor in
            if let usdzURL = Book3DAssetLocator.locateBundledUSDZ(variant: variant) {
                if #available(iOS 18.0, *) {
                    return try await Entity(contentsOf: usdzURL)
                } else {
                    return try Entity.load(contentsOf: usdzURL)
                }
            }
            return Self.makeProceduralFallbackBookHierarchy()
        }

        inFlightLoads[key] = task

        do {
            let loadedTemplate = try await task.value
            inFlightLoads.removeValue(forKey: key)

            let elapsedMs = durationMs(since: start)
            templateCache[key] = loadedTemplate
            let evicted = registry.insert(
                key: key,
                estimatedBytes: variant.estimatedMemoryBytes,
                loadDurationMs: elapsedMs,
                protectedKey: key
            )
            removeCachedTemplates(for: evicted)
            resetFailureCounter()
            return (loadedTemplate.clone(recursive: true), elapsedMs, false)
        } catch {
            inFlightLoads.removeValue(forKey: key)
            if !(error is CancellationError) {
                consecutiveFailureCount += 1
                lastFailureMessage = error.localizedDescription
            }
            throw error
        }
    }

    private func durationMs(since start: ContinuousClock.Instant) -> Double {
        let duration = ContinuousClock.now - start
        let components = duration.components
        return Double(components.seconds) * 1000.0 + Double(components.attoseconds) / 1_000_000_000_000_000.0
    }

    public static func makeProceduralFallbackBookHierarchy() -> Entity {
        let root = Entity()
        root.name = Book3DHierarchy.root

        let w = Book3DDimensions.bookWidth
        let h = Book3DDimensions.bookHeight
        let bt = Book3DDimensions.boardThickness
        let tt = Book3DDimensions.textblockThickness

        let backCover = ModelEntity(mesh: .generateBox(size: [w, bt, h]))
        backCover.name = Book3DHierarchy.backCover
        backCover.position = [w / 2, -(tt / 2 + bt / 2), 0]
        root.addChild(backCover)

        let spine = ModelEntity(mesh: .generateBox(size: [bt * 2, tt + bt * 2, h]))
        spine.name = Book3DHierarchy.spine
        spine.position = [0, 0, 0]
        root.addChild(spine)

        let textBlock = ModelEntity(mesh: .generateBox(size: [w - 0.008, tt, h - 0.010]))
        textBlock.name = Book3DHierarchy.textBlock
        textBlock.position = [(w - 0.008) / 2 + 0.004, 0, 0]
        root.addChild(textBlock)

        let ribbon = ModelEntity(mesh: .generateBox(size: [0.012, 0.0005, h * 1.15]))
        ribbon.name = Book3DHierarchy.ribbon
        ribbon.position = [w * 0.48, tt * 0.5 + 0.0003, 0.025]
        root.addChild(ribbon)

        let frontHinge = Entity()
        frontHinge.name = Book3DHierarchy.frontCoverHinge
        let frontCover = ModelEntity(mesh: .generateBox(size: [w, bt, h]))
        frontCover.name = Book3DHierarchy.frontCover
        frontCover.position = [w / 2, tt / 2 + bt / 2, 0]
        frontHinge.addChild(frontCover)

        let emblem = ModelEntity(mesh: .generateBox(size: [0.09, 0.0014, 0.09], cornerRadius: 0.045))
        emblem.name = Book3DHierarchy.emblem
        emblem.position = [w * 0.52, tt / 2 + bt + 0.0007, 0]
        frontHinge.addChild(emblem)

        let cornerGuards = ModelEntity(mesh: .generateBox(size: [0.03, 0.0012, 0.03]))
        cornerGuards.name = Book3DHierarchy.cornerGuards
        cornerGuards.position = [w - 0.015, tt / 2 + bt + 0.0006, h / 2 - 0.015]
        frontHinge.addChild(cornerGuards)
        root.addChild(frontHinge)

        let pageHinge = Entity()
        pageHinge.name = Book3DHierarchy.turningPageHinge
        pageHinge.position = [0.005, tt * 0.45, 0]
        let turningPage = ModelEntity(mesh: .generateBox(size: [w - 0.008, 0.0005, h - 0.010]))
        turningPage.name = Book3DHierarchy.turningPageLeaf
        turningPage.position = [(w - 0.008) / 2, 0.001, 0]
        pageHinge.addChild(turningPage)
        root.addChild(pageHinge)

        return root
    }
    #endif
}
