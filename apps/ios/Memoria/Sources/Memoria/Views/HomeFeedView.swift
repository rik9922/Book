import SwiftUI

public struct HomeFeedView: View {
    @State private var memories: [Memory] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var isCreatingMemory = false

    public let spaceId: String

    public init(spaceId: String = "e8cf4fc3-137e-4397-883d-21cd6a7cb61f") {
        self.spaceId = spaceId
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 0.05, green: 0.07, blue: 0.06).ignoresSafeArea()

                if isLoading && memories.isEmpty {
                    ProgressView("Loading Memories...")
                        .tint(Color(red: 0.89, green: 0.72, blue: 0.33))
                } else if memories.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "photo.stack")
                            .font(.system(size: 48))
                            .foregroundStyle(Color(red: 0.89, green: 0.72, blue: 0.33))
                        Text("No Memories Yet")
                            .font(.title2.bold())
                            .foregroundStyle(.white)
                        Text("Capture your first family heirloom memory to begin.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                        Button("Add Memory") {
                            isCreatingMemory = true
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Color(red: 0.89, green: 0.72, blue: 0.33))
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 20) {
                            ForEach(memories) { memory in
                                MemoryCardView(memory: memory)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Memoria")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isCreatingMemory = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .foregroundStyle(Color(red: 0.89, green: 0.72, blue: 0.33))
                    }
                }
            }
            .sheet(isPresented: $isCreatingMemory) {
                MemoryCreateView(spaceId: spaceId) { newMemory in
                    memories.insert(newMemory, at: 0)
                }
            }
            .task {
                await loadMemories()
            }
        }
    }

    private func loadMemories() async {
        isLoading = true
        // Check offline cache first
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
                        .foregroundStyle(.white)
                    if let location = memory.location {
                        Text(location)
                            .font(.caption)
                            .foregroundStyle(Color(red: 0.89, green: 0.72, blue: 0.33))
                    }
                }
                Spacer()
                if memory.isFavorite {
                    Image(systemName: "star.fill")
                        .foregroundStyle(Color(red: 0.89, green: 0.72, blue: 0.33))
                }
            }

            Text(memory.content)
                .font(.body)
                .foregroundStyle(.white.opacity(0.85))
                .lineLimit(3)

            HStack {
                Text(memory.capturedAt.prefix(10))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Spacer()
                ForEach(memory.tags.prefix(3), id: \.self) { tag in
                    Text("#\(tag)")
                        .font(.caption2.bold())
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.white.opacity(0.1))
                        .clipShape(Capsule())
                        .foregroundStyle(Color(red: 0.89, green: 0.72, blue: 0.33))
                }
            }
        }
        .padding()
        .background(Color(red: 0.08, green: 0.12, blue: 0.10))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color(red: 0.89, green: 0.72, blue: 0.33).opacity(0.2), lineWidth: 1)
        )
    }
}

