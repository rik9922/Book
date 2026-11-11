import SwiftUI

public struct HomeFeedView: View {
    @State private var memories: [Memory] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var isCreatingMemory = false
    @State private var isShowingAuth = false

    public let spaceId: String

    public init(spaceId: String = "e8cf4fc3-137e-4397-883d-21cd6a7cb61f") {
        self.spaceId = spaceId
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
                    Button {
                        isShowingAuth = true
                    } label: {
                        Image(systemName: "person.crop.circle")
                            .foregroundStyle(MemoriaTheme.plum)
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    HStack(spacing: 12) {
                        NavigationLink {
                            CollectionsView(spaceId: spaceId)
                        } label: {
                            Image(systemName: "folder")
                                .foregroundStyle(MemoriaTheme.sageFunc)
                        }
                        NavigationLink {
                            TrashRecoveryView(spaceId: spaceId)
                        } label: {
                            Image(systemName: "trash")
                                .foregroundStyle(MemoriaTheme.textSecondary)
                        }
                        Button {
                            isCreatingMemory = true
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.title3)
                                .foregroundStyle(MemoriaTheme.plum)
                        }
                    }
                }
            }
            .sheet(isPresented: $isCreatingMemory) {
                MemoryCreateView(spaceId: spaceId) { newMemory in
                    memories.insert(newMemory, at: 0)
                }
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
