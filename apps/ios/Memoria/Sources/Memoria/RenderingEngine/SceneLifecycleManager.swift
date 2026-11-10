import Foundation
import Combine

@MainActor
public final class SceneLifecycleManager: ObservableObject {
    @Published public private(set) var interactionState: BookInteractionState = .closed
    @Published public private(set) var isBackgrounded: Bool = false
    @Published public private(set) var isOccluded: Bool = false
    @Published public private(set) var isFallbackActive: Bool = false
    @Published public private(set) var activeSimulationTicks: Int = 0
    @Published public private(set) var suspendedIdleTicks: Int = 0

    private var stateBeforeBackground: BookInteractionState = .closed

    public init() {}

    public var isSimulationSuspended: Bool {
        if isBackgrounded || isOccluded || isFallbackActive {
            return true
        }
        return !interactionState.requiresContinuousSimulation
    }

    public func setBookOpenState(isOpen: Bool, animating: Bool) {
        guard !isFallbackActive else {
            interactionState = .fallback
            return
        }
        if animating {
            interactionState = isOpen ? .opening : .closing
        } else {
            interactionState = isOpen ? .reading : .closed
        }
    }

    public func beginUserInteraction() {
        guard !isBackgrounded, !isOccluded, !isFallbackActive else { return }
        if !interactionState.isCriticalAnimation {
            interactionState = .interactive
        }
    }

    public func endUserInteraction(isOpen: Bool) {
        guard !isBackgrounded, !isOccluded, !isFallbackActive else { return }
        if !interactionState.isCriticalAnimation {
            interactionState = isOpen ? .reading : .idle
        }
    }

    public func beginPageTurn() {
        guard !isBackgrounded, !isOccluded, !isFallbackActive else { return }
        interactionState = .pageTurning
    }

    public func settleToIdleOrReading(isOpen: Bool) {
        guard !isBackgrounded, !isOccluded, !isFallbackActive else { return }
        interactionState = isOpen ? .reading : .closed
    }

    public func setOccluded(_ occluded: Bool, isBookOpen: Bool) {
        isOccluded = occluded
        if occluded {
            if interactionState != .backgrounded && interactionState != .fallback {
                stateBeforeBackground = isBookOpen ? .reading : .closed
            }
        } else if !isBackgrounded && !isFallbackActive {
            interactionState = isBookOpen ? .reading : .closed
        }
    }

    public func enterBackground(isBookOpen: Bool) {
        guard !isBackgrounded else { return }
        stateBeforeBackground = isBookOpen ? .reading : .closed
        isBackgrounded = true
        if !isFallbackActive {
            interactionState = .backgrounded
        }
    }

    public func enterForeground(isBookOpen: Bool) {
        isBackgrounded = false
        if isFallbackActive {
            interactionState = .fallback
        } else {
            interactionState = isBookOpen ? .reading : .closed
        }
    }

    public func setFallbackActive(_ active: Bool, isBookOpen: Bool) {
        isFallbackActive = active
        if active {
            interactionState = .fallback
        } else if isBackgrounded {
            interactionState = .backgrounded
        } else {
            interactionState = isBookOpen ? .reading : .closed
        }
    }

    public func recordTick(wasActive: Bool) {
        if wasActive {
            activeSimulationTicks += 1
        } else {
            suspendedIdleTicks += 1
        }
    }
}
