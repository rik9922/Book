import Foundation
import simd

/// Owns deterministic cover opening/closing, bookmark ribbon sway, and
/// interactive or button-driven page-turn progress with interruption safety.
@MainActor
public final class BookAnimationController {
    public var currentOpenProgress: Float = 0
    public var targetOpenProgress: Float = 0

    /// Normalized page-turn sweep in `[0, 1]`:
    /// - `0.0` = sheet flat on right stack
    /// - `1.0` = sheet flat on left stack
    public var currentTurnProgress: Float = 0
    public var isAnimatingTurn: Bool = false
    public var isInteractiveTurnDrag: Bool = false
    public var turnDirection: Float = 1

    /// Target progress when settling an interactive or triggered turn (`1.0` commits forward, `0.0` cancels/completes backward)
    public private(set) var targetTurnProgress: Float = 0
    public private(set) var activeTurnStartSpread: Int = 0
    public private(set) var activeTurnDestinationSpread: Int = 0
    public private(set) var isTurnActive: Bool = false
    public private(set) var pendingInteractiveCommitSpread: Int?

    public var ribbonSwayAngleRadians: Float = 0

    private let settleEpsilon: Float = 0.0005

    public init() {}

    public func beginTriggeredTurn(
        direction: Int,
        fromSpread: Int,
        toSpread: Int,
        reduceMotion: Bool
    ) {
        pendingInteractiveCommitSpread = nil
        turnDirection = direction >= 0 ? 1.0 : -1.0
        activeTurnStartSpread = fromSpread
        activeTurnDestinationSpread = toSpread

        if reduceMotion {
            isTurnActive = false
            isAnimatingTurn = false
            isInteractiveTurnDrag = false
            currentTurnProgress = 0
            targetTurnProgress = 0
            return
        }

        isTurnActive = true
        isAnimatingTurn = true
        isInteractiveTurnDrag = false

        if turnDirection > 0 {
            // Turning forward: sheet starts on right stack (0.0) and sweeps to left stack (1.0)
            currentTurnProgress = 0.02
            targetTurnProgress = 1.0
        } else {
            // Turning backward: sheet starts on left stack (1.0) and sweeps back to right stack (0.0)
            currentTurnProgress = 0.98
            targetTurnProgress = 0.0
        }
    }

    public func beginInteractiveTurn(
        direction: Int,
        fromSpread: Int,
        toSpread: Int
    ) {
        pendingInteractiveCommitSpread = nil
        turnDirection = direction >= 0 ? 1.0 : -1.0
        activeTurnStartSpread = fromSpread
        activeTurnDestinationSpread = toSpread
        isTurnActive = true
        isAnimatingTurn = false
        isInteractiveTurnDrag = true
        if turnDirection > 0 {
            currentTurnProgress = 0.01
            targetTurnProgress = 1.0
        } else {
            currentTurnProgress = 0.99
            targetTurnProgress = 0.0
        }
    }

    public func updateInteractiveTurn(normalizedProgress: Float) {
        guard isInteractiveTurnDrag else { return }
        currentTurnProgress = BookAnimationContract.clamp01(normalizedProgress)
    }

    /// Resolves an interrupted or released interactive page drag.
    /// Returns `true` if the turn should commit to `activeTurnDestinationSpread`, `false` if it snaps back.
    @discardableResult
    public func finishInteractiveTurn(projectedVelocityX: Float = 0) -> Bool {
        guard isInteractiveTurnDrag else { return false }
        isInteractiveTurnDrag = false
        isAnimatingTurn = true

        let shouldCommit: Bool
        if turnDirection > 0 {
            shouldCommit = currentTurnProgress >= 0.42 || projectedVelocityX < -250
            targetTurnProgress = shouldCommit ? 1.0 : 0.0
        } else {
            shouldCommit = currentTurnProgress <= 0.58 || projectedVelocityX > 250
            targetTurnProgress = shouldCommit ? 0.0 : 1.0
        }
        pendingInteractiveCommitSpread = shouldCommit ? activeTurnDestinationSpread : nil
        return shouldCommit
    }

