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
    public var cameraEntity: PerspectiveCamera?
    public var updateSubscriptionStorage: Any?

    public var currentOpenProgress: Float = 0
    public var targetOpenProgress: Float = 0
    public var currentTurnProgress: Float = 0
    public var isAnimatingTurn = false
    public var turnDirection: Float = 1
    public var reducedMotion = false

    public var orbitYaw: Float = 0
    public var orbitPitch: Float = 0
    public var zoomScale: Float = 1.0
    public var activePreset: BookCameraPreset = .hero
    public var currentCameraPosition: SIMD3<Float> = BookCameraPreset.hero.position
    public var currentCameraTarget: SIMD3<Float> = BookCameraPreset.hero.target

    private var lastAppliedLeather: BookLeatherSwatch?
    private var lastAppliedFoil: BookFoilSwatch?
    private var lastTurnNonce: Int = 0

    public init() {}

    public func syncConfiguration(
        _ config: Book3DConfiguration,
        turnNonce: Int,
        turnDirection: Int
    ) {
        reducedMotion = config.reducedMotion
        targetOpenProgress = config.isOpen ? 1.0 : 0.0

        if config.cameraPreset != activePreset {
            activePreset = config.cameraPreset
            orbitYaw = 0
            orbitPitch = 0
            zoomScale = 1.0
            cameraEntity?.camera.fieldOfViewInDegrees = config.cameraPreset.fovDegrees
        }

        if turnNonce != lastTurnNonce {
            lastTurnNonce = turnNonce
            self.turnDirection = turnDirection >= 0 ? 1 : -1
            if config.isOpen && !config.reducedMotion {
                isAnimatingTurn = true
                currentTurnProgress = turnDirection >= 0 ? 0.02 : 0.98
            } else {
                isAnimatingTurn = false
                currentTurnProgress = 0
            }
        }

        if lastAppliedLeather != config.leather || lastAppliedFoil != config.foil {
            lastAppliedLeather = config.leather
            lastAppliedFoil = config.foil
            applyMaterials(leather: config.leather, foil: config.foil)
        }
    }

    public func applyMaterials(leather: BookLeatherSwatch, foil: BookFoilSwatch) {
        guard let root = bookRoot else { return }

        let leatherMat = Self.makePBRMaterial(
            hex: leather.hexUInt,
            metallic: leather.metallic,
            roughness: leather.roughness,
            clearcoat: leather.clearcoat
        )
        let foilMat = Self.makePBRMaterial(
            hex: foil.effectiveHexUInt(for: leather),
            metallic: foil.metallic,
            roughness: foil.roughness,
            clearcoat: foil.clearcoat
        )
        let paperMat = Self.makePBRMaterial(
            hex: 0xF7F4EE,
            metallic: 0.0,
            roughness: 0.95,
            clearcoat: 0.0
        )
        let ribbonMat = Self.makePBRMaterial(
            hex: 0x849483,
            metallic: 0.35,
            roughness: 0.45,
            clearcoat: 0.12
        )

        Self.traverseApplyingMaterials(
            entity: root,
            leather: leatherMat,
            foil: foilMat,
            paper: paperMat,
            ribbon: ribbonMat
        )
    }

    public func tick(deltaTime: Float) {
        let dt = min(deltaTime, 0.05)

        // 1. Front Cover Hinge Kinematics (+Z rotation swings cover up & left)
        if reducedMotion {
            currentOpenProgress = targetOpenProgress
        } else {
            let delta = targetOpenProgress - currentOpenProgress
            currentOpenProgress += delta * min(1.0, dt * BookAnimationContract.coverLerpSpeed)
        }

        if let hinge = frontCoverHinge {
            let angle = BookAnimationContract.computeCoverHingeAngle(openProgress: currentOpenProgress)
            hinge.orientation = simd_quatf(angle: angle, axis: BookAnimationContract.hingeAxis)
        }

        // 2. Turning Page Kinematics
        if targetOpenProgress < 0.1 {
            isAnimatingTurn = false
            currentTurnProgress = 0
        } else if isAnimatingTurn {
            let step = dt * (1000.0 / Float(BookAnimationContract.pageTurnDurationMs))
            if turnDirection > 0 {
                currentTurnProgress += step
                if currentTurnProgress >= 1.0 {
                    currentTurnProgress = 0
                    isAnimatingTurn = false
                }
            } else {
                currentTurnProgress -= step
                if currentTurnProgress <= 0.0 {
                    currentTurnProgress = 0
                    isAnimatingTurn = false
                }
            }
        }

        if let pageHinge = turningPageHinge {
            let angle = isAnimatingTurn
                ? BookAnimationContract.computePageTurnAngle(turnProgress: currentTurnProgress)
                : (targetOpenProgress > 0.5 ? 0.04 : 0.0)
            pageHinge.orientation = simd_quatf(angle: angle, axis: BookAnimationContract.hingeAxis)
        }

        // 3. Camera Preset & Orbit Interpolation
        if let camera = cameraEntity {
            let baseOffset = activePreset.position - activePreset.target
            let scaledOffset = baseOffset * zoomScale
            let yawQuat = simd_quatf(angle: orbitYaw, axis: SIMD3<Float>(0, 1, 0))
            let pitchQuat = simd_quatf(angle: orbitPitch, axis: SIMD3<Float>(1, 0, 0))
            let rotatedOffset = yawQuat.act(pitchQuat.act(scaledOffset))
            let desiredPos = activePreset.target + rotatedOffset

            if reducedMotion {
                currentCameraPosition = desiredPos
                currentCameraTarget = activePreset.target
            } else {
                let factor = min(1.0, dt * 6.0)
                currentCameraPosition = simd_mix(currentCameraPosition, desiredPos, SIMD3<Float>(repeating: factor))
                currentCameraTarget = simd_mix(currentCameraTarget, activePreset.target, SIMD3<Float>(repeating: factor))
            }

            camera.look(at: currentCameraTarget, from: currentCameraPosition, relativeTo: nil)
        }
    }

    public func triggerHapticFeedback() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }

    private static func makePBRMaterial(
        hex: UInt,
        metallic: Float,
        roughness: Float,
        clearcoat: Float
    ) -> PhysicallyBasedMaterial {
        var mat = PhysicallyBasedMaterial()
        let color = UIColor(
            red: CGFloat((hex >> 16) & 0xff) / 255.0,
            green: CGFloat((hex >> 08) & 0xff) / 255.0,
            blue: CGFloat((hex >> 00) & 0xff) / 255.0,
            alpha: 1.0
        )
        mat.baseColor = .init(tint: color)
        mat.metallic = .init(floatLiteral: metallic)
        mat.roughness = .init(floatLiteral: roughness)
        if clearcoat > 0 {
            mat.clearcoat = .init(floatLiteral: clearcoat)
            mat.clearcoatRoughness = .init(floatLiteral: 0.4)
        }
        mat.faceCulling = .none
        return mat
    }

    private static func traverseApplyingMaterials(
        entity: Entity,
        leather: PhysicallyBasedMaterial,
        foil: PhysicallyBasedMaterial,
        paper: PhysicallyBasedMaterial,
        ribbon: PhysicallyBasedMaterial
    ) {
        let name = entity.name
        let parentName = entity.parent?.name ?? ""

        if var model = entity.components[ModelComponent.self] {
            if name == Book3DHierarchy.frontCover
                || name == Book3DHierarchy.backCover
                || name == Book3DHierarchy.spine
                || parentName == Book3DHierarchy.frontCover
                || parentName == Book3DHierarchy.backCover
                || parentName == Book3DHierarchy.spine {
                model.materials = [leather]
            } else if name == Book3DHierarchy.emblem
                || name == Book3DHierarchy.cornerGuards
                || parentName == Book3DHierarchy.emblem
                || parentName == Book3DHierarchy.cornerGuards {
                model.materials = [foil]
            } else if name == Book3DHierarchy.ribbon
                || parentName == Book3DHierarchy.ribbon {
                model.materials = [ribbon]
            } else if name == Book3DHierarchy.textBlock
                || name == Book3DHierarchy.turningPageLeaf
                || parentName == Book3DHierarchy.textBlock
                || parentName == Book3DHierarchy.turningPageLeaf {
                model.materials = [paper]
            }
            entity.components.set(model)
        }

        for child in entity.children {
            traverseApplyingMaterials(
                entity: child,
                leather: leather,
                foil: foil,
                paper: paper,
                ribbon: ribbon
            )
        }
    }

    public static func loadBookSceneRoot() async throws -> Entity {
        if let usdzURL = Book3DAssetLocator.locateBundledUSDZ() {
            if #available(iOS 18.0, *) {
                return try await Entity(contentsOf: usdzURL)
            } else {
                return try Entity.load(contentsOf: usdzURL)
            }
        }
        return makeProceduralFallbackBookHierarchy()
    }

    public static func makeProceduralFallbackBookHierarchy() -> Entity {
        let root = Entity()
        root.name = Book3DHierarchy.root

        let w = Book3DDimensions.bookWidth
        let h = Book3DDimensions.bookHeight
        let bt = Book3DDimensions.boardThickness
        let tt = Book3DDimensions.textblockThickness

        let backCover = ModelEntity(mesh: .generateBox(size: [w, bt, h]))
        backCover.name = Book3DHierarchy.backCover
        backCover.position = [w / 2, -(tt / 2 + bt / 2), 0]
        root.addChild(backCover)

        let spine = ModelEntity(mesh: .generateBox(size: [bt * 2, tt + bt * 2, h]))
        spine.name = Book3DHierarchy.spine
        spine.position = [0, 0, 0]
        root.addChild(spine)

        let textBlock = ModelEntity(mesh: .generateBox(size: [w - 0.008, tt, h - 0.010]))
        textBlock.name = Book3DHierarchy.textBlock
        textBlock.position = [(w - 0.008) / 2 + 0.004, 0, 0]
        root.addChild(textBlock)

        let ribbon = ModelEntity(mesh: .generateBox(size: [0.012, 0.0005, h * 1.15]))
        ribbon.name = Book3DHierarchy.ribbon
        ribbon.position = [w * 0.48, tt * 0.5 + 0.0003, 0.025]
        root.addChild(ribbon)

        let frontHinge = Entity()
        frontHinge.name = Book3DHierarchy.frontCoverHinge
        let frontCover = ModelEntity(mesh: .generateBox(size: [w, bt, h]))
        frontCover.name = Book3DHierarchy.frontCover
        frontCover.position = [w / 2, tt / 2 + bt / 2, 0]
        frontHinge.addChild(frontCover)

        let emblem = ModelEntity(mesh: .generateBox(size: [0.09, 0.0014, 0.09], cornerRadius: 0.045))
        emblem.name = Book3DHierarchy.emblem
        emblem.position = [w * 0.52, tt / 2 + bt + 0.0007, 0]
        frontHinge.addChild(emblem)
        root.addChild(frontHinge)

        let pageHinge = Entity()
        pageHinge.name = Book3DHierarchy.turningPageHinge
        pageHinge.position = [0.005, tt * 0.45, 0]
        let turningPage = ModelEntity(mesh: .generateBox(size: [w - 0.008, 0.0005, h - 0.010]))
        turningPage.name = Book3DHierarchy.turningPageLeaf
        turningPage.position = [(w - 0.008) / 2, 0.001, 0]
        pageHinge.addChild(turningPage)
        root.addChild(pageHinge)

        return root
    }

    public static func makeStudioLightingRig() -> Entity {
        let rig = Entity()
        rig.name = "StudioLightingRig"

        let keyLight = DirectionalLight()
        keyLight.light.color = UIColor(
            red: 1.0,
            green: 0.973,
            blue: 0.922,
            alpha: 1.0
        )
        keyLight.light.intensity = 2200
        keyLight.shadow = DirectionalLightComponent.Shadow(maximumDistance: 2.0, depthBias: 0.002)
        keyLight.look(at: [0, 0, 0], from: BookLightingIntent.keyLightPosition, relativeTo: nil)
        rig.addChild(keyLight)

        let fillLight = DirectionalLight()
        fillLight.light.color = UIColor(
            red: 0.831,
            green: 0.902,
            blue: 0.875,
            alpha: 1.0
        )
        fillLight.light.intensity = 900
        fillLight.look(at: [0, 0, 0], from: BookLightingIntent.fillLightPosition, relativeTo: nil)
        rig.addChild(fillLight)

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

        return rig
    }
}

