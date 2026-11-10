import SwiftUI
import Combine

#if canImport(RealityKit) && os(iOS)
import RealityKit
import UIKit
import simd

@MainActor
public final class Book3DRealityController: ObservableObject {
    @Published public var isModelLoaded = false
    @Published public var loadErrorMessage: String?

    public var bookRoot: Entity?
    public var frontCoverHinge: Entity?
    public var turningPageHinge: Entity?
    public var turningPageLeaf: Entity?
    public var openSpreadOverlay: ModelEntity?
    public var lightingRig: Entity?
    public var sceneAnchor: AnchorEntity?
    public var cameraEntity: PerspectiveCamera?
    public var updateSubscriptionStorage: Any?

    public let lifecycleManager = SceneLifecycleManager()
    public let interactionController = BookInteractionController()
    public let renderingManager: BookRenderingManager

    private var lastAppliedLeather: BookLeatherSwatch?
    private var lastAppliedFoil: BookFoilSwatch?
    private var lastAppliedClearcoat: Bool?
    private var lastAppliedVariant: Book3DAssetVariant?
    private var lastAppliedLightingMode: RenderingLightingMode?
    private var lastAppliedShadowMode: RenderingShadowMode?
    private var lastAppliedSpreadIndex: Int?
    private var lastAppliedMaxTextureDim: Int?
    private var lastConfig: Book3DConfiguration = Book3DConfiguration()
    private var desiredSceneActive: Bool = true
    private var isReloadingVariant = false

    public init(renderingManager: BookRenderingManager = .shared) {
        self.renderingManager = renderingManager
    }

    public func syncConfiguration(
        _ config: Book3DConfiguration,
        turnNonce: Int,
        turnDirection: Int
    ) {
        lastConfig = config
        let renderConfig = renderingManager.activeConfiguration

        let presetChanged = interactionController.syncConfiguration(
            config,
            turnNonce: turnNonce,
            turnDirection: turnDirection,
            highDetailPageCurl: renderConfig.enableHighDetailPageCurl,
            lifecycle: lifecycleManager
        )

        if presetChanged {
            cameraEntity?.camera.fieldOfViewInDegrees = config.cameraPreset.fovDegrees
        }

        if lastAppliedLeather != config.leather
            || lastAppliedFoil != config.foil
            || lastAppliedClearcoat != renderConfig.enableClearcoat {
            lastAppliedLeather = config.leather
            lastAppliedFoil = config.foil
            lastAppliedClearcoat = renderConfig.enableClearcoat
            applyMaterials(
                leather: config.leather,
                foil: config.foil,
                enableClearcoat: renderConfig.enableClearcoat
            )
        }

        if lastAppliedLightingMode != renderConfig.lightingMode
            || lastAppliedShadowMode != renderConfig.shadowMode {
            applyLightingConfiguration(renderConfig)
        }

        if !lifecycleManager.isOccluded && !lifecycleManager.isBackgrounded {
            renderingManager.updateInteractionContext(
                state: lifecycleManager.interactionState,
                spreadIndex: config.currentSpreadIndex,
                totalSpreads: Book3DSampleData.sampleSpreads.count,
                reduceMotion: config.reducedMotion
            )
        }

        if lastAppliedSpreadIndex != config.currentSpreadIndex
            || lastAppliedMaxTextureDim != renderConfig.maxTextureDimension {
            lastAppliedSpreadIndex = config.currentSpreadIndex
            lastAppliedMaxTextureDim = renderConfig.maxTextureDimension
            applySpreadTexture(spreadIndex: config.currentSpreadIndex)
        }

        // Swap USDZ LOD variant only when not in the middle of a critical animation
        if isModelLoaded,
           !isReloadingVariant,
           let currentVariant = lastAppliedVariant,
           currentVariant != renderConfig.assetVariant,
           !lifecycleManager.interactionState.isCriticalAnimation {
            Task { @MainActor [weak self] in
                await self?.swapAssetVariant(renderConfig.assetVariant)
            }
        }
    }

