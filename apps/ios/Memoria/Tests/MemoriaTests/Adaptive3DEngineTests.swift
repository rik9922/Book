import Testing
import Foundation
@testable import Memoria

#if canImport(RealityKit) && os(iOS)
import RealityKit
#endif

@Suite("Memoria Adaptive 3D Rendering Engine Tests")
struct Adaptive3DEngineTests {

    private func makeSnapshot(
        memoryGB: Double = 8.0,
        cores: Int = 6,
        activeCores: Int? = nil,
        lowPower: Bool = false,
        thermal: ProcessInfo.ThermalState = .nominal,
        refreshRate: Int = 120,
        hasMetal: Bool = true,
        apple4Plus: Bool = true,
        workingSetMB: Double = 2048,
        reduceMotion: Bool = false,
        isSimulator: Bool = false,
        historicalAvgMs: Double? = nil,
        historicalDroppedRatio: Double? = nil
    ) -> DeviceEnvironmentSnapshot {
        DeviceEnvironmentSnapshot(
            physicalMemoryBytes: UInt64(memoryGB * 1024 * 1024 * 1024),
            processorCount: cores,
            activeProcessorCount: activeCores ?? cores,
            isLowPowerModeEnabled: lowPower,
            thermalState: thermal,
            maxRefreshRate: refreshRate,
            hasMetalDevice: hasMetal,
            supportsAppleGPUFamily4Plus: apple4Plus,
            recommendedMaxWorkingSetBytes: UInt64(workingSetMB * 1024 * 1024),
            isReduceMotionEnabled: reduceMotion,
            isSimulator: isSimulator,
            historicalAverageFrameTimeMs: historicalAvgMs,
            historicalDroppedFrameRatio: historicalDroppedRatio
        )
    }

    @Test("Device Capability Analyzer classifies Tiers A/B/C/D and respects measured runtime history")
    func testDeviceCapabilityTiers() {
        let analyzer = DeviceCapabilityAnalyzer()

        let tierA = analyzer.assess(snapshot: makeSnapshot(memoryGB: 8.0, cores: 6))
        #expect(tierA.tier == .tierA)
        #expect(tierA.recommendedProfile == .premium)

        let tierB = analyzer.assess(snapshot: makeSnapshot(memoryGB: 4.0, cores: 6))
        #expect(tierB.tier == .tierB)
        #expect(tierB.recommendedProfile == .balanced)

        let tierC = analyzer.assess(snapshot: makeSnapshot(memoryGB: 2.0, cores: 4))
        #expect(tierC.tier == .tierC)
        #expect(tierC.recommendedProfile == .efficient)

        let tierDNoMetal = analyzer.assess(snapshot: makeSnapshot(memoryGB: 8.0, cores: 6, hasMetal: false))
        #expect(tierDNoMetal.tier == .tierD)
        #expect(tierDNoMetal.recommendedProfile == .fallback)

        let tierDLowRAM = analyzer.assess(snapshot: makeSnapshot(memoryGB: 1.0, cores: 4))
        #expect(tierDLowRAM.tier == .tierD)
        #expect(tierDLowRAM.recommendedProfile == .fallback)

        // Measured historical frame drops constrain Tier A hardware down to Tier B
        let constrainedByHistory = analyzer.assess(
            snapshot: makeSnapshot(memoryGB: 8.0, cores: 6, historicalDroppedRatio: 0.35)
        )
        #expect(constrainedByHistory.tier == .tierB)
        #expect(constrainedByHistory.recommendedProfile == .balanced)

        // Low Power Mode constrains initial recommendation to Efficient
        let lowPower = analyzer.assess(snapshot: makeSnapshot(memoryGB: 8.0, cores: 6, lowPower: true))
        #expect(lowPower.recommendedProfile == .efficient)
    }

