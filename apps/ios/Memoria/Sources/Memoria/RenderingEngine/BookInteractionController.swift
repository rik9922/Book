import Foundation
import simd

@MainActor
public final class BookInteractionController {
    public var currentOpenProgress: Float = 0
    public var targetOpenProgress: Float = 0
    public var currentTurnProgress: Float = 0
    public var isAnimatingTurn: Bool = false
    public var turnDirection: Float = 1
    public var reducedMotion: Bool = false
    public var highDetailPageCurl: Bool = true

    public var orbitYaw: Float = 0
    public var orbitPitch: Float = 0
    public var zoomScale: Float = 1.0
    public var isDraggingOrbit: Bool = false
    public var activePreset: BookCameraPreset = .hero
    public var currentCameraPosition: SIMD3<Float> = BookCameraPreset.hero.position
    public var currentCameraTarget: SIMD3<Float> = BookCameraPreset.hero.target

    private var lastTurnNonce: Int = 0
    private var accumulatedStepDelta: Double = 0
    private var needsInitialCameraSync: Bool = true
    private var needsInitialHingeSync: Bool = true

    private let settleEpsilon: Float = 0.0005

    public init() {}

    public func syncConfiguration(
        _ config: Book3DConfiguration,
        turnNonce: Int,
        turnDirection: Int,
        highDetailPageCurl: Bool,
        lifecycle: SceneLifecycleManager
    ) -> Bool {
        self.reducedMotion = config.reducedMotion
        self.highDetailPageCurl = highDetailPageCurl

        let nextTargetOpen: Float = config.isOpen ? 1.0 : 0.0
        var presetChanged = false

        if abs(nextTargetOpen - targetOpenProgress) > settleEpsilon {
            targetOpenProgress = nextTargetOpen
            needsInitialHingeSync = true
            lifecycle.setBookOpenState(isOpen: config.isOpen, animating: !config.reducedMotion)
        }

        if config.cameraPreset != activePreset {
            activePreset = config.cameraPreset
            orbitYaw = 0
            orbitPitch = 0
            zoomScale = 1.0
            presetChanged = true
            needsInitialCameraSync = true
        }

        if turnNonce != lastTurnNonce {
            lastTurnNonce = turnNonce
            self.turnDirection = turnDirection >= 0 ? 1 : -1
            if config.isOpen && !config.reducedMotion {
                isAnimatingTurn = true
                currentTurnProgress = turnDirection >= 0 ? 0.02 : 0.98
                lifecycle.beginPageTurn()
            } else {
                isAnimatingTurn = false
                currentTurnProgress = 0
            }
            needsInitialHingeSync = true
        }

        if config.reducedMotion {
            currentOpenProgress = targetOpenProgress
            isAnimatingTurn = false
            currentTurnProgress = 0
            needsInitialHingeSync = true
            needsInitialCameraSync = true
        }

        return presetChanged
    }

    public func hasPendingMotion() -> Bool {
        if needsInitialCameraSync || needsInitialHingeSync {
            return true
        }
        if isDraggingOrbit || isAnimatingTurn {
            return true
        }
        if abs(targetOpenProgress - currentOpenProgress) > settleEpsilon {
            return true
        }
        let desired = desiredCameraTransform()
        let posDist = simd_distance(currentCameraPosition, desired.position)
        let tgtDist = simd_distance(currentCameraTarget, desired.target)
        return posDist > settleEpsilon || tgtDist > settleEpsilon
    }

    public struct KinematicStepResult {
        public let didUpdateTransforms: Bool
        public let coverAngleRadians: Float
        public let pageAngleRadians: Float
        public let pageCurlLift: Float
        public let openProgress: Float
        public let cameraPosition: SIMD3<Float>
        public let cameraTarget: SIMD3<Float>
        public let settledToIdle: Bool
    }

