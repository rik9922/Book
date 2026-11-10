import SwiftUI

public struct RenderingDiagnosticsView: View {
    @ObservedObject private var manager: BookRenderingManager
    @State private var refreshCounter = 0

    public init(manager: BookRenderingManager = .shared) {
        self.manager = manager
    }

    public var body: some View {
        let perf = manager.performanceMonitor.snapshot()
        let assessment = manager.qualityController.capabilityAssessment
        let config = manager.activeConfiguration

        List {
            Section("Active Adaptive Profile") {
                row("Device Tier", value: "\(assessment.tier.rawValue) (\(assessment.tier.summaryLabel))")
                row("Active Profile", value: manager.activeProfile.displayName)
                row("USDZ Variant", value: config.assetVariant.resourceName)
                row("Target Cadence", value: config.targetFrameRate > 0 ? "\(config.targetFrameRate) Hz (\(String(format: "%.2f", config.frameBudgetMs)) ms)" : "Suspended (2D)")
                row("Lighting Mode", value: config.lightingMode.rawValue)
                row("Shadow Mode", value: config.shadowMode.rawValue)
                row("Clearcoat PBR", value: config.enableClearcoat ? "Enabled" : "Disabled")
            }

            Section("Thermal, Power & Memory") {
                row("Thermal State", value: ThermalMonitor.label(for: manager.thermalMonitor.currentState))
                row("Low Power Mode", value: manager.thermalMonitor.isLowPowerModeEnabled ? "Enabled" : "Disabled")
                row("Memory Pressure", value: manager.memoryPressureManager.currentLevel.rawValue.capitalized)
                row("Physical RAM", value: String(format: "%.2f GB", assessment.snapshot.physicalMemoryGB))
                row("Asset Cache", value: "\(manager.assetManager.registry.totalCachedBytes / 1024) KB / \(config.assetCacheBudgetBytes / 1024) KB")
                row("Spread Texture Cache", value: "\(manager.textureManager.residentMemoryBytes / 1024) KB / \(config.textureMemoryBudgetBytes / 1024) KB")
            }

            Section("Frame Pacing & Load Telemetry") {
                row("Frame Samples", value: "\(perf.sampleCount)")
                row("Avg Frame Time", value: String(format: "%.2f ms", perf.averageFrameTimeMs))
                row("p95 Frame Time", value: String(format: "%.2f ms", perf.p95FrameTimeMs))
                row("Frame Variance (σ)", value: String(format: "%.2f ms", perf.frameTimeVarianceMs))
                row("Dropped Frames", value: "\(perf.droppedFrameCount) (\(String(format: "%.1f%%", perf.droppedFrameRatio * 100)))")
                row("Health Status", value: perf.healthStatus.rawValue)
                if let loadMs = perf.lastModelLoadDurationMs {
                    row("Last USDZ Load", value: String(format: "%.2f ms", loadMs))
                }
            }

            Section("Capability Assessment Reasons") {
                ForEach(assessment.reasons, id: \.self) { reason in
                    Text(reason)
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                }
            }

            Section("Quality Transition History") {
                ForEach(manager.qualityController.transitionHistory.reversed()) { event in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("\(event.fromProfile.displayName) → \(event.toProfile.displayName)")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(MemoriaTheme.ink)
                            Spacer()
                            Text(event.reason.rawValue)
                                .font(.caption2.monospaced())
                                .foregroundStyle(MemoriaTheme.plum)
                        }
                        Text(event.detail)
                            .font(.caption2)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                    }
                    .padding(.vertical, 2)
                }
            }

            #if DEBUG
            Section("Developer Simulation Controls") {
                Button("Simulate Serious Thermal State") {
                    manager.thermalMonitor.updateThermalState(.serious)
                    refreshCounter += 1
                }
                Button("Simulate Critical Thermal State") {
                    manager.thermalMonitor.updateThermalState(.critical)
                    refreshCounter += 1
                }
                Button("Restore Nominal Thermal State") {
                    manager.thermalMonitor.updateThermalState(.nominal)
                    manager.evaluateRuntimeQuality(now: Date().addingTimeInterval(20))
                    refreshCounter += 1
                }
                Button("Simulate Memory Warning") {
                    manager.memoryPressureManager.handleMemoryPressure(.warning)
                    refreshCounter += 1
                }
                Button("Clear Simulated Memory Pressure") {
                    manager.memoryPressureManager.handleMemoryPressure(.normal)
                    manager.evaluateRuntimeQuality(now: Date().addingTimeInterval(20))
                    refreshCounter += 1
                }
            }
            #endif
        }
        .navigationTitle("3D Engine Diagnostics")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .id(refreshCounter)
    }

    @ViewBuilder
    private func row(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(MemoriaTheme.textPrimary)
            Spacer()
            Text(value)
                .font(.caption.monospaced())
                .foregroundStyle(MemoriaTheme.textSecondary)
                .multilineTextAlignment(.trailing)
        }
    }
}
