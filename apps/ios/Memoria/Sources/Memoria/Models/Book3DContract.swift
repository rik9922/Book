import Foundation
import SwiftUI
import simd

// ==============================================================================
// 1. CANONICAL SCENE GRAPH NODE HIERARCHY (PARITY WITH GLB & CONTRACTS)
// ==============================================================================

public enum Book3DHierarchy {
    public static let root = "HeirloomBookRoot"
    public static let spine = "Spine"
    public static let backCover = "BackCover"
    public static let textBlock = "TextBlock"
    public static let ribbon = "SilkRibbonBookmark"
    public static let frontCoverHinge = "FrontCoverHinge"
    public static let frontCover = "FrontCover"
    public static let emblem = "TreeOfLifeEmblem"
    public static let cornerGuards = "CornerGuards"
    public static let turningPageHinge = "TurningPageHinge"
    public static let turningPageLeaf = "TurningPageLeaf"

    // Runtime physical reading hierarchy (attached by BookSceneCoordinator)
    public static let leftPageStack = "LeftPageStack"
    public static let rightPageStack = "RightPageStack"
    public static let leftPageSurface = "LeftPageSurface"
    public static let rightPageSurface = "RightPageSurface"
    public static let activeTurningPage = "ActiveTurningPage"
    public static let frontEndpaper = "FrontEndpaper"
    public static let backEndpaper = "BackEndpaper"

    public static let requiredNodes: [String] = [
        root,
        spine,
        backCover,
        textBlock,
        ribbon,
        frontCoverHinge,
        frontCover,
        emblem,
        cornerGuards,
        turningPageHinge,
        turningPageLeaf,
    ]
}

// ==============================================================================
// 2. CANONICAL PHYSICAL DIMENSIONS (METERS)
// ==============================================================================

public enum Book3DDimensions {
    public static let bookWidth: Float = 0.20
    public static let bookHeight: Float = 0.26
    public static let boardThickness: Float = 0.0035
    public static let textblockThickness: Float = 0.022
    public static let modelAssetName = "MemoriaHeirloomBook"
    public static let modelVersion = "2.0.0"
}

// ==============================================================================
// 3. LIVING ARCHIVE LEATHER & FOIL SWATCHES (MUTED PLUM DEFAULT)
// ==============================================================================

public enum BookLeatherSwatch: String, CaseIterable, Identifiable, Sendable, Codable {
    case plum
    case navy
    case burgundy
    case onyx
    case emerald

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .plum: return "Muted Plum"
        case .navy: return "Archival Navy"
        case .burgundy: return "Vintage Burgundy"
        case .onyx: return "Midnight Onyx"
        case .emerald: return "Heirloom Emerald"
        }
    }

    public var hexString: String {
        switch self {
        case .plum: return "#76556F"
        case .navy: return "#16233B"
        case .burgundy: return "#3B141C"
        case .onyx: return "#1C1C1E"
        case .emerald: return "#1B382B"
        }
    }

    public var hexUInt: UInt {
        switch self {
        case .plum: return 0x76556F
        case .navy: return 0x16233B
        case .burgundy: return 0x3B141C
        case .onyx: return 0x1C1C1E
        case .emerald: return 0x1B382B
        }
    }

    public var accentHexUInt: UInt {
        switch self {
        case .plum: return 0x63445C
        case .navy: return 0x253A5E
        case .burgundy: return 0x5C202C
        case .onyx: return 0x2C2C2E
        case .emerald: return 0x304C43
        }
    }

    public var swiftUIColor: Color {
        Color(hex: hexUInt)
    }

    public var metallic: Float {
        self == .onyx ? 0.05 : 0.04
    }

    public var roughness: Float {
        switch self {
        case .burgundy: return 0.82
        case .onyx: return 0.78
        default: return 0.80
        }
    }

    public var clearcoat: Float {
        self == .onyx ? 0.10 : 0.08
    }

    public var rgbNormalized: (r: Double, g: Double, b: Double) {
        (
            Double((hexUInt >> 16) & 0xff) / 255.0,
            Double((hexUInt >> 08) & 0xff) / 255.0,
            Double((hexUInt >> 00) & 0xff) / 255.0
        )
    }
}

