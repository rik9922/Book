import Foundation

#if canImport(RealityKit) && os(iOS)
import RealityKit
import UIKit
#endif

public struct MaterialCacheKey: Hashable, Sendable {
    public let leather: BookLeatherSwatch
    public let foil: BookFoilSwatch
    public let enableClearcoat: Bool

    public init(leather: BookLeatherSwatch, foil: BookFoilSwatch, enableClearcoat: Bool) {
        self.leather = leather
        self.foil = foil
        self.enableClearcoat = enableClearcoat
    }
}

public struct SpreadTextureEntry: Sendable, Equatable {
    public let spreadIndex: Int
    public let maxDimension: Int
    public let estimatedBytes: Int
    public let lastAccessedAt: Date

    public init(spreadIndex: Int, maxDimension: Int, estimatedBytes: Int, lastAccessedAt: Date = Date()) {
        self.spreadIndex = spreadIndex
        self.maxDimension = maxDimension
        self.estimatedBytes = estimatedBytes
        self.lastAccessedAt = lastAccessedAt
    }
}

@MainActor
public final class TextureResourceManager {
    public static let shared = TextureResourceManager()

    public private(set) var budgetBytes: Int = 10 * 1024 * 1024
    public private(set) var maxTextureDimension: Int = 512
    public private(set) var residentSpreads: [Int: SpreadTextureEntry] = [:]
    public private(set) var evictionCount: Int = 0

    #if canImport(RealityKit) && os(iOS)
    private struct MaterialBundle {
        let leather: PhysicallyBasedMaterial
        let foil: PhysicallyBasedMaterial
        let paper: PhysicallyBasedMaterial
        let ribbon: PhysicallyBasedMaterial
    }

    private var materialCache: [MaterialCacheKey: MaterialBundle] = [:]
    #endif

    public init() {}

    public var residentMemoryBytes: Int {
        residentSpreads.values.reduce(0) { $0 + $1.estimatedBytes }
    }

    public func updateBudget(bytes: Int, maxDimension: Int) {
        budgetBytes = max(0, bytes)
        maxTextureDimension = max(128, maxDimension)
        enforceBudget(protecting: nil)
    }

    /// Retains active spread `N` and immediate neighbors (`N-1`, `N+1`) when budget permits,
    /// evicting off-window spreads to keep VRAM bounded.
    public func prepareSpreadWindow(
        activeSpreadIndex: Int,
        totalSpreads: Int,
        allowAdjacentPreload: Bool
    ) {
        guard totalSpreads > 0, budgetBytes > 0 else {
            evictAllSpreads()
            return
        }

        let safeActive = max(0, min(totalSpreads - 1, activeSpreadIndex))
        var desiredIndices = Set<Int>([safeActive])
        if allowAdjacentPreload {
            if safeActive - 1 >= 0 { desiredIndices.insert(safeActive - 1) }
            if safeActive + 1 < totalSpreads { desiredIndices.insert(safeActive + 1) }
        }

        // Evict spreads outside the active window first
        for existingIdx in Array(residentSpreads.keys) where !desiredIndices.contains(existingIdx) {
            residentSpreads.removeValue(forKey: existingIdx)
            evictionCount += 1
        }

        // Estimate uncompressed RGBA footprint for procedural spread proof buffer if needed
        let perSpreadBytes = min(budgetBytes, maxTextureDimension * maxTextureDimension * 4)
        let now = Date()
        for idx in desiredIndices.sorted() {
            if residentSpreads[idx] == nil && (residentMemoryBytes + perSpreadBytes <= budgetBytes || idx == safeActive) {
                residentSpreads[idx] = SpreadTextureEntry(
                    spreadIndex: idx,
                    maxDimension: maxTextureDimension,
                    estimatedBytes: perSpreadBytes,
                    lastAccessedAt: idx == safeActive ? now : now.addingTimeInterval(-1)
                )
            } else if var existing = residentSpreads[idx], idx == safeActive {
                existing = SpreadTextureEntry(
                    spreadIndex: idx,
                    maxDimension: maxTextureDimension,
                    estimatedBytes: existing.estimatedBytes,
                    lastAccessedAt: now
                )
                residentSpreads[idx] = existing
            }
        }

        enforceBudget(protecting: safeActive)
    }

    public func handleMemoryPressure(_ level: MemoryPressureLevel, activeSpreadIndex: Int?) {
        switch level {
        case .normal:
            break
        case .warning:
            for idx in Array(residentSpreads.keys) where idx != activeSpreadIndex {
                residentSpreads.removeValue(forKey: idx)
                evictionCount += 1
            }
        case .critical:
            evictAllSpreads()
            #if canImport(RealityKit) && os(iOS)
            materialCache.removeAll()
            #endif
        }
    }

    public func evictAllSpreads() {
        if !residentSpreads.isEmpty {
            evictionCount += residentSpreads.count
            residentSpreads.removeAll()
        }
    }