    public func setSceneActive(_ active: Bool) {
        desiredSceneActive = active
        lifecycleManager.setOccluded(!active, isBookOpen: lastConfig.isOpen)
        if !active {
            interactionController.isDraggingOrbit = false
        } else {
            interactionController.markDirtyForCameraGesture()
        }
    }

    public func handleScenePhase(_ phase: ScenePhase) {
        switch phase {
        case .background:
            lifecycleManager.enterBackground(isBookOpen: lastConfig.isOpen)
            interactionController.resetStateAfterBackground()
            renderingManager.handleAppBackgrounded()
        case .inactive:
            lifecycleManager.setOccluded(true, isBookOpen: lastConfig.isOpen)
            interactionController.isDraggingOrbit = false
        case .active:
            renderingManager.handleAppForegrounded()
            lifecycleManager.enterForeground(isBookOpen: lastConfig.isOpen)
            lifecycleManager.setOccluded(!desiredSceneActive, isBookOpen: lastConfig.isOpen)
            if desiredSceneActive {
                interactionController.markDirtyForCameraGesture()
            }
        @unknown default:
            break
        }
    }

    public func applyMaterials(
        leather: BookLeatherSwatch,
        foil: BookFoilSwatch,
        enableClearcoat: Bool = true
    ) {
        guard let root = bookRoot else { return }
        renderingManager.textureManager.applyCachedMaterials(
            to: root,
            leather: leather,
            foil: foil,
            enableClearcoat: enableClearcoat
        )
    }

    public func applySpreadTexture(spreadIndex: Int) {
        guard let overlay = openSpreadOverlay else { return }
        let spreads = Book3DSampleData.sampleSpreads
        guard !spreads.isEmpty else { return }
        let safeIdx = max(0, min(spreads.count - 1, spreadIndex))
        let mat = renderingManager.textureManager.spreadMaterial(for: spreads[safeIdx])
        overlay.model?.materials = [mat]
    }

    public func applyLightingConfiguration(_ renderConfig: RenderingConfiguration) {
        guard let anchor = sceneAnchor else { return }
        lightingRig?.removeFromParent()
        let nextRig = Self.makeStudioLightingRig(configuration: renderConfig)
        anchor.addChild(nextRig)
        lightingRig = nextRig
        lastAppliedLightingMode = renderConfig.lightingMode
        lastAppliedShadowMode = renderConfig.shadowMode
    }

    public func tick(deltaTime: Float) {
        let clampedDt = Double(max(0.0, min(deltaTime, 0.25)))
        let renderConfig = renderingManager.activeConfiguration

        guard let step = interactionController.step(
            deltaTime: clampedDt,
            targetStepInterval: renderConfig.simulationStepIntervalSeconds,
            isBookOpen: lastConfig.isOpen,
            lifecycle: lifecycleManager
        ) else {
            return
        }

        // Only record frame timing during active simulation/interaction so idle suspension
        // is not miscounted or polled unnecessarily.
        renderingManager.recordActiveFrameDelta(clampedDt)

        if let hinge = frontCoverHinge {
            hinge.orientation = simd_quatf(angle: step.coverAngleRadians, axis: BookAnimationContract.hingeAxis)
        }

        if let pageHinge = turningPageHinge {
            pageHinge.orientation = simd_quatf(angle: step.pageAngleRadians, axis: BookAnimationContract.hingeAxis)
        }

        if let leaf = turningPageLeaf {
            if step.pageCurlLift > 0.001 {
                leaf.position.y = 0.001 + step.pageCurlLift * 0.006
                leaf.scale = SIMD3<Float>(1.0, 1.0 + step.pageCurlLift * 1.8, 1.0)
            } else {
                leaf.position.y = 0.001
                leaf.scale = SIMD3<Float>(1.0, 1.0, 1.0)
            }
        }

        openSpreadOverlay?.isEnabled = step.openProgress > 0.72

        if let camera = cameraEntity {
            camera.look(at: step.cameraTarget, from: step.cameraPosition, relativeTo: nil)
        }

        if step.settledToIdle && !lifecycleManager.isOccluded && !lifecycleManager.isBackgrounded {
            renderingManager.updateInteractionContext(
                state: lifecycleManager.interactionState,
                spreadIndex: lastConfig.currentSpreadIndex,
                totalSpreads: Book3DSampleData.sampleSpreads.count,
                reduceMotion: lastConfig.reducedMotion
            )
        }
    }

