import SwiftUI

public struct MemoryDetailView: View {
    @State private var memory: Memory
    @State private var comments: [MemoryCommentDTO] = []
    @State private var newComment = ""
    @State private var isEditing = false
    @State private var editingMediaId: String?
    @State private var isShowingPlayer = false

    public init(memory: Memory) {
        self._memory = State(initialValue: memory)
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
                                Spacer()
                                Button("Edit") {
                                    editingMediaId = mediaId
                                }
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(MemoriaTheme.plum)
                            }
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(MemoriaTheme.surfacePrimary)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }

                HStack(spacing: 12) {
                    Button {
                        isShowingPlayer = true
                    } label: {
                        Label("Inspect / Play Media", systemImage: "play.rectangle")
                    }
                    .buttonStyle(.bordered)
                    .tint(MemoriaTheme.sageFunc)

                    Button {
                        isEditing = true
                    } label: {
                        Label("Edit Story", systemImage: "pencil")
                    }
                    .buttonStyle(.bordered)
                    .tint(MemoriaTheme.plum)
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

                Divider()

                VStack(alignment: .leading, spacing: 10) {
                    Text("Family Reflections (\(comments.count))")
                        .font(.headline)
                        .foregroundStyle(MemoriaTheme.ink)

                    ForEach(comments) { comment in
                        VStack(alignment: .leading, spacing: 3) {
                            Text(comment.authorName)
                                .font(.caption.bold())
                                .foregroundStyle(MemoriaTheme.plum)
                            Text(comment.body)
                                .font(.subheadline)
                                .foregroundStyle(MemoriaTheme.textPrimary)
                        }
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(MemoriaTheme.surfacePrimary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    HStack {
                        TextField("Add a reflection...", text: $newComment)
                            .textFieldStyle(.roundedBorder)
                        Button("Post") {
                            Task { await postComment() }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(MemoriaTheme.plum)
                        .disabled(newComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
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
        .task {
            if let fetched = try? await MemoriaAPIClient.shared.fetchComments(memoryId: memory.id) {
                comments = fetched
            }
        }
        .sheet(isPresented: $isEditing) {
            EditMemorySheet(memory: memory) { updated in
                memory = updated
            }
        }
        .sheet(isPresented: $isShowingPlayer) {
            MediaPlaybackView(memory: memory)
        }
        .sheet(isPresented: Binding(
            get: { editingMediaId != nil },
            set: { if !$0 { editingMediaId = nil } }
        )) {
            if let mediaId = editingMediaId {
                CoreImageEditorView(mediaId: mediaId)
            }
        }
    }

    private func postComment() async {
        let trimmed = newComment.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        if let created = try? await MemoriaAPIClient.shared.addComment(memoryId: memory.id, body: trimmed) {
            comments.append(created)
            newComment = ""
        }
    }
}