public enum BookFoilSwatch: String, CaseIterable, Identifiable, Sendable, Codable {
    case gold
    case rose
    case silver
    case blindEmboss = "blind_emboss"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .gold: return "Metallic Gold Foil"
        case .rose: return "Rose Gold Foil"
        case .silver: return "Sterling Silver Foil"
        case .blindEmboss: return "Blind Emboss"
        }
    }

    public var shortLabel: String {
        switch self {
        case .gold: return "Gold"
        case .rose: return "Rose"
        case .silver: return "Silver"
        case .blindEmboss: return "Emboss"
        }
    }

    public var hexUInt: UInt {
        switch self {
        case .gold: return 0xD4AF37
        case .rose: return 0xB76E79
        case .silver: return 0xC0C0C0
        case .blindEmboss: return 0x5A4154
        }
    }

    public func effectiveHexUInt(for leather: BookLeatherSwatch) -> UInt {
        self == .blindEmboss ? leather.accentHexUInt : hexUInt
    }

    public var metallic: Float {
        switch self {
        case .gold: return 0.92
        case .rose: return 0.90
        case .silver: return 0.94
        case .blindEmboss: return 0.06
        }
    }

    public var roughness: Float {
        switch self {
        case .gold: return 0.25
        case .rose: return 0.26
        case .silver: return 0.22
        case .blindEmboss: return 0.88
        }
    }

    public var clearcoat: Float {
        self == .blindEmboss ? 0.05 : 0.25
    }
}

// ==============================================================================
// 4. CAMERA PRESETS & LIGHTING INTENT (PARITY WITH WEB CONTRACTS)
// ==============================================================================

public enum BookCameraPreset: String, CaseIterable, Identifiable, Sendable, Codable {
    case hero
    case openSpread = "open_spread"
    case spineDetail = "spine_detail"
    case emblemCloseup = "emblem_closeup"
    case topDown = "top_down"

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .hero: return "Hero 3/4"
        case .openSpread: return "Open Spread"
        case .spineDetail: return "Spine & Joint"
        case .emblemCloseup: return "Foil Medallion"
        case .topDown: return "Flat Proof"
        }
    }

    public var position: SIMD3<Float> {
        switch self {
        case .hero: return SIMD3<Float>(0.16, 0.28, 0.42)
        case .openSpread: return SIMD3<Float>(0.0, 0.34, 0.28)
        case .spineDetail: return SIMD3<Float>(-0.26, 0.16, 0.28)
        case .emblemCloseup: return SIMD3<Float>(0.12, 0.21, 0.14)
        case .topDown: return SIMD3<Float>(0.02, 0.44, 0.04)
        }
    }

    public var target: SIMD3<Float> {
        switch self {
        case .hero: return SIMD3<Float>(0.06, 0.01, 0.0)
        case .openSpread: return SIMD3<Float>(0.0, 0.01, 0.0)
        case .spineDetail: return SIMD3<Float>(-0.01, 0.0, 0.0)
        case .emblemCloseup: return SIMD3<Float>(0.10, 0.015, 0.0)
        case .topDown: return SIMD3<Float>(0.02, 0.0, 0.0)
        }
    }

    public var fovDegrees: Float {
        switch self {
        case .hero: return 38
        case .openSpread: return 40
        case .spineDetail: return 34
        case .emblemCloseup: return 32
        case .topDown: return 36
        }
    }

    public var minDistance: Float {
        switch self {
        case .spineDetail: return 0.18
        case .emblemCloseup: return 0.15
        case .topDown: return 0.22
        default: return 0.20
        }
    }

    public var maxDistance: Float {
        switch self {
        case .spineDetail: return 0.75
        case .emblemCloseup: return 0.65
        case .topDown: return 0.90
        default: return 0.85
        }
    }
}

public enum BookLightingIntent {
    public static let presetName = "LivingArchiveWarmMuseum"
    public static let backgroundHexUInt: UInt = 0xF7F4EE
    public static let keyLightPosition = SIMD3<Float>(2.5, 4.5, 3.0)
    public static let keyLightHexUInt: UInt = 0xFFF8EB
    public static let fillLightPosition = SIMD3<Float>(-2.5, 1.5, -2.0)
    public static let fillLightHexUInt: UInt = 0xD4E6DF
    public static let rimLightPosition = SIMD3<Float>(0.0, 3.5, 2.5)
    public static let rimLightHexUInt: UInt = 0xFFF5DF
}

// ==============================================================================
// 5. ANIMATION & KINEMATIC INTERPOLATION CONTRACT
// ==============================================================================

