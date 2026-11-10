import Foundation

#if canImport(Metal)
import Metal
#endif

#if canImport(UIKit)
import UIKit
#endif

public struct DeviceEnvironmentSnapshot: Sendable, Equatable {
    public let physicalMemoryBytes: UInt64
    public let processorCount: Int
    public let activeProcessorCount: Int
    public let isLowPowerModeEnabled: Bool
    public let thermalState: ProcessInfo.ThermalState
    public let maxRefreshRate: Int
    public let hasMetalDevice: Bool
    public let supportsAppleGPUFamily4Plus: Bool
    public let recommendedMaxWorkingSetBytes: UInt64
    public let isReduceMotionEnabled: Bool
    public let isSimulator: Bool
    public let historicalAverageFrameTimeMs: Double?
    public let historicalDroppedFrameRatio: Double?

    public init(
        physicalMemoryBytes: UInt64,
        processorCount: Int,
        activeProcessorCount: Int,
        isLowPowerModeEnabled: Bool,
        thermalState: ProcessInfo.ThermalState,
        maxRefreshRate: Int,
        hasMetalDevice: Bool,
        supportsAppleGPUFamily4Plus: Bool,
        recommendedMaxWorkingSetBytes: UInt64,
        isReduceMotionEnabled: Bool,
        isSimulator: Bool,
        historicalAverageFrameTimeMs: Double? = nil,
        historicalDroppedFrameRatio: Double? = nil
    ) {
        self.physicalMemoryBytes = physicalMemoryBytes
        self.processorCount = processorCount
        self.activeProcessorCount = activeProcessorCount
        self.isLowPowerModeEnabled = isLowPowerModeEnabled
        self.thermalState = thermalState
        self.maxRefreshRate = maxRefreshRate
        self.hasMetalDevice = hasMetalDevice
        self.supportsAppleGPUFamily4Plus = supportsAppleGPUFamily4Plus
        self.recommendedMaxWorkingSetBytes = recommendedMaxWorkingSetBytes
        self.isReduceMotionEnabled = isReduceMotionEnabled
        self.isSimulator = isSimulator
        self.historicalAverageFrameTimeMs = historicalAverageFrameTimeMs
        self.historicalDroppedFrameRatio = historicalDroppedFrameRatio
    }

    @MainActor
    public static func captureCurrent(
        historicalAverageFrameTimeMs: Double? = nil,
        historicalDroppedFrameRatio: Double? = nil
    ) -> DeviceEnvironmentSnapshot {
        let info = ProcessInfo.processInfo

        var hasMetal = false
        var supportsFamily4Plus = false
        var recommendedWorkingSet: UInt64 = 0

        #if canImport(Metal)
        if let device = MTLCreateSystemDefaultDevice() {
            hasMetal = true
            supportsFamily4Plus = device.supportsFamily(.apple4) || device.supportsFamily(.mac2)
            recommendedWorkingSet = device.recommendedMaxWorkingSetSize
        }
        #endif

        var refreshRate = 60
        var reduceMotion = false
        #if canImport(UIKit)
        refreshRate = max(30, UIScreen.main.maximumFramesPerSecond)
        reduceMotion = UIAccessibility.isReduceMotionEnabled
        #endif

        #if targetEnvironment(simulator)
        let runningInSimulator = true
        #else
        let runningInSimulator = false
        #endif

        return DeviceEnvironmentSnapshot(
            physicalMemoryBytes: info.physicalMemory,
            processorCount: info.processorCount,
            activeProcessorCount: info.activeProcessorCount,
            isLowPowerModeEnabled: info.isLowPowerModeEnabled,
            thermalState: info.thermalState,
            maxRefreshRate: refreshRate,
            hasMetalDevice: hasMetal,
            supportsAppleGPUFamily4Plus: supportsFamily4Plus,
            recommendedMaxWorkingSetBytes: recommendedWorkingSet,
            isReduceMotionEnabled: reduceMotion,
            isSimulator: runningInSimulator,
            historicalAverageFrameTimeMs: historicalAverageFrameTimeMs,
            historicalDroppedFrameRatio: historicalDroppedFrameRatio
        )
    }

    public var physicalMemoryGB: Double {
        Double(physicalMemoryBytes) / (1024.0 * 1024.0 * 1024.0)
    }
}

public struct DeviceCapabilityAssessment: Sendable, Equatable {
    public let tier: DeviceCapabilityTier
    public let recommendedProfile: RenderingQualityProfile
    public let maximumSustainableProfile: RenderingQualityProfile
    public let reasons: [String]
    public let snapshot: DeviceEnvironmentSnapshot

    public init(
        tier: DeviceCapabilityTier,
        recommendedProfile: RenderingQualityProfile,
        maximumSustainableProfile: RenderingQualityProfile,
        reasons: [String],
        snapshot: DeviceEnvironmentSnapshot
    ) {
        self.tier = tier
        self.recommendedProfile = recommendedProfile
        self.maximumSustainableProfile = maximumSustainableProfile
        self.reasons = reasons
        self.snapshot = snapshot
    }
}

public struct DeviceCapabilityAnalyzer: Sendable {
    public init() {}

