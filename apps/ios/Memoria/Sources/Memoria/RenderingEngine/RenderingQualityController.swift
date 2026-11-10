import Foundation
import Combine

@MainActor
public final class RenderingQualityController: ObservableObject {
    @Published public private(set) var capabilityAssessment: DeviceCapabilityAssessment
    @Published public private(set) var activeProfile: RenderingQualityProfile
    @Published public private(set) var configuration: RenderingConfiguration
    @Published public private(set) var pendingDeferredProfile: RenderingQualityProfile?
    @Published public private(set) var transitionHistory: [RenderingDiagnosticEvent] = []

    public let downgradeCooldownSeconds: TimeInterval
    public let recoveryCooldownSeconds: TimeInterval
    public let maxHistoryCount: Int

    private var lastTransitionDate: Date
    private var lastHealthyEvaluationStart: Date?
    private var lastDeferredReason: RenderingTransitionReason?
    private var lastDeferredDetail: String?

    public init(
        capabilityAssessment: DeviceCapabilityAssessment,
        downgradeCooldownSeconds: TimeInterval = 2.5,
        recoveryCooldownSeconds: TimeInterval = 12.0,
        maxHistoryCount: Int = 64,
        now: Date = Date()
    ) {
        self.capabilityAssessment = capabilityAssessment
        self.activeProfile = capabilityAssessment.recommendedProfile
        self.configuration = RenderingConfiguration.make(
            for: capabilityAssessment.recommendedProfile,
            displayMaxRefreshRate: capabilityAssessment.snapshot.maxRefreshRate,
            reduceMotion: capabilityAssessment.snapshot.isReduceMotionEnabled
        )
        self.downgradeCooldownSeconds = downgradeCooldownSeconds
        self.recoveryCooldownSeconds = recoveryCooldownSeconds
        self.maxHistoryCount = maxHistoryCount
        self.lastTransitionDate = now

        let initialEvent = RenderingDiagnosticEvent(
            timestamp: now,
            fromProfile: activeProfile,
            toProfile: activeProfile,
            reason: .initialCapabilityAssessment,
            detail: capabilityAssessment.reasons.joined(separator: "; ")
        )
        self.transitionHistory = [initialEvent]
    }