    @Test("Thermal escalation downgrades safely and recovery steps up gradually with cooldowns")
    @MainActor
    func testThermalEscalationAndGradualRecovery() {
        let manager = BookRenderingManager(
            environmentSnapshot: makeSnapshot(memoryGB: 8.0, cores: 6),
            downgradeCooldownSeconds: 2.0,
            recoveryCooldownSeconds: 10.0,
            observeAppLifecycle: false
        )

        #expect(manager.activeProfile == .premium)
        let t0 = Date(timeIntervalSince1970: 1_000)

        // Serious thermal pressure downgrades immediately to Efficient
        manager.thermalMonitor.updateThermalState(.serious, at: t0)
        manager.evaluateRuntimeQuality(now: t0)
        #expect(manager.activeProfile == .efficient)
        #expect(!manager.fallbackController.isFallbackActive)

        // Critical thermal pressure activates Fallback immediately
        let t1 = t0.addingTimeInterval(1)
        manager.thermalMonitor.updateThermalState(.critical, at: t1)
        manager.evaluateRuntimeQuality(now: t1)
        #expect(manager.activeProfile == .fallback)
        #expect(manager.fallbackController.isFallbackActive)
        #expect(manager.fallbackController.userFacingMessage != nil)

        // Recovering to Nominal does NOT jump instantly to Premium
        let t2 = t1.addingTimeInterval(2)
        manager.thermalMonitor.updateThermalState(.nominal, at: t2)
        manager.evaluateRuntimeQuality(now: t2)
        #expect(manager.activeProfile == .fallback)

        // First evaluation starts healthy timer; after recoveryCooldownSeconds steps up 1 tier: fallback -> efficient
        let t3 = t2.addingTimeInterval(11)
        manager.evaluateRuntimeQuality(now: t3)
        #expect(manager.activeProfile == .efficient)
        #expect(!manager.fallbackController.isFallbackActive)

        // Populate healthy frame samples for next steps: efficient -> balanced -> premium
        for _ in 0..<20 {
            manager.performanceMonitor.recordFrameDelta(seconds: 0.012)
        }
        let t4 = t3.addingTimeInterval(11)
        manager.evaluateRuntimeQuality(now: t4)
        #expect(manager.activeProfile == .balanced)

        let t5 = t4.addingTimeInterval(11)
        manager.evaluateRuntimeQuality(now: t5)
        #expect(manager.activeProfile == .premium)
    }

    @Test("Hysteresis prevents rapid profile oscillation under fluctuating conditions")
    @MainActor
    func testOscillationProtectionWithCooldowns() {
        let manager = BookRenderingManager(
            environmentSnapshot: makeSnapshot(memoryGB: 8.0, cores: 6),
            downgradeCooldownSeconds: 5.0,
            recoveryCooldownSeconds: 15.0,
            observeAppLifecycle: false
        )

        let t0 = Date()
        // Fair thermal state within 5s cooldown must NOT oscillate immediately
        manager.thermalMonitor.updateThermalState(.fair, at: t0)
        manager.evaluateRuntimeQuality(now: t0.addingTimeInterval(1.0))
        #expect(manager.activeProfile == .premium)

        // After downgrade cooldown passes, transitions once to Balanced
        manager.evaluateRuntimeQuality(now: t0.addingTimeInterval(6.0))
        #expect(manager.activeProfile == .balanced)

        // Immediately bouncing back to Nominal does NOT oscillate back up within recovery cooldown
        manager.thermalMonitor.updateThermalState(.nominal, at: t0.addingTimeInterval(7.0))
        for _ in 0..<20 {
            manager.performanceMonitor.recordFrameDelta(seconds: 0.010)
        }
        manager.evaluateRuntimeQuality(now: t0.addingTimeInterval(8.0))
        #expect(manager.activeProfile == .balanced)
    }