    private func enforceBudget(protecting protectedSpreadIndex: Int?) {
        while residentMemoryBytes > budgetBytes {
            let candidates = residentSpreads.values
                .filter { $0.spreadIndex != protectedSpreadIndex }
                .sorted { $0.lastAccessedAt < $1.lastAccessedAt }
            guard let victim = candidates.first else {
                if protectedSpreadIndex == nil {
                    evictAllSpreads()
                }
                break
            }
            residentSpreads.removeValue(forKey: victim.spreadIndex)
            evictionCount += 1
        }
    }

    #if canImport(RealityKit) && os(iOS)
    public func applyCachedMaterials(
        to root: Entity,
        leather: BookLeatherSwatch,
        foil: BookFoilSwatch,
        enableClearcoat: Bool
    ) {
        let key = MaterialCacheKey(leather: leather, foil: foil, enableClearcoat: enableClearcoat)
        let bundle: MaterialBundle
        if let existing = materialCache[key] {
            bundle = existing
        } else {
            bundle = MaterialBundle(
                leather: Self.makePBRMaterial(
                    hex: leather.hexUInt,
                    metallic: leather.metallic,
                    roughness: leather.roughness,
                    clearcoat: enableClearcoat ? leather.clearcoat : 0
                ),
                foil: Self.makePBRMaterial(
                    hex: foil.effectiveHexUInt(for: leather),
                    metallic: foil.metallic,
                    roughness: foil.roughness,
                    clearcoat: enableClearcoat ? foil.clearcoat : 0
                ),
                paper: Self.makePBRMaterial(
                    hex: 0xF7F4EE,
                    metallic: 0.0,
                    roughness: 0.95,
                    clearcoat: 0.0
                ),
                ribbon: Self.makePBRMaterial(
                    hex: 0x849483,
                    metallic: 0.35,
                    roughness: 0.45,
                    clearcoat: enableClearcoat ? 0.12 : 0.0
                )
            )
            // Keep material cache small and bounded
            if materialCache.count >= 16 {
                materialCache.removeAll()
            }
            materialCache[key] = bundle
        }

        Self.traverseApplyingMaterials(
            entity: root,
            leather: bundle.leather,
            foil: bundle.foil,
            paper: bundle.paper,
            ribbon: bundle.ribbon
        )
    }

    private static func makePBRMaterial(
        hex: UInt,
        metallic: Float,
        roughness: Float,
        clearcoat: Float
    ) -> PhysicallyBasedMaterial {
        var mat = PhysicallyBasedMaterial()
        let color = UIColor(
            red: CGFloat((hex >> 16) & 0xff) / 255.0,
            green: CGFloat((hex >> 08) & 0xff) / 255.0,
            blue: CGFloat((hex >> 00) & 0xff) / 255.0,
            alpha: 1.0
        )
        mat.baseColor = .init(tint: color)
        mat.metallic = .init(floatLiteral: metallic)
        mat.roughness = .init(floatLiteral: roughness)
        if clearcoat > 0 {
            mat.clearcoat = .init(floatLiteral: clearcoat)
            mat.clearcoatRoughness = .init(floatLiteral: 0.4)
        }
        mat.faceCulling = .none
        return mat
    }

    private static func traverseApplyingMaterials(
        entity: Entity,
        leather: PhysicallyBasedMaterial,
        foil: PhysicallyBasedMaterial,
        paper: PhysicallyBasedMaterial,
        ribbon: PhysicallyBasedMaterial
    ) {
        let name = entity.name
        let parentName = entity.parent?.name ?? ""

        if var model = entity.components[ModelComponent.self] {
            if name == Book3DHierarchy.frontCover
                || name == Book3DHierarchy.backCover
                || name == Book3DHierarchy.spine
                || parentName == Book3DHierarchy.frontCover
                || parentName == Book3DHierarchy.backCover
                || parentName == Book3DHierarchy.spine {
                model.materials = [leather]
            } else if name == Book3DHierarchy.emblem
                || name == Book3DHierarchy.cornerGuards
                || parentName == Book3DHierarchy.emblem
                || parentName == Book3DHierarchy.cornerGuards {
                model.materials = [foil]
            } else if name == Book3DHierarchy.ribbon
                || parentName == Book3DHierarchy.ribbon {
                model.materials = [ribbon]
            } else if name == Book3DHierarchy.textBlock
                || name == Book3DHierarchy.turningPageLeaf
                || parentName == Book3DHierarchy.textBlock
                || parentName == Book3DHierarchy.turningPageLeaf {
                model.materials = [paper]
            }
            entity.components.set(model)
        }

        for child in entity.children {
            traverseApplyingMaterials(
                entity: child,
                leather: leather,
                foil: foil,
                paper: paper,
                ribbon: ribbon
            )
        }
    }
    #endif
}