public enum BookAnimationContract {
    public static let hingeAxis = SIMD3<Float>(0, 0, 1)
    public static let closedAngleRadians: Float = 0.0
    public static let openAngleRadians: Float = 2.764
    public static let pageTurnStartRadians: Float = 0.0
    public static let pageTurnEndRadians: Float = 2.88
    public static let coverOpenDurationMs: Int = 650
    public static let pageTurnDurationMs: Int = 520
    public static let coverLerpSpeed: Float = 4.5
    public static let pageTurnLerpSpeed: Float = 6.0

    public static func clamp01(_ value: Float) -> Float {
        if value.isNaN { return 0 }
        return max(0.0, min(1.0, value))
    }

    public static func evaluateCubicBezierEaseInOut(_ t: Float) -> Float {
        let clamped = clamp01(t)
        if clamped < 0.5 {
            return 4.0 * clamped * clamped * clamped
        }
        return 1.0 - pow(-2.0 * clamped + 2.0, 3.0) / 2.0
    }

    public static func computeCoverHingeAngle(openProgress: Float) -> Float {
        let eased = evaluateCubicBezierEaseInOut(openProgress)
        return closedAngleRadians + (openAngleRadians - closedAngleRadians) * eased
    }

    public static func computePageTurnAngle(turnProgress: Float) -> Float {
        let eased = evaluateCubicBezierEaseInOut(turnProgress)
        return pageTurnStartRadians + (pageTurnEndRadians - pageTurnStartRadians) * eased
    }
}

// ==============================================================================
// 6. PRESENTATION MODES, PAPER STOCKS, RIBBON & PERSISTENT CONFIGURATION
// ==============================================================================

public enum BookPresentationMode: String, CaseIterable, Identifiable, Sendable, Codable {
    case library
    case preview
    case studio
    case reading

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .library: return "Library (2D)"
        case .preview: return "Book Preview"
        case .studio: return "Book Studio"
        case .reading: return "Reading"
        }
    }

    public var allowsSpreadPreloading: Bool {
        switch self {
        case .library, .preview:
            return false
        case .studio, .reading:
            return true
        }
    }
}

public enum BookPaperStock: String, CaseIterable, Identifiable, Sendable, Codable {
    case warmCotton = "warm_cotton"
    case archivalCream = "archival_cream"
    case deckleLinen = "deckle_linen"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .warmCotton: return "Warm Cotton Rag"
        case .archivalCream: return "Archival Cream"
        case .deckleLinen: return "Deckle Linen"
        }
    }

    public var hexUInt: UInt {
        switch self {
        case .warmCotton: return 0xF7F4EE
        case .archivalCream: return 0xF4ECD8
        case .deckleLinen: return 0xEFE8DC
        }
    }

    public var roughness: Float {
        switch self {
        case .warmCotton: return 0.95
        case .archivalCream: return 0.92
        case .deckleLinen: return 0.97
        }
    }
}

public enum BookRibbonColor: String, CaseIterable, Identifiable, Sendable, Codable {
    case sage
    case plum
    case gold
    case burgundy

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .sage: return "Soft Sage"
        case .plum: return "Muted Plum"
        case .gold: return "Antique Gold"
        case .burgundy: return "Vintage Claret"
        }
    }

    public var hexUInt: UInt {
        switch self {
        case .sage: return 0x849483
        case .plum: return 0x76556F
        case .gold: return 0xB89242
        case .burgundy: return 0x5C202C
        }
    }

    public var swiftUIColor: Color {
        Color(hex: hexUInt)
    }
}

public struct Book3DConfiguration: Sendable, Equatable, Codable {
    public var bookId: String
    public var leather: BookLeatherSwatch
    public var foil: BookFoilSwatch
    public var paperStock: BookPaperStock
    public var ribbonColor: BookRibbonColor
    public var coverTitle: String
    public var coverSubtitle: String
    public var spineText: String
    public var isOpen: Bool
    public var currentSpreadIndex: Int
    public var cameraPreset: BookCameraPreset
    public var reducedMotion: Bool

    public init(
        bookId: String = "bennett-heritage-vol-1",
        leather: BookLeatherSwatch = .plum,
        foil: BookFoilSwatch = .gold,
        paperStock: BookPaperStock = .warmCotton,
        ribbonColor: BookRibbonColor = .sage,
        coverTitle: String = "The Bennett Heritage",
        coverSubtitle: String = "1948 — 2026 • Memoria Volume I",
        spineText: String = "MEMORIA VOL. I",
        isOpen: Bool = false,
        currentSpreadIndex: Int = 0,
        cameraPreset: BookCameraPreset = .hero,
        reducedMotion: Bool = false
    ) {
        self.bookId = bookId
        self.leather = leather
        self.foil = foil
        self.paperStock = paperStock
        self.ribbonColor = ribbonColor
        self.coverTitle = coverTitle
        self.coverSubtitle = coverSubtitle
        self.spineText = spineText
        self.isOpen = isOpen
        self.currentSpreadIndex = currentSpreadIndex
        self.cameraPreset = cameraPreset
        self.reducedMotion = reducedMotion
    }
}

