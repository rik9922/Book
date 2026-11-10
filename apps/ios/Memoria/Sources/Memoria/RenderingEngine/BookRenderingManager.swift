import Foundation
import Combine
import os.log

#if canImport(UIKit)
import UIKit
#endif

@MainActor
public final class BookRenderingManager: ObservableObject {
    public static let shared = BookRenderingManager()

    public let capabilityAnalyzer: DeviceCapabilityAnalyzer
    public let thermalMonitor: ThermalMonitor
    public let performanceMonitor: PerformanceMonitor
    public let memoryPressureManager: MemoryPressureManager
    public let qualityController: RenderingQualityController
    public let assetManager: BookAssetManager
    public let textureManager: TextureResourceManager
    public let fallbackController: BookFallbackController

    @Published public private(set) var activeConfiguration: RenderingConfiguration
    @Published public private(set) var activeProfile: RenderingQualityProfile
    @Published public private(set) var isAppInBackground: Bool = false

    private var cancellables: Set<AnyCancellable> = []
    private nonisolated(unsafe) var backgroundObserver: NSObjectProtocol?
    private nonisolated(unsafe) var foregroundObserver: NSObjectProtocol?
    private var activeInteractionState: BookInteractionState = .closed
    private var activeSpreadIndex: Int = 0
    private var totalSpreadsCount: Int = Book3DSampleData.sampleSpreads.count
    private var reduceMotionPreference: Bool = false
    private var evaluationTickCounter: Int = 0
    private nonisolated(unsafe) var recoveryTask: Task<Void, Never>?

    private let logger = Logger(subsystem: "com.memoria.app", category: "Adaptive3DRendering")

    public init(
        environmentSnapshot: DeviceEnvironmentSnapshot? = nil,
        thermalMonitor: ThermalMonitor? = nil,
        performanceMonitor: PerformanceMonitor? = nil,
        memoryPressureManager: MemoryPressureManager? = nil,
        assetManager: BookAssetManager? = nil,
        textureManager: TextureResourceManager? = nil,
        fallbackController: BookFallbackController? = nil,
        downgradeCooldownSeconds: TimeInterval = 2.5,
        recoveryCooldownSeconds: TimeInterval = 12.0,
        observeAppLifecycle: Bool = true
    ) {
        let analyzer = DeviceCapabilityAnalyzer()
        let snapshot = environmentSnapshot ?? DeviceEnvironmentSnapshot.captureCurrent()
        let assessment = analyzer.assess(snapshot: snapshot)

        let thermal = thermalMonitor ?? ThermalMonitor(
            initialThermalState: snapshot.thermalState,
            initialLowPowerMode: snapshot.isLowPowerModeEnabled,
            observeSystemNotifications: environmentSnapshot == nil
        )
        let perf = performanceMonitor ?? PerformanceMonitor()
        let mem = memoryPressureManager ?? MemoryPressureManager(
            observeSystemEvents: environmentSnapshot == nil
        )
        let assets = assetManager ?? .shared
        let textures = textureManager ?? .shared
        let fallback = fallbackController ?? BookFallbackController()
        let quality = RenderingQualityController(
            capabilityAssessment: assessment,
            downgradeCooldownSeconds: downgradeCooldownSeconds,
            recoveryCooldownSeconds: recoveryCooldownSeconds
        )

        self.capabilityAnalyzer = analyzer
        self.thermalMonitor = thermal
        self.performanceMonitor = perf
        self.memoryPressureManager = mem
        self.qualityController = quality
        self.assetManager = assets
        self.textureManager = textures
        self.fallbackController = fallback
        self.activeProfile = quality.activeProfile
        self.activeConfiguration = quality.configuration

        applyConfigurationBudgets(quality.configuration)
        if quality.activeProfile == .fallback {
            fallback.activateFallback(
                reason: .initialCapabilityAssessment,
                internalDetail: assessment.reasons.joined(separator: "; ")
            )
        }

        wireObservers(observeAppLifecycle: observeAppLifecycle)
    }

    deinit {
        recoveryTask?.cancel()
        if let backgroundObserver {
            NotificationCenter.default.removeObserver(backgroundObserver)
        }
        if let foregroundObserver {
            NotificationCenter.default.removeObserver(foregroundObserver)
        }
    }

