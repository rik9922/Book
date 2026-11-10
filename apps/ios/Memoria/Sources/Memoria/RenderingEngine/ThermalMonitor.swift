import Foundation
import Combine

public enum ThermalPolicyDirective: String, Sendable, Equatable {
    case normal
    case conserveBackground
    case reduceWorkload
    case emergencySafeMode
}

public struct ThermalTransitionRecord: Identifiable, Sendable, Equatable {
    public let id: UUID
    public let timestamp: Date
    public let fromState: ProcessInfo.ThermalState
    public let toState: ProcessInfo.ThermalState
    public let directive: ThermalPolicyDirective

    public init(
        id: UUID = UUID(),
        timestamp: Date = Date(),
        fromState: ProcessInfo.ThermalState,
        toState: ProcessInfo.ThermalState,
        directive: ThermalPolicyDirective
    ) {
        self.id = id
        self.timestamp = timestamp
        self.fromState = fromState
        self.toState = toState
        self.directive = directive
    }
}

@MainActor
public final class ThermalMonitor: ObservableObject {
    @Published public private(set) var currentState: ProcessInfo.ThermalState
    @Published public private(set) var isLowPowerModeEnabled: Bool
    @Published public private(set) var directive: ThermalPolicyDirective
    @Published public private(set) var lastTransitionDate: Date
    @Published public private(set) var transitionHistory: [ThermalTransitionRecord] = []

    public var onThermalStateChanged: ((ProcessInfo.ThermalState, ThermalPolicyDirective, Bool, Date) -> Void)?

    private nonisolated(unsafe) var thermalObserver: NSObjectProtocol?
    private nonisolated(unsafe) var powerObserver: NSObjectProtocol?
    private let notificationCenter: NotificationCenter
    private let maxHistoryCount = 32

    public init(
        notificationCenter: NotificationCenter = .default,
        initialThermalState: ProcessInfo.ThermalState = ProcessInfo.processInfo.thermalState,
        initialLowPowerMode: Bool = ProcessInfo.processInfo.isLowPowerModeEnabled,
        observeSystemNotifications: Bool = true
    ) {
        self.notificationCenter = notificationCenter
        self.currentState = initialThermalState
        self.isLowPowerModeEnabled = initialLowPowerMode
        self.directive = Self.directive(for: initialThermalState)
        self.lastTransitionDate = Date()

        if observeSystemNotifications {
            startObserving()
        }
    }

    deinit {
        if let thermalObserver {
            notificationCenter.removeObserver(thermalObserver)
        }
        if let powerObserver {
            notificationCenter.removeObserver(powerObserver)
        }
    }

    public func startObserving() {
        guard thermalObserver == nil, powerObserver == nil else { return }

        thermalObserver = notificationCenter.addObserver(
            forName: ProcessInfo.thermalStateDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            let nextState = ProcessInfo.processInfo.thermalState
            Task { @MainActor [weak self] in
                self?.updateThermalState(nextState)
            }
        }

        powerObserver = notificationCenter.addObserver(
            forName: Notification.Name.NSProcessInfoPowerStateDidChange,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            let nextLowPower = ProcessInfo.processInfo.isLowPowerModeEnabled
            Task { @MainActor [weak self] in
                self?.updateLowPowerMode(nextLowPower)
            }
        }
    }

    public func stopObserving() {
        if let thermalObserver {
            notificationCenter.removeObserver(thermalObserver)
            self.thermalObserver = nil
        }
        if let powerObserver {
            notificationCenter.removeObserver(powerObserver)
            self.powerObserver = nil
        }
    }

    public func updateThermalState(_ nextState: ProcessInfo.ThermalState, at date: Date = Date()) {
        guard nextState != currentState else { return }
        let previous = currentState
        currentState = nextState
        directive = Self.directive(for: nextState)
        lastTransitionDate = date

        let record = ThermalTransitionRecord(
            timestamp: date,
            fromState: previous,
            toState: nextState,
            directive: directive
        )
        transitionHistory.append(record)
        if transitionHistory.count > maxHistoryCount {
            transitionHistory.removeFirst(transitionHistory.count - maxHistoryCount)
        }

        onThermalStateChanged?(nextState, directive, isLowPowerModeEnabled, date)
    }

    public func updateLowPowerMode(_ enabled: Bool, at date: Date = Date()) {
        guard enabled != isLowPowerModeEnabled else { return }
        isLowPowerModeEnabled = enabled
        lastTransitionDate = date
        onThermalStateChanged?(currentState, directive, enabled, date)
    }

    public func timeSinceLastTransition(at date: Date = Date()) -> TimeInterval {
        max(0, date.timeIntervalSince(lastTransitionDate))
    }

    public static func directive(for state: ProcessInfo.ThermalState) -> ThermalPolicyDirective {
        switch state {
        case .nominal: return .normal
        case .fair: return .conserveBackground
        case .serious: return .reduceWorkload
        case .critical: return .emergencySafeMode
        @unknown default: return .reduceWorkload
        }
    }

    public static func label(for state: ProcessInfo.ThermalState) -> String {
        switch state {
        case .nominal: return "Nominal"
        case .fair: return "Fair"
        case .serious: return "Serious"
        case .critical: return "Critical"
        @unknown default: return "Unknown"
        }
    }
}
