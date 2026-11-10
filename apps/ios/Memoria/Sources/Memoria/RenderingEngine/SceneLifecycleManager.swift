import Foundation
import Combine

/// Explicit 13-state rendering lifecycle defined by Part VIII.20 of the Memoria 3D Engineering Directive.
public enum SceneLifecycleState: String, CaseIterable, Sendable, Codable {
    case notLoaded
    case loading
    case ready
    case idle
    case interacting
    case opening
    case closing
    case turningPage
    case reading
    case suspended
    case recovering
    case fallback
    case failed

    public var requiresContinuousSimulation: Bool {
        switch self {
        case .interacting, .opening, .closing, .turningPage:
            return true
        case .notLoaded, .loading, .ready, .idle, .reading, .suspended, .recovering, .fallback, .failed:
            return false
        }
    }

    public var isCriticalAnimation: Bool {
        switch self {
        case .opening, .closing, .turningPage:
            return true
        default:
            return false
        }
    }

    public var legacyInteractionState: BookInteractionState {
        switch self {
        case .notLoaded, .loading, .ready:
            return .closed
        case .idle:
            return .idle
        case .interacting:
            return .interactive
        case .opening:
            return .opening
        case .closing:
            return .closing
        case .turningPage:
            return .pageTurning
        case .reading:
            return .reading
        case .suspended:
            return .backgrounded
        case .recovering:
            return .idle
        case .fallback, .failed:
            return .fallback
        }
    }
}

public struct SceneLifecycleTransitionRecord: Identifiable, Sendable, Equatable {
    public let id: UUID
    public let timestamp: Date
    public let from: SceneLifecycleState
    public let to: SceneLifecycleState
    public let reason: String

    public init(
        id: UUID = UUID(),
        timestamp: Date = Date(),
        from: SceneLifecycleState,
        to: SceneLifecycleState,
        reason: String
    ) {
        self.id = id
        self.timestamp = timestamp
        self.from = from
        self.to = to
        self.reason = reason
    }
}

@MainActor
public final class SceneLifecycleManager: ObservableObject {
    @Published public private(set) var lifecycleState: SceneLifecycleState = .notLoaded
    @Published public private(set) var interactionState: BookInteractionState = .closed
    @Published public private(set) var presentationMode: BookPresentationMode = .reading
    @Published public private(set) var isBackgrounded: Bool = false
    @Published public private(set) var isOccluded: Bool = false
    @Published public private(set) var isFallbackActive: Bool = false
    @Published public private(set) var activeSimulationTicks: Int = 0
    @Published public private(set) var suspendedIdleTicks: Int = 0
    @Published public private(set) var transitionLog: [SceneLifecycleTransitionRecord] = []
    @Published public private(set) var lastFailureMessage: String?

    public var onCancelObsoleteTasks: (() -> Void)?

    private var stateBeforeSuspension: SceneLifecycleState = .idle
    private let maxLogEntries = 48

    public init(presentationMode: BookPresentationMode = .reading) {
        self.presentationMode = presentationMode
    }

    public var isSimulationSuspended: Bool {
        if isBackgrounded || isOccluded || isFallbackActive {
            return true
        }
        return !lifecycleState.requiresContinuousSimulation
    }

    public static func isValidTransition(from: SceneLifecycleState, to: SceneLifecycleState) -> Bool {
        if from == to { return true }
        switch from {
        case .notLoaded:
            return [.loading, .ready, .idle, .reading, .opening, .closing, .fallback, .failed, .suspended].contains(to)
        case .loading:
            return [.ready, .idle, .reading, .opening, .closing, .failed, .fallback, .suspended].contains(to)
        case .ready:
            return [.loading, .idle, .reading, .opening, .closing, .interacting, .turningPage, .suspended, .recovering, .fallback, .failed].contains(to)
        case .idle:
            return [.interacting, .opening, .closing, .reading, .turningPage, .suspended, .recovering, .fallback, .failed, .loading].contains(to)
        case .interacting:
            return [.idle, .reading, .opening, .closing, .turningPage, .suspended, .fallback, .failed, .loading].contains(to)
        case .opening:
            return [.reading, .idle, .closing, .interacting, .turningPage, .suspended, .fallback, .failed, .loading].contains(to)
        case .closing:
            return [.idle, .reading, .opening, .interacting, .suspended, .fallback, .failed, .loading].contains(to)
        case .turningPage:
            return [.reading, .idle, .interacting, .closing, .opening, .suspended, .fallback, .failed, .loading].contains(to)
        case .reading:
            return [.interacting, .turningPage, .closing, .opening, .idle, .suspended, .recovering, .fallback, .failed, .loading].contains(to)
        case .suspended:
            return [.recovering, .ready, .idle, .reading, .fallback, .failed].contains(to)
        case .recovering:
            return [.loading, .ready, .idle, .reading, .fallback, .failed, .suspended].contains(to)
        case .fallback:
            return [.recovering, .loading, .ready, .idle, .reading, .suspended].contains(to)
        case .failed:
            return [.recovering, .loading, .fallback, .suspended].contains(to)
        }
    }

