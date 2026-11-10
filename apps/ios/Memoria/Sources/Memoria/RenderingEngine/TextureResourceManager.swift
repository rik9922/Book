import Foundation

#if canImport(RealityKit) && os(iOS)
import RealityKit
import UIKit
import CoreGraphics
#endif

public enum BookPageSide: String, Hashable, Sendable {
    case left
    case right
}

public struct PageTextureCacheKey: Hashable, Sendable {
    public let spreadIndex: Int
    public let side: BookPageSide
    public let paperStock: BookPaperStock
    public let dimension: Int
    public let contentSignature: String

    public init(
        spreadIndex: Int,
        side: BookPageSide,
        paperStock: BookPaperStock,
        dimension: Int,
        contentSignature: String = ""
    ) {
        self.spreadIndex = spreadIndex
        self.side = side
        self.paperStock = paperStock
        self.dimension = dimension
        self.contentSignature = contentSignature
    }
}

public struct MaterialCacheKey: Hashable, Sendable {
    public let leather: BookLeatherSwatch
    public let foil: BookFoilSwatch
    public let paperStock: BookPaperStock
    public let ribbonColor: BookRibbonColor
    public let enableClearcoat: Bool

    public init(
        leather: BookLeatherSwatch,
        foil: BookFoilSwatch,
        paperStock: BookPaperStock = .warmCotton,
        ribbonColor: BookRibbonColor = .sage,
        enableClearcoat: Bool
    ) {
        self.leather = leather
        self.foil = foil
        self.paperStock = paperStock
        self.ribbonColor = ribbonColor
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
        let endpaper: PhysicallyBasedMaterial
        let ribbon: PhysicallyBasedMaterial
    }

