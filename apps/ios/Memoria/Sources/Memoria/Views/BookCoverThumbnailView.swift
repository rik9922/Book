import SwiftUI

/// Lightweight 2D cover artwork view for Mode A (Library & collection browsing).
/// Uses cached CoreGraphics cover rendering on iOS (with SwiftUI placeholder/fallback)
/// and never instantiates a RealityKit scene inside scrolling library lists.
public struct BookCoverThumbnailView: View {
    public let configuration: Book3DConfiguration
    public let size: CGSize

    #if canImport(UIKit) && os(iOS)
    @State private var renderedImage: UIImage?
    @State private var isRendering = false
    @State private var didFail = false
    #endif

    public init(
        configuration: Book3DConfiguration,
        size: CGSize = CGSize(width: 140, height: 182)
    ) {
        self.configuration = configuration
        self.size = size
    }

    public var body: some View {
        ZStack {
            #if canImport(UIKit) && os(iOS)
            if let renderedImage {
                Image(uiImage: renderedImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: size.width, height: size.height)
                    .clipShape(RoundedRectangle(cornerRadius: MemoriaTheme.radiusMd))
                    .shadow(color: MemoriaTheme.shadowElevated, radius: 6, x: 2, y: 4)
            } else if didFail {
                fallbackVectorCover
            } else {
                fallbackVectorCover
                    .overlay(alignment: .bottomTrailing) {
                        if isRendering {
                            ProgressView()
                                .scaleEffect(0.7)
                                .padding(6)
                        }
                    }
            }
            #else
            fallbackVectorCover
            #endif
        }
        .frame(width: size.width, height: size.height)
        .accessibilityHidden(true)
        #if canImport(UIKit) && os(iOS)
        .task(id: renderTaskKey) {
            await loadThumbnail()
        }
        #endif
    }

    private var renderTaskKey: String {
        "\(configuration.bookId)|\(configuration.leather.rawValue)|\(configuration.foil.rawValue)|\(configuration.coverTitle)|\(configuration.coverSubtitle)"
    }

    private var fallbackVectorCover: some View {
        RoundedRectangle(cornerRadius: MemoriaTheme.radiusMd)
            .fill(configuration.leather.swiftUIColor)
            .overlay(
                RoundedRectangle(cornerRadius: MemoriaTheme.radiusMd)
                    .inset(by: 8)
                    .stroke(Color(hex: configuration.foil.effectiveHexUInt(for: configuration.leather)).opacity(0.85), lineWidth: 1.2)
            )
            .overlay(
                VStack(spacing: 6) {
                    Text(configuration.coverTitle.uppercased())
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(Color(hex: configuration.foil.effectiveHexUInt(for: configuration.leather)))
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .padding(.horizontal, 12)
                    Circle()
                        .stroke(Color(hex: configuration.foil.effectiveHexUInt(for: configuration.leather)), lineWidth: 1.5)
                        .frame(width: 30, height: 30)
                }
            )
            .shadow(color: MemoriaTheme.shadowSubtle, radius: 4, x: 1, y: 2)
    }

    #if canImport(UIKit) && os(iOS)
    @MainActor
    private func loadThumbnail() async {
        isRendering = true
        didFail = false
        let image = TextureResourceManager.shared.coverThumbnailImage(
            for: configuration,
            size: CGSize(width: max(180, size.width * 1.5), height: max(234, size.height * 1.5))
        )
        if !Task.isCancelled {
            if let image {
                renderedImage = image
            } else {
                didFail = true
            }
            isRendering = false
        }
    }
    #endif
}
