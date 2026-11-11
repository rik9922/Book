import SwiftUI

/// Mode A — Library and collection browsing.
/// Strictly uses lightweight cached 2D cover artwork (`BookCoverThumbnailView`)
/// for scrolling book cards and never creates multiple RealityKit scenes in lists.
public struct BookshelfView: View {
    @ObservedObject private var renderingManager = BookRenderingManager.shared
    @State private var volumes = BookVolumeRecord.libraryVolumes
    @State private var volumeConfigs: [String: Book3DConfiguration] = [:]
    @State private var activeDestination: LibraryDestination?

    private enum LibraryDestination: Identifiable {
        case preview(BookVolumeRecord)
        case studio(BookVolumeRecord)
        case reader(BookVolumeRecord)
        case fallback2D(BookVolumeRecord)

        var id: String {
            switch self {
            case .preview(let v): return "preview-\(v.id)"
            case .studio(let v): return "studio-\(v.id)"
            case .reader(let v): return "reader-\(v.id)"
            case .fallback2D(let v): return "fallback-\(v.id)"
            }
        }
    }

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                MemoriaTheme.canvas.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Heirloom Library")
                                .font(.largeTitle.bold())
                                .foregroundStyle(MemoriaTheme.ink)
                            Text("Published digital editions and family archive volumes")
                                .font(.subheadline)
                                .foregroundStyle(MemoriaTheme.textSecondary)
                        }
                        .padding(.horizontal)

                        ForEach(volumes) { volume in
                            let config = resolvedConfig(for: volume)
                            libraryVolumeCard(volume: volume, config: config)
                                .padding(.horizontal)
                        }
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle("Bookshelf")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    NavigationLink {
                        PrintOrdersView()
                    } label: {
                        Label("Print Orders", systemImage: "printer")
                            .foregroundStyle(MemoriaTheme.plum)
                    }
                }
            }
            .onAppear {
                reloadPersistedConfigurations()
            }
            #if os(iOS)
            .fullScreenCover(item: $activeDestination, onDismiss: reloadPersistedConfigurations) { dest in
                destinationView(for: dest)
            }
            #else
            .sheet(item: $activeDestination, onDismiss: reloadPersistedConfigurations) { dest in
                destinationView(for: dest)
            }
            #endif
        }
    }

    @ViewBuilder
    private func libraryVolumeCard(volume: BookVolumeRecord, config: Book3DConfiguration) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 16) {
                BookCoverThumbnailView(
                    configuration: config,
                    size: CGSize(width: 104, height: 136)
                )
                .onTapGesture {
                    activeDestination = .preview(volume)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text(volume.editionBadge)
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(volume.isFrozenForPrint ? MemoriaTheme.sageLight : MemoriaTheme.plumLight)
                        .foregroundStyle(volume.isFrozenForPrint ? MemoriaTheme.sageFunc : MemoriaTheme.plum)
                        .clipShape(Capsule())

                    Text(config.coverTitle)
                        .font(.headline)
                        .foregroundStyle(MemoriaTheme.ink)
                        .lineLimit(2)

                    Text(config.coverSubtitle)
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)

                    Text("\(config.leather.displayName) • \(config.foil.shortLabel) Foil")
                        .font(.caption2)
                        .foregroundStyle(MemoriaTheme.textTertiary)

                    Text("Spread \(config.currentSpreadIndex + 1) of \(volume.spreads.count) • \(volume.totalPageCount) pp.")
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(MemoriaTheme.sageFunc)
                }
                Spacer(minLength: 0)
            }

            HStack(spacing: 8) {
                Button {
                    var openCfg = config
                    openCfg.isOpen = true
                    openCfg.cameraPreset = .openSpread
                    saveConfig(openCfg, for: volume.id)
                    activeDestination = .reader(volume)
                } label: {
                    Label(
                        renderingManager.fallbackController.isFallbackActive ? "Read 2D" : "Read",
                        systemImage: "book.pages"
                    )
                    .font(.caption.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 40)
                }
                .buttonStyle(.borderedProminent)
                .tint(MemoriaTheme.plum)

                Button {
                    activeDestination = .preview(volume)
                } label: {
                    Label("Preview", systemImage: "cube")
                        .font(.caption.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: 40)
                }
                .buttonStyle(.bordered)
                .tint(MemoriaTheme.ink)
                .disabled(renderingManager.fallbackController.isFallbackActive)

                Button {
                    activeDestination = .studio(volume)
                } label: {
                    Label("Studio", systemImage: "swatchpalette")
                        .font(.caption.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: 40)
                }
                .buttonStyle(.bordered)
                .tint(MemoriaTheme.sageFunc)

                Button {
                    activeDestination = .fallback2D(volume)
                } label: {
                    Image(systemName: "doc.plaintext")
                        .frame(minWidth: 40, minHeight: 40)
                }
                .buttonStyle(.bordered)
                .tint(MemoriaTheme.ink)
                .accessibilityLabel("Open accessible 2D proof for \(config.coverTitle)")
            }
        }
        .padding(16)
        .memoriaCard()
    }

    @ViewBuilder
    private func destinationView(for destination: LibraryDestination) -> some View {
        switch destination {
        case .preview(let volume):
            BookPreviewView(
                volume: volume,
                initialConfiguration: resolvedConfig(for: volume)
            )
        case .studio(let volume):
            BookStudioView(
                volume: volume,
                initialConfiguration: resolvedConfig(for: volume)
            )
        case .reader(let volume):
            Book3DReaderView(
                volume: volume,
                initialConfiguration: resolvedConfig(for: volume)
            )
        case .fallback2D(let volume):
            let cfg = resolvedConfig(for: volume)
            NavigationStack {
                Book2DSpreadFallbackView(
                    configuration: cfg,
                    spreads: volume.spreads,
                    onSelectSpread: { nextIndex in
                        var updated = resolvedConfig(for: volume)
                        updated.currentSpreadIndex = nextIndex
                        saveConfig(updated, for: volume.id)
                    },
                    onReturnTo3D: renderingManager.fallbackController.isFallbackActive ? nil : {
                        activeDestination = .reader(volume)
                    }
                )
                .navigationTitle("Accessible 2D Proof")
                #if os(iOS)
                .navigationBarTitleDisplayMode(.inline)
                #endif
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close") {
                            activeDestination = nil
                        }
                        .foregroundStyle(MemoriaTheme.plum)
                    }
                }
            }
        }
    }

    private func resolvedConfig(for volume: BookVolumeRecord) -> Book3DConfiguration {
        volumeConfigs[volume.id] ?? volume.defaultConfiguration
    }

    private func saveConfig(_ config: Book3DConfiguration, for volumeId: String) {
        volumeConfigs[volumeId] = config
        try? BookStatePersistenceService.shared.saveConfiguration(config, for: volumeId)
    }

    private func reloadPersistedConfigurations() {
        var loaded: [String: Book3DConfiguration] = [:]
        for volume in volumes {
            loaded[volume.id] = BookStatePersistenceService.shared.loadConfiguration(
                for: volume.id,
                fallback: volume.defaultConfiguration
            )
        }
        volumeConfigs = loaded
    }
}