public struct BookVolumeRecord: Identifiable, Sendable, Equatable, Codable {
    public let id: String
    public let editionBadge: String
    public let totalPageCount: Int
    public let isFrozenForPrint: Bool
    public let defaultConfiguration: Book3DConfiguration
    public let spreads: [BookSpreadPreview]

    public init(
        id: String,
        editionBadge: String,
        totalPageCount: Int,
        isFrozenForPrint: Bool,
        defaultConfiguration: Book3DConfiguration,
        spreads: [BookSpreadPreview]
    ) {
        self.id = id
        self.editionBadge = editionBadge
        self.totalPageCount = totalPageCount
        self.isFrozenForPrint = isFrozenForPrint
        self.defaultConfiguration = defaultConfiguration
        self.spreads = spreads
    }

    public static let libraryVolumes: [BookVolumeRecord] = [
        BookVolumeRecord(
            id: "bennett-heritage-vol-1",
            editionBadge: "Edition Frozen • SHA-256 Verified",
            totalPageCount: 240,
            isFrozenForPrint: true,
            defaultConfiguration: Book3DConfiguration(),
            spreads: Book3DSampleData.sampleSpreads
        ),
        BookVolumeRecord(
            id: "sonoma-orchard-chronicle",
            editionBadge: "Family Circle Draft",
            totalPageCount: 164,
            isFrozenForPrint: false,
            defaultConfiguration: Book3DConfiguration(
                bookId: "sonoma-orchard-chronicle",
                leather: .emerald,
                foil: .gold,
                paperStock: .archivalCream,
                ribbonColor: .gold,
                coverTitle: "Sonoma Orchard Years",
                coverSubtitle: "1990 — 2012 • Harvest & Hearth",
                spineText: "SONOMA ORCHARD"
            ),
            spreads: Book3DSampleData.sampleSpreads
        ),
        BookVolumeRecord(
            id: "letters-across-oceans",
            editionBadge: "Archival Reprint",
            totalPageCount: 128,
            isFrozenForPrint: true,
            defaultConfiguration: Book3DConfiguration(
                bookId: "letters-across-oceans",
                leather: .navy,
                foil: .silver,
                paperStock: .deckleLinen,
                ribbonColor: .plum,
                coverTitle: "Letters Across Oceans",
                coverSubtitle: "1942 — 1954 • Correspondence Vault",
                spineText: "CORRESPONDENCE"
            ),
            spreads: Book3DSampleData.sampleSpreads
        ),
    ]
}

public struct BookSpreadPreview: Identifiable, Sendable, Equatable, Codable {
    public var id: Int { spreadIndex }
    public let spreadIndex: Int
    public let chapterTitle: String
    public let leftPageNumber: Int
    public let rightPageNumber: Int
    public let leftHeading: String
    public let leftDate: String
    public let leftLocation: String
    public let leftBody: String
    public let rightHeading: String
    public let rightDate: String
    public let rightLocation: String
    public let rightBody: String
    public let ocrInscription: String?
}

