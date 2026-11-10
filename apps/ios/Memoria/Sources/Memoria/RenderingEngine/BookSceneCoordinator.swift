import Foundation
import Combine
import SwiftUI

#if canImport(RealityKit) && os(iOS)
import RealityKit
import UIKit
import simd

/// Owns RealityKit scene construction, lighting rig, camera, page stacks,
/// endpapers, and real-time `PageDeformationController` updates.
/// Kept decoupled from SwiftUI views and durable book persistence.
@MainActor
public final class BookSceneCoordinator: ObservableObject {
    @Published public var isModelLoaded = false
    @Published public var loadErrorMessage: String?

    public var bookRoot: Entity?
    public var frontCoverHinge: Entity?
    public var turningPageHinge: Entity?
    public var turningPageLeaf: Entity?
    public var ribbonEntity: Entity?
    public var leftPageStack: ModelEntity?
    public var rightPageStack: ModelEntity?
    public var leftPageSurface: ModelEntity?
    public var rightPageSurface: ModelEntity?
    public var frontEndpaper: ModelEntity?
    public var backEndpaper: ModelEntity?
    public var deformableTurningPage: RealityKitDeformablePageMesh?
    public var openSpreadOverlay: ModelEntity? { rightPageSurface }
    public var lightingRig: Entity?
    public var sceneAnchor: AnchorEntity?
    public var cameraEntity: PerspectiveCamera?
    public var updateSubscriptionStorage: Any?

    public let lifecycleManager: SceneLifecycleManager
    public let interactionController: BookInteractionController
    public let renderingManager: BookRenderingManager
    public let presentationMode: BookPresentationMode

    private var lastAppliedLeather: BookLeatherSwatch?
    private var lastAppliedFoil: BookFoilSwatch?
    private var lastAppliedPaperStock: BookPaperStock?
    private var lastAppliedRibbonColor: BookRibbonColor?
    private var lastAppliedClearcoat: Bool?
    private var lastAppliedVariant: Book3DAssetVariant?
    private var lastAppliedLightingMode: RenderingLightingMode?
    private var lastAppliedShadowMode: RenderingShadowMode?
    private var lastAppliedSpreadIndex: Int?
    private var lastAppliedMaxTextureDim: Int?
    private var lastConfig: Book3DConfiguration = Book3DConfiguration()
    private var spreads: [BookSpreadPreview] = Book3DSampleData.sampleSpreads
    private var desiredSceneActive: Bool = true
    private var isReloadingVariant = false
    private var activeTurnFrontSpreadIndex: Int?
    private var activeTurnBackSpreadIndex: Int?
    private var activeTurnDirection: Int = 1
    private var activeTurnFrontMaterial: PhysicallyBasedMaterial?
    private var activeTurnBackMaterial: PhysicallyBasedMaterial?
    private var activeTurnMaterialsKey: String?
    private var isSceneDetached = false

    public init(
        presentationMode: BookPresentationMode = .reading,
        renderingManager: BookRenderingManager = .shared
    ) {
        self.presentationMode = presentationMode
        self.renderingManager = renderingManager
        self.lifecycleManager = SceneLifecycleManager(presentationMode: presentationMode)
        self.interactionController = BookInteractionController()
        self.lifecycleManager.onCancelObsoleteTasks = { [weak renderingManager] in
            renderingManager?.assetManager.cancelAllInFlightLoads()
        }
    }

    public var effectiveRenderingConfiguration: RenderingConfiguration {
        renderingManager.activeConfiguration.adjusted(for: presentationMode)
    }

    public func setSpreads(_ newSpreads: [BookSpreadPreview]) {
        if !newSpreads.isEmpty {
            spreads = newSpreads
        }
    }

