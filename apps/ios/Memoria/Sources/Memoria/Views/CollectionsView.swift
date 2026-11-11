import SwiftUI

public struct CollectionsView: View {
    public let spaceId: String
    @State private var collections: [CollectionDTO] = []
    @State private var newTitle = ""
    @State private var newDescription = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    public init(spaceId: String) {
        self.spaceId = spaceId
    }

    public var body: some View {
        List {
            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.error)
                }
            }

            Section("Create Collection") {
                TextField("Collection Title", text: $newTitle)
                TextField("Description (optional)", text: $newDescription)
                Button("Add Collection") {
                    Task { await create() }
                }
                .tint(MemoriaTheme.plum)
                .disabled(newTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }

            Section("Curated Collections") {
                if isLoading && collections.isEmpty {
                    ProgressView("Loading Collections...")
                } else if collections.isEmpty {
                    Text("No collections created yet.")
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                } else {
                    ForEach(collections) { col in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(col.title)
                                .font(.headline)
                                .foregroundStyle(MemoriaTheme.ink)
                            if let desc = col.description, !desc.isEmpty {
                                Text(desc)
                                    .font(.caption)
                                    .foregroundStyle(MemoriaTheme.textSecondary)
                            }
                            Text("\((col.memoryIds ?? []).count) curated memories")
                                .font(.caption2)
                                .foregroundStyle(MemoriaTheme.sageFunc)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(MemoriaTheme.canvas)
        .navigationTitle("Collections")
        .task {
            await load()
        }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            collections = try await MemoriaAPIClient.shared.fetchCollections(spaceId: spaceId)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func create() async {
        let trimmed = newTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        do {
            let created = try await MemoriaAPIClient.shared.createCollection(
                spaceId: spaceId,
                title: trimmed,
                description: newDescription.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            collections.insert(created, at: 0)
            newTitle = ""
            newDescription = ""
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
