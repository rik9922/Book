import Foundation
import Combine
import Dispatch

#if canImport(UIKit)
import UIKit
#endif

#if canImport(Darwin)
import Darwin
#endif

public enum MemoryPressureLevel: String, Sendable, Codable, Equatable, Comparable {
    case normal
    case warning
    case critical

    private var rank: Int {
        switch self {
        case .normal: return 0
        case .warning: return 1
        case .critical: return 2
        }
    }

    public static func < (lhs: MemoryPressureLevel, rhs: MemoryPressureLevel) -> Bool {
        lhs.rank < rhs.rank
    }
}

@MainActor
public final class MemoryPressureManager: ObservableObject {
    @Published public private(set) var currentLevel: MemoryPressureLevel = .normal
    @Published public private(set) var warningCount: Int = 0
    @Published public private(set) var lastPressureEventDate: Date?

    public var onPressureChanged: ((MemoryPressureLevel) -> Void)?

    private nonisolated(unsafe) var memoryWarningObserver: NSObjectProtocol?
    private nonisolated(unsafe) var memoryPressureSource: DispatchSourceMemoryPressure?
    private let notificationCenter: NotificationCenter

    public init(
        notificationCenter: NotificationCenter = .default,
        observeSystemEvents: Bool = true
    ) {
        self.notificationCenter = notificationCenter
        if observeSystemEvents {
            startObserving()
        }
    }

    deinit {
        if let memoryWarningObserver {
            notificationCenter.removeObserver(memoryWarningObserver)
        }
        memoryPressureSource?.cancel()
    }

    public func startObserving() {
        #if canImport(UIKit)
        if memoryWarningObserver == nil {
            memoryWarningObserver = notificationCenter.addObserver(
                forName: UIApplication.didReceiveMemoryWarningNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.handleMemoryPressure(.warning)
                }
            }
        }
        #endif

        if memoryPressureSource == nil {
            let source = DispatchSource.makeMemoryPressureSource(
                eventMask: [.warning, .critical, .normal],
                queue: .main
            )
            source.setEventHandler { [weak self, weak source] in
                guard let source else { return }
                let event = source.data
                Task { @MainActor [weak self] in
                    if event.contains(.critical) {
                        self?.handleMemoryPressure(.critical)
                    } else if event.contains(.warning) {
                        self?.handleMemoryPressure(.warning)
                    } else if event.contains(.normal) {
                        self?.handleMemoryPressure(.normal)
                    }
                }
            }
            source.resume()
            memoryPressureSource = source
        }
    }

    public func stopObserving() {
        if let memoryWarningObserver {
            notificationCenter.removeObserver(memoryWarningObserver)
            self.memoryWarningObserver = nil
        }
        memoryPressureSource?.cancel()
        memoryPressureSource = nil
    }

    public func handleMemoryPressure(_ level: MemoryPressureLevel, at date: Date = Date()) {
        if level != .normal {
            warningCount += 1
            lastPressureEventDate = date
        }
        let changed = currentLevel != level
        currentLevel = level
        if changed || level != .normal {
            onPressureChanged?(level)
        }
    }

    public func availableHeadroomBytes() -> UInt64? {
        #if os(iOS) && !targetEnvironment(simulator)
        return UInt64(os_proc_available_memory())
        #else
        return nil
        #endif
    }
}