    private func wireObservers(observeAppLifecycle: Bool) {
        thermalMonitor.onThermalStateChanged = { [weak self] state, directive, isLowPower, eventDate in
            guard let self else { return }
            self.logger.notice("Thermal state changed: \(ThermalMonitor.label(for: state), privacy: .public), directive=\(directive.rawValue, privacy: .public), lowPower=\(isLowPower)")
            if state == .serious || state == .critical {
                self.assetManager.trimForBackground(keeping: self.activeConfiguration.assetVariant)
            }
            self.evaluateRuntimeQuality(now: eventDate)
        }

        memoryPressureManager.onPressureChanged = { [weak self] level, eventDate in
            guard let self else { return }
            self.logger.warning("Memory pressure changed: \(level.rawValue, privacy: .public)")
            self.assetManager.handleMemoryPressure(level, activeVariant: self.activeConfiguration.assetVariant)
            self.textureManager.handleMemoryPressure(level, activeSpreadIndex: self.activeSpreadIndex)
            self.evaluateRuntimeQuality(now: eventDate)
        }

        qualityController.$activeProfile
            .sink { [weak self] profile in
                self?.activeProfile = profile
            }
            .store(in: &cancellables)

        fallbackController.objectWillChange
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)

        qualityController.$configuration
            .sink { [weak self] config in
                guard let self else { return }
                self.activeConfiguration = config
                self.applyConfigurationBudgets(config)
                if config.profile == .fallback && !self.fallbackController.isFallbackActive {
                    let reason = self.qualityController.transitionHistory.last?.reason ?? .initialCapabilityAssessment
                    let detail = self.qualityController.transitionHistory.last?.detail ?? "Fallback activated"
                    self.fallbackController.activateFallback(reason: reason, internalDetail: detail)
                } else if config.profile != .fallback && self.fallbackController.isFallbackActive {
                    self.fallbackController.clearFallbackIfRecovered()
                }
            }
            .store(in: &cancellables)

        #if canImport(UIKit)
        if observeAppLifecycle {
            backgroundObserver = NotificationCenter.default.addObserver(
                forName: UIApplication.didEnterBackgroundNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.handleAppBackgrounded()
                }
            }

