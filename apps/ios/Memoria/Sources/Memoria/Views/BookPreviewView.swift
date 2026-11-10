import SwiftUI

/// Mode B — Lightweight interactive 3D Book Preview.
/// Loads a single controlled 3D model for inspection and rotation without
/// preloading spread page content while closed, offering direct transitions
/// into Book Studio (Mode C) or Reading (Mode D).
public struct BookPreviewView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    @Environment(\.scenePhase) private var scenePhase

    @ObservedObject private var renderingManager: BookRenderingManager
    @State private var configuration: Book3DConfiguration
    @State private var isOpeningStudio = false
    @State private var isOpeningReader = false
    @State private var fallbackMessage: String?

    private let volume: BookVolumeRecord

    public init(
        volume: BookVolumeRecord,
        initialConfiguration: Book3DConfiguration,
        renderingManager: BookRenderingManager = .shared
    ) {
        self.volume = volume
        _configuration = State(initialValue: initialConfiguration)
        self._renderingManager = ObservedObject(wrappedValue: renderingManager)
    }

    private var effectiveConfig: Book3DConfiguration {
        var copy = configuration
        copy.reducedMotion = configuration.reducedMotion || systemReduceMotion
        return copy
    }

    private var show2DFallback: Bool {
        fallbackMessage != nil || renderingManager.fallbackController.isFallbackActive
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                if show2DFallback {
                    VStack(spacing: 16) {
                        BookCoverThumbnailView(
                            configuration: configuration,
                            size: CGSize(width: 210, height: 273)
                        )
                        if let msg = renderingManager.fallbackController.userFacingMessage ?? fallbackMessage {
                            Text(msg)
                                .font(.caption)
                                .foregroundStyle(MemoriaTheme.textSecondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    #if canImport(RealityKit) && os(iOS)
                    Book3DRealityView(
                        configuration: effectiveConfig,
                        spreads: volume.spreads,
                        presentationMode: .preview,
                        allowGestures: true,
                        isSceneActive: !isOpeningStudio && !isOpeningReader && scenePhase == .active,
                        renderingManager: renderingManager,
                        onToggleOpen: {
                            configuration.isOpen.toggle()
                            configuration.cameraPreset = configuration.isOpen ? .openSpread : .hero
                            persistState()
                        },
                        onFallbackRequired: { msg in
                            fallbackMessage = msg
                        }
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: MemoriaTheme.radiusLg))
                    .padding(.horizontal)
                    #else
                    BookCoverThumbnailView(
                        configuration: configuration,
                        size: CGSize(width: 210, height: 273)
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    #endif
                }

                VStack(spacing: 12) {
                    Text(configuration.coverTitle)
                        .font(.title3.bold())
                        .foregroundStyle(MemoriaTheme.ink)
                    Text("\(configuration.leather.displayName) • \(configuration.foil.displayName)")
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)

                    HStack(spacing: 12) {
                        Button {
                            isOpeningStudio = true
                        } label: {
                            Label("Book Studio", systemImage: "swatchpalette")
                                .frame(maxWidth: .infinity, minHeight: 44)
                        }
                        .buttonStyle(.bordered)
                        .tint(MemoriaTheme.ink)

                        Button {
                            configuration.isOpen = true
                            configuration.cameraPreset = .openSpread
                            persistState()
                            isOpeningReader = true
                        } label: {
                            Label("Read Book", systemImage: "book.pages")
                                .frame(maxWidth: .infinity, minHeight: 44)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(MemoriaTheme.plum)
                    }
                }
                .padding()
                .memoriaCard()
                .padding(.horizontal)
                .padding(.bottom)
            }
            .background(MemoriaTheme.canvas.ignoresSafeArea())
            .navigationTitle("Book Preview")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundStyle(MemoriaTheme.plum)
                }
            }
            #if os(iOS)
            .fullScreenCover(isPresented: $isOpeningStudio, onDismiss: reloadPersistedState) {
                BookStudioView(volume: volume, initialConfiguration: configuration)
            }
            .fullScreenCover(isPresented: $isOpeningReader, onDismiss: reloadPersistedState) {
                Book3DReaderView(volume: volume, initialConfiguration: configuration)
            }
            #else
            .sheet(isPresented: $isOpeningStudio, onDismiss: reloadPersistedState) {
                BookStudioView(volume: volume, initialConfiguration: configuration)
            }
            .sheet(isPresented: $isOpeningReader, onDismiss: reloadPersistedState) {
                Book3DReaderView(volume: volume, initialConfiguration: configuration)
            }
            #endif
        }
    }

    private func persistState() {
        try? BookStatePersistenceService.shared.saveConfiguration(configuration, for: volume.id)
    }

    private func reloadPersistedState() {
        configuration = BookStatePersistenceService.shared.loadConfiguration(
            for: volume.id,
            fallback: configuration
        )
    }
}
