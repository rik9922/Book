import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

public struct MemoryDetailView: View {
    @State private var memory: Memory
    public var onUpdated: ((Memory) -> Void)?

    @State private var comments: [MemoryCommentDTO] = []
    @State private var reactionState = MemoryReactionState()
    @State private var newComment = ""
    @State private var isEditing = false
    @State private var editingMediaId: String?
    @State private var isShowingPlayer = false
    @State private var isShowingReflectionsSheet = false
    @State private var isAuthenticated = false
    @State private var commentError: String?

    public init(memory: Memory, onUpdated: ((Memory) -> Void)? = nil) {
        self._memory = State(initialValue: memory)
        self.onUpdated = onUpdated
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
                                Button("Edit Photo") {
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
                } else if !isAuthenticated {
                    Button {
                        attachLocalSpecimenAsset()
                    } label: {
                        Label("Attach Local Media Specimen", systemImage: "photo.badge.plus")
                            .font(.caption.weight(.semibold))
                    }
                    .buttonStyle(.bordered)
                    .tint(MemoriaTheme.plum)
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

                // IOS-42: Emotional Reaction Bar & Reflections Sheet Launcher
                VStack(alignment: .leading, spacing: 12) {
                    Text("Emotional Reactions")
                        .font(.headline)
                        .foregroundStyle(MemoriaTheme.ink)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(MemoryReactionKind.allCases) { kind in
                                let selected = reactionState.isSelected(kind)
                                let count = reactionState.count(for: kind)
                                Button {
                                    toggleReaction(kind)
                                } label: {
                                    HStack(spacing: 5) {
                                        Image(systemName: kind.symbolName)
                                            .font(.caption)
                                        Text(kind.label)
                                            .font(.caption.weight(.semibold))
                                        if count > 0 {
                                            Text("\(count)")
                                                .font(.caption2.monospacedDigit().bold())
                                        }
                                    }
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 7)
                                    .background(selected ? MemoriaTheme.plum : MemoriaTheme.surfacePrimary)
                                    .foregroundStyle(selected ? Color.white : MemoriaTheme.plum)
                                    .clipShape(Capsule())
                                    .overlay(Capsule().stroke(MemoriaTheme.borderSubtle, lineWidth: 1))
                                }
                                .accessibilityLabel("\(kind.label) reaction")
                            }
                        }
                    }

                    Button {
                        isShowingReflectionsSheet = true
                    } label: {
                        HStack {
                            Label("Reactions & Family Reflections (\(comments.count))", systemImage: "bubble.left.and.heart.fill")
                                .font(.subheadline.weight(.semibold))
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity)
                        .background(MemoriaTheme.surfacePrimary)
                        .foregroundStyle(MemoriaTheme.plum)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(MemoriaTheme.borderSubtle, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text("Family Reflections (\(comments.count))")
                        .font(.headline)
                        .foregroundStyle(MemoriaTheme.ink)

                    if let commentError {
                        Text(commentError)
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.error)
                    }

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
            await loadCommentsAndReactions()
        }
        .sheet(isPresented: $isEditing) {
            EditMemorySheet(memory: memory) { updated in
                memory = updated
                onUpdated?(updated)
            }
        }
        .sheet(isPresented: $isShowingPlayer) {
            MediaPlaybackView(memory: memory)
        }
        .sheet(isPresented: $isShowingReflectionsSheet) {
            MemoryCommentsSheetView(
                memory: memory,
                comments: $comments,
                reactionState: $reactionState,
                onToggleReaction: toggleReaction
            )
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

    private func loadCommentsAndReactions() async {
        reactionState = LocalStorageService.shared.loadLocalReactions(forMemoryId: memory.id)
        let hasAuth = await MemoriaAPIClient.shared.getAuthToken() != nil
        isAuthenticated = hasAuth
        guard hasAuth else {
            comments = LocalStorageService.shared.loadLocalComments(forMemoryId: memory.id)
            commentError = nil
            return
        }
        do {
            comments = try await MemoriaAPIClient.shared.fetchComments(memoryId: memory.id)
            commentError = nil
        } catch {
            commentError = error.localizedDescription
        }
    }

    private func toggleReaction(_ kind: MemoryReactionKind) {
        #if os(iOS)
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        #endif
        reactionState.toggle(kind)
        try? LocalStorageService.shared.saveReactionsLocally(reactionState, forMemoryId: memory.id)
    }

    private func attachLocalSpecimenAsset() {
        let specimenId = "local-specimen-\(memory.id.prefix(8))"
        guard !memory.mediaIds.contains(specimenId) else { return }
        let updated = Memory(
            id: memory.id,
            spaceId: memory.spaceId,
            authorId: memory.authorId,
            title: memory.title,
            content: memory.content,
            format: memory.format,
            capturedAt: memory.capturedAt,
            location: memory.location,
            latitude: memory.latitude,
            longitude: memory.longitude,
            isFavorite: memory.isFavorite,
            associatedProfileIds: memory.associatedProfileIds,
            mediaIds: memory.mediaIds + [specimenId],
            tags: memory.tags,
            createdAt: memory.createdAt,
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )
        memory = updated
        try? LocalStorageService.shared.upsertLocalMemory(updated)
        onUpdated?(updated)
    }

    private func postComment() async {
        let trimmed = newComment.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let hasAuth = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuth else {
            let localComment = MemoryCommentDTO(
                memoryId: memory.id,
                spaceId: memory.spaceId,
                authorId: "local-author",
                authorName: "Family Archivist",
                body: trimmed
            )
            comments.append(localComment)
            try? LocalStorageService.shared.saveCommentsLocally(comments, forMemoryId: memory.id)
            newComment = ""
            commentError = nil
            return
        }
        do {
            let created = try await MemoriaAPIClient.shared.addComment(memoryId: memory.id, body: trimmed)
            comments.append(created)
            newComment = ""
            commentError = nil
        } catch {
            commentError = error.localizedDescription
        }
    }
}

// MARK: - IOS-42: Memory Comments & Emotional Reaction Sheet

public struct MemoryCommentsSheetView: View {
    @Environment(\.dismiss) private var dismiss

