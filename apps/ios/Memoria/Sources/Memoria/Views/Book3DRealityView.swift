import SwiftUI

#if canImport(RealityKit) && os(iOS)
import RealityKit
import UIKit
import simd

/// SwiftUI <-> RealityKit scene host (`BookSceneHost`) owning the `RealityView` (iOS 18+)
/// or `ARView` (iOS 17) boundary and gesture routing, while delegating scene graph,
/// materials, lighting, and page deformation to `BookSceneCoordinator`.
public struct Book3DRealityView: View {
    @Environment(\.scenePhase) private var scenePhase

    public let configuration: Book3DConfiguration
    public let spreads: [BookSpreadPreview]
    public let presentationMode: BookPresentationMode
    public let pageTurnNonce: Int
    public let pageTurnDirection: Int
    public let allowGestures: Bool
    public let isSceneActive: Bool
    public let onToggleOpen: () -> Void
    public let onTurnPage: (Int) -> Void
    public let onFallbackRequired: (String) -> Void

    @StateObject private var coordinator: BookSceneCoordinator
    @ObservedObject private var renderingManager: BookRenderingManager
    @State private var lastDragTranslation: CGSize = .zero
    @State private var activePageDragDirection: Int?

    public init(
        configuration: Book3DConfiguration,
        spreads: [BookSpreadPreview] = Book3DSampleData.sampleSpreads,
        presentationMode: BookPresentationMode = .reading,
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
        self.spreads = spreads
        self.presentationMode = presentationMode
        self.pageTurnNonce = pageTurnNonce
        self.pageTurnDirection = pageTurnDirection
        self.allowGestures = allowGestures
        self.isSceneActive = isSceneActive
        self.onToggleOpen = onToggleOpen
        self.onTurnPage = onTurnPage
        self.onFallbackRequired = onFallbackRequired
        self._renderingManager = ObservedObject(wrappedValue: renderingManager)
        self._coordinator = StateObject(
            wrappedValue: BookSceneCoordinator(
                presentationMode: presentationMode,
                renderingManager: renderingManager
            )
        )
    }

