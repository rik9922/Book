import Foundation

public enum DeviceCapabilityTier: String, CaseIterable, Sendable, Codable, Comparable {
    case tierA = "Tier A"
    case tierB = "Tier B"
    case tierC = "Tier C"
    case tierD = "Tier D"

    private var rank: Int {
        switch self {
        case .tierD: return 0
        case .tierC: return 1
        case .tierB: return 2
        case .tierA: return 3
        }
    }

    public static func < (lhs: DeviceCapabilityTier, rhs: DeviceCapabilityTier) -> Bool {
        lhs.rank < rhs.rank
    }

    public var summaryLabel: String {
        switch self {
        case .tierA: return "High Capability"
        case .tierB: return "Medium Capability"
        case .tierC: return "Limited Capability"
        case .tierD: return "Accessible Presentation"
        }
    }
}

public enum RenderingQualityProfile: String, CaseIterable, Identifiable, Sendable, Codable, Comparable {
    case fallback
    case efficient
    case balanced
    case premium

    public var id: String { rawValue }

    private var rank: Int {
        switch self {
        case .fallback: return 0
        case .efficient: return 1
        case .balanced: return 2
        case .premium: return 3
        }
    }

    public static func < (lhs: RenderingQualityProfile, rhs: RenderingQualityProfile) -> Bool {
        lhs.rank < rhs.rank
    }

    public var displayName: String {
        switch self {
        case .premium: return "Premium"
        case .balanced: return "Balanced"
        case .efficient: return "Efficient"
        case .fallback: return "Accessible 2D"
        }
    }

    public func steppedDown() -> RenderingQualityProfile {
        switch self {
        case .premium: return .balanced
        case .balanced: return .efficient
        case .efficient, .fallback: return .fallback
        }
    }

    public func steppedUp(cappedAt maxProfile: RenderingQualityProfile) -> RenderingQualityProfile {
        let candidate: RenderingQualityProfile
        switch self {
        case .fallback: candidate = .efficient
        case .efficient: candidate = .balanced
        case .balanced, .premium: candidate = .premium
        }
        return min(candidate, maxProfile)
    }
}

public enum RenderingShadowMode: String, Sendable, Codable, Equatable {
    case full
    case reduced
    case disabled
}

public enum RenderingLightingMode: String, Sendable, Codable, Equatable {
    case fourPointStudio
    case threePointBalanced
    case twoPointMinimal
}

public struct RenderingConfiguration: Sendable, Equatable {
    public let profile: RenderingQualityProfile
    public let assetVariant: Book3DAssetVariant
    public let shadowMode: RenderingShadowMode
    public let lightingMode: RenderingLightingMode
    public let enableClearcoat: Bool
    public let enableHighDetailPageCurl: Bool
    public let targetFrameRate: Int
    public let maxTextureDimension: Int
    public let textureMemoryBudgetBytes: Int
    public let assetCacheBudgetBytes: Int
    public let allowPreloading: Bool
    public let enableHaptics: Bool
    public let enableAntialiasingHint: Bool
    public let pageMeshSubdivisionsX: Int
    public let pageMeshSubdivisionsZ: Int
    public let enableInteractivePageDeformation: Bool

    public init(
        profile: RenderingQualityProfile,
        assetVariant: Book3DAssetVariant,
        shadowMode: RenderingShadowMode,
        lightingMode: RenderingLightingMode,
        enableClearcoat: Bool,
        enableHighDetailPageCurl: Bool,
        targetFrameRate: Int,
        maxTextureDimension: Int,
        textureMemoryBudgetBytes: Int,
        assetCacheBudgetBytes: Int,
        allowPreloading: Bool,
        enableHaptics: Bool,
        enableAntialiasingHint: Bool,
        pageMeshSubdivisionsX: Int = 12,
        pageMeshSubdivisionsZ: Int = 4,
        enableInteractivePageDeformation: Bool = true
    ) {
        self.profile = profile
        self.assetVariant = assetVariant
        self.shadowMode = shadowMode
        self.lightingMode = lightingMode
        self.enableClearcoat = enableClearcoat
        self.enableHighDetailPageCurl = enableHighDetailPageCurl
        self.targetFrameRate = targetFrameRate
        self.maxTextureDimension = maxTextureDimension
        self.textureMemoryBudgetBytes = textureMemoryBudgetBytes
        self.assetCacheBudgetBytes = assetCacheBudgetBytes
        self.allowPreloading = allowPreloading
        self.enableHaptics = enableHaptics
        self.enableAntialiasingHint = enableAntialiasingHint
        self.pageMeshSubdivisionsX = pageMeshSubdivisionsX
        self.pageMeshSubdivisionsZ = pageMeshSubdivisionsZ
        self.enableInteractivePageDeformation = enableInteractivePageDeformation
    }

