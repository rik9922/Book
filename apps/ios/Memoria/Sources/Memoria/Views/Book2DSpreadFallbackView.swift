import SwiftUI

public struct Book2DSpreadFallbackView: View {
    public let configuration: Book3DConfiguration
    public let spreads: [BookSpreadPreview]
    public let fallbackReason: String?
    public let onSelectSpread: (Int) -> Void
    public let onReturnTo3D: (() -> Void)?

    public init(
        configuration: Book3DConfiguration,
        spreads: [BookSpreadPreview] = Book3DSampleData.sampleSpreads,
        fallbackReason: String? = nil,
        onSelectSpread: @escaping (Int) -> Void,
        onReturnTo3D: (() -> Void)? = nil
    ) {
        self.configuration = configuration
        self.spreads = spreads
        self.fallbackReason = fallbackReason
        self.onSelectSpread = onSelectSpread
        self.onReturnTo3D = onReturnTo3D
    }

    private var safeIndex: Int {
        guard !spreads.isEmpty else { return 0 }
        return max(0, min(spreads.count - 1, configuration.currentSpreadIndex))
    }

    private var activeSpread: BookSpreadPreview {
        spreads[safeIndex]
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .center, spacing: 12) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(configuration.leather.swiftUIColor)
                        .frame(width: 14, height: 38)
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(Color(hex: configuration.foil.effectiveHexUInt(for: configuration.leather)), lineWidth: 1.5)
                        )
                        .accessibilityHidden(true)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(activeSpread.chapterTitle.uppercased())
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(MemoriaTheme.plum)
                        Text(configuration.coverTitle)
                            .font(.headline)
                            .foregroundStyle(MemoriaTheme.ink)
                        Text("Pages \(activeSpread.leftPageNumber)–\(activeSpread.rightPageNumber) of \(spreads.count * 2)")
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                    }

                    Spacer()

                    if let onReturnTo3D {
                        Button(action: onReturnTo3D) {
                            Label("3D View", systemImage: "cube")
                                .font(.caption.weight(.semibold))
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(MemoriaTheme.plum)
                        .frame(minHeight: 44)
                    }
                }

                if let fallbackReason {
                    HStack(spacing: 8) {
                        Image(systemName: "info.circle.fill")
                            .foregroundStyle(MemoriaTheme.warning)
                        Text(fallbackReason)
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.warning)
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(MemoriaTheme.warningBg)
                    .clipShape(RoundedRectangle(cornerRadius: MemoriaTheme.radiusMd))
                    .overlay(
                        RoundedRectangle(cornerRadius: MemoriaTheme.radiusMd)
                            .stroke(MemoriaTheme.warningBorder, lineWidth: 1)
                    )
                }

                // Left Page Card
                pageCard(
                    heading: activeSpread.leftHeading,
                    date: activeSpread.leftDate,
                    location: activeSpread.leftLocation,
                    bodyText: activeSpread.leftBody,
                    pageNumber: activeSpread.leftPageNumber,
                    inscription: nil
                )

                // Right Page Card
                pageCard(
                    heading: activeSpread.rightHeading,
                    date: activeSpread.rightDate,
                    location: activeSpread.rightLocation,
                    bodyText: activeSpread.rightBody,
                    pageNumber: activeSpread.rightPageNumber,
                    inscription: activeSpread.ocrInscription
                )

                // Spread Navigation Controls
                HStack {
                    Button {
                        onSelectSpread(max(0, safeIndex - 1))
                    } label: {
                        Label("Previous", systemImage: "chevron.left")
                            .frame(minHeight: 44)
                    }
                    .buttonStyle(.bordered)
                    .tint(MemoriaTheme.ink)
                    .disabled(safeIndex == 0)

                    Spacer()

                    HStack(spacing: 6) {
                        ForEach(spreads) { spread in
                            Button("\(spread.spreadIndex + 1)") {
                                onSelectSpread(spread.spreadIndex)
                            }
                            .frame(minWidth: 36, minHeight: 44)
                            .background(spread.spreadIndex == safeIndex ? MemoriaTheme.plum : MemoriaTheme.surfacePrimary)
                            .foregroundStyle(spread.spreadIndex == safeIndex ? MemoriaTheme.textOnAction : MemoriaTheme.ink)
                            .clipShape(RoundedRectangle(cornerRadius: MemoriaTheme.radiusMd))
                            .overlay(
                                RoundedRectangle(cornerRadius: MemoriaTheme.radiusMd)
                                    .stroke(MemoriaTheme.borderSubtle, lineWidth: 1)
                            )
                        }
                    }

                    Spacer()

                    Button {
                        onSelectSpread(min(spreads.count - 1, safeIndex + 1))
                    } label: {
                        Label("Next", systemImage: "chevron.right")
                            .frame(minHeight: 44)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(MemoriaTheme.plum)
                    .disabled(safeIndex >= spreads.count - 1)
                }
            }
            .padding()
        }
        .background(MemoriaTheme.canvas)
    }

    @ViewBuilder
    private func pageCard(
        heading: String,
        date: String,
        location: String,
        bodyText: String,
        pageNumber: Int,
        inscription: String?
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Label(date, systemImage: "calendar")
                    .font(.caption2)
                    .foregroundStyle(MemoriaTheme.plum)
                Label(location, systemImage: "mappin.and.ellipse")
                    .font(.caption2)
                    .foregroundStyle(MemoriaTheme.sageFunc)
            }

            Text(heading)
                .font(.title3.bold())
                .foregroundStyle(MemoriaTheme.ink)

            Text(bodyText)
                .font(.body)
                .foregroundStyle(MemoriaTheme.textPrimary)

            if let inscription {
                VStack(alignment: .leading, spacing: 4) {
                    Text("ARCHIVAL INSCRIPTION (OCR)")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(MemoriaTheme.plum)
                    Text("\"\(inscription)\"")
                        .font(.subheadline.italic())
                        .foregroundStyle(MemoriaTheme.textPrimary)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(MemoriaTheme.surfaceSecondary)
                .clipShape(RoundedRectangle(cornerRadius: MemoriaTheme.radiusMd))
            }

            HStack {
                Spacer()
                Text("p. \(pageNumber)")
                    .font(.caption2.monospaced())
                    .foregroundStyle(MemoriaTheme.textTertiary)
            }
        }
        .padding(16)
        .memoriaCard()
    }
}