    public func evaluate(
        thermalState: ProcessInfo.ThermalState,
        isLowPowerMode: Bool,
        memoryPressure: MemoryPressureLevel,
        performance: PerformanceMetricsSnapshot,
        interactionState: BookInteractionState,
        reduceMotion: Bool,
        now: Date = Date()
    ) {
        let ceiling = capabilityAssessment.maximumSustainableProfile
        if ceiling == .fallback {
            applyTransition(
                to: .fallback,
                reason: .initialCapabilityAssessment,
                detail: "Device classified as Tier D constrained/unsupported",
                interactionState: interactionState,
                reduceMotion: reduceMotion,
                forceImmediate: true,
                now: now
            )
            return
        }

        // 1. Emergency interventions (critical thermal or critical memory pressure)
        if thermalState == .critical {
            lastHealthyEvaluationStart = nil
            applyTransition(
                to: .fallback,
                reason: .thermalEscalation,
                detail: "System thermal state reached Critical; protecting responsiveness",
                interactionState: interactionState,
                reduceMotion: reduceMotion,
                forceImmediate: true,
                now: now
            )
            return
        }

        if memoryPressure == .critical {
            lastHealthyEvaluationStart = nil
            applyTransition(
                to: .fallback,
                reason: .memoryPressureCritical,
                detail: "Critical memory pressure received; entering safe accessible presentation",
                interactionState: interactionState,
                reduceMotion: reduceMotion,
                forceImmediate: true,
                now: now
            )
            return
        }

        // 2. Compute desired upper bound from current environmental pressure
        var environmentalCap = ceiling
        var capReason: RenderingTransitionReason = .framePacingRecovery
        var capDetail = "Conditions within budget"

        if thermalState == .serious {
            environmentalCap = min(environmentalCap, .efficient)
            capReason = .thermalEscalation
            capDetail = "Thermal state Serious requires Efficient profile"
        } else if thermalState == .fair {
            environmentalCap = min(environmentalCap, .balanced)
            capReason = .thermalEscalation
            capDetail = "Thermal state Fair caps rendering at Balanced profile"
        }

        if isLowPowerMode {
            environmentalCap = min(environmentalCap, .efficient)
            capReason = .lowPowerModeEnabled
            capDetail = "Low Power Mode enabled; targeting Efficient profile"
        }

        if memoryPressure == .warning {
            environmentalCap = min(environmentalCap, .efficient)
            capReason = .memoryPressureWarning
            capDetail = "Memory pressure warning; constraining to Efficient profile"
        }

        // 3. Downgrade path (environmental cap or measured frame degradation)
        if activeProfile > environmentalCap {
            lastHealthyEvaluationStart = nil
            let elapsedSinceChange = now.timeIntervalSince(lastTransitionDate)
            let isSevereThermal = thermalState == .serious || thermalState == .critical
            if elapsedSinceChange >= downgradeCooldownSeconds || isSevereThermal {
                let target: RenderingQualityProfile
                if isSevereThermal || memoryPressure != .normal || isLowPowerMode {
                    target = environmentalCap
                } else {
                    let nextProfile = activeProfile.steppedDown()
                    target = max(environmentalCap, min(activeProfile, nextProfile))
                }
                applyTransition(
                    to: target,
                    reason: capReason,
                    detail: capDetail,
                    interactionState: interactionState,
                    reduceMotion: reduceMotion,
                    forceImmediate: isSevereThermal,
                    now: now
                )
            }
            return
        }

        if performance.healthStatus == .severeDegradation || performance.healthStatus == .moderateDegradation {
            lastHealthyEvaluationStart = nil
            let elapsedSinceChange = now.timeIntervalSince(lastTransitionDate)
            if elapsedSinceChange >= downgradeCooldownSeconds {
                let target = activeProfile.steppedDown()
                if target < activeProfile {
                    applyTransition(
                        to: target,
                        reason: .framePacingDegradation,
                        detail: String(
                            format: "Frame pacing degraded (avg %.1fms, p95 %.1fms, dropped %.0f%%)",
                            performance.averageFrameTimeMs,
                            performance.p95FrameTimeMs,
                            performance.droppedFrameRatio * 100
                        ),
                        interactionState: interactionState,
                        reduceMotion: reduceMotion,
                        forceImmediate: false,
                        now: now
                    )
                }
            }
            return
        }

        // 4. Apply any deferred transition once critical interaction settles
        if let pending = pendingDeferredProfile, !interactionState.isCriticalAnimation {
            let reason = lastDeferredReason ?? .deferredInteractionApplied
            let detail = lastDeferredDetail ?? "Applied deferred quality transition after interaction settled"
            pendingDeferredProfile = nil
            lastDeferredReason = nil
            lastDeferredDetail = nil
            commitProfile(pending, reason: reason, detail: detail, reduceMotion: reduceMotion, now: now)
            return
        }

        // 5. Gradual one-step recovery when conditions are healthy and stable
        let isThermalRecoverable = thermalState == .nominal || thermalState == .fair
        let canConsiderRecovery = activeProfile < environmentalCap
            && (performance.healthStatus == .healthy || (performance.sampleCount == 0 && activeProfile == .fallback && isThermalRecoverable && memoryPressure == .normal))

        if canConsiderRecovery {
            if lastHealthyEvaluationStart == nil {
                lastHealthyEvaluationStart = now
                return
            }
            let healthyDuration = now.timeIntervalSince(lastHealthyEvaluationStart ?? now)
            let cooldownElapsed = now.timeIntervalSince(lastTransitionDate)
            if healthyDuration >= recoveryCooldownSeconds && cooldownElapsed >= recoveryCooldownSeconds {
                let nextStep = activeProfile.steppedUp(cappedAt: environmentalCap)
                if nextStep > activeProfile {
                    let reason: RenderingTransitionReason = (thermalState == .nominal && memoryPressure == .normal)
                        ? .thermalRecovery
                        : .framePacingRecovery
                    applyTransition(
                        to: nextStep,
                        reason: reason,
                        detail: "Sustained healthy budget for \(Int(healthyDuration))s; stepping up to \(nextStep.displayName)",
                        interactionState: interactionState,
                        reduceMotion: reduceMotion,
                        forceImmediate: false,
                        now: now
                    )
                    lastHealthyEvaluationStart = now
                }
            }
        } else {
            lastHealthyEvaluationStart = nil
        }
    }

    public func refreshConfiguration(reduceMotion: Bool) {
        configuration = RenderingConfiguration.make(
            for: activeProfile,
            displayMaxRefreshRate: capabilityAssessment.snapshot.maxRefreshRate,
            reduceMotion: reduceMotion || capabilityAssessment.snapshot.isReduceMotionEnabled
        )
    }

    public func forceFallback(reason: RenderingTransitionReason, detail: String, now: Date = Date()) {
        commitProfile(.fallback, reason: reason, detail: detail, reduceMotion: capabilityAssessment.snapshot.isReduceMotionEnabled, now: now)
    }

    private func applyTransition(
        to target: RenderingQualityProfile,
        reason: RenderingTransitionReason,
        detail: String,
        interactionState: BookInteractionState,
        reduceMotion: Bool,
        forceImmediate: Bool,
        now: Date
    ) {
        guard target != activeProfile else { return }

        if interactionState.isCriticalAnimation && !forceImmediate {
            pendingDeferredProfile = target
            lastDeferredReason = reason
            lastDeferredDetail = detail
            return
        }

        pendingDeferredProfile = nil
        commitProfile(target, reason: reason, detail: detail, reduceMotion: reduceMotion, now: now)
    }

    private func commitProfile(
        _ next: RenderingQualityProfile,
        reason: RenderingTransitionReason,
        detail: String,
        reduceMotion: Bool,
        now: Date
    ) {
        let previous = activeProfile
        activeProfile = next
        lastTransitionDate = now
        configuration = RenderingConfiguration.make(
            for: next,
            displayMaxRefreshRate: capabilityAssessment.snapshot.maxRefreshRate,
            reduceMotion: reduceMotion || capabilityAssessment.snapshot.isReduceMotionEnabled
        )

        let event = RenderingDiagnosticEvent(
            timestamp: now,
            fromProfile: previous,
            toProfile: next,
            reason: reason,
            detail: detail
        )
        transitionHistory.append(event)
        if transitionHistory.count > maxHistoryCount {
            transitionHistory.removeFirst(transitionHistory.count - maxHistoryCount)
        }
    }
}