    public static func make(
        for profile: RenderingQualityProfile,
        displayMaxRefreshRate: Int = 60,
        reduceMotion: Bool = false
    ) -> RenderingConfiguration {
        let clampedMaxHz = max(30, min(120, displayMaxRefreshRate))

        switch profile {
        case .premium:
            // Cap interactive ProMotion target at 60 Hz unless 90/120 Hz is explicitly warranted,
            // prioritizing stable frame pacing and thermal headroom over unnecessary 120 Hz drain.
            let targetFPS = clampedMaxHz >= 120 ? 60 : clampedMaxHz
            return RenderingConfiguration(
                profile: .premium,
                assetVariant: .premium,
                shadowMode: .full,
                lightingMode: .fourPointStudio,
                enableClearcoat: true,
                enableHighDetailPageCurl: !reduceMotion,
                targetFrameRate: targetFPS,
                maxTextureDimension: 1024,
                textureMemoryBudgetBytes: 24 * 1024 * 1024,
                assetCacheBudgetBytes: 12 * 1024 * 1024,
                allowPreloading: true,
                enableHaptics: true,
                enableAntialiasingHint: true,
                pageMeshSubdivisionsX: 16,
                pageMeshSubdivisionsZ: 6,
                enableInteractivePageDeformation: !reduceMotion
            )
        case .balanced:
            return RenderingConfiguration(
                profile: .balanced,
                assetVariant: .balanced,
                shadowMode: .reduced,
                lightingMode: .threePointBalanced,
                enableClearcoat: true,
                enableHighDetailPageCurl: !reduceMotion,
                targetFrameRate: min(60, clampedMaxHz),
                maxTextureDimension: 512,
                textureMemoryBudgetBytes: 10 * 1024 * 1024,
                assetCacheBudgetBytes: 6 * 1024 * 1024,
                allowPreloading: true,
                enableHaptics: true,
                enableAntialiasingHint: true,
                pageMeshSubdivisionsX: 10,
                pageMeshSubdivisionsZ: 4,
                enableInteractivePageDeformation: !reduceMotion
            )
        case .efficient:
            return RenderingConfiguration(
                profile: .efficient,
                assetVariant: .efficient,
                shadowMode: .disabled,
                lightingMode: .twoPointMinimal,
                enableClearcoat: false,
                enableHighDetailPageCurl: false,
                targetFrameRate: 30,
                maxTextureDimension: 256,
                textureMemoryBudgetBytes: 4 * 1024 * 1024,
                assetCacheBudgetBytes: 2 * 1024 * 1024,
                allowPreloading: false,
                enableHaptics: false,
                enableAntialiasingHint: false,
                pageMeshSubdivisionsX: 6,
                pageMeshSubdivisionsZ: 2,
                enableInteractivePageDeformation: !reduceMotion
            )
        case .fallback:
            return RenderingConfiguration(
                profile: .fallback,
                assetVariant: .efficient,
                shadowMode: .disabled,
                lightingMode: .twoPointMinimal,
                enableClearcoat: false,
                enableHighDetailPageCurl: false,
                targetFrameRate: 0,
                maxTextureDimension: 256,
                textureMemoryBudgetBytes: 0,
                assetCacheBudgetBytes: 0,
                allowPreloading: false,
                enableHaptics: false,
                enableAntialiasingHint: false,
                pageMeshSubdivisionsX: 0,
                pageMeshSubdivisionsZ: 0,
                enableInteractivePageDeformation: false
            )
        }
    }

