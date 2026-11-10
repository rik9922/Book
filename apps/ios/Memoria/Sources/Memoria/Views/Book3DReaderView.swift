import SwiftUI

public struct Book3DReaderView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion

    @State private var configuration: Book3DConfiguration
    @State private var pageTurnNonce: Int = 0
    @State private var pageTurnDirection: Int = 1
    @State private var is2DMode: Bool = false
    @State private var showMaterialCustomizer: Bool = false
    @State private var fallbackReason: String?

    private let spreads = Book3DSampleData.sampleSpreads

    public init(initialConfiguration: Book3DConfiguration = Book3DConfiguration()) {
        _configuration = State(initialValue: initialConfiguration)
    }

    private var activeSpread: BookSpreadPreview {
        let safeIdx = max(0, min(spreads.count - 1, configuration.currentSpreadIndex))
        return spreads[safeIdx]
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                MemoriaTheme.canvas.ignoresSafeArea()

                VStack(spacing: 0) {
                    if is2DMode {
                        Book2DSpreadFallbackView(
                            configuration: configuration,
                            spreads: spreads,
                            fallbackReason: fallbackReason,
                            onSelectSpread: { nextIndex in
                                configuration.currentSpreadIndex = nextIndex
                            },
                            onReturnTo3D: fallbackReason == nil ? { is2DMode = false } : nil
                        )
                    } else {
                        #if canImport(RealityKit) && os(iOS)
                        ZStack(alignment: .bottom) {
                            Book3DRealityView(
                                configuration: effectiveConfiguration,
                                pageTurnNonce: pageTurnNonce,
                                pageTurnDirection: pageTurnDirection,
                                allowGestures: true,
                                onToggleOpen: toggleCover,
                                onTurnPage: turnPage,
                                onFallbackRequired: { reason in
                                    fallbackReason = reason
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
                            fallbackReason: "3D RealityKit preview is available on iOS devices; showing Accessible 2D Spread Reader.",
                            onSelectSpread: { nextIndex in
                                configuration.currentSpreadIndex = nextIndex
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
                        dismiss()
                    }
                    .foregroundStyle(MemoriaTheme.plum)
                }

                ToolbarItemGroup(placement: .primaryAction) {
                    Button {
                        showMaterialCustomizer = true
                    } label: {
                        Label("Materials", systemImage: "swatchpalette")
                    }
                    .tint(MemoriaTheme.plum)

                    Button {
                        is2DMode.toggle()
                    } label: {
                        Label(is2DMode ? "3D" : "2D", systemImage: is2DMode ? "cube" : "book.pages")
                    }
                    .tint(MemoriaTheme.sageFunc)
                    .disabled(fallbackReason != nil)
                }
            }
            .sheet(isPresented: $showMaterialCustomizer) {
                materialCustomizerSheet
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
            // Active Spread Context Pill when Book is Open
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

            // Camera Preset Selector Strip
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

            // Primary Action Bar: Previous Page, Open/Close Cover, Next Page
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

    private var materialCustomizerSheet: some View {
        NavigationStack {
            Form {
                Section("Archival Leather Binding") {
                    ForEach(BookLeatherSwatch.allCases) { swatch in
                        Button {
                            configuration.leather = swatch
                        } label: {
                            HStack(spacing: 12) {
                                Circle()
                                    .fill(swatch.swiftUIColor)
                                    .frame(width: 24, height: 24)
                                    .overlay(Circle().stroke(Color.black.opacity(0.15), lineWidth: 1))
                                Text(swatch.displayName)
                                    .foregroundStyle(MemoriaTheme.ink)
                                Spacer()
                                if configuration.leather == swatch {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(MemoriaTheme.plum)
                                }
                            }
                            .frame(minHeight: 44)
                        }
                    }
                }

                Section("Hot Foil Stamping") {
                    ForEach(BookFoilSwatch.allCases) { foil in
                        Button {
                            configuration.foil = foil
                        } label: {
                            HStack(spacing: 12) {
                                Circle()
                                    .fill(Color(hex: foil.effectiveHexUInt(for: configuration.leather)))
                                    .frame(width: 24, height: 24)
                                    .overlay(Circle().stroke(Color.black.opacity(0.15), lineWidth: 1))
                                Text(foil.displayName)
                                    .foregroundStyle(MemoriaTheme.ink)
                                Spacer()
                                if configuration.foil == foil {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(MemoriaTheme.plum)
                                }
                            }
                            .frame(minHeight: 44)
                        }
                    }
                }

                Section("Cover Typography & Motion") {
                    TextField("Cover Title", text: $configuration.coverTitle)
                    Toggle("Reduced Motion", isOn: $configuration.reducedMotion)
                }
            }
            .navigationTitle("Heirloom Material Studio")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        showMaterialCustomizer = false
                    }
                    .foregroundStyle(MemoriaTheme.plum)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func toggleCover() {
        configuration.isOpen.toggle()
        configuration.cameraPreset = configuration.isOpen ? .openSpread : .hero
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
        }
    }
}
