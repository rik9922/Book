import Foundation

#if canImport(RealityKit) && os(iOS)
import RealityKit
import UIKit
import CoreGraphics
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
    private var spreadTextureCache: [Int: (dimension: Int, texture: TextureResource)] = [:]
    private var leatherGrainCache: [Int: TextureResource] = [:]
    #endif

    public init() {}

    public var residentMemoryBytes: Int {
        residentSpreads.values.reduce(0) { $0 + $1.estimatedBytes }
    }

    public func updateBudget(bytes: Int, maxDimension: Int) {
        budgetBytes = max(0, bytes)
        let clampedDim = max(128, maxDimension)
        maxTextureDimension = clampedDim

        // Evict any resident spreads encoded above the new dimension cap so VRAM shrinks on downgrade
        for (idx, entry) in residentSpreads where entry.maxDimension > clampedDim {
            residentSpreads.removeValue(forKey: idx)
            evictCachedSpreadTexture(at: idx)
            evictionCount += 1
        }
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
            evictCachedSpreadTexture(at: existingIdx)
            evictionCount += 1
        }

        // 2:1 spread aspect footprint (width = maxTextureDimension, height = maxTextureDimension / 2)
        let width = maxTextureDimension
        let height = max(64, maxTextureDimension / 2)
        let perSpreadBytes = min(budgetBytes, width * height * 4)
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
                evictCachedSpreadTexture(at: idx)
                evictionCount += 1
            }
            #if canImport(RealityKit) && os(iOS)
            leatherGrainCache.removeAll()
            #endif
        case .critical:
            evictAllSpreads()
            #if canImport(RealityKit) && os(iOS)
            materialCache.removeAll()
            leatherGrainCache.removeAll()
            #endif
        }
    }

    public func evictAllSpreads() {
        if !residentSpreads.isEmpty {
            evictionCount += residentSpreads.count
            residentSpreads.removeAll()
        }
        #if canImport(RealityKit) && os(iOS)
        spreadTextureCache.removeAll()
        #endif
    }

    private func evictCachedSpreadTexture(at index: Int) {
        #if canImport(RealityKit) && os(iOS)
        spreadTextureCache.removeValue(forKey: index)
        #endif
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
            evictCachedSpreadTexture(at: victim.spreadIndex)
            evictionCount += 1
        }
    }

    #if canImport(RealityKit) && os(iOS)
    public func spreadMaterial(for spread: BookSpreadPreview) -> PhysicallyBasedMaterial {
        var mat = PhysicallyBasedMaterial()
        mat.metallic = .init(floatLiteral: 0.0)
        mat.roughness = .init(floatLiteral: 0.92)
        mat.faceCulling = .none

        if let texture = cachedOrRenderedSpreadTexture(for: spread) {
            mat.baseColor = .init(tint: .white, texture: .init(texture))
        } else {
            mat.baseColor = .init(tint: UIColor(red: 0.969, green: 0.957, blue: 0.933, alpha: 1.0))
        }
        return mat
    }

    public func cachedSpreadTextureCount() -> Int {
        spreadTextureCache.count
    }

    private func cachedOrRenderedSpreadTexture(for spread: BookSpreadPreview) -> TextureResource? {
        guard budgetBytes > 0 else { return nil }
        let targetWidth = max(256, min(1024, maxTextureDimension))
        if let cached = spreadTextureCache[spread.spreadIndex], cached.dimension == targetWidth {
            return cached.texture
        }

        let targetHeight = max(128, targetWidth / 2)
        guard let cgImage = Self.renderSpreadCGImage(spread: spread, width: targetWidth, height: targetHeight) else {
            return nil
        }

        let texture: TextureResource?
        if #available(iOS 18.0, *) {
            texture = try? TextureResource(image: cgImage, options: .init(semantic: .color))
        } else {
            texture = try? TextureResource.generate(from: cgImage, options: .init(semantic: .color))
        }

        if let texture {
            spreadTextureCache[spread.spreadIndex] = (dimension: targetWidth, texture: texture)
            if residentSpreads[spread.spreadIndex] == nil {
                prepareSpreadWindow(
                    activeSpreadIndex: spread.spreadIndex,
                    totalSpreads: max(spread.spreadIndex + 1, Book3DSampleData.sampleSpreads.count),
                    allowAdjacentPreload: false
                )
            }
        }
        return texture
    }

    private func leatherGrainRoughnessTexture() -> TextureResource? {
        guard budgetBytes >= 6 * 1024 * 1024 else { return nil }
        let dim = min(256, maxTextureDimension)
        if let existing = leatherGrainCache[dim] {
            return existing
        }
        guard let cgImage = Self.renderLeatherGrainCGImage(dimension: dim) else { return nil }
        let texture: TextureResource?
        if #available(iOS 18.0, *) {
            texture = try? TextureResource(image: cgImage, options: .init(semantic: .raw))
        } else {
            texture = try? TextureResource.generate(from: cgImage, options: .init(semantic: .raw))
        }
        if let texture {
            leatherGrainCache[dim] = texture
        }
        return texture
    }

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
            let grainTex = enableClearcoat ? leatherGrainRoughnessTexture() : nil
            bundle = MaterialBundle(
                leather: Self.makePBRMaterial(
                    hex: leather.hexUInt,
                    metallic: leather.metallic,
                    roughness: leather.roughness,
                    clearcoat: enableClearcoat ? leather.clearcoat : 0,
                    roughnessTexture: grainTex
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
        clearcoat: Float,
        roughnessTexture: TextureResource? = nil
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
        if let roughnessTexture {
            mat.roughness = .init(scale: roughness, texture: .init(roughnessTexture))
        } else {
            mat.roughness = .init(floatLiteral: roughness)
        }
        if clearcoat > 0 {
            mat.clearcoat = .init(floatLiteral: clearcoat)
            mat.clearcoatRoughness = .init(floatLiteral: 0.4)
        }
        mat.faceCulling = .none
        return mat
    }

    private static func renderLeatherGrainCGImage(dimension: Int) -> CGImage? {
        let size = max(64, dimension)
        var bytes = [UInt8](repeating: 215, count: size * size * 4)
        for y in 0..<size {
            for x in 0..<size {
                // Deterministic pseudo-pebble leather grain hash
                let h = UInt32(truncatingIfNeeded: (x &* 73856093) ^ (y &* 19349663))
                let grain = UInt8(185 + (h % 60))
                let idx = (y * size + x) * 4
                bytes[idx] = grain
                bytes[idx + 1] = grain
                bytes[idx + 2] = grain
                bytes[idx + 3] = 255
            }
        }
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        guard let provider = CGDataProvider(data: Data(bytes) as CFData) else { return nil }
        return CGImage(
            width: size,
            height: size,
            bitsPerComponent: 8,
            bitsPerPixel: 32,
            bytesPerRow: size * 4,
            space: colorSpace,
            bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
            provider: provider,
            decode: nil,
            shouldInterpolate: true,
            intent: .defaultIntent
        )
    }

    private static func renderSpreadCGImage(spread: BookSpreadPreview, width: Int, height: Int) -> CGImage? {
        let rendererFormat = UIGraphicsImageRendererFormat()
        rendererFormat.scale = 1.0
        rendererFormat.opaque = true

        let rect = CGRect(x: 0, y: 0, width: width, height: height)
        let renderer = UIGraphicsImageRenderer(size: rect.size, format: rendererFormat)
        let uiImage = renderer.image { ctx in
            let cg = ctx.cgContext

            // Warm Ivory cotton-rag background (#F7F4EE)
            UIColor(red: 0.969, green: 0.957, blue: 0.933, alpha: 1.0).setFill()
            cg.fill(rect)

            // Center gutter shadow crease
            let gutterWidth = CGFloat(width) * 0.04
            let gutterRect = CGRect(x: (CGFloat(width) - gutterWidth) / 2.0, y: 0, width: gutterWidth, height: CGFloat(height))
            UIColor(red: 0.85, green: 0.82, blue: 0.77, alpha: 0.65).setFill()
            cg.fill(gutterRect)

            let scale = CGFloat(width) / 512.0
            let padX = 20.0 * scale
            let padY = 20.0 * scale
            let halfW = CGFloat(width) / 2.0
            let colW = halfW - padX * 1.6

            let ink = UIColor(red: 0.125, green: 0.141, blue: 0.173, alpha: 1.0)
            let plum = UIColor(red: 0.463, green: 0.333, blue: 0.435, alpha: 1.0)
            let sage = UIColor(red: 0.373, green: 0.451, blue: 0.369, alpha: 1.0)
            let bodyColor = UIColor(red: 0.157, green: 0.153, blue: 0.165, alpha: 1.0)

            let metaAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 9 * scale, weight: .semibold),
                .foregroundColor: plum
            ]
            let locAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 8.5 * scale, weight: .medium),
                .foregroundColor: sage
            ]
            let titleAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 13 * scale, weight: .bold),
                .foregroundColor: ink
            ]
            let bodyAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 10 * scale, weight: .regular),
                .foregroundColor: bodyColor
            ]

            // Left page
            let leftOriginX = padX
            (spread.leftDate.uppercased() as NSString).draw(
                in: CGRect(x: leftOriginX, y: padY, width: colW, height: 14 * scale),
                withAttributes: metaAttrs
            )
            (spread.leftLocation as NSString).draw(
                in: CGRect(x: leftOriginX, y: padY + 13 * scale, width: colW, height: 14 * scale),
                withAttributes: locAttrs
            )
            (spread.leftHeading as NSString).draw(
                in: CGRect(x: leftOriginX, y: padY + 32 * scale, width: colW, height: 36 * scale),
                withAttributes: titleAttrs
            )
            (spread.leftBody as NSString).draw(
                in: CGRect(x: leftOriginX, y: padY + 72 * scale, width: colW, height: CGFloat(height) - padY * 2 - 84 * scale),
                withAttributes: bodyAttrs
            )
            ("p. \(spread.leftPageNumber)" as NSString).draw(
                at: CGPoint(x: leftOriginX, y: CGFloat(height) - padY - 12 * scale),
                withAttributes: locAttrs
            )

            // Right page
            let rightOriginX = halfW + padX * 0.6
            (spread.rightDate.uppercased() as NSString).draw(
                in: CGRect(x: rightOriginX, y: padY, width: colW, height: 14 * scale),
                withAttributes: metaAttrs
            )
            (spread.rightLocation as NSString).draw(
                in: CGRect(x: rightOriginX, y: padY + 13 * scale, width: colW, height: 14 * scale),
                withAttributes: locAttrs
            )
            (spread.rightHeading as NSString).draw(
                in: CGRect(x: rightOriginX, y: padY + 32 * scale, width: colW, height: 36 * scale),
                withAttributes: titleAttrs
            )
            (spread.rightBody as NSString).draw(
                in: CGRect(x: rightOriginX, y: padY + 72 * scale, width: colW, height: CGFloat(height) - padY * 2 - 110 * scale),
                withAttributes: bodyAttrs
            )
            if let inscription = spread.ocrInscription {
                ("\"\(inscription)\"" as NSString).draw(
                    in: CGRect(x: rightOriginX, y: CGFloat(height) - padY - 46 * scale, width: colW, height: 32 * scale),
                    withAttributes: metaAttrs
                )
            }
            ("p. \(spread.rightPageNumber)" as NSString).draw(
                at: CGPoint(x: rightOriginX + colW - 28 * scale, y: CGFloat(height) - padY - 12 * scale),
                withAttributes: locAttrs
            )
        }
        return uiImage.cgImage
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