    @Test("Sustained frame drops trigger runtime profile downgrade and background lifecycle trims caches")
    @MainActor
    func testFrameDropDowngradeAndBackgroundTrim() {
        let assetMgr = BookAssetManager(budgetBytes: 12 * 1024 * 1024)
        let texMgr = TextureResourceManager()
        let manager = BookRenderingManager(
            environmentSnapshot: makeSnapshot(memoryGB: 8.0, cores: 6, refreshRate: 60),
            assetManager: assetMgr,
            textureManager: texMgr,
            downgradeCooldownSeconds: 2.0,
            recoveryCooldownSeconds: 12.0,
            observeAppLifecycle: false
        )

        let t0 = Date()
        // Simulate 30 dropped frames (35ms vs 16.67ms budget)
        for _ in 0..<30 {
            manager.performanceMonitor.recordFrameDelta(seconds: 0.035)
        }
        manager.evaluateRuntimeQuality(now: t0.addingTimeInterval(3.0))
        #expect(manager.activeProfile == .balanced)

        // Populate multiple cached assets and spreads, then background app
        let kPrem = BookAssetCacheKey(variant: .premium)
        let kBal = BookAssetCacheKey(variant: .balanced)
        assetMgr.registry.insert(key: kPrem, estimatedBytes: 650_000, loadDurationMs: 10, at: t0)
        assetMgr.registry.insert(key: kBal, estimatedBytes: 450_000, loadDurationMs: 8, at: t0, protectedKey: kBal)
        texMgr.prepareSpreadWindow(activeSpreadIndex: 1, totalSpreads: 4, allowAdjacentPreload: true)

        manager.updateInteractionContext(state: .reading, spreadIndex: 1, totalSpreads: 4, reduceMotion: false)
        manager.handleAppBackgrounded()
        #expect(manager.isAppInBackground)
        // Inactive premium variant evicted, active balanced variant retained
        #expect(!assetMgr.registry.cachedKeys.contains(kPrem))
        #expect(assetMgr.registry.cachedKeys.contains(kBal))
        // Adjacent spreads evicted, active spread retained
        #expect(Set(texMgr.residentSpreads.keys) == Set([1]))
    }

    @Test("Non-emergency quality downgrades defer during critical page-turn animation and apply after settling")
    @MainActor
    func testDeferredTransitionDuringPageTurn() {
        let snapshot = makeSnapshot(memoryGB: 8.0, cores: 6, refreshRate: 60)
        let assessment = DeviceCapabilityAnalyzer().assess(snapshot: snapshot)
        let controller = RenderingQualityController(
            capabilityAssessment: assessment,
            downgradeCooldownSeconds: 1.0,
            recoveryCooldownSeconds: 10.0,
            now: Date(timeIntervalSince1970: 100)
        )
        let perf = PerformanceMonitor()
        for _ in 0..<30 {
            perf.recordFrameDelta(seconds: 0.035) // ~28 fps -> severe degradation vs 16.67ms budget
        }

        let t1 = Date(timeIntervalSince1970: 105)
        controller.evaluate(
            thermalState: .nominal,
            isLowPowerMode: false,
            memoryPressure: .normal,
            performance: perf.snapshot(),
            interactionState: .pageTurning,
            reduceMotion: false,
            now: t1
        )
        // Must remain Premium during page turn, queuing Balanced
        #expect(controller.activeProfile == .premium)
        #expect(controller.pendingDeferredProfile == .balanced)

        // Once interaction settles to reading, deferred transition applies
        controller.evaluate(
            thermalState: .nominal,
            isLowPowerMode: false,
            memoryPressure: .normal,
            performance: perf.snapshot(),
            interactionState: .reading,
            reduceMotion: false,
            now: t1.addingTimeInterval(0.6)
        )
        #expect(controller.activeProfile == .balanced)
        #expect(controller.pendingDeferredProfile == nil)
    }