    public func syncConfiguration(
        _ config: Book3DConfiguration,
        turnNonce: Int,
        turnDirection: Int
    ) {
        let previousSpread = lastConfig.currentSpreadIndex
        lastConfig = config
        let renderConfig = effectiveRenderingConfiguration

        let presetChanged = interactionController.syncConfiguration(
            config,
            turnNonce: turnNonce,
            turnDirection: turnDirection,
            highDetailPageCurl: renderConfig.enableHighDetailPageCurl,
            lifecycle: lifecycleManager
        )

        if let deformable = deformableTurningPage {
            deformable.controller.parameters = PageDeformationParameters(
                subdivisionsX: max(2, renderConfig.pageMeshSubdivisionsX),
                subdivisionsZ: max(1, renderConfig.pageMeshSubdivisionsZ)
            )
        }

        if presetChanged {
            cameraEntity?.camera.fieldOfViewInDegrees = config.cameraPreset.fovDegrees
        }

        if lastAppliedLeather != config.leather
            || lastAppliedFoil != config.foil
            || lastAppliedPaperStock != config.paperStock
            || lastAppliedRibbonColor != config.ribbonColor
            || lastAppliedClearcoat != renderConfig.enableClearcoat {
            lastAppliedLeather = config.leather
            lastAppliedFoil = config.foil
            lastAppliedPaperStock = config.paperStock
            lastAppliedRibbonColor = config.ribbonColor
            lastAppliedClearcoat = renderConfig.enableClearcoat
            applyMaterials(
                leather: config.leather,
                foil: config.foil,
                paperStock: config.paperStock,
                ribbonColor: config.ribbonColor,
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
                totalSpreads: spreads.count,
                reduceMotion: config.reducedMotion
            )
        }

        let spreadChanged = lastAppliedSpreadIndex != config.currentSpreadIndex
        let textureDimChanged = lastAppliedMaxTextureDim != renderConfig.maxTextureDimension

        if interactionController.animationController.isTurnActive && spreadChanged {
            // Prepare turning front/back spreads + revealed destination stack cleanly
            // unless interactive drag already configured them.
            let dir = turnDirection >= 0 ? 1 : -1
            let startSpread = interactionController.animationController.activeTurnStartSpread
            let destSpread = interactionController.animationController.activeTurnDestinationSpread
            let resolvedFrom = (startSpread != destSpread) ? startSpread : previousSpread
            prepareTurnSurfaces(
                direction: dir,
                fromSpread: resolvedFrom,
                toSpread: config.currentSpreadIndex,
                paperStock: config.paperStock
            )
            lastAppliedSpreadIndex = config.currentSpreadIndex
            lastAppliedMaxTextureDim = renderConfig.maxTextureDimension
        } else if spreadChanged || textureDimChanged {
            lastAppliedSpreadIndex = config.currentSpreadIndex
            lastAppliedMaxTextureDim = renderConfig.maxTextureDimension
            activeTurnFrontMaterial = nil
            activeTurnBackMaterial = nil
            activeTurnMaterialsKey = nil
            applySpreadTexture(spreadIndex: config.currentSpreadIndex)
        }

        // Swap USDZ LOD variant only when not in the middle of a critical animation
        if isModelLoaded,
           !isReloadingVariant,
           let currentVariant = lastAppliedVariant,
           currentVariant != renderConfig.assetVariant,
           !lifecycleManager.lifecycleState.isCriticalAnimation {
            Task { @MainActor [weak self] in
                await self?.swapAssetVariant(renderConfig.assetVariant)
            }
        }
    }

    public func beginInteractivePageTurn(
        direction: Int,
        fromSpread: Int,
        toSpread: Int
    ) {
        let dir = direction >= 0 ? 1 : -1
        interactionController.isDraggingOrbit = false
        interactionController.animationController.beginInteractiveTurn(
            direction: dir,
            fromSpread: fromSpread,
            toSpread: toSpread
        )
        lifecycleManager.beginPageTurn()
        prepareTurnSurfaces(
            direction: dir,
            fromSpread: fromSpread,
            toSpread: toSpread,
            paperStock: lastConfig.paperStock
        )
        interactionController.markDirtyForGeometrySync()
    }