    public func triggerHapticFeedback() {
        guard renderingManager.activeConfiguration.enableHaptics else { return }
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }

    public func attachLoadedRoot(_ root: Entity, variant: Book3DAssetVariant) {
        root.position = [-0.04, 0, 0]
        root.orientation = simd_quatf(angle: -0.22, axis: [0, 1, 0])

        let bookBoundsShape = ShapeResource.generateBox(size: [0.24, 0.06, 0.28])
            .offsetBy(translation: [0.10, 0, 0])
        root.components.set(CollisionComponent(shapes: [bookBoundsShape]))
        if #available(iOS 18.0, *) {
            root.components.set(InputTargetComponent())
        }

        for interactiveName in [Book3DHierarchy.frontCover, Book3DHierarchy.textBlock] {
            if let entity = root.findEntity(named: interactiveName) {
                entity.generateCollisionShapes(recursive: false)
                if #available(iOS 18.0, *) {
                    entity.components.set(InputTargetComponent())
                }
            }
        }

        // Open-spread archival proof plane resting cleanly above TextBlock when book is open
        let overlayWidth = (Book3DDimensions.bookWidth - 0.008) * 0.96
        let overlayDepth = (Book3DDimensions.bookHeight - 0.010) * 0.96
        let overlayMesh = MeshResource.generatePlane(width: overlayWidth, depth: overlayDepth)
        let overlayEntity = ModelEntity(mesh: overlayMesh)
        overlayEntity.name = "OpenSpreadOverlay"
        overlayEntity.position = [
            (Book3DDimensions.bookWidth - 0.008) / 2 + 0.004,
            Book3DDimensions.textblockThickness / 2 + 0.0003,
            0
        ]
        overlayEntity.isEnabled = interactionController.currentOpenProgress > 0.72
        root.addChild(overlayEntity)

        bookRoot?.removeFromParent()
        sceneAnchor?.addChild(root)

        bookRoot = root
        frontCoverHinge = root.findEntity(named: Book3DHierarchy.frontCoverHinge)
        turningPageHinge = root.findEntity(named: Book3DHierarchy.turningPageHinge)
        turningPageLeaf = root.findEntity(named: Book3DHierarchy.turningPageLeaf)
        openSpreadOverlay = overlayEntity
        lastAppliedVariant = variant
        lastAppliedLeather = nil
        lastAppliedFoil = nil
        lastAppliedClearcoat = nil
        lastAppliedSpreadIndex = nil

        // Immediately snap hinges to current progress to avoid visual pop during variant swap
        if let hinge = frontCoverHinge {
            let angle = BookAnimationContract.computeCoverHingeAngle(openProgress: interactionController.currentOpenProgress)
            hinge.orientation = simd_quatf(angle: angle, axis: BookAnimationContract.hingeAxis)
        }
    }

    private func swapAssetVariant(_ nextVariant: Book3DAssetVariant) async {
        guard !isReloadingVariant, sceneAnchor != nil else { return }
        isReloadingVariant = true
        defer { isReloadingVariant = false }

        do {
            let result = try await renderingManager.assetManager.loadBookSceneRoot(variant: nextVariant)
            renderingManager.recordModelLoad(durationMs: result.loadDurationMs)
            attachLoadedRoot(result.entity, variant: nextVariant)
            let renderConfig = renderingManager.activeConfiguration
            applyMaterials(
                leather: lastConfig.leather,
                foil: lastConfig.foil,
                enableClearcoat: renderConfig.enableClearcoat
            )
            lastAppliedLeather = lastConfig.leather
            lastAppliedFoil = lastConfig.foil
            lastAppliedClearcoat = renderConfig.enableClearcoat
            applySpreadTexture(spreadIndex: lastConfig.currentSpreadIndex)
            lastAppliedSpreadIndex = lastConfig.currentSpreadIndex
            lastAppliedMaxTextureDim = renderConfig.maxTextureDimension
            interactionController.markDirtyForCameraGesture()
        } catch {
            renderingManager.reportSceneLoadFailure(error.localizedDescription)
        }
    }

    public static func loadBookSceneRoot(variant: Book3DAssetVariant = .balanced) async throws -> Entity {
        let result = try await BookAssetManager.shared.loadBookSceneRoot(variant: variant)
        return result.entity
    }

    public static func makeProceduralFallbackBookHierarchy() -> Entity {
        BookAssetManager.makeProceduralFallbackBookHierarchy()
    }

    public static func makeStudioLightingRig(
        configuration: RenderingConfiguration = RenderingConfiguration.make(for: .premium)
    ) -> Entity {
        let rig = Entity()
        rig.name = "StudioLightingRig"

        let keyLight = DirectionalLight()
        keyLight.light.color = UIColor(
            red: 1.0,
            green: 0.973,
            blue: 0.922,
            alpha: 1.0
        )
        keyLight.light.intensity = configuration.lightingMode == .twoPointMinimal ? 2450 : 2200
        switch configuration.shadowMode {
        case .full:
            keyLight.shadow = DirectionalLightComponent.Shadow(maximumDistance: 2.0, depthBias: 0.002)
        case .reduced:
            keyLight.shadow = DirectionalLightComponent.Shadow(maximumDistance: 1.4, depthBias: 0.004)
        case .disabled:
            keyLight.shadow = nil
        }
        keyLight.look(at: [0, 0, 0], from: BookLightingIntent.keyLightPosition, relativeTo: nil)
        rig.addChild(keyLight)

        let fillLight = DirectionalLight()
        fillLight.light.color = UIColor(
            red: 0.831,
            green: 0.902,
            blue: 0.875,
            alpha: 1.0
        )
        fillLight.light.intensity = configuration.lightingMode == .twoPointMinimal ? 1100 : 900
        fillLight.look(at: [0, 0, 0], from: BookLightingIntent.fillLightPosition, relativeTo: nil)
        rig.addChild(fillLight)

        if configuration.lightingMode == .threePointBalanced || configuration.lightingMode == .fourPointStudio {
            let foilBounceLight = PointLight()
            foilBounceLight.light.color = UIColor(
                red: 1.0,
                green: 0.976,
                blue: 0.910,
                alpha: 1.0
            )
            foilBounceLight.light.intensity = 1800
            foilBounceLight.position = SIMD3<Float>(0.15, 0.85, 0.65)
            rig.addChild(foilBounceLight)
        }

        if configuration.lightingMode == .fourPointStudio {
            let rimLight = PointLight()
            rimLight.light.color = UIColor(
                red: 1.0,
                green: 0.961,
                blue: 0.875,
                alpha: 1.0
            )
            rimLight.light.intensity = 1500
            rimLight.position = BookLightingIntent.rimLightPosition
            rig.addChild(rimLight)
        }

        return rig
    }
}