    @Test("PerformanceMonitor calculates avg, p95, stdDev, and dropped ratio accurately")
    @MainActor
    func testPerformanceMonitorStatistics() {
        let monitor = PerformanceMonitor(maxSampleCapacity: 50)
        monitor.updateTargetFrameBudgetMs(16.67)

        for i in 0..<20 {
            // 18 frames at 10ms, 2 frames at 30ms (dropped)
            monitor.recordFrameDelta(seconds: i < 18 ? 0.010 : 0.030)
        }
        let snap = monitor.snapshot()
        #expect(snap.sampleCount == 20)
        #expect(abs(snap.averageFrameTimeMs - 12.0) < 0.01)
        #expect(snap.droppedFrameCount == 2)
        #expect(abs(snap.droppedFrameRatio - 0.10) < 0.01)
        #expect(snap.p95FrameTimeMs >= 30.0)
        #expect(snap.frameTimeVarianceMs > 0)
    }

    @Test("AssetCacheRegistry & TextureResourceManager enforce LRU budgets and memory pressure eviction")
    @MainActor
    func testAssetAndTextureMemoryManagement() {
        let registry = BookAssetCacheRegistry(budgetBytes: 1_000_000)
        let kPrem = BookAssetCacheKey(variant: .premium)
        let kBal = BookAssetCacheKey(variant: .balanced)
        let kEff = BookAssetCacheKey(variant: .efficient)

        let t0 = Date(timeIntervalSince1970: 500)
        registry.insert(key: kPrem, estimatedBytes: 500_000, loadDurationMs: 12, at: t0)
        registry.insert(key: kBal, estimatedBytes: 450_000, loadDurationMs: 8, at: t0.addingTimeInterval(1))
        #expect(registry.totalCachedBytes == 950_000)

        // Inserting kEff exceeds 1 MB budget -> LRU kPrem is evicted while kEff is protected
        let evicted = registry.insert(
            key: kEff,
            estimatedBytes: 260_000,
            loadDurationMs: 5,
            at: t0.addingTimeInterval(2),
            protectedKey: kEff
        )
        #expect(evicted == [kPrem])
        #expect(registry.totalCachedBytes <= 1_000_000)

        // Texture spread windowing retains only N-1, N, N+1
        let texMgr = TextureResourceManager()
        texMgr.updateBudget(bytes: 10 * 1024 * 1024, maxDimension: 512)
        texMgr.prepareSpreadWindow(activeSpreadIndex: 1, totalSpreads: 4, allowAdjacentPreload: true)
        #expect(Set(texMgr.residentSpreads.keys) == Set([0, 1, 2]))

        // Move to spread 3 -> spread 0 & 1 evicted, 2 & 3 retained
        texMgr.prepareSpreadWindow(activeSpreadIndex: 3, totalSpreads: 4, allowAdjacentPreload: true)
        #expect(Set(texMgr.residentSpreads.keys) == Set([2, 3]))

        // Memory warning evicts adjacent spread 2, preserving active spread 3
        texMgr.handleMemoryPressure(.warning, activeSpreadIndex: 3)
        #expect(Set(texMgr.residentSpreads.keys) == Set([3]))

        // Critical memory clears all resident textures
        texMgr.handleMemoryPressure(.critical, activeSpreadIndex: 3)
        #expect(texMgr.residentSpreads.isEmpty)
    }