    public func assess(
        snapshot: DeviceEnvironmentSnapshot,
        modelTriangleCount: Int = 314,
        estimatedTextureFootprintBytes: Int = 0
    ) -> DeviceCapabilityAssessment {
        var reasons: [String] = []

        // 1. Check hard GPU / Metal / extreme constraint boundaries -> Tier D
        if !snapshot.hasMetalDevice {
            reasons.append("No supported Metal GPU device detected")
            return DeviceCapabilityAssessment(
                tier: .tierD,
                recommendedProfile: .fallback,
                maximumSustainableProfile: .fallback,
                reasons: reasons,
                snapshot: snapshot
            )
        }

        if snapshot.physicalMemoryBytes < 1_400_000_000 {
            reasons.append("System memory below minimum 1.4 GB interactive 3D threshold")
            return DeviceCapabilityAssessment(
                tier: .tierD,
                recommendedProfile: .fallback,
                maximumSustainableProfile: .fallback,
                reasons: reasons,
                snapshot: snapshot
            )
        }

        if !snapshot.supportsAppleGPUFamily4Plus && !snapshot.isSimulator {
            reasons.append("GPU feature family below Apple4 PBR baseline")
            return DeviceCapabilityAssessment(
                tier: .tierD,
                recommendedProfile: .fallback,
                maximumSustainableProfile: .fallback,
                reasons: reasons,
                snapshot: snapshot
            )
        }

        // 2. Determine baseline hardware capability tier from memory, cores, GPU working set, and asset budget
        // Note: iOS reports physicalMemory minus kernel carve-out (e.g. 6 GB iPhones report ~5.3-5.6 GiB).
        let memoryGB = snapshot.physicalMemoryGB
        let workingSetMB = Double(snapshot.recommendedMaxWorkingSetBytes) / (1024.0 * 1024.0)
        let assetFitsComfortably = estimatedTextureFootprintBytes < 32 * 1024 * 1024 && modelTriangleCount <= 50_000

        var tier: DeviceCapabilityTier
        if memoryGB >= 5.0 && snapshot.processorCount >= 6 && (workingSetMB >= 1024 || snapshot.isSimulator) && assetFitsComfortably {
            tier = .tierA
            reasons.append(String(format: "%.1f GB RAM, %d cores, Metal GPU family capable of Tier A", memoryGB, snapshot.processorCount))
        } else if memoryGB >= 2.7 && snapshot.processorCount >= 4 {
            tier = .tierB
            reasons.append(String(format: "%.1f GB RAM, %d cores classified as Tier B medium capability", memoryGB, snapshot.processorCount))
        } else {
            tier = .tierC
            reasons.append(String(format: "%.1f GB RAM, %d cores classified as Tier C constrained capability", memoryGB, snapshot.processorCount))
        }

        // 3. Apply measured runtime performance evidence (never assume maximum quality blindly)
        if let droppedRatio = snapshot.historicalDroppedFrameRatio, droppedRatio > 0.25 {
            if tier == .tierA { tier = .tierB }
            else if tier == .tierB { tier = .tierC }
            reasons.append(String(format: "Measured historical dropped-frame ratio %.0f%% constrained ceiling", droppedRatio * 100))
        } else if let avgMs = snapshot.historicalAverageFrameTimeMs, avgMs > 18.0 {
            if tier == .tierA { tier = .tierB }
            else if tier == .tierB && avgMs > 35.0 { tier = .tierC }
            reasons.append(String(format: "Measured historical avg frame time %.1f ms constrained ceiling", avgMs))
        }

        let maxProfile: RenderingQualityProfile
        switch tier {
        case .tierA: maxProfile = .premium
        case .tierB: maxProfile = .balanced
        case .tierC: maxProfile = .efficient
        case .tierD: maxProfile = .fallback
        }

        // 4. Adjust initial recommended profile for active thermal, low-power, or simulator constraints
        var recommended = maxProfile
        if snapshot.thermalState == .critical {
            recommended = .fallback
            reasons.append("Initial thermal state is critical; entering accessible presentation")
        } else if snapshot.thermalState == .serious {
            recommended = min(recommended, .efficient)
            reasons.append("Initial thermal state is serious; starting in Efficient profile")
        } else if snapshot.thermalState == .fair {
            recommended = min(recommended, .balanced)
            reasons.append("Initial thermal state is fair; capping initial profile at Balanced")
        }

        if snapshot.isLowPowerModeEnabled {
            recommended = min(recommended, .efficient)
            reasons.append("Low Power Mode active; starting in Efficient profile")
        }

        if snapshot.activeProcessorCount < max(2, snapshot.processorCount / 2) {
            recommended = min(recommended, .balanced)
            reasons.append("Reduced active processor count detected")
        }

        if snapshot.isSimulator {
            reasons.append("Running on iOS Simulator (GPU/thermal/battery measurements reflect host environment, not physical iPhone silicon)")
        }

        return DeviceCapabilityAssessment(
            tier: tier,
            recommendedProfile: recommended,
            maximumSustainableProfile: maxProfile,
            reasons: reasons,
            snapshot: snapshot
        )
    }
}