    private var materialCache: [MaterialCacheKey: MaterialBundle] = [:]
    private var materialOrder: [MaterialCacheKey] = []
    private var spreadTextureCache: [Int: (dimension: Int, texture: TextureResource)] = [:]
    private var pageTextureCache: [PageTextureCacheKey: TextureResource] = [:]
    private var pageTextureOrder: [PageTextureCacheKey] = []
    private var leatherGrainCache: [Int: TextureResource] = [:]
    private var coverThumbnailCache: [String: UIImage] = [:]
    private var coverThumbnailOrder: [String] = []
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
        #if canImport(RealityKit) && os(iOS)
        for key in Array(pageTextureCache.keys) where key.dimension > clampedDim {
            pageTextureCache.removeValue(forKey: key)
            pageTextureOrder.removeAll { $0 == key }
        }
        #endif
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
            for key in Array(pageTextureCache.keys) where key.spreadIndex != activeSpreadIndex {
                pageTextureCache.removeValue(forKey: key)
                pageTextureOrder.removeAll { $0 == key }
            }
            coverThumbnailCache.removeAll()
            coverThumbnailOrder.removeAll()
            #endif
        case .critical:
            evictAllSpreads()
            #if canImport(RealityKit) && os(iOS)
            materialCache.removeAll()
            materialOrder.removeAll()
            leatherGrainCache.removeAll()
            pageTextureCache.removeAll()
            pageTextureOrder.removeAll()
            coverThumbnailCache.removeAll()
            coverThumbnailOrder.removeAll()
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
        pageTextureCache.removeAll()
        pageTextureOrder.removeAll()
        #endif
    }

    private func evictCachedSpreadTexture(at index: Int) {
        #if canImport(RealityKit) && os(iOS)
        spreadTextureCache.removeValue(forKey: index)
        for key in Array(pageTextureCache.keys) where key.spreadIndex == index {
            pageTextureCache.removeValue(forKey: key)
            pageTextureOrder.removeAll { $0 == key }
        }
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
        let pageSpreadIndices = Set(pageTextureCache.keys.map(\.spreadIndex))
        return pageSpreadIndices.union(spreadTextureCache.keys).count
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

    public func prewarmSpreadPages(
        for spread: BookSpreadPreview,
        paperStock: BookPaperStock = .warmCotton
    ) {
        guard budgetBytes > 0 else { return }
        let targetWidth = max(256, min(1024, maxTextureDimension))
        let targetHeight = max(256, Int(Double(targetWidth) * 1.3))
        let contentSig = "\(spread.leftPageNumber)-\(spread.rightPageNumber)-\(spread.leftHeading.hashValue)-\(spread.rightHeading.hashValue)"

        for side in [BookPageSide.left, BookPageSide.right] {
            let key = PageTextureCacheKey(
                spreadIndex: spread.spreadIndex,
                side: side,
                paperStock: paperStock,
                dimension: targetWidth,
                contentSignature: contentSig
            )
            if pageTextureCache[key] != nil { continue }

            Task.detached(priority: .userInitiated) {
                guard let cgImage = TextureResourceManager.renderSinglePageCGImage(
                    spread: spread,
                    side: side,
                    paperStock: paperStock,
                    width: targetWidth,
                    height: targetHeight
                ) else { return }

                await MainActor.run { [weak self] in
                    guard let self, self.budgetBytes > 0, self.pageTextureCache[key] == nil else { return }
                    let texture: TextureResource?
                    if #available(iOS 18.0, *) {
                        texture = try? TextureResource(image: cgImage, options: .init(semantic: .color))
                    } else {
                        texture = try? TextureResource.generate(from: cgImage, options: .init(semantic: .color))
                    }
                    if let texture {
                        while self.pageTextureCache.count >= 18, let oldest = self.pageTextureOrder.first {
                            self.pageTextureOrder.removeFirst()
                            self.pageTextureCache.removeValue(forKey: oldest)
                        }
                        self.pageTextureCache[key] = texture
                        self.pageTextureOrder.append(key)
                    }
                }
            }
        }
    }

    public func pageMaterial(
        for spread: BookSpreadPreview,
        side: BookPageSide,
        paperStock: BookPaperStock = .warmCotton
    ) -> PhysicallyBasedMaterial {
        var mat = PhysicallyBasedMaterial()
        mat.metallic = .init(floatLiteral: 0.0)
        mat.roughness = .init(floatLiteral: paperStock.roughness)
        mat.faceCulling = .back

        if let texture = cachedOrRenderedPageTexture(for: spread, side: side, paperStock: paperStock) {
            mat.baseColor = .init(tint: .white, texture: .init(texture))
        } else {
            mat.baseColor = .init(tint: Self.uiColor(hex: paperStock.hexUInt))
        }
        return mat
    }

    public func cachedPageTextureCount() -> Int {
        pageTextureCache.count
    }

    private func cachedOrRenderedPageTexture(
        for spread: BookSpreadPreview,
        side: BookPageSide,
        paperStock: BookPaperStock
    ) -> TextureResource? {
        guard budgetBytes > 0 else { return nil }
        let targetWidth = max(256, min(1024, maxTextureDimension))
        let contentSig = "\(spread.leftPageNumber)-\(spread.rightPageNumber)-\(spread.leftHeading.hashValue)-\(spread.rightHeading.hashValue)"
        let key = PageTextureCacheKey(
            spreadIndex: spread.spreadIndex,
            side: side,
            paperStock: paperStock,
            dimension: targetWidth,
            contentSignature: contentSig
        )
        if let cached = pageTextureCache[key] {
            pageTextureOrder.removeAll { $0 == key }
            pageTextureOrder.append(key)
            return cached
        }

        // Book aspect ratio 20:26 (~1 : 1.3)
        let targetHeight = max(256, Int(Double(targetWidth) * 1.3))
        guard let cgImage = Self.renderSinglePageCGImage(
            spread: spread,
            side: side,
            paperStock: paperStock,
            width: targetWidth,
            height: targetHeight
        ) else {
            return nil
        }

        let texture: TextureResource?
        if #available(iOS 18.0, *) {
            texture = try? TextureResource(image: cgImage, options: .init(semantic: .color))
        } else {
            texture = try? TextureResource.generate(from: cgImage, options: .init(semantic: .color))
        }

        if let texture {
            while pageTextureCache.count >= 18, let oldest = pageTextureOrder.first {
                pageTextureOrder.removeFirst()
                pageTextureCache.removeValue(forKey: oldest)
            }
            pageTextureCache[key] = texture
            pageTextureOrder.append(key)
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

    public func coverThumbnailImage(for config: Book3DConfiguration, size: CGSize = CGSize(width: 240, height: 312)) -> UIImage? {
        let key = "\(config.bookId)|\(config.leather.rawValue)|\(config.foil.rawValue)|\(config.coverTitle)|\(config.coverSubtitle)|\(Int(size.width))x\(Int(size.height))"
        if let cached = coverThumbnailCache[key] {
            coverThumbnailOrder.removeAll { $0 == key }
            coverThumbnailOrder.append(key)
            return cached
        }

        let format = UIGraphicsImageRendererFormat()
        format.scale = 2.0
        format.opaque = false
        let renderer = UIGraphicsImageRenderer(size: size, format: format)
        let image = renderer.image { ctx in
            let cg = ctx.cgContext
            let rect = CGRect(origin: .zero, size: size)
            let corner: CGFloat = 10.0

            // Leather cover base with subtle vertical lighting gradient
            let path = UIBezierPath(roundedRect: rect, cornerRadius: corner)
            cg.saveGState()
            path.addClip()

            let baseColor = Self.uiColor(hex: config.leather.hexUInt)
            let accentColor = Self.uiColor(hex: config.leather.accentHexUInt)
            if let gradient = CGGradient(
                colorsSpace: CGColorSpaceCreateDeviceRGB(),
                colors: [baseColor.cgColor, accentColor.cgColor] as CFArray,
                locations: [0.0, 1.0]
            ) {
                cg.drawLinearGradient(
                    gradient,
                    start: CGPoint(x: 0, y: 0),
                    end: CGPoint(x: size.width, y: size.height),
                    options: []
                )
            } else {
                baseColor.setFill()
                cg.fill(rect)
            }

            // Spine hinge crease shadow on left edge
            let spineRect = CGRect(x: 0, y: 0, width: size.width * 0.08, height: size.height)
            UIColor.black.withAlphaComponent(0.20).setFill()
            cg.fill(spineRect)
            let creaseRect = CGRect(x: size.width * 0.08, y: 0, width: 2.0, height: size.height)
            UIColor.white.withAlphaComponent(0.14).setFill()
            cg.fill(creaseRect)

            // Hot-foil stamped inner border and medallion
            let foilColor = Self.uiColor(hex: config.foil.effectiveHexUInt(for: config.leather))
            foilColor.withAlphaComponent(0.88).setStroke()
            let insetRect = rect.insetBy(dx: 16, dy: 16)
            let borderPath = UIBezierPath(roundedRect: insetRect, cornerRadius: 4)
            borderPath.lineWidth = 1.5
            borderPath.stroke()

            let medallionRadius: CGFloat = min(size.width, size.height) * 0.14
            let medallionCenter = CGPoint(x: size.width * 0.54, y: size.height * 0.48)
            let medallionRect = CGRect(
                x: medallionCenter.x - medallionRadius,
                y: medallionCenter.y - medallionRadius,
                width: medallionRadius * 2,
                height: medallionRadius * 2
            )
            let medallionPath = UIBezierPath(ovalIn: medallionRect)
            medallionPath.lineWidth = 1.8
            medallionPath.stroke()

            // Title and subtitle typography
            let titleStyle = NSMutableParagraphStyle()
            titleStyle.alignment = .center
            let titleAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: max(12, size.width * 0.075), weight: .semibold),
                .foregroundColor: foilColor,
                .paragraphStyle: titleStyle
            ]
            let subtitleAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: max(9, size.width * 0.044), weight: .medium),
                .foregroundColor: foilColor.withAlphaComponent(0.85),
                .paragraphStyle: titleStyle
            ]
            (config.coverTitle.uppercased() as NSString).draw(
                in: CGRect(x: 24, y: 28, width: size.width - 36, height: size.height * 0.22),
                withAttributes: titleAttrs
            )
            (config.coverSubtitle as NSString).draw(
                in: CGRect(x: 24, y: size.height - 48, width: size.width - 36, height: 30),
                withAttributes: subtitleAttrs
            )
            cg.restoreGState()
        }

        while coverThumbnailCache.count >= 24, let oldest = coverThumbnailOrder.first {
            coverThumbnailOrder.removeFirst()
            coverThumbnailCache.removeValue(forKey: oldest)
        }
        coverThumbnailCache[key] = image
        coverThumbnailOrder.append(key)
        return image
    }

    public func applyCachedMaterials(
        to root: Entity,
        leather: BookLeatherSwatch,
        foil: BookFoilSwatch,
        paperStock: BookPaperStock = .warmCotton,
        ribbonColor: BookRibbonColor = .sage,
        enableClearcoat: Bool
    ) {
        let key = MaterialCacheKey(
            leather: leather,
            foil: foil,
            paperStock: paperStock,
            ribbonColor: ribbonColor,
            enableClearcoat: enableClearcoat
        )
        let bundle: MaterialBundle
        if let existing = materialCache[key] {
            materialOrder.removeAll { $0 == key }
            materialOrder.append(key)
            bundle = existing
        } else {
            let grainTex = enableClearcoat ? leatherGrainRoughnessTexture() : nil
            let endpaperHex: UInt = paperStock.hexUInt
            var endpaperMat = PhysicallyBasedMaterial()
            endpaperMat.baseColor = .init(tint: UIColor(
                red: CGFloat((endpaperHex >> 16) & 0xff) / 255.0 * 0.94,
                green: CGFloat((endpaperHex >> 08) & 0xff) / 255.0 * 0.94,
                blue: CGFloat((endpaperHex >> 00) & 0xff) / 255.0 * 0.92,
                alpha: 1.0
            ))
            endpaperMat.metallic = .init(floatLiteral: 0.0)
            endpaperMat.roughness = .init(floatLiteral: 0.96)
            endpaperMat.faceCulling = .none

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
                    hex: paperStock.hexUInt,
                    metallic: 0.0,
                    roughness: paperStock.roughness,
                    clearcoat: 0.0
                ),
                endpaper: endpaperMat,
                ribbon: Self.makePBRMaterial(
                    hex: ribbonColor.hexUInt,
                    metallic: 0.0,
                    roughness: 0.45,
                    clearcoat: enableClearcoat ? 0.12 : 0.0
                )
            )
            // Keep material cache small and bounded via LRU
            while materialCache.count >= 16, let oldest = materialOrder.first {
                materialOrder.removeFirst()
                materialCache.removeValue(forKey: oldest)
            }
            materialCache[key] = bundle
            materialOrder.append(key)
        }

        Self.traverseApplyingMaterials(
            entity: root,
            leather: bundle.leather,
            foil: bundle.foil,
            paper: bundle.paper,
            endpaper: bundle.endpaper,
            ribbon: bundle.ribbon
        )
    }

    private nonisolated static func uiColor(hex: UInt) -> UIColor {
        UIColor(
            red: CGFloat((hex >> 16) & 0xff) / 255.0,
            green: CGFloat((hex >> 08) & 0xff) / 255.0,
            blue: CGFloat((hex >> 00) & 0xff) / 255.0,
            alpha: 1.0
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

    private nonisolated static func renderLeatherGrainCGImage(dimension: Int) -> CGImage? {
        let size = max(64, dimension)
        var bytes = [UInt8](repeating: 215, count: size * size)
        for y in 0..<size {
            for x in 0..<size {
                // Deterministic pseudo-pebble leather grain hash (1-byte DeviceGray saves 4x VRAM vs RGBA8)
                let h = UInt32(truncatingIfNeeded: (x &* 73856093) ^ (y &* 19349663))
                bytes[y * size + x] = UInt8(185 + (h % 60))
            }
        }
        let colorSpace = CGColorSpaceCreateDeviceGray()
        guard let provider = CGDataProvider(data: Data(bytes) as CFData) else { return nil }
        return CGImage(
            width: size,
            height: size,
            bitsPerComponent: 8,
            bitsPerPixel: 8,
            bytesPerRow: size,
            space: colorSpace,
            bitmapInfo: CGBitmapInfo(rawValue: 0),
            provider: provider,
            decode: nil,
            shouldInterpolate: true,
            intent: .defaultIntent
        )
    }

    private nonisolated static func renderSpreadCGImage(spread: BookSpreadPreview, width: Int, height: Int) -> CGImage? {
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

    private nonisolated static func renderSinglePageCGImage(
        spread: BookSpreadPreview,
        side: BookPageSide,
        paperStock: BookPaperStock,
        width: Int,
        height: Int
    ) -> CGImage? {
        let rendererFormat = UIGraphicsImageRendererFormat()
        rendererFormat.scale = 1.0
        rendererFormat.opaque = true

        let rect = CGRect(x: 0, y: 0, width: width, height: height)
        let renderer = UIGraphicsImageRenderer(size: rect.size, format: rendererFormat)
        let uiImage = renderer.image { ctx in
            let cg = ctx.cgContext

            uiColor(hex: paperStock.hexUInt).setFill()
            cg.fill(rect)

            // Subtle gutter crease along spine edge (right edge for left page, left edge for right page)
            let gutterWidth = CGFloat(width) * 0.055
            let gutterX = side == .left ? CGFloat(width) - gutterWidth : 0
            let gutterRect = CGRect(x: gutterX, y: 0, width: gutterWidth, height: CGFloat(height))
            UIColor(red: 0.84, green: 0.80, blue: 0.74, alpha: 0.55).setFill()
            cg.fill(gutterRect)

            let scale = CGFloat(width) / 256.0
            let padX = 20.0 * scale
            let padY = 22.0 * scale
            let contentW = CGFloat(width) - padX * 2.0

            let ink = UIColor(red: 0.125, green: 0.141, blue: 0.173, alpha: 1.0)
            let plum = UIColor(red: 0.463, green: 0.333, blue: 0.435, alpha: 1.0)
            let sage = UIColor(red: 0.373, green: 0.451, blue: 0.369, alpha: 1.0)
            let bodyColor = UIColor(red: 0.157, green: 0.153, blue: 0.165, alpha: 1.0)

            let metaAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 9.5 * scale, weight: .semibold),
                .foregroundColor: plum
            ]
            let locAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 8.5 * scale, weight: .medium),
                .foregroundColor: sage
            ]
            let titleAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 13.5 * scale, weight: .bold),
                .foregroundColor: ink
            ]
            let bodyAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 10.5 * scale, weight: .regular),
                .foregroundColor: bodyColor
            ]

            let date = side == .left ? spread.leftDate : spread.rightDate
            let location = side == .left ? spread.leftLocation : spread.rightLocation
            let heading = side == .left ? spread.leftHeading : spread.rightHeading
            let body = side == .left ? spread.leftBody : spread.rightBody
            let pageNum = side == .left ? spread.leftPageNumber : spread.rightPageNumber

            (date.uppercased() as NSString).draw(
                in: CGRect(x: padX, y: padY, width: contentW, height: 14 * scale),
                withAttributes: metaAttrs
            )
            (location as NSString).draw(
                in: CGRect(x: padX, y: padY + 14 * scale, width: contentW, height: 14 * scale),
                withAttributes: locAttrs
            )
            (heading as NSString).draw(
                in: CGRect(x: padX, y: padY + 34 * scale, width: contentW, height: 42 * scale),
                withAttributes: titleAttrs
            )
            (body as NSString).draw(
                in: CGRect(x: padX, y: padY + 80 * scale, width: contentW, height: CGFloat(height) - padY * 2 - 134 * scale),
                withAttributes: bodyAttrs
            )

            if side == .right, let inscription = spread.ocrInscription {
                let boxRect = CGRect(x: padX, y: CGFloat(height) - padY - 62 * scale, width: contentW, height: 40 * scale)
                UIColor(red: 0.94, green: 0.92, blue: 0.88, alpha: 0.9).setFill()
                UIBezierPath(roundedRect: boxRect, cornerRadius: 4 * scale).fill()
                ("\"\(inscription)\"" as NSString).draw(
                    in: boxRect.insetBy(dx: 6 * scale, dy: 4 * scale),
                    withAttributes: metaAttrs
                )
            }

            let pageLabel = "p. \(pageNum)" as NSString
            let pageX = side == .left ? padX : CGFloat(width) - padX - 28 * scale
            pageLabel.draw(
                at: CGPoint(x: pageX, y: CGFloat(height) - padY - 12 * scale),
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
        endpaper: PhysicallyBasedMaterial,
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
            } else if name == Book3DHierarchy.frontEndpaper
                || name == Book3DHierarchy.backEndpaper {
                model.materials = [endpaper]
            } else if name == Book3DHierarchy.textBlock
                || name == Book3DHierarchy.leftPageStack
                || name == Book3DHierarchy.rightPageStack
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
                endpaper: endpaper,
                ribbon: ribbon
            )
        }
    }
    #endif
}