public struct Book3DRealityView: View {
    public let configuration: Book3DConfiguration
    public let pageTurnNonce: Int
    public let pageTurnDirection: Int
    public let allowGestures: Bool
    public let onToggleOpen: () -> Void
    public let onTurnPage: (Int) -> Void
    public let onFallbackRequired: (String) -> Void

    @StateObject private var controller = Book3DRealityController()
    @State private var lastDragTranslation: CGSize = .zero

    public init(
        configuration: Book3DConfiguration,
        pageTurnNonce: Int = 0,
        pageTurnDirection: Int = 1,
        allowGestures: Bool = true,
        onToggleOpen: @escaping () -> Void = {},
        onTurnPage: @escaping (Int) -> Void = { _ in },
        onFallbackRequired: @escaping (String) -> Void = { _ in }
    ) {
        self.configuration = configuration
        self.pageTurnNonce = pageTurnNonce
        self.pageTurnDirection = pageTurnDirection
        self.allowGestures = allowGestures
        self.onToggleOpen = onToggleOpen
        self.onTurnPage = onTurnPage
        self.onFallbackRequired = onFallbackRequired
    }

    public var body: some View {
        ZStack {
            Color(hex: BookLightingIntent.backgroundHexUInt)

            if #available(iOS 18.0, *) {
                realityKit18View
                    .modifier(
                        Book3DGestureModifier(
                            enabled: allowGestures,
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
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("3D Heirloom Book: \(configuration.coverTitle)")
        .accessibilityHint(configuration.isOpen ? "Book is open. Double tap to close cover." : "Book is closed. Double tap to open cover.")
        .accessibilityAddTraits(.isButton)
        .accessibilityAction {
            onToggleOpen()
        }
    }

    @available(iOS 18.0, *)
    private var realityKit18View: some View {
        RealityView { (content: inout RealityViewCameraContent) in
            content.camera = .virtual

            let anchor = AnchorEntity(world: .zero)
            let lightingRig = Book3DRealityController.makeStudioLightingRig()
            anchor.addChild(lightingRig)

            let camera = PerspectiveCamera()
            camera.camera.fieldOfViewInDegrees = configuration.cameraPreset.fovDegrees
            camera.look(
                at: configuration.cameraPreset.target,
                from: configuration.cameraPreset.position,
                relativeTo: nil
            )
            anchor.addChild(camera)
            controller.cameraEntity = camera

            do {
                let root = try await Book3DRealityController.loadBookSceneRoot()
                root.position = [-0.04, 0, 0]
                root.orientation = simd_quatf(angle: -0.22, axis: [0, 1, 0])
                let bookBoundsShape = ShapeResource.generateBox(size: [0.24, 0.06, 0.28])
                    .offsetBy(translation: [0.10, 0, 0])
                root.components.set(CollisionComponent(shapes: [bookBoundsShape]))
                root.components.set(InputTargetComponent())

                for interactiveName in [Book3DHierarchy.frontCover, Book3DHierarchy.textBlock] {
                    if let entity = root.findEntity(named: interactiveName) {
                        entity.generateCollisionShapes(recursive: false)
                        entity.components.set(InputTargetComponent())
                    }
                }

                anchor.addChild(root)
                content.add(anchor)

                controller.bookRoot = root
                controller.frontCoverHinge = root.findEntity(named: Book3DHierarchy.frontCoverHinge)
                controller.turningPageHinge = root.findEntity(named: Book3DHierarchy.turningPageHinge)
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
                onFallbackRequired(message)
            }
        } update: { _ in
            controller.syncConfiguration(
                configuration,
                turnNonce: pageTurnNonce,
                turnDirection: pageTurnDirection
            )
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
                            let dx = Float(value.translation.width - lastDragTranslation.width)
                            let dy = Float(value.translation.height - lastDragTranslation.height)
                            lastDragTranslation = value.translation
                            controller.orbitYaw -= dx * 0.008
                            controller.orbitPitch = max(-0.65, min(0.65, controller.orbitPitch - dy * 0.008))
                        }
                        .onEnded { value in
                            lastDragTranslation = .zero
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
                            let clamped = max(0.55, min(1.8, Float(1.0 / value.magnification)))
                            controller.zoomScale = clamped
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
    let onFallbackRequired: (String) -> Void

    func makeUIView(context: Context) -> ARView {
        let arView = ARView(frame: .zero, cameraMode: .nonAR, automaticallyConfigureSession: false)
        arView.environment.background = .color(
            UIColor(red: 0.969, green: 0.957, blue: 0.933, alpha: 1.0)
        )

        let anchor = AnchorEntity(world: .zero)
        anchor.addChild(Book3DRealityController.makeStudioLightingRig())

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
                let root = try await Book3DRealityController.loadBookSceneRoot()
                root.position = [-0.04, 0, 0]
                root.orientation = simd_quatf(angle: -0.22, axis: [0, 1, 0])
                anchor.addChild(root)

                controller.bookRoot = root
                controller.frontCoverHinge = root.findEntity(named: Book3DHierarchy.frontCoverHinge)
                controller.turningPageHinge = root.findEntity(named: Book3DHierarchy.turningPageHinge)
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
                onFallbackRequired(msg)
            }
        }

        return arView
    }

    func updateUIView(_ uiView: ARView, context: Context) {
        controller.syncConfiguration(
            configuration,
            turnNonce: pageTurnNonce,
            turnDirection: pageTurnDirection
        )
    }
}
#endif
