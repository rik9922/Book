import SwiftUI

public struct HomeFeedView: View {
    @State private var memories: [Memory] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var isCreatingMemory = false
    @State private var isCapturingVideo = false
    @State private var isRecordingVoice = false
    @State private var isShowingUploadQueue = false
    @State private var isShowingSpaceSwitcher = false
    @State private var isShowingAuth = false
    @State private var activeSpaceId: String

    public var spaceId: String { activeSpaceId }

    public init(spaceId: String = "e8cf4fc3-137e-4397-883d-21cd6a7cb61f") {
        self._activeSpaceId = State(initialValue: spaceId)
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                MemoriaTheme.canvas.ignoresSafeArea()

                if isLoading && memories.isEmpty {
                    ProgressView("Preserving Memories...")
                        .tint(MemoriaTheme.plum)
                } else if memories.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "photo.stack")
                            .font(.system(size: 48))
                            .foregroundStyle(MemoriaTheme.plum)
                        Text("No Memories Yet")
                            .font(.title2.bold())
                            .foregroundStyle(MemoriaTheme.ink)
                        Text("Capture your first family heirloom memory to begin your living archive.")
                            .font(.subheadline)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                        Button("Add First Memory") {
                            isCreatingMemory = true
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(MemoriaTheme.plum)
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(memories) { memory in
                                NavigationLink {
                                    MemoryDetailView(memory: memory)
                                } label: {
                                    MemoryCardView(memory: memory)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Memoria")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    HStack(spacing: 12) {
                        Button {
                            isShowingAuth = true
                        } label: {
                            Image(systemName: "person.crop.circle")
                                .foregroundStyle(MemoriaTheme.plum)
                        }
                        .accessibilityLabel("Account Access")
                        Button {
                            isShowingSpaceSwitcher = true
                        } label: {
                            Image(systemName: "square.stack.3d.up")
                                .foregroundStyle(MemoriaTheme.sageFunc)
                        }
                        .accessibilityLabel("Switch Space")
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    HStack(spacing: 12) {
                        NavigationLink {
                            TimelineCalendarView(spaceId: activeSpaceId, localMemories: memories)
                        } label: {
                            Image(systemName: "calendar")
                                .foregroundStyle(MemoriaTheme.ink)
                        }
                        .accessibilityLabel("Timeline & Calendar")
                        NavigationLink {
                            CollectionsView(spaceId: activeSpaceId)
                        } label: {
                            Image(systemName: "folder")
                                .foregroundStyle(MemoriaTheme.sageFunc)
                        }
                        .accessibilityLabel("Collections")
                        NavigationLink {
                            TrashRecoveryView(spaceId: activeSpaceId)
                        } label: {
                            Image(systemName: "trash")
                                .foregroundStyle(MemoriaTheme.textSecondary)
                        }
                        .accessibilityLabel("Trash Recovery")
                        Menu {
                            Button("Photo or Story", systemImage: "square.and.pencil") {
                                isCreatingMemory = true
                            }
                            Button("Video Trim Studio", systemImage: "video") {
                                isCapturingVideo = true
                            }
                            Button("Voice Oral History", systemImage: "mic") {
                                isRecordingVoice = true
                            }
                            Button("Upload Queue", systemImage: "arrow.up.circle") {
                                isShowingUploadQueue = true
                            }
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.title3)
                                .foregroundStyle(MemoriaTheme.plum)
                        }
                        .accessibilityLabel("Capture Memory")
                    }
                }
            }
            .sheet(isPresented: $isCreatingMemory) {
                MemoryCreateView(spaceId: activeSpaceId) { newMemory in
                    memories.insert(newMemory, at: 0)
                }
            }
            .sheet(isPresented: $isCapturingVideo) {
                VideoCaptureTrimView(spaceId: activeSpaceId) { newMemory in
                    memories.insert(newMemory, at: 0)
                }
            }
            .sheet(isPresented: $isRecordingVoice) {
                VoiceRecorderView(spaceId: activeSpaceId) { newMemory in
                    memories.insert(newMemory, at: 0)
                }
            }
            .sheet(isPresented: $isShowingUploadQueue) {
                UploadQueueSheetView()
            }
            .sheet(isPresented: $isShowingSpaceSwitcher, onDismiss: {
                Task { await loadMemories() }
            }) {
                SpaceOverviewSheet(activeSpaceId: $activeSpaceId)
            }
            .sheet(isPresented: $isShowingAuth) {
                AuthSheetView { _ in
                    Task { await loadMemories() }
                }
            }
            .task {
                await loadMemories()
            }
        }
    }

    private func loadMemories() async {
        isLoading = true
        let local = LocalStorageService.shared.loadLocalMemories(forSpaceId: spaceId)
        if !local.isEmpty {
            self.memories = local
        }

        do {
            let fetched = try await MemoriaAPIClient.shared.fetchMemories(spaceId: spaceId)
            self.memories = fetched
            try? LocalStorageService.shared.saveMemoriesLocally(fetched, forSpaceId: spaceId)
        } catch {
            self.errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

public struct MemoryCardView: View {
    public let memory: Memory

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(memory.title)
                        .font(.headline)
                        .foregroundStyle(MemoriaTheme.ink)
                    if let location = memory.location {
                        HStack(spacing: 4) {
                            Image(systemName: "mappin.and.ellipse")
                                .font(.caption2)
                            Text(location)
                                .font(.caption)
                        }
                        .foregroundStyle(MemoriaTheme.sageFunc)
                    }
                }
                Spacer()
                if memory.isFavorite {
                    Image(systemName: "star.fill")
                        .foregroundStyle(MemoriaTheme.plum)
                }
            }

            if let content = memory.content, !content.isEmpty {
                Text(content)
                    .font(.body)
                    .foregroundStyle(MemoriaTheme.textPrimary)
                    .lineLimit(3)
            }

            HStack {
                Text(memory.capturedAt.prefix(10))
                    .font(.caption2)
                    .foregroundStyle(MemoriaTheme.textSecondary)
                Spacer()
                ForEach(memory.tags.prefix(3), id: \.self) { tag in
                    Text("#\(tag)")
                        .font(.caption2.weight(.medium))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(MemoriaTheme.sageLight)
                        .clipShape(Capsule())
                        .foregroundStyle(MemoriaTheme.sageFunc)
                }
            }
        }
        .padding()
        .memoriaCard()
    }
}