    public func step(
        deltaTime: Double,
        targetStepInterval: Double,
        isBookOpen: Bool,
        lifecycle: SceneLifecycleManager
    ) -> KinematicStepResult? {
        if lifecycle.isBackgrounded || lifecycle.isOccluded || lifecycle.isFallbackActive {
            lifecycle.recordTick(wasActive: false)
            return nil
        }

        if !hasPendingMotion() {
            lifecycle.recordTick(wasActive: false)
            return nil
        }

        // Frame-pacing accumulator (e.g., 30 Hz cadence under Efficient profile)
        if targetStepInterval > 0.020 && !reducedMotion {
            accumulatedStepDelta += deltaTime
            if accumulatedStepDelta < targetStepInterval && !needsInitialHingeSync && !needsInitialCameraSync {
                return nil
            }
        }
        let effectiveDt = Float(min(0.05, accumulatedStepDelta > 0 ? accumulatedStepDelta : deltaTime))
        accumulatedStepDelta = 0

        lifecycle.recordTick(wasActive: true)

        // 1. Cover Hinge Kinematics
        if reducedMotion {
            currentOpenProgress = targetOpenProgress
        } else {
            let delta = targetOpenProgress - currentOpenProgress
            if abs(delta) <= settleEpsilon {
                currentOpenProgress = targetOpenProgress
            } else {
                currentOpenProgress += delta * min(1.0, effectiveDt * BookAnimationContract.coverLerpSpeed)
            }
        }

        let coverAngle = BookAnimationContract.computeCoverHingeAngle(openProgress: currentOpenProgress)

        // 2. Page Turn Kinematics
        if targetOpenProgress < 0.1 {
            isAnimatingTurn = false
            currentTurnProgress = 0
        } else if isAnimatingTurn {
            let step = effectiveDt * (1000.0 / Float(BookAnimationContract.pageTurnDurationMs))
            if turnDirection > 0 {
                currentTurnProgress += step
                if currentTurnProgress >= 1.0 {
                    currentTurnProgress = 0
                    isAnimatingTurn = false
                }
            } else {
                currentTurnProgress -= step
                if currentTurnProgress <= 0.0 {
                    currentTurnProgress = 0
                    isAnimatingTurn = false
                }
            }
        }

        let pageAngle: Float
        let pageCurlLift: Float
        if isAnimatingTurn {
            let base = BookAnimationContract.computePageTurnAngle(turnProgress: currentTurnProgress)
            pageAngle = highDetailPageCurl ? base : base * 0.96
            let arch = sin(Float.pi * BookAnimationContract.clamp01(currentTurnProgress))
            pageCurlLift = arch * (highDetailPageCurl ? 1.0 : 0.35)
        } else {
            pageAngle = targetOpenProgress > 0.5 ? 0.04 : 0.0
            pageCurlLift = 0.0
        }

        // 3. Camera Preset & Orbit Interpolation
        let desired = desiredCameraTransform()
        if reducedMotion {
            currentCameraPosition = desired.position
            currentCameraTarget = desired.target
        } else {
            let factor = min(1.0, effectiveDt * 6.0)
            currentCameraPosition = simd_mix(currentCameraPosition, desired.position, SIMD3<Float>(repeating: factor))
            currentCameraTarget = simd_mix(currentCameraTarget, desired.target, SIMD3<Float>(repeating: factor))

            if simd_distance(currentCameraPosition, desired.position) <= settleEpsilon {
                currentCameraPosition = desired.position
            }
            if simd_distance(currentCameraTarget, desired.target) <= settleEpsilon {
                currentCameraTarget = desired.target
            }
        }

        needsInitialHingeSync = false
        needsInitialCameraSync = false

        let settled = !hasPendingMotion()
        if settled {
            lifecycle.settleToIdleOrReading(isOpen: isBookOpen)
        }

        return KinematicStepResult(
            didUpdateTransforms: true,
            coverAngleRadians: coverAngle,
            pageAngleRadians: pageAngle,
            pageCurlLift: pageCurlLift,
            openProgress: currentOpenProgress,
            cameraPosition: currentCameraPosition,
            cameraTarget: currentCameraTarget,
            settledToIdle: settled
        )
    }

    public func markDirtyForCameraGesture() {
        needsInitialCameraSync = true
    }

    public func resetStateAfterBackground() {
        accumulatedStepDelta = 0
        isDraggingOrbit = false
        isAnimatingTurn = false
        currentTurnProgress = 0
        needsInitialCameraSync = true
        needsInitialHingeSync = true
    }

    private func desiredCameraTransform() -> (position: SIMD3<Float>, target: SIMD3<Float>) {
        let baseOffset = activePreset.position - activePreset.target
        let scaledOffset = baseOffset * zoomScale
        let yawQuat = simd_quatf(angle: orbitYaw, axis: SIMD3<Float>(0, 1, 0))
        let pitchQuat = simd_quatf(angle: orbitPitch, axis: SIMD3<Float>(1, 0, 0))
        let rotatedOffset = yawQuat.act(pitchQuat.act(scaledOffset))
        return (activePreset.target + rotatedOffset, activePreset.target)
    }
}
