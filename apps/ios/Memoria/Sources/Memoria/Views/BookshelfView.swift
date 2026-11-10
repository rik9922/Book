import SwiftUI

public struct BookshelfView: View {
    @Environment(\.scenePhase) private var scenePhase
    @ObservedObject private var renderingManager = BookRenderingManager.shared
    @State private var selectedConfig = Book3DConfiguration()
    @State private var isPresentingReader = false
    @State private var isPresenting2DFallback = false

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                MemoriaTheme.canvas.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Heirloom Library")
                                .font(.largeTitle.bold())
                                .foregroundStyle(MemoriaTheme.ink)
                            Text("Published digital editions and interactive 3D RealityKit books")
                                .font(.subheadline)
                                .foregroundStyle(MemoriaTheme.textSecondary)
                        }
                        .padding(.horizontal)

                        // Featured Volume Card with Live 3D RealityKit Preview (or calm accessible preview when constrained)
                        VStack(spacing: 18) {
                            ZStack(alignment: .topTrailing) {
                                #if canImport(RealityKit) && os(iOS)
                                if renderingManager.fallbackController.isFallbackActive {
                                    accessibleBookCoverCard
                                } else {
                                    Book3DRealityView(
                                        configuration: selectedConfig,
                                        allowGestures: false,
                                        isSceneActive: !isPresentingReader && !isPresenting2DFallback && scenePhase == .active,
                                        renderingManager: renderingManager,
                                        onToggleOpen: {
                                            isPresentingReader = true
                                        }
                                    )
                                    .frame(height: 240)
                                    .clipShape(RoundedRectangle(cornerRadius: MemoriaTheme.radiusLg))
                                    .onTapGesture {
                                        isPresentingReader = true
                                    }
                                }
                                #else
                                accessibleBookCoverCard
                                #endif

                                Text(renderingManager.fallbackController.isFallbackActive ? "Accessible Edition" : "Heirloom 3D")
                                    .font(.caption2.weight(.semibold))
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(MemoriaTheme.surfacePrimary.opacity(0.92))
                                    .foregroundStyle(MemoriaTheme.sageFunc)
                                    .clipShape(Capsule())
                                    .overlay(
                                        Capsule()
                                            .stroke(MemoriaTheme.borderSubtle, lineWidth: 1)
                                    )
                                    .padding(10)
                            }

                            VStack(spacing: 4) {
                                Text(selectedConfig.coverTitle.uppercased())
                                    .font(.headline)
                                    .tracking(2)
                                    .foregroundStyle(MemoriaTheme.ink)
                                Text("\(selectedConfig.coverSubtitle) • \(selectedConfig.leather.displayName)")
                                    .font(.caption)
                                    .foregroundStyle(MemoriaTheme.sageFunc)
                            }

                            // Quick Binding Swatch Selector on Shelf
                            HStack(spacing: 12) {
                                ForEach(BookLeatherSwatch.allCases) { swatch in
                                    Button {
                                        selectedConfig.leather = swatch
                                    } label: {
                                        Circle()
                                            .fill(swatch.swiftUIColor)
                                            .frame(width: 28, height: 28)
                                            .overlay(
                                                Circle()
                                                    .stroke(
                                                        selectedConfig.leather == swatch
                                                        ? MemoriaTheme.plum
                                                        : Color.black.opacity(0.15),
                                                        lineWidth: selectedConfig.leather == swatch ? 3 : 1
                                                    )
                                            )
                                    }
                                    .frame(minWidth: 44, minHeight: 44)
                                    .accessibilityLabel("Select \(swatch.displayName) binding")
                                }
                            }

                            Text("4 Interactive Spreads • 240 Archival Pages • Edition Frozen")
                                .font(.caption2)
                                .foregroundStyle(MemoriaTheme.textSecondary)

                            HStack(spacing: 12) {
                                Button {
                                    isPresentingReader = true
                                } label: {
                                    Label("Open 3D Reader", systemImage: "book.pages")
                                        .frame(minHeight: 44)
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(MemoriaTheme.plum)

                                Button {
                                    isPresenting2DFallback = true
                                } label: {
                                    Label("2D Proof", systemImage: "doc.plaintext")
                                        .frame(minHeight: 44)
                                }
                                .buttonStyle(.bordered)
                                .tint(MemoriaTheme.ink)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(20)
                        .memoriaCard()
                        .padding(.horizontal)
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle("Bookshelf")
            #if os(iOS)
            .fullScreenCover(isPresented: $isPresentingReader) {
                Book3DReaderView(initialConfiguration: selectedConfig)
            }
            #else
            .sheet(isPresented: $isPresentingReader) {
                Book3DReaderView(initialConfiguration: selectedConfig)
            }
            #endif
            .sheet(isPresented: $isPresenting2DFallback) {
                NavigationStack {
                    Book2DSpreadFallbackView(
                        configuration: selectedConfig,
                        onSelectSpread: { nextIndex in
                            selectedConfig.currentSpreadIndex = nextIndex
                        },
                        onReturnTo3D: {
                            isPresenting2DFallback = false
                            isPresentingReader = true
                        }
                    )
                    .navigationTitle("Accessible 2D Proof")
                    #if os(iOS)
                    .navigationBarTitleDisplayMode(.inline)
                    #endif
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Close") {
                                isPresenting2DFallback = false
                            }
                            .foregroundStyle(MemoriaTheme.plum)
                        }
                    }
                }
            }
        }
    }

    private var accessibleBookCoverCard: some View {
        RoundedRectangle(cornerRadius: MemoriaTheme.radiusLg)
            .fill(selectedConfig.leather.swiftUIColor.opacity(0.14))
            .frame(height: 220)
            .overlay(
                VStack(spacing: 10) {
                    Image(systemName: "book.closed.fill")
                        .font(.system(size: 52))
                        .foregroundStyle(selectedConfig.leather.swiftUIColor)
                    Text(selectedConfig.coverTitle)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(MemoriaTheme.ink)
                }
            )
            .overlay(
                RoundedRectangle(cornerRadius: MemoriaTheme.radiusLg)
                    .stroke(MemoriaTheme.borderSubtle, lineWidth: 1)
            )
            .onTapGesture {
                isPresentingReader = true
            }
    }
}