    @Test("Idle rendering suspension and background/foreground lifecycle preserve reading progress")
    @MainActor
    func testIdleSuspensionAndBackgroundLifecycle() {
        let lifecycle = SceneLifecycleManager()
        let interaction = BookInteractionController()
        var config = Book3DConfiguration(leather: .navy, foil: .silver, isOpen: false, currentSpreadIndex: 2)

        // Initial closed sync runs once to settle transforms, then suspends idle ticks
        _ = interaction.syncConfiguration(config, turnNonce: 0, turnDirection: 1, highDetailPageCurl: true, lifecycle: lifecycle)
        let firstStep = interaction.step(deltaTime: 0.016, targetStepInterval: 1.0 / 60.0, isBookOpen: false, lifecycle: lifecycle)
        #expect(firstStep?.didUpdateTransforms == true)

        // Subsequent idle ticks must NOT step simulation
        for _ in 0..<20 {
            let idleStep = interaction.step(deltaTime: 0.016, targetStepInterval: 1.0 / 60.0, isBookOpen: false, lifecycle: lifecycle)
            #expect(idleStep == nil)
        }
        #expect(lifecycle.suspendedIdleTicks == 20)

        // Opening the book activates simulation until settled, then suspends into .reading
        config.isOpen = true
        _ = interaction.syncConfiguration(config, turnNonce: 0, turnDirection: 1, highDetailPageCurl: true, lifecycle: lifecycle)
        #expect(lifecycle.interactionState == .opening)

        var safetyCounter = 0
        while interaction.hasPendingMotion() && safetyCounter < 300 {
            _ = interaction.step(deltaTime: 0.016, targetStepInterval: 1.0 / 60.0, isBookOpen: true, lifecycle: lifecycle)
            safetyCounter += 1
        }
        #expect(!interaction.hasPendingMotion())
        #expect(lifecycle.interactionState == .reading)

        // Backgrounding suspends simulation and preserves spread index
        lifecycle.enterBackground(isBookOpen: true)
        #expect(lifecycle.isSimulationSuspended)
        #expect(lifecycle.interactionState == .backgrounded)
        #expect(config.currentSpreadIndex == 2)

        lifecycle.enterForeground(isBookOpen: true)
        #expect(lifecycle.interactionState == .reading)
    }

    @Test("FallbackController caps retries and produces calm non-technical user copy")
    @MainActor
    func testFallbackControllerRetryCapAndCopy() {
        let fallback = BookFallbackController(maxRetryAttempts: 2)
        #expect(!fallback.recordLoadFailure(detail: "MTLDevice allocation timeout"))
        #expect(!fallback.isFallbackActive)

        #expect(fallback.recordLoadFailure(detail: "RealityKit scene initialization error"))
        #expect(fallback.isFallbackActive)
        let msg = fallback.userFacingMessage ?? ""
        #expect(!msg.isEmpty)
        #expect(!msg.localizedCaseInsensitiveContains("metal"))
        #expect(!msg.localizedCaseInsensitiveContains("gpu"))
        #expect(!msg.localizedCaseInsensitiveContains("thermal"))
    }

    @Test("Stale deferred downgrade clears if conditions recover during page turn, and moderate degradation does not force Efficient into 2D fallback")
    @MainActor
    func testDeferredDowngradeRecoveryAndModerateEfficientStability() {
        let snapshot = makeSnapshot(memoryGB: 8.0, cores: 6, refreshRate: 60)
        let assessment = DeviceCapabilityAnalyzer().assess(snapshot: snapshot)
        let controller = RenderingQualityController(
            capabilityAssessment: assessment,
            downgradeCooldownSeconds: 1.0,
            recoveryCooldownSeconds: 10.0,
            now: Date(timeIntervalSince1970: 100)
        )

        // Defer a thermal fair downgrade during .pageTurning
        let t1 = Date(timeIntervalSince1970: 105)
        controller.evaluate(
            thermalState: .fair,
            isLowPowerMode: false,
            memoryPressure: .normal,
            performance: .empty,
            interactionState: .pageTurning,
            reduceMotion: false,
            now: t1
        )
        #expect(controller.activeProfile == .premium)
        #expect(controller.pendingDeferredProfile == .balanced)

        // Thermal recovers to nominal before page turn finishes
        controller.evaluate(
            thermalState: .nominal,
            isLowPowerMode: false,
            memoryPressure: .normal,
            performance: .empty,
            interactionState: .reading,
            reduceMotion: false,
            now: t1.addingTimeInterval(0.6)
        )
        #expect(controller.activeProfile == .premium)
        #expect(controller.pendingDeferredProfile == nil)

        // Moderate degradation in .efficient must NOT kick user out of 3D into .fallback
        let t2 = t1.addingTimeInterval(2.0)
        controller.evaluate(
            thermalState: .serious,
            isLowPowerMode: false,
            memoryPressure: .normal,
            performance: .empty,
            interactionState: .reading,
            reduceMotion: false,
            now: t2
        )
        #expect(controller.activeProfile == .efficient)

        let modPerf = PerformanceMonitor()
        for i in 0..<20 {
            modPerf.recordFrameDelta(seconds: i < 17 ? 0.025 : 0.045) // 15% dropped -> moderateDegradation
        }
        modPerf.updateTargetFrameBudgetMs(33.33)
        #expect(modPerf.snapshot().healthStatus == .moderateDegradation)

        controller.evaluate(
            thermalState: .nominal,
            isLowPowerMode: false,
            memoryPressure: .normal,
            performance: modPerf.snapshot(),
            interactionState: .reading,
            reduceMotion: false,
            now: t2.addingTimeInterval(5.0)
        )
        #expect(controller.activeProfile == .efficient)
    }