public enum Book3DSampleData {
    public static let sampleSpreads: [BookSpreadPreview] = [
        BookSpreadPreview(
            spreadIndex: 0,
            chapterTitle: "Prologue • Family Hearth",
            leftPageNumber: 1,
            rightPageNumber: 2,
            leftHeading: "Ex Libris • The Bennett Archive",
            leftDate: "1948 — 2026",
            leftLocation: "Mill Valley, California",
            leftBody: "Compiled by three generations of the Bennett family on acid-free cotton rag stock. Every photograph and letter has been SHA-256 verified for permanence.",
            rightHeading: "Chapter I: The Wisteria Pergola",
            rightDate: "June 14, 1978",
            rightLocation: "Villa Bellagio, Lake Como",
            rightBody: "All three generations gathered under the afternoon sun. Grandfather wore his tailored tweed jacket, reciting the poem he wrote for Eleanor in Florence in 1928.",
            ocrInscription: "To Eleanor, my north star across fifty summers — James, June 1978"
        ),
        BookSpreadPreview(
            spreadIndex: 1,
            chapterTitle: "Chapter II • Childhood & Orchard",
            leftPageNumber: 3,
            rightPageNumber: 4,
            leftHeading: "First Steps in the High Orchard",
            leftDate: "September 22, 1994",
            leftLocation: "Sonoma Valley Estate",
            leftBody: "Between the rows of honeycrisp trees, Clara let go of her mother’s hands and took seven steady steps toward the basket of freshly harvested pears.",
            rightHeading: "Autumn Harvest Notes",
            rightDate: "October 8, 1994",
            rightLocation: "Sonoma Barn Loft",
            rightBody: "Pressed 35mm Kodachrome contact sheets preserved alongside Grandmother’s handwritten orchard ledger and cider recipes.",
            ocrInscription: nil
        ),
        BookSpreadPreview(
            spreadIndex: 2,
            chapterTitle: "Chapter III • Letters Across Oceans",
            leftPageNumber: 5,
            rightPageNumber: 6,
            leftHeading: "Postcard from Normandy",
            leftDate: "August 3, 1944",
            leftLocation: "Sainte-Mère-Église, France",
            leftBody: "Original postcard found inside the cedar chest. Penciled on field stationery, assuring his parents he was safe and asking about the cider harvest back in Devon.",
            rightHeading: "Archival OCR Transcription",
            rightDate: "Digitized 2026",
            rightLocation: "Local Archive Vault",
            rightBody: "Preserved at 600 DPI lossless master resolution with bilingual transcription and original postmark watermarks intact.",
            ocrInscription: "My dearest Mother & Father — Do not worry about me. The cider apples must be sweet this year."
        ),
        BookSpreadPreview(
            spreadIndex: 3,
            chapterTitle: "Epilogue • Colophon & Integrity",
            leftPageNumber: 7,
            rightPageNumber: 8,
            leftHeading: "Living Archive Colophon",
            leftDate: "Edition Hash Verified",
            leftLocation: "Local-First Vault",
            leftBody: "Bound in vegetable-tanned French morocco leather with 24k hot-stamped foil and 170gsm cotton rag pages.",
            rightHeading: "Continuing the Chronicle",
            rightDate: "2026 & Beyond",
            rightLocation: "Family Circle",
            rightBody: "Spaces remain open for future generations to add voice oral histories, heirloom photographs, and milestone letters.",
            ocrInscription: nil
        ),
    ]
}

public enum Book3DAssetVariant: String, CaseIterable, Identifiable, Sendable, Codable {
    case premium
    case balanced
    case efficient

    public var id: String { rawValue }

    public var resourceName: String {
        switch self {
        case .premium: return "\(Book3DDimensions.modelAssetName)_Premium"
        case .balanced: return Book3DDimensions.modelAssetName
        case .efficient: return "\(Book3DDimensions.modelAssetName)_Efficient"
        }
    }

    public var estimatedMemoryBytes: Int {
        switch self {
        case .premium: return 650_000
        case .balanced: return 450_000
        case .efficient: return 260_000
        }
    }
}

public enum Book3DAssetLocator {
    public static func locateBundledUSDZ(
        variant: Book3DAssetVariant = .balanced,
        in bundle: Bundle = .main
    ) -> URL? {
        if let variantURL = findUSDZ(named: variant.resourceName, in: bundle) {
            return variantURL
        }
        if variant != .balanced {
            return findUSDZ(named: Book3DDimensions.modelAssetName, in: bundle)
        }
        return nil
    }

    private static func findUSDZ(named name: String, in bundle: Bundle) -> URL? {
        if let direct = bundle.url(forResource: name, withExtension: "usdz") {
            return direct
        }
        if let nested = bundle.url(
            forResource: name,
            withExtension: "usdz",
            subdirectory: "Models"
        ) {
            return nested
        }
        if let nestedResources = bundle.url(
            forResource: name,
            withExtension: "usdz",
            subdirectory: "Resources/Models"
        ) {
            return nestedResources
        }
        return nil
    }
}

public struct Book3DManifestDTO: Decodable, Sendable {
    public struct ManifestSummary: Decodable, Sendable {
        public let version: String
        public let modelId: String
    }

    public struct EndpointsSummary: Decodable, Sendable {
        public let glb: String
        public let usdz: String
    }

    public let manifest: ManifestSummary
    public let endpoints: EndpointsSummary
}