public struct Book3DRealityView: View {
    @Environment(\.scenePhase) private var scenePhase

    public let configuration: Book3DConfiguration
    public let pageTurnNonce: Int
    public let pageTurnDirection: Int
    public let allowGestures: Bool
    public let isSceneActive: Bool
    public let onToggleOpen: () -> Void
    public let onTurnPage: (Int) -> Void
    public let onFallbackRequired: (String) -> Void

    @StateObject private var controller: Book3DRealityController
    @ObservedObject private var renderingManager: BookRenderingManager
    @State private var lastDragTranslation: CGSize = .zero

    public init(
        configuration: Book3DConfiguration,
        pageTurnNonce: Int = 0,
        pageTurnDirection: Int = 1,
        allowGestures: Bool = true,
        isSceneActive: Bool = true,
        renderingManager: BookRenderingManager = .shared,
        onToggleOpen: @escaping () -> Void = {},
        onTurnPage: @escaping (Int) -> Void = { _ in },
        onFallbackRequired: @escaping (String) -> Void = { _ in }
    ) {
        self.configuration = configuration
        self.pageTurnNonce = pageTurnNonce
        self.pageTurnDirection = pageTurnDirection
        self.allowGestures = allowGestures
        self.isSceneActive = isSceneActive
        self.onToggleOpen = onToggleOpen
        self.onTurnPage = onTurnPage
        self.onFallbackRequired = onFallbackRequired
        self._renderingManager = ObservedObject(wrappedValue: renderingManager)
        self._controller = StateObject(wrappedValue: Book3DRealityController(renderingManager: renderingManager))
    }