    public let memory: Memory
    @Binding public var comments: [MemoryCommentDTO]
    @Binding public var reactionState: MemoryReactionState
    public var onToggleReaction: (MemoryReactionKind) -> Void

    @State private var draftComment = ""
    @State private var isPosting = false
    @State private var errorMessage: String?

    public init(
        memory: Memory,
        comments: Binding<[MemoryCommentDTO]>,
        reactionState: Binding<MemoryReactionState>,
        onToggleReaction: @escaping (MemoryReactionKind) -> Void
    ) {
        self.memory = memory
        self._comments = comments
        self._reactionState = reactionState
        self.onToggleReaction = onToggleReaction
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                List {
                    Section("Emotional Reactions") {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(MemoryReactionKind.allCases) { kind in
                                    let selected = reactionState.isSelected(kind)
                                    let count = reactionState.count(for: kind)
                                    Button {
                                        onToggleReaction(kind)
                                    } label: {
                                        HStack(spacing: 5) {
                                            Image(systemName: kind.symbolName)
                                                .font(.caption)
                                            Text(kind.label)
                                                .font(.caption.weight(.semibold))
                                            if count > 0 {
                                                Text("\(count)")
                                                    .font(.caption2.monospacedDigit().bold())
                                            }
                                        }
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 7)
                                        .background(selected ? MemoriaTheme.plum : MemoriaTheme.canvas)
                                        .foregroundStyle(selected ? Color.white : MemoriaTheme.plum)
                                        .clipShape(Capsule())
                                        .overlay(Capsule().stroke(MemoriaTheme.borderSubtle, lineWidth: 1))
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel("Sheet \(kind.label) reaction")
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }

                    if let errorMessage {
                        Section {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundStyle(MemoriaTheme.error)
                        }
                    }

                    Section("Family Reflections (\(comments.count))") {
                        if comments.isEmpty {
                            Text("Be the first to leave a reflection on this treasured moment.")
                                .font(.caption)
                                .foregroundStyle(MemoriaTheme.textSecondary)
                        } else {
                            ForEach(comments) { comment in
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(comment.authorName)
                                            .font(.caption.bold())
                                            .foregroundStyle(MemoriaTheme.plum)
                                        Spacer()
                                        Text(String(comment.createdAt.prefix(10)))
                                            .font(.caption2)
                                            .foregroundStyle(MemoriaTheme.textTertiary)
                                    }
                                    Text(comment.body)
                                        .font(.subheadline)
                                        .foregroundStyle(MemoriaTheme.ink)
                                }
                                .padding(.vertical, 3)
                            }
                        }
                    }
                }
                .scrollContentBackground(.hidden)

                Divider()

                HStack(spacing: 10) {
                    TextField("Share a memory or reflection...", text: $draftComment)
                        .textFieldStyle(.roundedBorder)
                    Button {
                        Task { await submitReflection() }
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.title2)
                            .foregroundStyle(MemoriaTheme.plum)
                    }
                    .disabled(isPosting || draftComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .accessibilityLabel("Send Reflection")
                }
                .padding()
                .background(MemoriaTheme.surfacePrimary)
            }
            .background(MemoriaTheme.canvas)
            .navigationTitle("Reflections & Notes")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    private func submitReflection() async {
        let trimmed = draftComment.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        isPosting = true
        defer { isPosting = false }

        let hasAuth = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuth else {
            let localComment = MemoryCommentDTO(
                memoryId: memory.id,
                spaceId: memory.spaceId,
                authorId: "local-author",
                authorName: "Family Archivist",
                body: trimmed
            )
            comments.append(localComment)
            try? LocalStorageService.shared.saveCommentsLocally(comments, forMemoryId: memory.id)
            draftComment = ""
            errorMessage = nil
            return
        }

        do {
            let created = try await MemoriaAPIClient.shared.addComment(memoryId: memory.id, body: trimmed)
            comments.append(created)
            draftComment = ""
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