            foregroundObserver = NotificationCenter.default.addObserver(
                forName: UIApplication.willEnterForegroundNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.handleAppForegrounded()
                }
            }
        }
        #endif
    }

    public func updateInteractionContext(
        state: BookInteractionState,
        spreadIndex: Int,
        totalSpreads: Int,
        reduceMotion: Bool
    ) {
        let spreadChanged = activeSpreadIndex != spreadIndex
        let reduceMotionChanged = reduceMotionPreference != reduceMotion
        activeInteractionState = state
        activeSpreadIndex = spreadIndex
        totalSpreadsCount = max(1, totalSpreads)
        reduceMotionPreference = reduceMotion

        if reduceMotionChanged {
            qualityController.refreshConfiguration(reduceMotion: reduceMotion)
        }

        let allowPreload = activeConfiguration.allowPreloading
            && (thermalMonitor.currentState == .nominal || thermalMonitor.currentState == .fair)
        if spreadChanged || state == .reading || state == .opening {
            textureManager.prepareSpreadWindow(
                activeSpreadIndex: spreadIndex,
                totalSpreads: totalSpreadsCount,
                allowAdjacentPreload: allowPreload
            )
        }

        if !state.isCriticalAnimation && qualityController.pendingDeferredProfile != nil {
            evaluateRuntimeQuality()
        }
    }

    public func recordActiveFrameDelta(_ deltaTime: Double) {
        performanceMonitor.recordFrameDelta(seconds: deltaTime)
        evaluationTickCounter += 1
        // Evaluate quality every ~30 active frames to avoid per-frame evaluation overhead
        if evaluationTickCounter >= 30 {
            evaluationTickCounter = 0
            evaluateRuntimeQuality()
        }
    }

    public func recordModelLoad(durationMs: Double) {
        performanceMonitor.recordModelLoadDuration(ms: durationMs)
    }

    public func reportSceneLoadFailure(_ message: String) {
        logger.error("3D scene load failure: \(message, privacy: .public)")
        let enteredFallback = fallbackController.recordLoadFailure(detail: message)
        if enteredFallback {
            qualityController.forceFallback(reason: .repeatedAssetFailures, detail: message)
        } else if activeProfile > .efficient {
            qualityController.evaluate(
                thermalState: thermalMonitor.currentState,
                isLowPowerMode: thermalMonitor.isLowPowerModeEnabled,
                memoryPressure: .warning,
                performance: performanceMonitor.snapshot(),
                interactionState: activeInteractionState,
                reduceMotion: reduceMotionPreference
            )
        } else {
            fallbackController.activateFallback(reason: .sceneLoadFailure, internalDetail: message)
            qualityController.forceFallback(reason: .sceneLoadFailure, detail: message)
        }
    }

    public func handleAppBackgrounded() {
        guard !isAppInBackground else { return }
        isAppInBackground = true
        recoveryTask?.cancel()
        recoveryTask = nil
        activeInteractionState = .backgrounded
        assetManager.cancelAllInFlightLoads()
        assetManager.trimForBackground(keeping: activeConfiguration.assetVariant)
        textureManager.handleMemoryPressure(.warning, activeSpreadIndex: activeSpreadIndex)
        performanceMonitor.resetFrameSamples()
        logger.notice("Memoria 3D engine suspended for background")
    }

    public func handleAppForegrounded() {
        guard isAppInBackground else { return }
        isAppInBackground = false
        evaluateRuntimeQuality()
        let allowPreload = activeConfiguration.allowPreloading
            && (thermalMonitor.currentState == .nominal || thermalMonitor.currentState == .fair)
        textureManager.prepareSpreadWindow(
            activeSpreadIndex: activeSpreadIndex,
            totalSpreads: totalSpreadsCount,
            allowAdjacentPreload: allowPreload
        )
        logger.notice("Memoria 3D engine restored to foreground (profile=\(self.activeProfile.rawValue, privacy: .public))")
    }

    public func evaluateRuntimeQuality(now: Date = Date()) {
        // Do not auto-recover out of asset-failure fallback unless explicitly reset
        if activeProfile == .fallback && fallbackController.retryAttempts > 0 {
            recoveryTask?.cancel()
            recoveryTask = nil
            return
        }
        qualityController.evaluate(
            thermalState: thermalMonitor.currentState,
            isLowPowerMode: thermalMonitor.isLowPowerModeEnabled,
            memoryPressure: memoryPressureManager.currentLevel,
            performance: performanceMonitor.snapshot(),
            interactionState: activeInteractionState,
            reduceMotion: reduceMotionPreference,
            now: now
        )
        scheduleRecoveryIfNeeded()
    }

    private func scheduleRecoveryIfNeeded() {
        guard !isAppInBackground else {
            recoveryTask?.cancel()
            recoveryTask = nil
            return
        }

        var desiredCap = qualityController.capabilityAssessment.maximumSustainableProfile
        if thermalMonitor.currentState == .critical || memoryPressureManager.currentLevel == .critical {
            desiredCap = .fallback
        } else if thermalMonitor.currentState == .serious || thermalMonitor.isLowPowerModeEnabled || memoryPressureManager.currentLevel == .warning {
            desiredCap = min(desiredCap, .efficient)
        } else if thermalMonitor.currentState == .fair {
            desiredCap = min(desiredCap, .balanced)
        }

        let perfHealth = performanceMonitor.snapshot().healthStatus
        let canRecover = activeProfile < desiredCap
            && (perfHealth == .healthy || perfHealth == .insufficientData)

        guard canRecover else {
            recoveryTask?.cancel()
            recoveryTask = nil
            return
        }

        if recoveryTask != nil {
            return
        }

        let delaySeconds = max(0.05, qualityController.recoveryCooldownSeconds + 0.05)
        recoveryTask = Task { @MainActor [weak self] in
            let nanos = UInt64(delaySeconds * 1_000_000_000.0)
            try? await Task.sleep(nanoseconds: nanos)
            guard !Task.isCancelled, let self else { return }
            self.recoveryTask = nil
            self.evaluateRuntimeQuality()
        }
    }

    private func applyConfigurationBudgets(_ config: RenderingConfiguration) {
        performanceMonitor.updateTargetFrameBudgetMs(config.frameBudgetMs)
        assetManager.applyBudget(config.assetCacheBudgetBytes)
        textureManager.updateBudget(
            bytes: config.textureMemoryBudgetBytes,
            maxDimension: config.maxTextureDimension
        )
    }
}