    public var body: some View {
        ZStack {
            Color(hex: BookLightingIntent.backgroundHexUInt)

            if #available(iOS 18.0, *) {
                realityKit18View
                    .modifier(
                        Book3DGestureModifier(
                            enabled: allowGestures && isSceneActive,
                            controller: controller,
                            isOpen: configuration.isOpen,
                            lastDragTranslation: $lastDragTranslation,
                            onToggleOpen: onToggleOpen,
                            onTurnPage: onTurnPage
                        )
                    )
            } else {
                Book3DLegacyARView(
                    controller: controller,
                    configuration: configuration,
                    pageTurnNonce: pageTurnNonce,
                    pageTurnDirection: pageTurnDirection,
                    isSceneActive: isSceneActive,
                    onFallbackRequired: onFallbackRequired
                )
            }

            if !controller.isModelLoaded && controller.loadErrorMessage == nil {
                VStack(spacing: 10) {
                    ProgressView()
                        .tint(MemoriaTheme.plum)
                    Text("Preparing 3D Heirloom Edition...")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(MemoriaTheme.textSecondary)
                }
                .padding(16)
                .background(MemoriaTheme.surfacePrimary.opacity(0.92))
                .clipShape(RoundedRectangle(cornerRadius: MemoriaTheme.radiusMd))
            }
        }
        .onChange(of: isSceneActive) { _, nextActive in
            controller.setSceneActive(nextActive)
        }
        .onChange(of: scenePhase) { _, nextPhase in
            controller.handleScenePhase(nextPhase)
        }
        .onChange(of: configuration) { _, nextConfig in
            controller.syncConfiguration(
                nextConfig,
                turnNonce: pageTurnNonce,
                turnDirection: pageTurnDirection
            )
        }
        .onChange(of: pageTurnNonce) { _, nextNonce in
            controller.syncConfiguration(
                configuration,
                turnNonce: nextNonce,
                turnDirection: pageTurnDirection
            )
        }
        .onChange(of: renderingManager.activeConfiguration) { _, _ in
            controller.syncConfiguration(
                configuration,
                turnNonce: pageTurnNonce,
                turnDirection: pageTurnDirection
            )
        }
        .onDisappear {
            controller.setSceneActive(false)
            controller.updateSubscriptionStorage = nil
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("3D Heirloom Book: \(configuration.coverTitle)")
        .accessibilityHint(
            allowGestures
                ? (configuration.isOpen ? "Book is open. Double tap to close cover, or swipe up and down to turn pages." : "Book is closed. Double tap to open cover.")
                : "Double tap to open the interactive 3D book reader."
        )
        .accessibilityAddTraits(.isButton)
        .accessibilityAction {
            onToggleOpen()
        }
        .accessibilityAdjustableAction { direction in
            guard allowGestures, configuration.isOpen else { return }
            switch direction {
            case .increment:
                onTurnPage(1)
            case .decrement:
                onTurnPage(-1)
            @unknown default:
                break
            }
        }
    }