    private func prepareTurnSurfaces(
        direction: Int,
        fromSpread: Int,
        toSpread: Int,
        paperStock: BookPaperStock
    ) {
        activeTurnDirection = direction >= 0 ? 1 : -1
        if activeTurnDirection > 0 {
            activeTurnFrontSpreadIndex = fromSpread
            activeTurnBackSpreadIndex = toSpread
            applyPageSurfaces(
                leftSpreadIndex: fromSpread,
                rightSpreadIndex: toSpread,
                paperStock: paperStock
            )
        } else {
            activeTurnFrontSpreadIndex = toSpread
            activeTurnBackSpreadIndex = fromSpread
            applyPageSurfaces(
                leftSpreadIndex: toSpread,
                rightSpreadIndex: fromSpread,
                paperStock: paperStock
            )
        }
        activeTurnFrontMaterial = nil
        activeTurnBackMaterial = nil
        activeTurnMaterialsKey = nil
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
            activeTurnFrontSpreadIndex = nil
            activeTurnBackSpreadIndex = nil
            activeTurnFrontMaterial = nil
            activeTurnBackMaterial = nil
            activeTurnMaterialsKey = nil
            renderingManager.handleAppBackgrounded()
        case .inactive:
            lifecycleManager.setOccluded(true, isBookOpen: lastConfig.isOpen)
            interactionController.isDraggingOrbit = false
        case .active:
            renderingManager.handleAppForegrounded()
            lifecycleManager.enterForeground(isBookOpen: lastConfig.isOpen)
            lifecycleManager.setOccluded(!desiredSceneActive, isBookOpen: lastConfig.isOpen)
            if desiredSceneActive {
                if isModelLoaded && !interactionController.animationController.isTurnActive {
                    applySpreadTexture(spreadIndex: lastConfig.currentSpreadIndex)
                }
                interactionController.markDirtyForCameraGesture()
            }
        @unknown default:
            break
        }
    }

    public func applyMaterials(
        leather: BookLeatherSwatch,
        foil: BookFoilSwatch,
        paperStock: BookPaperStock = .warmCotton,
        ribbonColor: BookRibbonColor = .sage,
        enableClearcoat: Bool = true
    ) {
        guard let root = bookRoot else { return }
        renderingManager.textureManager.applyCachedMaterials(
            to: root,
            leather: leather,
            foil: foil,
            paperStock: paperStock,
            ribbonColor: ribbonColor,
            enableClearcoat: enableClearcoat
        )
    }

    public func applySpreadTexture(spreadIndex: Int) {
        applyPageSurfaces(
            leftSpreadIndex: spreadIndex,
            rightSpreadIndex: spreadIndex,
            paperStock: lastConfig.paperStock
        )
    }

    private func applyPageSurfaces(
        leftSpreadIndex: Int,
        rightSpreadIndex: Int,
        paperStock: BookPaperStock
    ) {
        guard !spreads.isEmpty else { return }
        let safeLeft = max(0, min(spreads.count - 1, leftSpreadIndex))
        let safeRight = max(0, min(spreads.count - 1, rightSpreadIndex))

        if presentationMode == .preview && !lastConfig.isOpen {
            // Mode B preview avoids decoding spread textures while book stays closed
            return
        }

        let leftMat = renderingManager.textureManager.pageMaterial(
            for: spreads[safeLeft],
            side: .left,
            paperStock: paperStock
        )
        let rightMat = renderingManager.textureManager.pageMaterial(
            for: spreads[safeRight],
            side: .right,
            paperStock: paperStock
        )
        leftPageSurface?.model?.materials = [leftMat]
        rightPageSurface?.model?.materials = [rightMat]
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
        let renderConfig = effectiveRenderingConfiguration

        guard let step = interactionController.step(
            deltaTime: clampedDt,
            targetStepInterval: renderConfig.simulationStepIntervalSeconds,
            isBookOpen: lastConfig.isOpen,
            lifecycle: lifecycleManager
        ) else {
            return
        }

        // Only record frame timing during active simulation/interaction
        renderingManager.recordActiveFrameDelta(clampedDt)

        if let hinge = frontCoverHinge {
            hinge.orientation = simd_quatf(angle: step.coverAngleRadians, axis: BookAnimationContract.hingeAxis)
        }

        if let ribbon = ribbonEntity {
            ribbon.orientation = simd_quatf(angle: step.ribbonSwayRadians, axis: [0, 0, 1])
        }

        // Show left & right open page stacks smoothly once cover lifts clear of textblock
        let isOpenVisible = step.openProgress > 0.72
        let isLeftStackVisible = step.openProgress > 0.35
        leftPageStack?.isEnabled = isLeftStackVisible
        leftPageSurface?.isEnabled = isOpenVisible
        rightPageSurface?.isEnabled = isOpenVisible
        frontEndpaper?.isEnabled = step.openProgress > 0.15
        backEndpaper?.isEnabled = step.openProgress > 0.15

        // Update genuine deformable turning sheet only while turning
        if let deformable = deformableTurningPage {
            if step.isTurnVisible && renderConfig.enableInteractivePageDeformation && !spreads.isEmpty {
                deformable.entity.isEnabled = true
                turningPageLeaf?.isEnabled = false

                let frontIdx = max(0, min(spreads.count - 1, activeTurnFrontSpreadIndex ?? lastConfig.currentSpreadIndex))
                let backIdx = max(0, min(spreads.count - 1, activeTurnBackSpreadIndex ?? lastConfig.currentSpreadIndex))
                let turnMatKey = "\(frontIdx)-\(backIdx)-\(lastConfig.paperStock.rawValue)-\(renderConfig.maxTextureDimension)"
                let frontMat: PhysicallyBasedMaterial
                let backMat: PhysicallyBasedMaterial
                if activeTurnMaterialsKey == turnMatKey,
                   let cachedFront = activeTurnFrontMaterial,
                   let cachedBack = activeTurnBackMaterial {
                    frontMat = cachedFront
                    backMat = cachedBack
                } else {
                    frontMat = renderingManager.textureManager.pageMaterial(
                        for: spreads[frontIdx],
                        side: .right,
                        paperStock: lastConfig.paperStock
                    )
                    backMat = renderingManager.textureManager.pageMaterial(
                        for: spreads[backIdx],
                        side: .left,
                        paperStock: lastConfig.paperStock
                    )
                    activeTurnFrontMaterial = frontMat
                    activeTurnBackMaterial = backMat
                    activeTurnMaterialsKey = turnMatKey
                }

                deformable.updateGeometry(
                    turnProgress: step.turnProgress,
                    curlIntensity: step.curlIntensity,
                    turnDirection: interactionController.turnDirection,
                    frontMaterial: frontMat,
                    backMaterial: backMat
                )
            } else {
                deformable.entity.isEnabled = false
                turningPageLeaf?.isEnabled = false
            }
        }

        if step.didCompleteTurn {
            activeTurnFrontSpreadIndex = nil
            activeTurnBackSpreadIndex = nil
            activeTurnFrontMaterial = nil
            activeTurnBackMaterial = nil
            activeTurnMaterialsKey = nil
            applySpreadTexture(spreadIndex: lastConfig.currentSpreadIndex)
        }

        if let camera = cameraEntity {
            camera.look(at: step.cameraTarget, from: step.cameraPosition, relativeTo: nil)
        }

        if step.settledToIdle && !lifecycleManager.isOccluded && !lifecycleManager.isBackgrounded {
            renderingManager.updateInteractionContext(
                state: lifecycleManager.interactionState,
                spreadIndex: lastConfig.currentSpreadIndex,
                totalSpreads: spreads.count,
                reduceMotion: lastConfig.reducedMotion
            )
        }
    }

    public func triggerHapticFeedback() {
        guard effectiveRenderingConfiguration.enableHaptics else { return }
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }

    public func attachLoadedRoot(_ root: Entity, variant: Book3DAssetVariant) {
        guard !isSceneDetached else { return }
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

        let pageWidth = (Book3DDimensions.bookWidth - 0.010) * 0.96
        let pageDepth = (Book3DDimensions.bookHeight - 0.012) * 0.96
        let paperMat = makeBasePaperMaterial(stock: lastConfig.paperStock)

        // 1. RightPageSurface sitting cleanly on top of TextBlock
        let rightSurfaceMesh = MeshResource.generatePlane(width: pageWidth, depth: pageDepth)
        let rightSurfaceEntity = ModelEntity(mesh: rightSurfaceMesh, materials: [paperMat])
        rightSurfaceEntity.name = Book3DHierarchy.rightPageSurface
        rightSurfaceEntity.position = [
            (Book3DDimensions.bookWidth - 0.008) / 2.0 + 0.004,
            Book3DDimensions.textblockThickness / 2.0 + 0.0003,
            0
        ]
        rightSurfaceEntity.isEnabled = interactionController.currentOpenProgress > 0.72
        root.addChild(rightSurfaceEntity)

        // 2. FrontEndpaper, LeftPageStack & LeftPageSurface attached to FrontCoverHinge
        let hinge = root.findEntity(named: Book3DHierarchy.frontCoverHinge)
        let endpaperMat = makeEndpaperMaterial(stock: lastConfig.paperStock)
        let frontEndpaperMesh = MeshResource.generatePlane(width: pageWidth, depth: pageDepth)
        let frontEndpaperEntity = ModelEntity(mesh: frontEndpaperMesh, materials: [endpaperMat])
        frontEndpaperEntity.name = Book3DHierarchy.frontEndpaper
        frontEndpaperEntity.position = [
            (Book3DDimensions.bookWidth - 0.008) / 2.0 + 0.004,
            Book3DDimensions.textblockThickness / 2.0 - 0.0002,
            0
        ]
        frontEndpaperEntity.orientation = simd_quatf(angle: .pi, axis: [0, 0, 1])
        frontEndpaperEntity.isEnabled = interactionController.currentOpenProgress > 0.15
        hinge?.addChild(frontEndpaperEntity)

        let leftStackThickness: Float = 0.0045
        let leftStackMesh = MeshResource.generateBox(
            size: [Book3DDimensions.bookWidth - 0.010, leftStackThickness, Book3DDimensions.bookHeight - 0.012]
        )
        let leftStackEntity = ModelEntity(mesh: leftStackMesh, materials: [paperMat])
        leftStackEntity.name = Book3DHierarchy.leftPageStack
        leftStackEntity.position = [
            (Book3DDimensions.bookWidth - 0.008) / 2.0 + 0.004,
            Book3DDimensions.textblockThickness / 2.0 - leftStackThickness / 2.0 - 0.0004,
            0
        ]
        leftStackEntity.isEnabled = interactionController.currentOpenProgress > 0.35
        hinge?.addChild(leftStackEntity)

        let leftSurfaceMesh = MeshResource.generatePlane(width: pageWidth, depth: pageDepth)
        let leftSurfaceEntity = ModelEntity(mesh: leftSurfaceMesh, materials: [paperMat])
        leftSurfaceEntity.name = Book3DHierarchy.leftPageSurface
        leftSurfaceEntity.position = [
            (Book3DDimensions.bookWidth - 0.008) / 2.0 + 0.004,
            Book3DDimensions.textblockThickness / 2.0 - leftStackThickness - 0.0006,
            0
        ]
        leftSurfaceEntity.orientation = simd_quatf(angle: .pi, axis: [0, 0, 1])
        leftSurfaceEntity.isEnabled = interactionController.currentOpenProgress > 0.72
        hinge?.addChild(leftSurfaceEntity)

        // 3. BackEndpaper resting on BackCover inner face
        let backEndpaperMesh = MeshResource.generatePlane(width: pageWidth, depth: pageDepth)
        let backEndpaperEntity = ModelEntity(mesh: backEndpaperMesh, materials: [endpaperMat])
        backEndpaperEntity.name = Book3DHierarchy.backEndpaper
        backEndpaperEntity.position = [
            (Book3DDimensions.bookWidth - 0.008) / 2.0 + 0.004,
            -Book3DDimensions.textblockThickness / 2.0 + 0.0002,
            0
        ]
        backEndpaperEntity.isEnabled = interactionController.currentOpenProgress > 0.15
        root.addChild(backEndpaperEntity)

        // 4. Genuine subdivided deformable ActiveTurningPage anchored at spine gutter
        let renderConfig = effectiveRenderingConfiguration
        let deformController = PageDeformationController(
            parameters: PageDeformationParameters(
                subdivisionsX: max(2, renderConfig.pageMeshSubdivisionsX),
                subdivisionsZ: max(1, renderConfig.pageMeshSubdivisionsZ)
            )
        )
        let deformableMesh = RealityKitDeformablePageMesh(controller: deformController)
        deformableMesh.entity.position = [0.0045, Book3DDimensions.textblockThickness / 2.0 + 0.0004, 0]
        deformableMesh.entity.isEnabled = false
        root.addChild(deformableMesh.entity)

        bookRoot?.removeFromParent()
        sceneAnchor?.addChild(root)

        bookRoot = root
        frontCoverHinge = hinge
        turningPageHinge = root.findEntity(named: Book3DHierarchy.turningPageHinge)
        turningPageLeaf = root.findEntity(named: Book3DHierarchy.turningPageLeaf)
        turningPageLeaf?.isEnabled = false
        ribbonEntity = root.findEntity(named: Book3DHierarchy.ribbon)
        leftPageStack = leftStackEntity
        rightPageStack = root.findEntity(named: Book3DHierarchy.textBlock) as? ModelEntity
        leftPageSurface = leftSurfaceEntity
        rightPageSurface = rightSurfaceEntity
        frontEndpaper = frontEndpaperEntity
        backEndpaper = backEndpaperEntity
        deformableTurningPage = deformableMesh

        lastAppliedVariant = variant
        lastAppliedLeather = nil
        lastAppliedFoil = nil
        lastAppliedPaperStock = nil
        lastAppliedRibbonColor = nil
        lastAppliedClearcoat = nil
        lastAppliedSpreadIndex = nil

        if let hinge {
            let angle = BookAnimationContract.computeCoverHingeAngle(openProgress: interactionController.currentOpenProgress)
            hinge.orientation = simd_quatf(angle: angle, axis: BookAnimationContract.hingeAxis)
        }
        lifecycleManager.markSceneReady(isOpen: lastConfig.isOpen)
    }

    public func detachScene() {
        isSceneDetached = true
        updateSubscriptionStorage = nil
        bookRoot?.removeFromParent()
        bookRoot = nil
        frontCoverHinge = nil
        turningPageHinge = nil
        turningPageLeaf = nil
        ribbonEntity = nil
        leftPageStack = nil
        rightPageStack = nil
        leftPageSurface = nil
        rightPageSurface = nil
        frontEndpaper = nil
        backEndpaper = nil
        deformableTurningPage = nil
        activeTurnFrontSpreadIndex = nil
        activeTurnBackSpreadIndex = nil
        activeTurnFrontMaterial = nil
        activeTurnBackMaterial = nil
        activeTurnMaterialsKey = nil
        lightingRig?.removeFromParent()
        lightingRig = nil
        cameraEntity = nil
        sceneAnchor = nil
    }

    public func markScenePreparing() {
        isSceneDetached = false
    }

    private func makeBasePaperMaterial(stock: BookPaperStock) -> PhysicallyBasedMaterial {
        var mat = PhysicallyBasedMaterial()
        let hex = stock.hexUInt
        mat.baseColor = .init(tint: UIColor(
            red: CGFloat((hex >> 16) & 0xff) / 255.0,
            green: CGFloat((hex >> 08) & 0xff) / 255.0,
            blue: CGFloat((hex >> 00) & 0xff) / 255.0,
            alpha: 1.0
        ))
        mat.metallic = .init(floatLiteral: 0.0)
        mat.roughness = .init(floatLiteral: stock.roughness)
        return mat
    }

    private func makeEndpaperMaterial(stock: BookPaperStock) -> PhysicallyBasedMaterial {
        var mat = PhysicallyBasedMaterial()
        let hex = stock.hexUInt
        mat.baseColor = .init(tint: UIColor(
            red: CGFloat((hex >> 16) & 0xff) / 255.0 * 0.94,
            green: CGFloat((hex >> 08) & 0xff) / 255.0 * 0.94,
            blue: CGFloat((hex >> 00) & 0xff) / 255.0 * 0.92,
            alpha: 1.0
        ))
        mat.metallic = .init(floatLiteral: 0.0)
        mat.roughness = .init(floatLiteral: 0.96)
        return mat
    }

    private func swapAssetVariant(_ nextVariant: Book3DAssetVariant) async {
        guard !isReloadingVariant, !isSceneDetached, sceneAnchor != nil else { return }
        isReloadingVariant = true
        defer { isReloadingVariant = false }

        lifecycleManager.beginLoading()
        do {
            let result = try await renderingManager.assetManager.loadBookSceneRoot(variant: nextVariant)
            guard !isSceneDetached, sceneAnchor != nil else { return }
            renderingManager.recordModelLoad(durationMs: result.loadDurationMs)
            attachLoadedRoot(result.entity, variant: nextVariant)
            let renderConfig = effectiveRenderingConfiguration
            applyMaterials(
                leather: lastConfig.leather,
                foil: lastConfig.foil,
                paperStock: lastConfig.paperStock,
                ribbonColor: lastConfig.ribbonColor,
                enableClearcoat: renderConfig.enableClearcoat
            )
            lastAppliedLeather = lastConfig.leather
            lastAppliedFoil = lastConfig.foil
            lastAppliedPaperStock = lastConfig.paperStock
            lastAppliedRibbonColor = lastConfig.ribbonColor
            lastAppliedClearcoat = renderConfig.enableClearcoat
            applySpreadTexture(spreadIndex: lastConfig.currentSpreadIndex)
            lastAppliedSpreadIndex = lastConfig.currentSpreadIndex
            lastAppliedMaxTextureDim = renderConfig.maxTextureDimension
            interactionController.markDirtyForCameraGesture()
        } catch {
            lifecycleManager.markFailed(error.localizedDescription)
            renderingManager.reportSceneLoadFailure(error.localizedDescription)
        }
    }

    public static func makeStudioLightingRig(
        configuration: RenderingConfiguration = RenderingConfiguration.make(for: .premium)
    ) -> Entity {
        let rig = Entity()
        rig.name = "StudioLightingRig"

        let keyLight = DirectionalLight()
        keyLight.light.color = UIColor(red: 1.0, green: 0.973, blue: 0.922, alpha: 1.0)
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
        fillLight.light.color = UIColor(red: 0.831, green: 0.902, blue: 0.875, alpha: 1.0)
        fillLight.light.intensity = configuration.lightingMode == .twoPointMinimal ? 1100 : 900
        fillLight.look(at: [0, 0, 0], from: BookLightingIntent.fillLightPosition, relativeTo: nil)
        rig.addChild(fillLight)

        if configuration.lightingMode == .threePointBalanced || configuration.lightingMode == .fourPointStudio {
            let foilBounceLight = PointLight()
            foilBounceLight.light.color = UIColor(red: 1.0, green: 0.976, blue: 0.910, alpha: 1.0)
            foilBounceLight.light.intensity = 1800
            foilBounceLight.position = SIMD3<Float>(0.15, 0.85, 0.65)
            rig.addChild(foilBounceLight)
        }

        if configuration.lightingMode == .fourPointStudio {
            let rimLight = PointLight()
            rimLight.light.color = UIColor(red: 1.0, green: 0.961, blue: 0.875, alpha: 1.0)
            rimLight.light.intensity = 1500
            rimLight.position = BookLightingIntent.rimLightPosition
            rig.addChild(rimLight)
        }

        return rig
    }

    public static func loadBookSceneRoot(variant: Book3DAssetVariant = .balanced) async throws -> Entity {
        let result = try await BookAssetManager.shared.loadBookSceneRoot(variant: variant)
        return result.entity
    }

    public static func makeProceduralFallbackBookHierarchy() -> Entity {
        BookAssetManager.makeProceduralFallbackBookHierarchy()
    }
}

public typealias Book3DRealityController = BookSceneCoordinator
#endif