    @Test("Scheduled auto-recovery steps up from thermal fallback while idle, while permanent asset failure fallback stays safe")
    @MainActor
    func testScheduledAutoRecoveryWhileIdle() async throws {
        let manager = BookRenderingManager(
            environmentSnapshot: makeSnapshot(memoryGB: 8.0, cores: 6),
            assetManager: BookAssetManager(budgetBytes: 12 * 1024 * 1024),
            textureManager: TextureResourceManager(),
            downgradeCooldownSeconds: 0.05,
            recoveryCooldownSeconds: 0.12,
            observeAppLifecycle: false
        )

        manager.thermalMonitor.updateThermalState(.critical)
        #expect(manager.activeProfile == .fallback)
        #expect(manager.fallbackController.isFallbackActive)

        // Return to nominal while idle (sampleCount == 0); scheduled recovery should step up automatically
        manager.thermalMonitor.updateThermalState(.nominal)
        try await Task.sleep(nanoseconds: 550_000_000)
        #expect(manager.activeProfile > .fallback)
        #expect(!manager.fallbackController.isFallbackActive)

        // Exhaust asset failure retries -> must remain in fallback without auto-retrying
        manager.reportSceneLoadFailure("Corrupt asset test 1")
        manager.reportSceneLoadFailure("Corrupt asset test 2")
        #expect(manager.activeProfile == .fallback)
        try await Task.sleep(nanoseconds: 250_000_000)
        #expect(manager.activeProfile == .fallback)
        #expect(manager.fallbackController.isFallbackActive)
    }

    @Test("6 GB physical memory devices classify as Tier A after iOS kernel carve-out")
    func testSixGigabyteCarveOutTierClassification() {
        let analyzer = DeviceCapabilityAnalyzer()
        // Real 6 GB iPhones typically report ~5.35 GiB to ProcessInfo.physicalMemory
        let sixGbIphone = makeSnapshot(memoryGB: 5.35, cores: 6, workingSetMB: 2048)
        let assessment = analyzer.assess(snapshot: sixGbIphone)
        #expect(assessment.tier == .tierA)
        #expect(assessment.recommendedProfile == .premium)
    }

