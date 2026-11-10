import Foundation
import Combine

#if canImport(MetricKit) && os(iOS)
import MetricKit
#endif

public struct MetricKitSummarySnapshot: Sendable, Equatable {
    public let isRegistered: Bool
    public let receivedMetricPayloads: Int
    public let receivedDiagnosticPayloads: Int
    public let lastPayloadTimestamp: Date?
    public let lastPeakMemoryMB: Double?
    public let lastHangCount: Int

    public static let initial = MetricKitSummarySnapshot(
        isRegistered: false,
        receivedMetricPayloads: 0,
        receivedDiagnosticPayloads: 0,
        lastPayloadTimestamp: nil,
        lastPeakMemoryMB: nil,
        lastHangCount: 0
    )
}

/// Observes Apple's supported MetricKit aggregate telemetry payloads on iOS without
/// fabricating metrics. On simulators or before the OS delivers its periodic payload,
/// `receivedMetricPayloads` remains 0 and surfaces honestly in diagnostics.
@MainActor
public final class MetricKitDiagnosticsCollector: NSObject, ObservableObject {
    public static let shared = MetricKitDiagnosticsCollector()

    @Published public private(set) var snapshot: MetricKitSummarySnapshot = .initial

    #if canImport(MetricKit) && os(iOS)
    private var subscriberRegistered = false
    #endif

    public override init() {
        super.init()
    }

    public func startIfSupported() {
        #if canImport(MetricKit) && os(iOS)
        guard !subscriberRegistered else { return }
        MXMetricManager.shared.add(self)
        subscriberRegistered = true
        snapshot = MetricKitSummarySnapshot(
            isRegistered: true,
            receivedMetricPayloads: snapshot.receivedMetricPayloads,
            receivedDiagnosticPayloads: snapshot.receivedDiagnosticPayloads,
            lastPayloadTimestamp: snapshot.lastPayloadTimestamp,
            lastPeakMemoryMB: snapshot.lastPeakMemoryMB,
            lastHangCount: snapshot.lastHangCount
        )
        #endif
    }

    public func stop() {
        #if canImport(MetricKit) && os(iOS)
        guard subscriberRegistered else { return }
        MXMetricManager.shared.remove(self)
        subscriberRegistered = false
        #endif
    }
}

#if canImport(MetricKit) && os(iOS)
extension MetricKitDiagnosticsCollector: MXMetricManagerSubscriber {
    nonisolated public func didReceive(_ payloads: [MXMetricPayload]) {
        let count = payloads.count
        let latest = payloads.last
        let peakBytes = latest?.memoryMetrics?.peakMemoryUsage.converted(to: .megabytes).value
        let timestamp = latest?.timeStampEnd ?? Date()

        Task { @MainActor [weak self] in
            guard let self else { return }
            self.snapshot = MetricKitSummarySnapshot(
                isRegistered: self.snapshot.isRegistered,
                receivedMetricPayloads: self.snapshot.receivedMetricPayloads + count,
                receivedDiagnosticPayloads: self.snapshot.receivedDiagnosticPayloads,
                lastPayloadTimestamp: timestamp,
                lastPeakMemoryMB: peakBytes ?? self.snapshot.lastPeakMemoryMB,
                lastHangCount: self.snapshot.lastHangCount
            )
        }
    }

    nonisolated public func didReceive(_ payloads: [MXDiagnosticPayload]) {
        let count = payloads.count
        let hangCount = payloads.reduce(0) { $0 + ($1.hangDiagnostics?.count ?? 0) }
        let timestamp = payloads.last?.timeStampEnd ?? Date()

        Task { @MainActor [weak self] in
            guard let self else { return }
            self.snapshot = MetricKitSummarySnapshot(
                isRegistered: self.snapshot.isRegistered,
                receivedMetricPayloads: self.snapshot.receivedMetricPayloads,
                receivedDiagnosticPayloads: self.snapshot.receivedDiagnosticPayloads + count,
                lastPayloadTimestamp: timestamp,
                lastPeakMemoryMB: self.snapshot.lastPeakMemoryMB,
                lastHangCount: self.snapshot.lastHangCount + hangCount
            )
        }
    }
}
#endif