    public func adjusted(for mode: BookPresentationMode) -> RenderingConfiguration {
        switch mode {
        case .library:
            return RenderingConfiguration(
                profile: .fallback,
                assetVariant: .efficient,
                shadowMode: .disabled,
                lightingMode: .twoPointMinimal,
                enableClearcoat: false,
                enableHighDetailPageCurl: false,
                targetFrameRate: 0,
                maxTextureDimension: 256,
                textureMemoryBudgetBytes: 0,
                assetCacheBudgetBytes: assetCacheBudgetBytes,
                allowPreloading: false,
                enableHaptics: false,
                enableAntialiasingHint: false,
                pageMeshSubdivisionsX: 0,
                pageMeshSubdivisionsZ: 0,
                enableInteractivePageDeformation: false
            )
        case .preview:
            return RenderingConfiguration(
                profile: profile,
                assetVariant: assetVariant == .premium ? .balanced : assetVariant,
                shadowMode: shadowMode == .full ? .reduced : shadowMode,
                lightingMode: lightingMode == .fourPointStudio ? .threePointBalanced : lightingMode,
                enableClearcoat: enableClearcoat,
                enableHighDetailPageCurl: false,
                targetFrameRate: targetFrameRate,
                maxTextureDimension: min(512, maxTextureDimension),
                textureMemoryBudgetBytes: min(2 * 1024 * 1024, textureMemoryBudgetBytes),
                assetCacheBudgetBytes: assetCacheBudgetBytes,
                allowPreloading: false,
                enableHaptics: enableHaptics,
                enableAntialiasingHint: enableAntialiasingHint,
                pageMeshSubdivisionsX: 6,
                pageMeshSubdivisionsZ: 2,
                enableInteractivePageDeformation: false
            )
        case .studio, .reading:
            return self
        }
    }

    public var frameBudgetMs: Double {
        guard targetFrameRate > 0 else { return 0 }
        return 1000.0 / Double(targetFrameRate)
    }

    public var simulationStepIntervalSeconds: Double {
        guard targetFrameRate > 0 else { return .infinity }
        return 1.0 / Double(targetFrameRate)
    }
}

public enum BookInteractionState: String, CaseIterable, Sendable, Codable {
    case closed
    case idle
    case opening
    case closing
    case interactive
    case pageTurning
    case reading
    case backgrounded
    case fallback

    public var requiresContinuousSimulation: Bool {
        switch self {
        case .opening, .closing, .interactive, .pageTurning:
            return true
        case .closed, .idle, .reading, .backgrounded, .fallback:
            return false
        }
    }

    public var isCriticalAnimation: Bool {
        switch self {
        case .opening, .closing, .pageTurning:
            return true
        default:
            return false
        }
    }
}

public enum RenderingTransitionReason: String, Sendable, Codable {
    case initialCapabilityAssessment
    case thermalEscalation
    case thermalRecovery
    case lowPowerModeEnabled
    case lowPowerModeDisabled
    case framePacingDegradation
    case framePacingRecovery
    case memoryPressureWarning
    case memoryPressureCritical
    case memoryPressureCleared
    case sceneLoadFailure
    case repeatedAssetFailures
    case manualOrAccessibilityFallback
    case deferredInteractionApplied
}

public struct RenderingDiagnosticEvent: Identifiable, Sendable, Equatable {
    public let id: UUID
    public let timestamp: Date
    public let fromProfile: RenderingQualityProfile
    public let toProfile: RenderingQualityProfile
    public let reason: RenderingTransitionReason
    public let detail: String

    public init(
        id: UUID = UUID(),
        timestamp: Date = Date(),
        fromProfile: RenderingQualityProfile,
        toProfile: RenderingQualityProfile,
        reason: RenderingTransitionReason,
        detail: String
    ) {
        self.id = id
        self.timestamp = timestamp
        self.fromProfile = fromProfile
        self.toProfile = toProfile
        self.reason = reason
        self.detail = detail
    }
}
