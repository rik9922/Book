import SwiftUI

/// Mode D — Long-session interactive reading view.
/// Persists reading position and book customization independently of transient
/// RealityKit state, respects Reduce Motion, and provides a non-3D fallback route.
public struct Book3DReaderView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    @Environment(\.scenePhase) private var scenePhase

    @ObservedObject private var renderingManager: BookRenderingManager
    @State private var configuration: Book3DConfiguration
    @State private var pageTurnNonce: Int = 0
    @State private var pageTurnDirection: Int = 1
    @State private var is2DMode: Bool = false
    @State private var showMaterialCustomizer: Bool = false
    @State private var fallbackReason: String?

    private let volume: BookVolumeRecord
    private var spreads: [BookSpreadPreview] { volume.spreads }

    public init(
        volume: BookVolumeRecord = BookVolumeRecord.libraryVolumes[0],
        initialConfiguration: Book3DConfiguration? = nil,
        renderingManager: BookRenderingManager = .shared
    ) {
        self.volume = volume
        let resolvedInitial = initialConfiguration ?? BookStatePersistenceService.shared.loadConfiguration(
            for: volume.id,
            fallback: volume.defaultConfiguration
        )
        _configuration = State(initialValue: resolvedInitial)
        self._renderingManager = ObservedObject(wrappedValue: renderingManager)
    }

    private var activeSpread: BookSpreadPreview {
        let safeIdx = max(0, min(spreads.count - 1, configuration.currentSpreadIndex))
        return spreads[safeIdx]
    }

    private var shouldShow2DFallback: Bool {
        is2DMode || renderingManager.fallbackController.isFallbackActive
    }

    private var effectiveFallbackReason: String? {
        renderingManager.fallbackController.userFacingMessage ?? fallbackReason
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                MemoriaTheme.canvas.ignoresSafeArea()

                VStack(spacing: 0) {
                    if shouldShow2DFallback {
                        Book2DSpreadFallbackView(
                            configuration: configuration,
                            spreads: spreads,
                            fallbackReason: effectiveFallbackReason,
                            onSelectSpread: { nextIndex in
                                configuration.currentSpreadIndex = nextIndex
                                persistConfiguration()
                                renderingManager.updateInteractionContext(
                                    state: .fallback,
                                    spreadIndex: nextIndex,
                                    totalSpreads: spreads.count,
                                    reduceMotion: effectiveConfiguration.reducedMotion
                                )
                            },
                            onReturnTo3D: renderingManager.fallbackController.isFallbackActive ? nil : {
                                fallbackReason = nil
                                is2DMode = false
                            }
                        )
                    } else {
                        #if canImport(RealityKit) && os(iOS)
                        ZStack(alignment: .bottom) {
                            Book3DRealityView(
                                configuration: effectiveConfiguration,
                                spreads: spreads,
                                presentationMode: .reading,
                                pageTurnNonce: pageTurnNonce,
                                pageTurnDirection: pageTurnDirection,
                                allowGestures: true,
                                isSceneActive: !showMaterialCustomizer && scenePhase == .active,
                                renderingManager: renderingManager,
                                onToggleOpen: toggleCover,
                                onTurnPage: turnPage,
                                onFallbackRequired: { _ in
                                    fallbackReason = renderingManager.fallbackController.userFacingMessage
                                        ?? BookFallbackController.calmUserMessage(for: .sceneLoadFailure)
                                    is2DMode = true
                                }
                            )
                            .frame(maxWidth: .infinity, maxHeight: .infinity)

                            floatingControlsOverlay
                                .padding()
                        }
                        #else
                        Book2DSpreadFallbackView(
                            configuration: configuration,
                            spreads: spreads,
                            fallbackReason: "Interactive 3D preview is available on supported iOS devices. Showing the accessible heirloom book reader.",
                            onSelectSpread: { nextIndex in
                                configuration.currentSpreadIndex = nextIndex
                                persistConfiguration()
                            }
                        )
                        #endif
                    }
                }
            }
            .navigationTitle(configuration.coverTitle)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        persistConfiguration()
                        dismiss()
                    }
                    .foregroundStyle(MemoriaTheme.plum)
                }

                ToolbarItemGroup(placement: .primaryAction) {
                    Button {
                        showMaterialCustomizer = true
                    } label: {
                        Label("Studio", systemImage: "swatchpalette")
                    }
                    .tint(MemoriaTheme.plum)

                    Button {
                        is2DMode.toggle()
                    } label: {
                        Label(shouldShow2DFallback ? "3D" : "2D", systemImage: shouldShow2DFallback ? "cube" : "book.pages")
                    }
                    .tint(MemoriaTheme.sageFunc)
                    .disabled(renderingManager.fallbackController.isFallbackActive)
                }
            }
            .sheet(isPresented: $showMaterialCustomizer, onDismiss: {
                configuration = BookStatePersistenceService.shared.loadConfiguration(
                    for: volume.id,
                    fallback: configuration
                )
            }) {
                BookStudioView(volume: volume, initialConfiguration: configuration)
            }
            .onChange(of: configuration) { _, _ in
                persistConfiguration()
            }
            .onChange(of: scenePhase) { _, nextPhase in
                if nextPhase == .background {
                    persistConfiguration()
                    renderingManager.handleAppBackgrounded()
                } else if nextPhase == .active {
                    renderingManager.handleAppForegrounded()
                }
            }
            .onChange(of: renderingManager.activeProfile) { _, nextProfile in
                if nextProfile != .fallback && !renderingManager.fallbackController.isFallbackActive {
                    fallbackReason = nil
                }
            }
        }
    }

    private var effectiveConfiguration: Book3DConfiguration {
        var copy = configuration
        copy.reducedMotion = configuration.reducedMotion || systemReduceMotion
        return copy
    }

    private var floatingControlsOverlay: some View {
        VStack(spacing: 12) {
            if configuration.isOpen {
                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(activeSpread.chapterTitle.uppercased())
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(MemoriaTheme.plum)
                        Text("\(activeSpread.rightHeading) • pp. \(activeSpread.leftPageNumber)–\(activeSpread.rightPageNumber)")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(MemoriaTheme.ink)
                            .lineLimit(1)
                    }
                    Spacer()
                    Text("Swipe or tap arrows")
                        .font(.caption2)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(MemoriaTheme.surfacePrimary.opacity(0.94))
                .clipShape(RoundedRectangle(cornerRadius: MemoriaTheme.radiusLg))
                .overlay(
                    RoundedRectangle(cornerRadius: MemoriaTheme.radiusLg)
                        .stroke(MemoriaTheme.borderSubtle, lineWidth: 1)
                )
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(BookCameraPreset.allCases) { preset in
                        Button(preset.label) {
                            configuration.cameraPreset = preset
                        }
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 12)
                        .frame(minHeight: 36)
                        .background(
                            configuration.cameraPreset == preset
                            ? MemoriaTheme.plum
                            : MemoriaTheme.surfacePrimary.opacity(0.92)
                        )
                        .foregroundStyle(
                            configuration.cameraPreset == preset
                            ? MemoriaTheme.textOnAction
                            : MemoriaTheme.ink
                        )
                        .clipShape(Capsule())
                        .overlay(
                            Capsule()
                                .stroke(MemoriaTheme.borderSubtle, lineWidth: 1)
                        )
                    }
                }
            }

            HStack(spacing: 10) {
                Button {
                    turnPage(-1)
                } label: {
                    Image(systemName: "chevron.left")
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.bordered)
                .tint(MemoriaTheme.ink)
                .disabled(configuration.isOpen && configuration.currentSpreadIndex == 0)
                .accessibilityLabel("Previous spread")

                Button(action: toggleCover) {
                    Label(
                        configuration.isOpen ? "Close Cover" : "Open Book",
                        systemImage: configuration.isOpen ? "book.closed" : "book.pages"
                    )
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.borderedProminent)
                .tint(MemoriaTheme.plum)

                Button {
                    turnPage(1)
                } label: {
                    Image(systemName: "chevron.right")
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.bordered)
                .tint(MemoriaTheme.ink)
                .disabled(configuration.isOpen && configuration.currentSpreadIndex >= spreads.count - 1)
                .accessibilityLabel("Next spread")
            }
            .padding(10)
            .background(MemoriaTheme.surfacePrimary.opacity(0.95))
            .clipShape(RoundedRectangle(cornerRadius: MemoriaTheme.radiusXl))
            .overlay(
                RoundedRectangle(cornerRadius: MemoriaTheme.radiusXl)
                    .stroke(MemoriaTheme.borderSubtle, lineWidth: 1)
            )
            .shadow(color: MemoriaTheme.shadowElevated, radius: 10, x: 0, y: 4)
        }
    }

    private func toggleCover() {
        configuration.isOpen.toggle()
        configuration.cameraPreset = configuration.isOpen ? .openSpread : .hero
        persistConfiguration()
    }

    private func turnPage(_ direction: Int) {
        if !configuration.isOpen {
            configuration.isOpen = true
            configuration.cameraPreset = .openSpread
        }
        let nextIndex = max(0, min(spreads.count - 1, configuration.currentSpreadIndex + direction))
        if nextIndex != configuration.currentSpreadIndex {
            pageTurnDirection = direction
            configuration.currentSpreadIndex = nextIndex
            pageTurnNonce += 1
            persistConfiguration()
        }
    }

    private func persistConfiguration() {
        try? BookStatePersistenceService.shared.saveConfiguration(configuration, for: volume.id)
    }
}