    @available(iOS 18.0, *)
    private var realityKit18View: some View {
        RealityView { (content: inout RealityViewCameraContent) in
            content.camera = .virtual

            let renderConfig = renderingManager.activeConfiguration
            let anchor = AnchorEntity(world: .zero)
            let lightingRig = Book3DRealityController.makeStudioLightingRig(configuration: renderConfig)
            anchor.addChild(lightingRig)
            controller.sceneAnchor = anchor
            controller.lightingRig = lightingRig

            let camera = PerspectiveCamera()
            camera.camera.fieldOfViewInDegrees = configuration.cameraPreset.fovDegrees
            camera.look(
                at: configuration.cameraPreset.target,
                from: configuration.cameraPreset.position,
                relativeTo: nil
            )
            anchor.addChild(camera)
            controller.cameraEntity = camera
            content.add(anchor)

            do {
                let result = try await renderingManager.assetManager.loadBookSceneRoot(
                    variant: renderConfig.assetVariant
                )
                renderingManager.recordModelLoad(durationMs: result.loadDurationMs)

                controller.attachLoadedRoot(result.entity, variant: renderConfig.assetVariant)
                controller.setSceneActive(isSceneActive)
                controller.syncConfiguration(
                    configuration,
                    turnNonce: pageTurnNonce,
                    turnDirection: pageTurnDirection
                )
                controller.isModelLoaded = true

                controller.updateSubscriptionStorage = content.subscribe(to: SceneEvents.Update.self) { event in
                    let dt = Float(event.deltaTime)
                    MainActor.assumeIsolated {
                        controller.tick(deltaTime: dt)
                    }
                }
            } catch {
                let message = "Unable to initialize 3D book scene: \(error.localizedDescription)"
                controller.loadErrorMessage = message
                renderingManager.reportSceneLoadFailure(message)
                onFallbackRequired(message)
            }
        }
    }
}

@available(iOS 18.0, *)
private struct Book3DGestureModifier: ViewModifier {
    let enabled: Bool
    let controller: Book3DRealityController
    let isOpen: Bool
    @Binding var lastDragTranslation: CGSize
    let onToggleOpen: () -> Void
    let onTurnPage: (Int) -> Void

    func body(content: Content) -> some View {
        if enabled {
            content
                .gesture(
                    SpatialTapGesture()
                        .targetedToAnyEntity()
                        .onEnded { _ in
                            controller.triggerHapticFeedback()
                            onToggleOpen()
                        }
                )
                .simultaneousGesture(
                    DragGesture()
                        .onChanged { value in
                            controller.interactionController.isDraggingOrbit = true
                            controller.lifecycleManager.beginUserInteraction()

                            let dx = Float(value.translation.width - lastDragTranslation.width)
                            let dy = Float(value.translation.height - lastDragTranslation.height)
                            lastDragTranslation = value.translation
                            controller.interactionController.orbitYaw -= dx * 0.008
                            controller.interactionController.orbitPitch = max(
                                -0.65,
                                min(0.65, controller.interactionController.orbitPitch - dy * 0.008)
                            )
                            controller.interactionController.markDirtyForCameraGesture()
                        }
                        .onEnded { value in
                            lastDragTranslation = .zero
                            controller.interactionController.isDraggingOrbit = false
                            controller.lifecycleManager.endUserInteraction(isOpen: isOpen)

                            guard isOpen else { return }
                            if value.translation.width < -90 && abs(value.translation.height) < 50 {
                                controller.triggerHapticFeedback()
                                onTurnPage(1)
                            } else if value.translation.width > 90 && abs(value.translation.height) < 50 {
                                controller.triggerHapticFeedback()
                                onTurnPage(-1)
                            }
                        }
                )
                .simultaneousGesture(
                    MagnifyGesture()
                        .onChanged { value in
                            controller.interactionController.isDraggingOrbit = true
                            controller.lifecycleManager.beginUserInteraction()
                            let clamped = max(0.55, min(1.8, Float(1.0 / value.magnification)))
                            controller.interactionController.zoomScale = clamped
                            controller.interactionController.markDirtyForCameraGesture()
                        }
                        .onEnded { _ in
                            controller.interactionController.isDraggingOrbit = false
                            controller.lifecycleManager.endUserInteraction(isOpen: isOpen)
                        }
                )
        } else {
            content
        }
    }
}