    @discardableResult
    public func transition(to next: SceneLifecycleState, reason: String) -> Bool {
        guard Self.isValidTransition(from: lifecycleState, to: next) else {
            return false
        }
        guard next != lifecycleState else { return true }

        let previous = lifecycleState
        lifecycleState = next
        interactionState = next.legacyInteractionState

        // Entry actions (cancel obsolete tasks once when leaving active work for suspended/failed/fallback)
        switch next {
        case .suspended, .failed, .fallback:
            onCancelObsoleteTasks?()
        case .ready, .idle, .reading:
            lastFailureMessage = nil
        default:
            break
        }

        transitionLog.append(SceneLifecycleTransitionRecord(from: previous, to: next, reason: reason))
        if transitionLog.count > maxLogEntries {
            transitionLog.removeFirst(transitionLog.count - maxLogEntries)
        }
        return true
    }

    public func setPresentationMode(_ mode: BookPresentationMode) {
        presentationMode = mode
    }

    public func beginLoading() {
        if lifecycleState == .failed || lifecycleState == .fallback {
            _ = transition(to: .recovering, reason: "Retry requested")
        }
        _ = transition(to: .loading, reason: "Loading 3D book asset")
    }

    public func markSceneReady(isOpen: Bool) {
        lastFailureMessage = nil
        _ = transition(to: .ready, reason: "3D scene hierarchy attached")
        if !isBackgrounded && !isOccluded && !isFallbackActive {
            _ = transition(to: isOpen ? .reading : .idle, reason: isOpen ? "Initial open state" : "Initial closed state")
        }
    }

    public func markFailed(_ message: String) {
        lastFailureMessage = message
        _ = transition(to: .failed, reason: message)
    }

    public func beginRecovery() {
        _ = transition(to: .recovering, reason: "Attempting scene recovery")
    }

    public func setBookOpenState(isOpen: Bool, animating: Bool) {
        guard !isFallbackActive else {
            _ = transition(to: .fallback, reason: "Fallback active")
            return
        }
        if animating {
            _ = transition(to: isOpen ? .opening : .closing, reason: isOpen ? "Cover opening" : "Cover closing")
        } else {
            _ = transition(to: isOpen ? .reading : .idle, reason: isOpen ? "Cover open (direct)" : "Cover closed (direct)")
        }
    }

    public func beginUserInteraction() {
        guard !isBackgrounded, !isOccluded, !isFallbackActive else { return }
        if !lifecycleState.isCriticalAnimation {
            _ = transition(to: .interacting, reason: "User gesture active")
        }
    }

    public func endUserInteraction(isOpen: Bool) {
        guard !isBackgrounded, !isOccluded, !isFallbackActive else { return }
        if !lifecycleState.isCriticalAnimation {
            _ = transition(to: isOpen ? .reading : .idle, reason: "User gesture ended")
        }
    }

    public func beginPageTurn() {
        guard !isBackgrounded, !isOccluded, !isFallbackActive else { return }
        _ = transition(to: .turningPage, reason: "Page turn active")
    }

    public func settleToIdleOrReading(isOpen: Bool) {
        guard !isBackgrounded, !isOccluded, !isFallbackActive else { return }
        _ = transition(to: isOpen ? .reading : .idle, reason: isOpen ? "Settled to reading" : "Settled to idle")
        // Maintain legacy closed vs idle expectation when closed
        if !isOpen {
            interactionState = .closed
        }
    }

    public func setOccluded(_ occluded: Bool, isBookOpen: Bool) {
        isOccluded = occluded
        if occluded {
            if lifecycleState != .suspended && lifecycleState != .fallback && lifecycleState != .failed {
                stateBeforeSuspension = isBookOpen ? .reading : .idle
                _ = transition(to: .suspended, reason: "Scene occluded")
            }
        } else if !isBackgrounded && !isFallbackActive {
            if lifecycleState == .suspended {
                _ = transition(to: .recovering, reason: "Scene visible again")
            }
            _ = transition(to: isBookOpen ? .reading : .idle, reason: "Scene active")
            if !isBookOpen {
                interactionState = .closed
            }
        }
    }

    public func enterBackground(isBookOpen: Bool) {
        guard !isBackgrounded else { return }
        stateBeforeSuspension = isBookOpen ? .reading : .idle
        isBackgrounded = true
        if !isFallbackActive {
            _ = transition(to: .suspended, reason: "App entered background")
        }
    }

    public func enterForeground(isBookOpen: Bool) {
        isBackgrounded = false
        if isFallbackActive {
            _ = transition(to: .fallback, reason: "Foreground with fallback active")
        } else {
            if lifecycleState == .suspended {
                _ = transition(to: .recovering, reason: "App returned to foreground")
            }
            let target: SceneLifecycleState = isBookOpen ? .reading : .idle
            _ = transition(to: target, reason: "Restored foreground state")
            if !isBookOpen {
                interactionState = .closed
            }
        }
    }

    public func setFallbackActive(_ active: Bool, isBookOpen: Bool) {
        isFallbackActive = active
        if active {
            _ = transition(to: .fallback, reason: "Fallback presentation activated")
        } else if isBackgrounded {
            _ = transition(to: .suspended, reason: "Fallback cleared while backgrounded")
        } else {
            _ = transition(to: .recovering, reason: "Recovering from fallback")
            let target: SceneLifecycleState = isBookOpen ? .reading : .idle
            _ = transition(to: target, reason: "Recovered to 3D")
            if !isBookOpen {
                interactionState = .closed
            }
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