    public var body: some View {
        ZStack {
            Color(hex: BookLightingIntent.backgroundHexUInt)

            if #available(iOS 18.0, *) {
                realityKit18View
                    .modifier(
                        Book3DGestureModifier(
                            enabled: allowGestures && isSceneActive,
                            useEntityTargetedTap: true,
                            coordinator: coordinator,
                            presentationMode: presentationMode,
                            isOpen: configuration.isOpen,
                            currentSpreadIndex: configuration.currentSpreadIndex,
                            totalSpreads: spreads.count,
                            reducedMotion: configuration.reducedMotion,
                            lastDragTranslation: $lastDragTranslation,
                            activePageDragDirection: $activePageDragDirection,
                            onToggleOpen: onToggleOpen,
                            onTurnPage: onTurnPage
                        )
                    )
            } else {
                Book3DLegacyARView(
                    coordinator: coordinator,
                    configuration: configuration,
                    spreads: spreads,
                    pageTurnNonce: pageTurnNonce,
                    pageTurnDirection: pageTurnDirection,
                    isSceneActive: isSceneActive,
                    onFallbackRequired: onFallbackRequired
                )
                .modifier(
                    Book3DGestureModifier(
                        enabled: allowGestures && isSceneActive,
                        useEntityTargetedTap: false,
                        coordinator: coordinator,
                        presentationMode: presentationMode,
                        isOpen: configuration.isOpen,
                        currentSpreadIndex: configuration.currentSpreadIndex,
                        totalSpreads: spreads.count,
                        reducedMotion: configuration.reducedMotion,
                        lastDragTranslation: $lastDragTranslation,
                        activePageDragDirection: $activePageDragDirection,
                        onToggleOpen: onToggleOpen,
                        onTurnPage: onTurnPage
                    )
                )
            }

            if !coordinator.isModelLoaded && coordinator.loadErrorMessage == nil {
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
        .onAppear {
            MetricKitDiagnosticsCollector.shared.startIfSupported()
            coordinator.setSpreads(spreads)
        }
        .onChange(of: isSceneActive) { _, nextActive in
            coordinator.setSceneActive(nextActive)
        }
        .onChange(of: scenePhase) { _, nextPhase in
            coordinator.handleScenePhase(nextPhase)
        }
        .onChange(of: configuration) { _, nextConfig in
            coordinator.syncConfiguration(
                nextConfig,
                turnNonce: pageTurnNonce,
                turnDirection: pageTurnDirection
            )
        }
        .onChange(of: pageTurnNonce) { _, nextNonce in
            coordinator.syncConfiguration(
                configuration,
                turnNonce: nextNonce,
                turnDirection: pageTurnDirection
            )
        }
        .onChange(of: renderingManager.activeConfiguration) { _, _ in
            coordinator.syncConfiguration(
                configuration,
                turnNonce: pageTurnNonce,
                turnDirection: pageTurnDirection
            )
        }
        .onDisappear {
            coordinator.setSceneActive(false)
            coordinator.detachScene()
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("3D Heirloom Book: \(configuration.coverTitle)")
        .accessibilityValue(accessibilitySpreadDescription)
        .accessibilityHint(
            allowGestures
                ? (configuration.isOpen ? "Book is open. Double tap to close cover, or swipe to turn pages." : "Book is closed. Double tap to open cover.")
                : "Interactive 3D heirloom volume preview."
        )
        .accessibilityAddTraits(.isButton)
        .accessibilityAction {
            onToggleOpen()
        }
        .accessibilityAction(named: "Next Page") {
            if allowGestures && configuration.isOpen && configuration.currentSpreadIndex + 1 < spreads.count {
                onTurnPage(1)
            }
        }
        .accessibilityAction(named: "Previous Page") {
            if allowGestures && configuration.isOpen && configuration.currentSpreadIndex > 0 {
                onTurnPage(-1)
            }
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

    private var accessibilitySpreadDescription: String {
        guard configuration.isOpen, !spreads.isEmpty else {
            return "Closed \(configuration.leather.displayName) cover with \(configuration.foil.displayName) stamping."
        }
        let idx = max(0, min(spreads.count - 1, configuration.currentSpreadIndex))
        let spread = spreads[idx]
        var summary = "Spread \(idx + 1) of \(spreads.count): \(spread.chapterTitle). "
        summary += "Page \(spread.leftPageNumber): \(spread.leftHeading). \(spread.leftBody) "
        summary += "Page \(spread.rightPageNumber): \(spread.rightHeading). \(spread.rightBody)"
        if let ocr = spread.ocrInscription, !ocr.isEmpty {
            summary += " Archival inscription: \(ocr)"
        }
        return summary
    }

    @available(iOS 18.0, *)
    private var realityKit18View: some View {
        RealityView { (content: inout RealityViewCameraContent) in
            content.camera = .virtual

            coordinator.markScenePreparing()
            coordinator.setSpreads(spreads)
            coordinator.lifecycleManager.beginLoading()

            let renderConfig = coordinator.effectiveRenderingConfiguration
            let anchor = AnchorEntity(world: .zero)
            let lightingRig = BookSceneCoordinator.makeStudioLightingRig(configuration: renderConfig)
            anchor.addChild(lightingRig)
            coordinator.sceneAnchor = anchor
            coordinator.lightingRig = lightingRig

            let camera = PerspectiveCamera()
            camera.camera.fieldOfViewInDegrees = configuration.cameraPreset.fovDegrees
            camera.look(
                at: configuration.cameraPreset.target,
                from: configuration.cameraPreset.position,
                relativeTo: nil
            )
            anchor.addChild(camera)
            coordinator.cameraEntity = camera
            content.add(anchor)

            do {
                let result = try await renderingManager.assetManager.loadBookSceneRoot(
                    variant: renderConfig.assetVariant
                )
                guard !Task.isCancelled, coordinator.sceneAnchor != nil else { return }
                renderingManager.recordModelLoad(durationMs: result.loadDurationMs)

                coordinator.attachLoadedRoot(result.entity, variant: renderConfig.assetVariant)
                coordinator.setSceneActive(isSceneActive)
                coordinator.syncConfiguration(
                    configuration,
                    turnNonce: pageTurnNonce,
                    turnDirection: pageTurnDirection
                )
                coordinator.isModelLoaded = true

                coordinator.updateSubscriptionStorage = content.subscribe(to: SceneEvents.Update.self) { event in
                    let dt = Float(event.deltaTime)
                    MainActor.assumeIsolated {
                        coordinator.tick(deltaTime: dt)
                    }
                }
            } catch {
                guard !Task.isCancelled else { return }
                let message = "Unable to initialize 3D book scene: \(error.localizedDescription)"
                coordinator.loadErrorMessage = message
                coordinator.lifecycleManager.markFailed(message)
                renderingManager.reportSceneLoadFailure(message)
                onFallbackRequired(message)
            }
        }
    }
}

public typealias BookSceneHost = Book3DRealityView

private struct Book3DGestureModifier: ViewModifier {
    let enabled: Bool
    let useEntityTargetedTap: Bool
    let coordinator: BookSceneCoordinator
    let presentationMode: BookPresentationMode
    let isOpen: Bool
    let currentSpreadIndex: Int
    let totalSpreads: Int
    let reducedMotion: Bool
    @Binding var lastDragTranslation: CGSize
    @Binding var activePageDragDirection: Int?
    let onToggleOpen: () -> Void
    let onTurnPage: (Int) -> Void

    @ViewBuilder
    private func tapEnhancedContent(_ content: Content) -> some View {
        if useEntityTargetedTap, #available(iOS 18.0, *) {
            content.gesture(
                SpatialTapGesture()
                    .targetedToAnyEntity()
                    .onEnded { _ in
                        coordinator.triggerHapticFeedback()
                        onToggleOpen()
                    }
            )
        } else {
            content.gesture(
                TapGesture()
                    .onEnded {
                        coordinator.triggerHapticFeedback()
                        onToggleOpen()
                    }
            )
        }
    }

    func body(content: Content) -> some View {
        if enabled {
            tapEnhancedContent(content)
                .simultaneousGesture(
                    DragGesture()
                        .onChanged { value in
                            coordinator.lifecycleManager.beginUserInteraction()

                            // In Reading mode when open with motion allowed, lock into either
                            // interactive page turn or camera orbit once movement exceeds deadband.
                            let isHorizontalPageDrag = presentationMode == .reading
                                && isOpen
                                && !reducedMotion
                                && !coordinator.interactionController.isDraggingOrbit
                                && abs(value.translation.width) > abs(value.translation.height) * 1.35
                                && abs(value.translation.width) > 16

                            if activePageDragDirection == nil && isHorizontalPageDrag {
                                let dir = value.translation.width < 0 ? 1 : -1
                                let nextIdx = currentSpreadIndex + dir
                                if nextIdx >= 0 && nextIdx < totalSpreads {
                                    activePageDragDirection = dir
                                    coordinator.beginInteractivePageTurn(
                                        direction: dir,
                                        fromSpread: currentSpreadIndex,
                                        toSpread: nextIdx
                                    )
                                }
                            }

                            if let dir = activePageDragDirection {
                                let normalized: Float
                                if dir > 0 {
                                    normalized = Float(min(1.0, max(0.02, -value.translation.width / 220.0)))
                                } else {
                                    normalized = Float(max(0.0, min(0.98, 1.0 - value.translation.width / 220.0)))
                                }
                                coordinator.interactionController.animationController.updateInteractiveTurn(normalizedProgress: normalized)
                                coordinator.interactionController.markDirtyForGeometrySync()
                                return
                            }

                            let exceededDeadband = abs(value.translation.width) > 16 || abs(value.translation.height) > 16
                            if presentationMode == .reading && isOpen && !reducedMotion && !exceededDeadband && !coordinator.interactionController.isDraggingOrbit {
                                lastDragTranslation = value.translation
                                return
                            }

                            coordinator.interactionController.isDraggingOrbit = true
                            let dx = Float(value.translation.width - lastDragTranslation.width)
                            let dy = Float(value.translation.height - lastDragTranslation.height)
                            lastDragTranslation = value.translation
                            coordinator.interactionController.orbitYaw -= dx * 0.008
                            coordinator.interactionController.orbitPitch = max(
                                -0.65,
                                min(0.65, coordinator.interactionController.orbitPitch - dy * 0.008)
                            )
                            coordinator.interactionController.markDirtyForCameraGesture()
                        }
                        .onEnded { value in
                            lastDragTranslation = .zero
                            coordinator.interactionController.isDraggingOrbit = false

                            if let dir = activePageDragDirection {
                                activePageDragDirection = nil
                                let vx = Float(value.predictedEndTranslation.width - value.translation.width) * 4.0
                                let committed = coordinator.interactionController.animationController.finishInteractiveTurn(projectedVelocityX: vx)
                                coordinator.interactionController.markDirtyForGeometrySync()
                                if committed {
                                    coordinator.triggerHapticFeedback()
                                    onTurnPage(dir)
                                }
                                return
                            }

                            coordinator.lifecycleManager.endUserInteraction(isOpen: isOpen)

                            guard isOpen else { return }
                            if value.translation.width < -90 && abs(value.translation.height) < 50 {
                                coordinator.triggerHapticFeedback()
                                onTurnPage(1)
                            } else if value.translation.width > 90 && abs(value.translation.height) < 50 {
                                coordinator.triggerHapticFeedback()
                                onTurnPage(-1)
                            }
                        }
                )
                .simultaneousGesture(
                    MagnifyGesture()
                        .onChanged { value in
                            coordinator.interactionController.isDraggingOrbit = true
                            coordinator.lifecycleManager.beginUserInteraction()
                            let clamped = max(0.55, min(1.8, Float(1.0 / value.magnification)))
                            coordinator.interactionController.zoomScale = clamped
                            coordinator.interactionController.markDirtyForCameraGesture()
                        }
                        .onEnded { _ in
                            coordinator.interactionController.isDraggingOrbit = false
                            coordinator.lifecycleManager.endUserInteraction(isOpen: isOpen)
                        }
                )
        } else {
            content
        }
    }
}

private struct Book3DLegacyARView: UIViewRepresentable {
    @ObservedObject var coordinator: BookSceneCoordinator
    let configuration: Book3DConfiguration
    let spreads: [BookSpreadPreview]
    let pageTurnNonce: Int
    let pageTurnDirection: Int
    let isSceneActive: Bool
    let onFallbackRequired: (String) -> Void

    func makeUIView(context: Context) -> ARView {
        let arView = ARView(frame: .zero, cameraMode: .nonAR, automaticallyConfigureSession: false)
        arView.environment.background = .color(
            UIColor(red: 0.969, green: 0.957, blue: 0.933, alpha: 1.0)
        )

        coordinator.markScenePreparing()
        coordinator.setSpreads(spreads)
        coordinator.lifecycleManager.beginLoading()

        let renderConfig = coordinator.effectiveRenderingConfiguration
        applyRenderOptions(to: arView, configuration: renderConfig)

        let anchor = AnchorEntity(world: .zero)
        let lightingRig = BookSceneCoordinator.makeStudioLightingRig(configuration: renderConfig)
        anchor.addChild(lightingRig)
        coordinator.sceneAnchor = anchor
        coordinator.lightingRig = lightingRig

        let camera = PerspectiveCamera()
        camera.camera.fieldOfViewInDegrees = configuration.cameraPreset.fovDegrees
        camera.look(
            at: configuration.cameraPreset.target,
            from: configuration.cameraPreset.position,
            relativeTo: nil
        )
        anchor.addChild(camera)
        arView.scene.addAnchor(anchor)

        coordinator.cameraEntity = camera

        Task { @MainActor [weak coordinator, weak arView] in
            guard let coordinator, let arView else { return }
            do {
                let result = try await coordinator.renderingManager.assetManager.loadBookSceneRoot(
                    variant: renderConfig.assetVariant
                )
                guard !Task.isCancelled, coordinator.sceneAnchor != nil else { return }
                coordinator.renderingManager.recordModelLoad(durationMs: result.loadDurationMs)

                coordinator.attachLoadedRoot(result.entity, variant: renderConfig.assetVariant)
                coordinator.setSceneActive(isSceneActive)
                coordinator.syncConfiguration(
                    configuration,
                    turnNonce: pageTurnNonce,
                    turnDirection: pageTurnDirection
                )
                coordinator.isModelLoaded = true

                coordinator.updateSubscriptionStorage = arView.scene.subscribe(to: SceneEvents.Update.self) { event in
                    let dt = Float(event.deltaTime)
                    MainActor.assumeIsolated {
                        coordinator.tick(deltaTime: dt)
                    }
                }
            } catch {
                guard !Task.isCancelled else { return }
                let msg = "RealityKit fallback activated: \(error.localizedDescription)"
                coordinator.loadErrorMessage = msg
                coordinator.lifecycleManager.markFailed(msg)
                coordinator.renderingManager.reportSceneLoadFailure(msg)
                onFallbackRequired(msg)
            }
        }

        return arView
    }

    func updateUIView(_ uiView: ARView, context: Context) {
        applyRenderOptions(to: uiView, configuration: coordinator.effectiveRenderingConfiguration)
    }

    static func dismantleUIView(_ uiView: ARView, coordinator: ()) {
        uiView.scene.anchors.removeAll()
        uiView.session.pause()
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