private struct Book3DLegacyARView: UIViewRepresentable {
    @ObservedObject var controller: Book3DRealityController
    let configuration: Book3DConfiguration
    let pageTurnNonce: Int
    let pageTurnDirection: Int
    let isSceneActive: Bool
    let onFallbackRequired: (String) -> Void

    func makeUIView(context: Context) -> ARView {
        let arView = ARView(frame: .zero, cameraMode: .nonAR, automaticallyConfigureSession: false)
        arView.environment.background = .color(
            UIColor(red: 0.969, green: 0.957, blue: 0.933, alpha: 1.0)
        )

        let renderConfig = controller.renderingManager.activeConfiguration
        applyRenderOptions(to: arView, configuration: renderConfig)

        let anchor = AnchorEntity(world: .zero)
        let lightingRig = Book3DRealityController.makeStudioLightingRig(configuration: renderConfig)
        anchor.addChild(lightingRig)
        controller.sceneAnchor = anchor
        controller.lightingRig = lightingRig

        let camera = PerspectiveCamera()
        camera.camera.fieldOfViewInDegrees = configuration.cameraPreset.fovDegrees
        camera.look(
            at: configuration.cameraPreset.target,
            from: configuration.cameraPreset.position,
            relativeTo: nil
        )
        anchor.addChild(camera)
        arView.scene.addAnchor(anchor)

        controller.cameraEntity = camera

        Task { @MainActor in
            do {
                let result = try await controller.renderingManager.assetManager.loadBookSceneRoot(
                    variant: renderConfig.assetVariant
                )
                controller.renderingManager.recordModelLoad(durationMs: result.loadDurationMs)

                controller.attachLoadedRoot(result.entity, variant: renderConfig.assetVariant)
                controller.setSceneActive(isSceneActive)
                controller.syncConfiguration(
                    configuration,
                    turnNonce: pageTurnNonce,
                    turnDirection: pageTurnDirection
                )
                controller.isModelLoaded = true

                controller.updateSubscriptionStorage = arView.scene.subscribe(to: SceneEvents.Update.self) { event in
                    let dt = Float(event.deltaTime)
                    MainActor.assumeIsolated {
                        controller.tick(deltaTime: dt)
                    }
                }
            } catch {
                let msg = "RealityKit fallback activated: \(error.localizedDescription)"
                controller.loadErrorMessage = msg
                controller.renderingManager.reportSceneLoadFailure(msg)
                onFallbackRequired(msg)
            }
        }

        return arView
    }

    func updateUIView(_ uiView: ARView, context: Context) {
        applyRenderOptions(to: uiView, configuration: controller.renderingManager.activeConfiguration)
    }

    private func applyRenderOptions(to arView: ARView, configuration: RenderingConfiguration) {
        var options: ARView.RenderOptions = [
            .disableCameraGrain,
            .disableFaceMesh,
            .disablePersonOcclusion,
            .disableAREnvironmentLighting
        ]
        if configuration.profile == .efficient {
            options.insert(.disableMotionBlur)
            options.insert(.disableDepthOfField)
            options.insert(.disableHDR)
            options.insert(.disableGroundingShadows)
        } else if configuration.profile == .balanced {
            options.insert(.disableMotionBlur)
            options.insert(.disableDepthOfField)
        }
        arView.renderOptions = options
    }
}
#endif