    #if os(iOS) && canImport(RealityKit)
    @Test("All 3 USDZ runtime variants load via BookAssetManager with 11 canonical nodes and cache hits")
    @MainActor
    func testUSDZVariantsAndAdaptiveRealityKitIntegration() async throws {
        let assetManager = BookAssetManager(budgetBytes: 12 * 1024 * 1024)

        for variant in Book3DAssetVariant.allCases {
            let url = Book3DAssetLocator.locateBundledUSDZ(variant: variant)
            #expect(url != nil, "Missing USDZ variant \(variant.resourceName)")

            let first = try await assetManager.loadBookSceneRoot(variant: variant)
            #expect(!first.cacheHit)
            for nodeName in Book3DHierarchy.requiredNodes {
                #expect(first.entity.findEntity(named: nodeName) != nil, "Variant \(variant.rawValue) missing \(nodeName)")
            }

            let second = try await assetManager.loadBookSceneRoot(variant: variant)
            #expect(second.cacheHit)
            #expect(first.entity !== second.entity)
        }

        // Verify adaptive lighting rigs per profile
        let premiumRig = Book3DRealityController.makeStudioLightingRig(
            configuration: RenderingConfiguration.make(for: .premium)
        )
        let balancedRig = Book3DRealityController.makeStudioLightingRig(
            configuration: RenderingConfiguration.make(for: .balanced)
        )
        let efficientRig = Book3DRealityController.makeStudioLightingRig(
            configuration: RenderingConfiguration.make(for: .efficient)
        )
        #expect(premiumRig.children.count == 4)
        #expect(balancedRig.children.count == 3)
        #expect(efficientRig.children.count == 2)

        // Verify repeated open/close, page curl lift, spread overlay, and occluded scene isolation
        let texMgr = TextureResourceManager()
        let renderingMgr = BookRenderingManager(
            environmentSnapshot: makeSnapshot(memoryGB: 8.0, cores: 6),
            assetManager: assetManager,
            textureManager: texMgr,
            observeAppLifecycle: false
        )
        let controller = Book3DRealityController(renderingManager: renderingMgr)
        let loaded = try await assetManager.loadBookSceneRoot(variant: .balanced)
        controller.attachLoadedRoot(loaded.entity, variant: .balanced)
        controller.isModelLoaded = true

        // Real spread texture generation and dimension-aware eviction on downgrade
        let openCfg = Book3DConfiguration(leather: .plum, foil: .gold, isOpen: true, currentSpreadIndex: 1)
        controller.syncConfiguration(openCfg, turnNonce: 1, turnDirection: 1)
        #expect(texMgr.cachedSpreadTextureCount() >= 1)

        // Verify mid-turn curl lift activates during page turn and settles to 0
        var sawCurlLift = false
        for _ in 0..<40 {
            if let step = controller.interactionController.step(
                deltaTime: 0.016,
                targetStepInterval: 1.0 / 60.0,
                isBookOpen: true,
                lifecycle: controller.lifecycleManager
            ), step.pageCurlLift > 0.1 {
                sawCurlLift = true
            }
        }
        #expect(sawCurlLift)

        // Downgrading texture dimension from 1024 -> 256 must evict oversized 1024px spread cache entries
        texMgr.updateBudget(bytes: 4 * 1024 * 1024, maxDimension: 256)
        #expect(texMgr.cachedSpreadTextureCount() == 0)

        // Occluded shelf controller must remain occluded across foreground transition and not clobber spreadIndex
        let shelfController = Book3DRealityController(renderingManager: renderingMgr)
        shelfController.setSceneActive(false)
        shelfController.handleScenePhase(.background)
        shelfController.handleScenePhase(.active)
        #expect(shelfController.lifecycleManager.isOccluded)

        for cycle in 2...5 {
            let cycleOpen = Book3DConfiguration(leather: .plum, foil: .gold, isOpen: true, currentSpreadIndex: cycle % 4)
            controller.syncConfiguration(cycleOpen, turnNonce: cycle, turnDirection: 1)
            for _ in 0..<180 {
                controller.tick(deltaTime: 0.016)
            }
            #expect(controller.openSpreadOverlay?.isEnabled == true)

            let closedCfg = Book3DConfiguration(leather: .plum, foil: .gold, isOpen: false, currentSpreadIndex: cycle % 4)
            controller.syncConfiguration(closedCfg, turnNonce: cycle, turnDirection: 1)
            for _ in 0..<180 {
                controller.tick(deltaTime: 0.016)
            }
            #expect(controller.openSpreadOverlay?.isEnabled == false)
        }

        let activeBeforeIdle = controller.lifecycleManager.activeSimulationTicks
        for _ in 0..<60 {
            controller.tick(deltaTime: 0.016)
        }
        #expect(controller.lifecycleManager.activeSimulationTicks == activeBeforeIdle)
        #expect(controller.lifecycleManager.suspendedIdleTicks >= 60)
    }
    #endif
}
