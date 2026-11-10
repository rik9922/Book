import SwiftUI

public struct MemoryDetailView: View {
    public let memory: Memory

    public init(memory: Memory) {
        self.memory = memory
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    Text(memory.format.rawValue.uppercased())
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(MemoriaTheme.plumLight)
                        .foregroundStyle(MemoriaTheme.plum)
                        .clipShape(Capsule())

                    Spacer()

                    Text(String(memory.capturedAt.prefix(10)))
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                }

                Text(memory.title)
                    .font(.largeTitle.bold())
                    .foregroundStyle(MemoriaTheme.ink)

                if let location = memory.location, !location.isEmpty {
                    Label(location, systemImage: "mappin.and.ellipse")
                        .font(.subheadline)
                        .foregroundStyle(MemoriaTheme.sageFunc)
                }

                Divider()

                if let content = memory.content, !content.isEmpty {
                    Text(content)
                        .font(.body)
                        .lineSpacing(6)
                        .foregroundStyle(MemoriaTheme.textPrimary)
                } else {
                    Text("Visual or audio heirloom capture without written narrative.")
                        .font(.subheadline)
                        .italic()
                        .foregroundStyle(MemoriaTheme.textSecondary)
                }

                if !memory.mediaIds.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Attached Archival Assets")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(MemoriaTheme.textSecondary)
                        ForEach(memory.mediaIds, id: \.self) { mediaId in
                            HStack {
                                Image(systemName: "photo.on.rectangle.angled")
                                    .foregroundStyle(MemoriaTheme.plum)
                                Text(mediaId)
                                    .font(.caption.monospaced())
                                    .foregroundStyle(MemoriaTheme.ink)
                                    .lineLimit(1)
                            }
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(MemoriaTheme.surfacePrimary)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }

                if !memory.tags.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(memory.tags, id: \.self) { tag in
                                Text("#\(tag)")
                                    .font(.caption.weight(.medium))
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(MemoriaTheme.sageLight)
                                    .foregroundStyle(MemoriaTheme.sageFunc)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }
            }
            .padding()
        }
        .background(MemoriaTheme.canvas.ignoresSafeArea())
        .navigationTitle("Heirloom Story")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}
