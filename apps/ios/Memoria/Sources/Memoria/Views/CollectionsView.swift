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
                        NavigationLink {
                            CollectionDetailView(
                                spaceId: spaceId,
                                collection: col,
                                onUpdated: { updated in
                                    if let idx = collections.firstIndex(where: { $0.id == updated.id }) {
                                        collections[idx] = updated
                                    }
                                    persistLocalIfOffline()
                                },
                                onDeleted: { deletedId in
                                    collections.removeAll { $0.id == deletedId }
                                    persistLocalIfOffline()
                                }
                            )
                        } label: {
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
                    .onDelete { offsets in
                        let toDelete = offsets.map { collections[$0] }
                        Task {
                            for item in toDelete {
                                await deleteCollection(item)
                            }
                        }
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
        .refreshable {
            await load()
        }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuthToken else {
            collections = LocalStorageService.shared.loadLocalCollections(forSpaceId: spaceId)
            errorMessage = nil
            return
        }
        do {
            let fetched = try await MemoriaAPIClient.shared.fetchCollections(spaceId: spaceId)
            collections = fetched
            try? LocalStorageService.shared.saveCollectionsLocally(fetched, forSpaceId: spaceId)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func create() async {
        let trimmed = newTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let desc = newDescription.trimmingCharacters(in: .whitespacesAndNewlines)
        let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuthToken else {
            let local = CollectionDTO(
                spaceId: spaceId,
                title: trimmed,
                description: desc.isEmpty ? nil : desc,
                memoryIds: []
            )
            collections.insert(local, at: 0)
            try? LocalStorageService.shared.saveCollectionsLocally(collections, forSpaceId: spaceId)
            newTitle = ""
            newDescription = ""
            errorMessage = nil
            return
        }
        do {
            let created = try await MemoriaAPIClient.shared.createCollection(
                spaceId: spaceId,
                title: trimmed,
                description: desc.isEmpty ? nil : desc
            )
            collections.insert(created, at: 0)
            newTitle = ""
            newDescription = ""
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteCollection(_ col: CollectionDTO) async {
        let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuthToken else {
            collections.removeAll { $0.id == col.id }
            try? LocalStorageService.shared.saveCollectionsLocally(collections, forSpaceId: spaceId)
            return
        }
        do {
            try await MemoriaAPIClient.shared.deleteCollection(spaceId: spaceId, collectionId: col.id)
            collections.removeAll { $0.id == col.id }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func persistLocalIfOffline() {
        Task {
            let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
            if !hasAuthToken {
                try? LocalStorageService.shared.saveCollectionsLocally(collections, forSpaceId: spaceId)
            }
        }
    }
}

// MARK: - IOS-33: Collection Detail & Memory Curator View

public struct CollectionDetailView: View {
    @Environment(\.dismiss) private var dismiss

    public let spaceId: String
    @State private var collection: CollectionDTO
    public var onUpdated: ((CollectionDTO) -> Void)?
    public var onDeleted: ((String) -> Void)?

    @State private var curatedMemories: [Memory] = []
    @State private var spaceMemories: [Memory] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var isShowingMemoryPicker = false
    @State private var isShowingEditSheet = false
    @State private var isShowingBookWizard = false
    @State private var showTimelineView = false

    public init(
        spaceId: String,
        collection: CollectionDTO,
        onUpdated: ((CollectionDTO) -> Void)? = nil,
        onDeleted: ((String) -> Void)? = nil
    ) {
        self.spaceId = spaceId
        self._collection = State(initialValue: collection)
        self.onUpdated = onUpdated
        self.onDeleted = onDeleted
    }

    public var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(collection.title)
                            .font(.title2.bold())
                            .foregroundStyle(MemoriaTheme.ink)
                        Spacer()
                        Text("\(curatedMemories.count) items")
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(MemoriaTheme.plumLight)
                            .foregroundStyle(MemoriaTheme.plum)
                            .clipShape(Capsule())
                    }

                    if let desc = collection.description, !desc.isEmpty {
                        Text(desc)
                            .font(.subheadline)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                    } else {
                        Text("Thematic heirloom chapter curated for family reading and print.")
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                    }

                    HStack(spacing: 10) {
                        Button {
                            isShowingMemoryPicker = true
                        } label: {
                            Label("Add Memories", systemImage: "plus.circle.fill")
                                .font(.caption.weight(.semibold))
                                .frame(maxWidth: .infinity, minHeight: 38)
                        }
                        .buttonStyle(.bordered)
                        .tint(MemoriaTheme.plum)

                        Button {
                            isShowingBookWizard = true
                        } label: {
                            Label("Print as Book", systemImage: "book.closed.fill")
                                .font(.caption.weight(.semibold))
                                .frame(maxWidth: .infinity, minHeight: 38)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(MemoriaTheme.sageFunc)
                    }
                    .padding(.top, 4)
                }
                .padding(.vertical, 6)
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.error)
                }
            }

            Section {
                Picker("Layout", selection: $showTimelineView) {
                    Text("Chronological List").tag(false)
                    Text("Chapter Summary").tag(true)
                }
                .pickerStyle(.segmented)
            }

            Section("Curated Memories (\(curatedMemories.count))") {
                if isLoading && curatedMemories.isEmpty {
                    ProgressView("Loading curated memories...")
                } else if curatedMemories.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("This collection is empty. Tap Add Memories to curate items from your space.")
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                        Button("Browse Space Memories") {
                            isShowingMemoryPicker = true
                        }
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(MemoriaTheme.plum)
                    }
                    .padding(.vertical, 4)
                } else {
                    ForEach(Array(curatedMemories.enumerated()), id: \.element.id) { index, memory in
                        HStack(spacing: 8) {
                            NavigationLink {
                                MemoryDetailView(memory: memory) { updatedMemory in
                                    if let idx = curatedMemories.firstIndex(where: { $0.id == updatedMemory.id }) {
                                        curatedMemories[idx] = updatedMemory
                                    }
                                    if let idx = spaceMemories.firstIndex(where: { $0.id == updatedMemory.id }) {
                                        spaceMemories[idx] = updatedMemory
                                    }
                                }
                            } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(memory.title)
                                            .font(.headline)
                                            .foregroundStyle(MemoriaTheme.ink)
                                        Spacer()
                                        Text(memory.format.rawValue.uppercased())
                                            .font(.caption2.weight(.semibold))
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(MemoriaTheme.sageLight)
                                            .foregroundStyle(MemoriaTheme.sageFunc)
                                            .clipShape(Capsule())
                                    }
                                    Text(String(memory.capturedAt.prefix(10)))
                                        .font(.caption2)
                                        .foregroundStyle(MemoriaTheme.textSecondary)
                                    if showTimelineView, let bodyText = memory.content, !bodyText.isEmpty {
                                        Text(bodyText)
                                            .font(.caption)
                                            .foregroundStyle(MemoriaTheme.textPrimary)
                                            .lineLimit(2)
                                    }
                                }
                                .padding(.vertical, 3)
                            }

                            if curatedMemories.count > 1 {
                                VStack(spacing: 4) {
                                    Button {
                                        Task { await moveMemory(at: index, direction: -1) }
                                    } label: {
                                        Image(systemName: "arrow.up.circle")
                                            .font(.subheadline)
                                    }
                                    .buttonStyle(.borderless)
                                    .tint(MemoriaTheme.plum)
                                    .disabled(index == 0)
                                    .accessibilityLabel("Move \(memory.title) up in collection")

                                    Button {
                                        Task { await moveMemory(at: index, direction: 1) }
                                    } label: {
                                        Image(systemName: "arrow.down.circle")
                                            .font(.subheadline)
                                    }
                                    .buttonStyle(.borderless)
                                    .tint(MemoriaTheme.plum)
                                    .disabled(index == curatedMemories.count - 1)
                                    .accessibilityLabel("Move \(memory.title) down in collection")
                                }
                            }
                        }
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                Task { _ = await removeMemory(memory) }
                            } label: {
                                Label("Remove", systemImage: "minus.circle")
                            }
                        }
                    }
                    .onMove { source, destination in
                        var reordered = curatedMemories
                        reordered.move(fromOffsets: source, toOffset: destination)
                        Task { await applyReorder(reordered) }
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(MemoriaTheme.canvas)
        .navigationTitle(collection.title)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Edit") {
                    isShowingEditSheet = true
                }
                .foregroundStyle(MemoriaTheme.plum)
            }
        }
        .task {
            await loadDetail()
        }
        .sheet(isPresented: $isShowingMemoryPicker) {
            CollectionMemoryPickerSheet(
                spaceMemories: spaceMemories,
                curatedIds: Set(curatedMemories.map(\.id)),
                onAdd: { mem in
                    await addMemory(mem)
                },
                onRemove: { mem in
                    await removeMemory(mem)
                }
            )
        }
        .sheet(isPresented: $isShowingEditSheet) {
            EditCollectionSheet(
                spaceId: spaceId,
                collection: collection,
                onUpdated: { updated in
                    collection = updated
                    onUpdated?(updated)
                },
                onDeleted: { deletedId in
                    onDeleted?(deletedId)
                    Task { @MainActor in
                        try? await Task.sleep(for: .milliseconds(150))
                        dismiss()
                    }
                }
            )
        }
        .sheet(isPresented: $isShowingBookWizard) {
            BookCreatorWizardView(
                initialSpaceId: spaceId,
                initialSelectedMemories: curatedMemories,
                initialTitle: collection.title
            )
        }
    }

    private func loadDetail() async {
        isLoading = true
        defer { isLoading = false }
        let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuthToken else {
            let local = LocalStorageService.shared.loadLocalMemories(forSpaceId: spaceId)
            let samples = Self.offlineSpaceSampleMemories(spaceId: spaceId)
            var merged = local
            for sample in samples where !merged.contains(where: { $0.id == sample.id }) {
                merged.append(sample)
            }
            spaceMemories = merged
            let memById = Dictionary(uniqueKeysWithValues: merged.map { ($0.id, $0) })
            curatedMemories = (collection.memoryIds ?? []).compactMap { memById[$0] }
            errorMessage = nil
            return
        }

        do {
            async let detailReq = MemoriaAPIClient.shared.fetchCollectionDetail(spaceId: spaceId, collectionId: collection.id)
            async let spaceMemsReq = MemoriaAPIClient.shared.fetchMemories(spaceId: spaceId)
            let (detail, allSpaceMems) = try await (detailReq, spaceMemsReq)
            spaceMemories = allSpaceMems
            collection = CollectionDTO(
                id: detail.id,
                spaceId: detail.spaceId,
                title: detail.title,
                description: detail.description,
                coverMemoryId: detail.coverMemoryId,
                memoryIds: detail.memoryIds,
                createdAt: detail.createdAt,
                updatedAt: detail.updatedAt
            )
            if let hydrated = detail.memories {
                curatedMemories = hydrated
            } else {
                let memById = Dictionary(uniqueKeysWithValues: allSpaceMems.map { ($0.id, $0) })
                curatedMemories = (detail.memoryIds ?? []).compactMap { memById[$0] }
            }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @discardableResult
    private func addMemory(_ memory: Memory) async -> Bool {
        guard !curatedMemories.contains(where: { $0.id == memory.id }) else { return true }
        let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuthToken else {
            curatedMemories.append(memory)
            var nextIds = collection.memoryIds ?? []
            if !nextIds.contains(memory.id) { nextIds.append(memory.id) }
            collection = CollectionDTO(
                id: collection.id,
                spaceId: collection.spaceId,
                title: collection.title,
                description: collection.description,
                coverMemoryId: collection.coverMemoryId,
                memoryIds: nextIds,
                createdAt: collection.createdAt,
                updatedAt: ISO8601DateFormatter().string(from: Date())
            )
            onUpdated?(collection)
            return true
        }
        do {
            let updated = try await MemoriaAPIClient.shared.addMemoryToCollection(
                spaceId: spaceId,
                collectionId: collection.id,
                memoryId: memory.id,
                sortOrder: curatedMemories.count
            )
            collection = updated
            curatedMemories.append(memory)
            onUpdated?(updated)
            errorMessage = nil
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    @discardableResult
    private func removeMemory(_ memory: Memory) async -> Bool {
        let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuthToken else {
            curatedMemories.removeAll { $0.id == memory.id }
            let nextIds = (collection.memoryIds ?? []).filter { $0 != memory.id }
            collection = CollectionDTO(
                id: collection.id,
                spaceId: collection.spaceId,
                title: collection.title,
                description: collection.description,
                coverMemoryId: collection.coverMemoryId,
                memoryIds: nextIds,
                createdAt: collection.createdAt,
                updatedAt: ISO8601DateFormatter().string(from: Date())
            )
            onUpdated?(collection)
            return true
        }
        do {
            try await MemoriaAPIClient.shared.removeMemoryFromCollection(
                spaceId: spaceId,
                collectionId: collection.id,
                memoryId: memory.id
            )
            curatedMemories.removeAll { $0.id == memory.id }
            let nextIds = (collection.memoryIds ?? []).filter { $0 != memory.id }
            collection = CollectionDTO(
                id: collection.id,
                spaceId: collection.spaceId,
                title: collection.title,
                description: collection.description,
                coverMemoryId: collection.coverMemoryId,
                memoryIds: nextIds,
                createdAt: collection.createdAt,
                updatedAt: ISO8601DateFormatter().string(from: Date())
            )
            onUpdated?(collection)
            errorMessage = nil
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    private func moveMemory(at index: Int, direction: Int) async {
        let target = index + direction
        guard curatedMemories.indices.contains(index), curatedMemories.indices.contains(target) else { return }
        var reordered = curatedMemories
        reordered.swapAt(index, target)
        await applyReorder(reordered)
    }

    private func applyReorder(_ reordered: [Memory]) async {
        let nextIds = reordered.map(\.id)
        let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuthToken else {
            curatedMemories = reordered
            collection = CollectionDTO(
                id: collection.id,
                spaceId: collection.spaceId,
                title: collection.title,
                description: collection.description,
                coverMemoryId: collection.coverMemoryId,
                memoryIds: nextIds,
                createdAt: collection.createdAt,
                updatedAt: ISO8601DateFormatter().string(from: Date())
            )
            onUpdated?(collection)
            return
        }
        do {
            let updated = try await MemoriaAPIClient.shared.reorderCollectionMemories(
                spaceId: spaceId,
                collectionId: collection.id,
                memoryIds: nextIds
            )
            curatedMemories = reordered
            collection = updated
            onUpdated?(updated)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private static func offlineSpaceSampleMemories(spaceId: String) -> [Memory] {
        [
            Memory(
                id: "local-sample-1",
                spaceId: spaceId,
                authorId: "local",
                title: "Prologue • Family Hearth",
                content: "Three generations gathered under the wisteria pergola.",
                format: .story,
                tags: ["family", "heritage"]
            ),
            Memory(
                id: "local-sample-2",
                spaceId: spaceId,
                authorId: "local",
                title: "Autumn Harvest in Sonoma",
                content: "Pressed Kodachrome reels and cider ledger notes.",
                format: .image,
                tags: ["autumn", "sonoma"]
            ),
        ]
    }
}

private struct CollectionMemoryPickerSheet: View {
    @Environment(\.dismiss) private var dismiss

    let spaceMemories: [Memory]
    @State var curatedIds: Set<String>
    @State private var isMutating = false
    let onAdd: (Memory) async -> Bool
    let onRemove: (Memory) async -> Bool

    var body: some View {
        NavigationStack {
            List {
                Section("Select Space Memories to Curate") {
                    if spaceMemories.isEmpty {
                        Text("No memories found in this space yet.")
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                    } else {
                        ForEach(spaceMemories) { memory in
                            let included = curatedIds.contains(memory.id)
                            Button {
                                guard !isMutating else { return }
                                isMutating = true
                                Task {
                                    defer { isMutating = false }
                                    if included {
                                        if await onRemove(memory) {
                                            curatedIds.remove(memory.id)
                                        }
                                    } else {
                                        if await onAdd(memory) {
                                            curatedIds.insert(memory.id)
                                        }
                                    }
                                }
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(memory.title)
                                            .font(.subheadline.weight(.medium))
                                            .foregroundStyle(MemoriaTheme.ink)
                                        Text(String(memory.capturedAt.prefix(10)))
                                            .font(.caption2)
                                            .foregroundStyle(MemoriaTheme.textSecondary)
                                    }
                                    Spacer()
                                    Image(systemName: included ? "checkmark.circle.fill" : "plus.circle")
                                        .foregroundStyle(included ? MemoriaTheme.sageFunc : MemoriaTheme.plum)
                                }
                            }
                            .disabled(isMutating)
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(MemoriaTheme.canvas)
            .navigationTitle("Add Memories")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(MemoriaTheme.plum)
                }
            }
        }
    }
}

private struct EditCollectionSheet: View {
    @Environment(\.dismiss) private var dismiss

    let spaceId: String
    let collection: CollectionDTO
    let onUpdated: (CollectionDTO) -> Void
    let onDeleted: (String) -> Void

    @State private var title: String
    @State private var descriptionText: String
    @State private var isSaving = false
    @State private var showDeleteConfirm = false
    @State private var errorMessage: String?

    init(
        spaceId: String,
        collection: CollectionDTO,
        onUpdated: @escaping (CollectionDTO) -> Void,
        onDeleted: @escaping (String) -> Void
    ) {
        self.spaceId = spaceId
        self.collection = collection
        self.onUpdated = onUpdated
        self.onDeleted = onDeleted
        self._title = State(initialValue: collection.title)
        self._descriptionText = State(initialValue: collection.description ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Collection Details") {
                    TextField("Collection Title", text: $title)
                    TextField("Description", text: $descriptionText, axis: .vertical)
                        .lineLimit(3...6)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.error)
                    }
                }

                Section {
                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        Label("Delete Collection", systemImage: "trash")
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(MemoriaTheme.canvas)
            .navigationTitle("Edit Collection")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving..." : "Save") {
                        Task { await save() }
                    }
                    .disabled(isSaving || title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .foregroundStyle(MemoriaTheme.plum)
                }
            }
            .confirmationDialog(
                "Delete this collection? Memories inside remain preserved in your space archive.",
                isPresented: $showDeleteConfirm,
                titleVisibility: .visible
            ) {
                Button("Delete Collection", role: .destructive) {
                    Task { await removeCollection() }
                }
                Button("Cancel", role: .cancel) {}
            }
        }
    }

    private func save() async {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let desc = descriptionText.trimmingCharacters(in: .whitespacesAndNewlines)
        isSaving = true
        defer { isSaving = false }

        let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuthToken else {
            let updated = CollectionDTO(
                id: collection.id,
                spaceId: collection.spaceId,
                title: trimmed,
                description: desc.isEmpty ? nil : desc,
                coverMemoryId: collection.coverMemoryId,
                memoryIds: collection.memoryIds,
                createdAt: collection.createdAt,
                updatedAt: ISO8601DateFormatter().string(from: Date())
            )
            onUpdated(updated)
            dismiss()
            return
        }

        do {
            let updated = try await MemoriaAPIClient.shared.updateCollection(
                spaceId: spaceId,
                collectionId: collection.id,
                title: trimmed,
                description: desc.isEmpty ? nil : desc,
                clearDescription: desc.isEmpty
            )
            onUpdated(updated)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func removeCollection() async {
        isSaving = true
        defer { isSaving = false }
        let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuthToken else {
            onDeleted(collection.id)
            dismiss()
            return
        }
        do {
            try await MemoriaAPIClient.shared.deleteCollection(spaceId: spaceId, collectionId: collection.id)
            onDeleted(collection.id)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
