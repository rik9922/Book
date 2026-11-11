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
    @State private var isShowingOnboarding = false
    @State private var activeSpaceId: String

    // IOS-24: Grid vs List & Pinch-to-Zoom Column Density (1, 2, 3 columns)
    @State private var columnDensity: Int = 1
    @State private var pinchScale: CGFloat = 1.0

    // IOS-31: Favorites Quick Filter
    @State private var favoritesOnly = false

    public var spaceId: String { activeSpaceId }

    public init(spaceId: String = "e8cf4fc3-137e-4397-883d-21cd6a7cb61f") {
        let saved = UserDefaults.standard.string(forKey: "memoria_active_space_id")
        self._activeSpaceId = State(initialValue: saved ?? spaceId)
    }

    private var displayedMemories: [Memory] {
        favoritesOnly ? memories.filter(\.isFavorite) : memories
    }

    private var gridColumns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: 12, alignment: .top), count: max(1, min(3, columnDensity)))
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                MemoriaTheme.canvas.ignoresSafeArea()

                VStack(spacing: 0) {
                    archiveControlStrip

                    if let errorMessage {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(MemoriaTheme.error)
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundStyle(MemoriaTheme.error)
                            Spacer()
                            Button("Dismiss") {
                                self.errorMessage = nil
                            }
                            .font(.caption2.weight(.semibold))
                        }
                        .padding(.horizontal)
                        .padding(.vertical, 8)
                        .background(MemoriaTheme.error.opacity(0.08))
                    }

                    if isLoading && memories.isEmpty {
                        Spacer()
                        ProgressView("Preserving Memories...")
                            .tint(MemoriaTheme.plum)
                        Spacer()
                    } else if displayedMemories.isEmpty {
                        Spacer()
                        VStack(spacing: 16) {
                            Image(systemName: favoritesOnly ? "star.slash" : "photo.stack")
                                .font(.system(size: 48))
                                .foregroundStyle(MemoriaTheme.plum)
                            Text(favoritesOnly ? "No Favorite Memories" : "No Memories Yet")
                                .font(.title2.bold())
                                .foregroundStyle(MemoriaTheme.ink)
                            Text(
                                favoritesOnly
                                    ? "Tap the star on any memory card to pin it to your Favorites quick filter."
                                    : "Capture your first family heirloom memory or run guided onboarding to begin your living archive."
                            )
                            .font(.subheadline)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                            HStack(spacing: 12) {
                                if favoritesOnly {
                                    Button("Show All Memories") {
                                        favoritesOnly = false
                                    }
                                    .buttonStyle(.borderedProminent)
                                    .tint(MemoriaTheme.plum)
                                } else {
                                    Button("Add First Memory") {
                                        isCreatingMemory = true
                                    }
                                    .buttonStyle(.borderedProminent)
                                    .tint(MemoriaTheme.plum)

                                    Button("Guided Setup") {
                                        isShowingOnboarding = true
                                    }
                                    .buttonStyle(.bordered)
                                    .tint(MemoriaTheme.sageFunc)
                                }
                            }
                        }
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVGrid(columns: gridColumns, spacing: 14) {
                                ForEach(displayedMemories) { memory in
                                    NavigationLink {
                                        MemoryDetailView(
                                            memory: memory,
                                            onUpdated: { updated in
                                                if let idx = memories.firstIndex(where: { $0.id == updated.id }) {
                                                    memories[idx] = updated
                                                }
                                            },
                                            onDeleted: { deletedId in
                                                memories.removeAll { $0.id == deletedId }
                                            }
                                        )
                                    } label: {
                                        MemoryCardView(memory: memory, compact: columnDensity > 1)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding()
                        }
                        .refreshable {
                            await loadMemories()
                        }
                        .gesture(
                            MagnifyGesture()
                                .onChanged { value in
                                    pinchScale = value.magnification
                                }
                                .onEnded { value in
                                    withAnimation(.easeInOut(duration: 0.2)) {
                                        if value.magnification > 1.15 && columnDensity > 1 {
                                            columnDensity -= 1
                                        } else if value.magnification < 0.85 && columnDensity < 3 {
                                            columnDensity += 1
                                        }
                                        pinchScale = 1.0
                                    }
                                }
                        )
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
                            Button("Guided Archive Setup", systemImage: "sparkles") {
                                isShowingOnboarding = true
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
            .sheet(isPresented: $isShowingOnboarding) {
                OnboardingFlowView()
            }
            .task {
                await loadMemories()
            }
        }
    }

    private var archiveControlStrip: some View {
        VStack(spacing: 8) {
            // IOS-24: List (1 col) vs Grid (2/3 col) Density Selector
            Picker("View Density", selection: $columnDensity) {
                Text("List").tag(1)
                Text("2-Col Grid").tag(2)
                Text("3-Col Grid").tag(3)
            }
            .pickerStyle(.segmented)
            .accessibilityLabel("Grid Column Density")

            HStack(spacing: 8) {
                // IOS-31: Favorites Quick Filter
                Button {
                    favoritesOnly.toggle()
                } label: {
                    Label(favoritesOnly ? "Favorites Only" : "Favorites", systemImage: favoritesOnly ? "star.fill" : "star")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .frame(maxWidth: .infinity)
                        .background(favoritesOnly ? MemoriaTheme.plum : MemoriaTheme.surfacePrimary)
                        .foregroundStyle(favoritesOnly ? Color.white : MemoriaTheme.plum)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(MemoriaTheme.borderSubtle, lineWidth: 1))
                }
                .accessibilityLabel("Favorites Filter")

                // IOS-32: Direct Collections Link
                NavigationLink {
                    CollectionsView(spaceId: activeSpaceId)
                } label: {
                    Label("Collections", systemImage: "folder")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .frame(maxWidth: .infinity)
                        .background(MemoriaTheme.surfacePrimary)
                        .foregroundStyle(MemoriaTheme.sageFunc)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(MemoriaTheme.borderSubtle, lineWidth: 1))
                }

                // IOS-09/10: Direct Onboarding Access
                Button {
                    isShowingOnboarding = true
                } label: {
                    Label("Onboarding", systemImage: "sparkles")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .frame(maxWidth: .infinity)
                        .background(MemoriaTheme.surfacePrimary)
                        .foregroundStyle(MemoriaTheme.ink)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(MemoriaTheme.borderSubtle, lineWidth: 1))
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }

    private func loadMemories() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil

        let hasAuth = await MemoriaAPIClient.shared.getAuthToken() != nil
        if hasAuth {
            do {
                let userSpaces = try await MemoriaAPIClient.shared.fetchSpaces()
                if userSpaces.isEmpty {
                    self.memories = []
                    return
                }
                if !userSpaces.contains(where: { $0.id == activeSpaceId }) {
                    activeSpaceId = userSpaces[0].id
                }
                UserDefaults.standard.set(activeSpaceId, forKey: "memoria_active_space_id")
            } catch {
                // Fall through to cached or explicit fetch error below
            }
        }

        let local = LocalStorageService.shared.loadLocalMemories(forSpaceId: activeSpaceId)
        if !local.isEmpty {
            self.memories = local
        }

        guard hasAuth else {
            return
        }

        do {
            let fetched = try await MemoriaAPIClient.shared.fetchMemories(spaceId: activeSpaceId)
            self.memories = fetched
            try? LocalStorageService.shared.saveMemoriesLocally(fetched, forSpaceId: activeSpaceId)
        } catch {
            self.errorMessage = error.localizedDescription
        }
    }
}

public struct MemoryCardView: View {
    public let memory: Memory
    public var compact: Bool = false

    public var body: some View {
        VStack(alignment: .leading, spacing: compact ? 8 : 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(memory.title)
                        .font(compact ? .subheadline.bold() : .headline)
                        .foregroundStyle(MemoriaTheme.ink)
                        .lineLimit(compact ? 2 : 3)
                    if !compact, let location = memory.location {
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

            if !compact, let content = memory.content, !content.isEmpty {
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
                if !compact {
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
        }
        .padding(compact ? 10 : 16)
        .memoriaCard()
    }
}
