import SwiftUI

/// Mode C — Book Studio for physical heirloom customization.
/// Updates leather, foil, paper stock, ribbon, and cover typography in real time
/// without rebuilding the RealityKit scene, and persists selections durably.
public struct BookStudioView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    @Environment(\.scenePhase) private var scenePhase

    @ObservedObject private var renderingManager: BookRenderingManager
    @State private var configuration: Book3DConfiguration
    @State private var fallbackMessage: String?
    @State private var saveConfirmation: String?
    @State private var saveError: String?

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
            VStack(spacing: 0) {
                // Live 3D Studio Viewport (top half)
                ZStack(alignment: .bottomLeading) {
                    if show2DFallback {
                        VStack(spacing: 12) {
                            BookCoverThumbnailView(
                                configuration: configuration,
                                size: CGSize(width: 150, height: 195)
                            )
                            Text(renderingManager.fallbackController.userFacingMessage ?? fallbackMessage ?? "Accessible studio preview active.")
                                .font(.caption)
                                .foregroundStyle(MemoriaTheme.textSecondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(MemoriaTheme.canvas)
                    } else {
                        #if canImport(RealityKit) && os(iOS)
                        Book3DRealityView(
                            configuration: effectiveConfig,
                            spreads: volume.spreads,
                            presentationMode: .studio,
                            allowGestures: true,
                            isSceneActive: scenePhase == .active,
                            renderingManager: renderingManager,
                            onToggleOpen: {
                                configuration.isOpen.toggle()
                                configuration.cameraPreset = configuration.isOpen ? .openSpread : .hero
                            },
                            onFallbackRequired: { msg in
                                fallbackMessage = msg
                            }
                        )
                        #else
                        BookCoverThumbnailView(
                            configuration: configuration,
                            size: CGSize(width: 150, height: 195)
                        )
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(MemoriaTheme.canvas)
                        #endif
                    }

                    HStack(spacing: 8) {
                        Button(configuration.isOpen ? "Inspect Cover" : "Inspect Interior") {
                            configuration.isOpen.toggle()
                            configuration.cameraPreset = configuration.isOpen ? .openSpread : .hero
                        }
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 12)
                        .frame(minHeight: 36)
                        .background(MemoriaTheme.surfacePrimary.opacity(0.92))
                        .foregroundStyle(MemoriaTheme.plum)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(MemoriaTheme.borderSubtle, lineWidth: 1))

                        if let saveConfirmation {
                            Text(saveConfirmation)
                                .font(.caption2.weight(.medium))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(MemoriaTheme.successBg)
                                .foregroundStyle(MemoriaTheme.success)
                                .clipShape(Capsule())
                        }
                        if let saveError {
                            Text(saveError)
                                .font(.caption2.weight(.medium))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(MemoriaTheme.error.opacity(0.15))
                                .foregroundStyle(MemoriaTheme.error)
                                .clipShape(Capsule())
                        }
                    }
                    .padding(12)
                }
                .frame(height: 290)

                // Real-time Physical Customization Controls
                Form {
                    Section("Leather Binding") {
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

                    Section("Paper Stock & Silk Ribbon") {
                        Picker("Paper Stock", selection: $configuration.paperStock) {
                            ForEach(BookPaperStock.allCases) { stock in
                                Text(stock.displayName).tag(stock)
                            }
                        }
                        Picker("Bookmark Ribbon", selection: $configuration.ribbonColor) {
                            ForEach(BookRibbonColor.allCases) { ribbon in
                                Text(ribbon.displayName).tag(ribbon)
                            }
                        }
                    }

                    Section("Cover & Spine Typography") {
                        TextField("Cover Title", text: $configuration.coverTitle)
                        TextField("Subtitle", text: $configuration.coverSubtitle)
                        TextField("Spine Label", text: $configuration.spineText)
                    }
                }
            }
            .navigationTitle("Book Studio")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        persistSelection()
                        dismiss()
                    }
                    .foregroundStyle(MemoriaTheme.plum)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        persistSelection()
                        saveConfirmation = "Saved"
                    }
                    .foregroundStyle(MemoriaTheme.plum)
                }
            }
            .onChange(of: configuration) { _, nextConfig in
                try? BookStatePersistenceService.shared.saveConfiguration(nextConfig, for: volume.id)
            }
        }
    }

    private func persistSelection() {
        try? BookStatePersistenceService.shared.saveConfiguration(configuration, for: volume.id)
        if UUID(uuidString: volume.id) != nil {
            let configCopy = configuration
            Task {
                do {
                    _ = try await MemoriaAPIClient.shared.updateBook(
                        bookId: volume.id,
                        coverTitle: configCopy.coverTitle,
                        coverColor: configCopy.leather.hexString,
                        foilStamping: configCopy.foil.rawValue
                    )
                    saveError = nil
                } catch {
                    saveError = error.localizedDescription
                    saveConfirmation = nil
                }
            }
        }
    }
}