    public func consumePendingInteractiveCommit(for spreadIndex: Int) -> Bool {
        guard pendingInteractiveCommitSpread == spreadIndex else { return false }
        pendingInteractiveCommitSpread = nil
        return true
    }

    public func cancelActiveTurn() {
        pendingInteractiveCommitSpread = nil
        isInteractiveTurnDrag = false
        isAnimatingTurn = false
        isTurnActive = false
        currentTurnProgress = 0
        targetTurnProgress = 0
    }

    public var hasPendingAnimation: Bool {
        if isAnimatingTurn || isInteractiveTurnDrag || isTurnActive {
            return true
        }
        if abs(targetOpenProgress - currentOpenProgress) > settleEpsilon {
            return true
        }
        if abs(ribbonSwayAngleRadians) > settleEpsilon {
            return true
        }
        return false
    }

    public struct AnimationStep {
        public let coverAngleRadians: Float
        public let turnProgress: Float
        public let curlIntensity: Float
        public let isTurnVisible: Bool
        public let didCompleteTurn: Bool
        public let ribbonSwayRadians: Float
    }

    public func step(
        dt: Float,
        reducedMotion: Bool,
        highDetailPageCurl: Bool
    ) -> AnimationStep {
        // 1. Cover Hinge Kinematics (interruptible at any point)
        let prevOpen = currentOpenProgress
        if reducedMotion {
            currentOpenProgress = targetOpenProgress
        } else {
            let delta = targetOpenProgress - currentOpenProgress
            if abs(delta) <= settleEpsilon {
                currentOpenProgress = targetOpenProgress
            } else {
                currentOpenProgress += delta * min(1.0, dt * BookAnimationContract.coverLerpSpeed)
            }
        }
        let openVelocity = dt > 0 ? (currentOpenProgress - prevOpen) / dt : 0
        let coverAngle = BookAnimationContract.computeCoverHingeAngle(openProgress: currentOpenProgress)

        // Subtle bookmark ribbon inertia during cover swing
        if reducedMotion {
            ribbonSwayAngleRadians = 0
        } else {
            let targetSway = max(-0.18, min(0.18, openVelocity * 0.06))
            ribbonSwayAngleRadians += (targetSway - ribbonSwayAngleRadians) * min(1.0, dt * 8.0)
            if abs(targetOpenProgress - currentOpenProgress) <= settleEpsilon && abs(ribbonSwayAngleRadians) <= settleEpsilon {
                ribbonSwayAngleRadians = 0
            }
        }

        // 2. Page Turn Kinematics
        var didCompleteTurn = false
        if targetOpenProgress < 0.1 || reducedMotion {
            if isTurnActive {
                didCompleteTurn = true
            }
            cancelActiveTurn()
        } else if isAnimatingTurn {
            let stepDelta = dt * (1000.0 / Float(BookAnimationContract.pageTurnDurationMs))
            if targetTurnProgress > currentTurnProgress {
                currentTurnProgress += stepDelta
                if currentTurnProgress >= targetTurnProgress {
                    currentTurnProgress = targetTurnProgress
                    isAnimatingTurn = false
                    isTurnActive = false
                    didCompleteTurn = true
                }
            } else {
                currentTurnProgress -= stepDelta
                if currentTurnProgress <= targetTurnProgress {
                    currentTurnProgress = targetTurnProgress
                    isAnimatingTurn = false
                    isTurnActive = false
                    didCompleteTurn = true
                }
            }
        }

        let curlIntensity: Float = isTurnActive ? (highDetailPageCurl ? 1.0 : 0.45) : 0.0

        return AnimationStep(
            coverAngleRadians: coverAngle,
            turnProgress: currentTurnProgress,
            curlIntensity: curlIntensity,
            isTurnVisible: isTurnActive && currentOpenProgress > 0.72,
            didCompleteTurn: didCompleteTurn,
            ribbonSwayRadians: ribbonSwayAngleRadians
        )
    }
}
