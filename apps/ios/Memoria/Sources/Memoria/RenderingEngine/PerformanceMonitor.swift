import Foundation

public enum PerformanceHealthStatus: String, Sendable, Equatable {
    case insufficientData
    case healthy
    case moderateDegradation
    case severeDegradation
}

public struct PerformanceMetricsSnapshot: Sendable, Equatable {
    public let sampleCount: Int
    public let averageFrameTimeMs: Double
    public let p95FrameTimeMs: Double
    public let frameTimeVarianceMs: Double
    public let droppedFrameCount: Int
    public let droppedFrameRatio: Double
    public let targetFrameBudgetMs: Double
    public let lastModelLoadDurationMs: Double?
    public let lastTextureLoadDurationMs: Double?
    public let healthStatus: PerformanceHealthStatus

    public init(
        sampleCount: Int,
        averageFrameTimeMs: Double,
        p95FrameTimeMs: Double,
        frameTimeVarianceMs: Double,
        droppedFrameCount: Int,
        droppedFrameRatio: Double,
        targetFrameBudgetMs: Double,
        lastModelLoadDurationMs: Double?,
        lastTextureLoadDurationMs: Double?,
        healthStatus: PerformanceHealthStatus
    ) {
        self.sampleCount = sampleCount
        self.averageFrameTimeMs = averageFrameTimeMs
        self.p95FrameTimeMs = p95FrameTimeMs
        self.frameTimeVarianceMs = frameTimeVarianceMs
        self.droppedFrameCount = droppedFrameCount
        self.droppedFrameRatio = droppedFrameRatio
        self.targetFrameBudgetMs = targetFrameBudgetMs
        self.lastModelLoadDurationMs = lastModelLoadDurationMs
        self.lastTextureLoadDurationMs = lastTextureLoadDurationMs
        self.healthStatus = healthStatus
    }

    public static let empty = PerformanceMetricsSnapshot(
        sampleCount: 0,
        averageFrameTimeMs: 0,
        p95FrameTimeMs: 0,
        frameTimeVarianceMs: 0,
        droppedFrameCount: 0,
        droppedFrameRatio: 0,
        targetFrameBudgetMs: 16.67,
        lastModelLoadDurationMs: nil,
        lastTextureLoadDurationMs: nil,
        healthStatus: .insufficientData
    )
}

@MainActor
public final class PerformanceMonitor {
    private var frameTimesMs: [Double] = []
    private let maxSampleCapacity: Int
    private var targetFrameBudgetMs: Double = 16.67
    private var lastModelLoadMs: Double?
    private var lastTextureLoadMs: Double?

    public init(maxSampleCapacity: Int = 180) {
        self.maxSampleCapacity = max(30, maxSampleCapacity)
    }

    public func updateTargetFrameBudgetMs(_ budgetMs: Double) {
        guard budgetMs > 0 else { return }
        targetFrameBudgetMs = budgetMs
    }

    public func recordFrameDelta(seconds: Double) {
        guard seconds.isFinite && seconds > 0 else { return }
        // Clamp extreme resume spikes (e.g. returning from background) so a single pause
        // does not corrupt frame-time variance; treat > 250ms as non-active stall outlier.
        let ms = min(seconds * 1000.0, 250.0)
        frameTimesMs.append(ms)
        if frameTimesMs.count > maxSampleCapacity {
            frameTimesMs.removeFirst(frameTimesMs.count - maxSampleCapacity)
        }
    }

    public func recordModelLoadDuration(ms: Double) {
        guard ms.isFinite && ms >= 0 else { return }
        lastModelLoadMs = ms
    }

    public func recordTextureLoadDuration(ms: Double) {
        guard ms.isFinite && ms >= 0 else { return }
        lastTextureLoadMs = ms
    }

    public func resetFrameSamples() {
        frameTimesMs.removeAll(keepingCapacity: true)
    }

    public func snapshot() -> PerformanceMetricsSnapshot {
        let count = frameTimesMs.count
        guard count > 0 else {
            return PerformanceMetricsSnapshot(
                sampleCount: 0,
                averageFrameTimeMs: 0,
                p95FrameTimeMs: 0,
                frameTimeVarianceMs: 0,
                droppedFrameCount: 0,
                droppedFrameRatio: 0,
                targetFrameBudgetMs: targetFrameBudgetMs,
                lastModelLoadDurationMs: lastModelLoadMs,
                lastTextureLoadDurationMs: lastTextureLoadMs,
                healthStatus: .insufficientData
            )
        }

        let sum = frameTimesMs.reduce(0.0, +)
        let avg = sum / Double(count)

        let sorted = frameTimesMs.sorted()
        let p95Index = min(count - 1, Int(Double(count - 1) * 0.95))
        let p95 = sorted[p95Index]

        let varianceSum = frameTimesMs.reduce(0.0) { acc, value in
            let diff = value - avg
            return acc + diff * diff
        }
        let stdDev = sqrt(varianceSum / Double(count))

        // Consider a frame dropped when it exceeds 1.25x the active frame budget (e.g. > 20.8 ms at 60 Hz)
        let dropThresholdMs = max(18.0, targetFrameBudgetMs * 1.25)
        let droppedCount = frameTimesMs.filter { $0 > dropThresholdMs }.count
        let droppedRatio = Double(droppedCount) / Double(count)

        let health: PerformanceHealthStatus
        if count < 15 {
            health = .insufficientData
        } else if droppedRatio >= 0.30 || p95 > targetFrameBudgetMs * 2.0 {
            health = .severeDegradation
        } else if droppedRatio >= 0.12 || p95 > targetFrameBudgetMs * 1.45 || stdDev > targetFrameBudgetMs * 0.75 {
            health = .moderateDegradation
        } else {
            health = .healthy
        }

        return PerformanceMetricsSnapshot(
            sampleCount: count,
            averageFrameTimeMs: avg,
            p95FrameTimeMs: p95,
            frameTimeVarianceMs: stdDev,
            droppedFrameCount: droppedCount,
            droppedFrameRatio: droppedRatio,
            targetFrameBudgetMs: targetFrameBudgetMs,
            lastModelLoadDurationMs: lastModelLoadMs,
            lastTextureLoadDurationMs: lastTextureLoadMs,
            healthStatus: health
        )
    }
}
