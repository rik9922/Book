import SwiftUI

public struct ProfilesDirectoryView: View {
    public let spaceId: String
    @State private var profiles: [SpaceProfileDTO] = []
    @State private var name = ""
    @State private var relationship = ""
    @State private var profileType = "child"
    @State private var isLoading = false
    @State private var isShowingCreatorSheet = false
    @State private var errorMessage: String?

    private let profileTypes = ["child", "parent", "individual", "couple", "pet"]

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

            Section("Add Family or Pet Profile") {
                TextField("Full Name", text: $name)
                TextField("Relationship (e.g. Daughter, Elder)", text: $relationship)
                Picker("Category", selection: $profileType) {
                    ForEach(profileTypes, id: \.self) { type in
                        Text(type.capitalized).tag(type)
                    }
                }
                Button("Save Profile") {
                    Task { await addProfile() }
                }
                .tint(MemoriaTheme.plum)
                .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }

            Section("Directory (\(profiles.count))") {
                if isLoading && profiles.isEmpty {
                    ProgressView("Loading Profiles...")
                } else if profiles.isEmpty {
                    Text("No profiles in this memory space yet.")
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                } else {
                    ForEach(profiles) { profile in
                        NavigationLink {
                            ProfileDetailView(
                                spaceId: spaceId,
                                profile: profile,
                                onUpdated: { updated in
                                    if let idx = profiles.firstIndex(where: { $0.id == updated.id }) {
                                        profiles[idx] = updated
                                    }
                                    persistLocalIfOffline()
                                },
                                onDeleted: { deletedId in
                                    profiles.removeAll { $0.id == deletedId }
                                    persistLocalIfOffline()
                                }
                            )
                        } label: {
                            HStack(spacing: 12) {
                                Circle()
                                    .fill(MemoriaTheme.plumLight)
                                    .frame(width: 36, height: 36)
                                    .overlay(
                                        Text(String(profile.name.prefix(1)).uppercased())
                                            .font(.subheadline.bold())
                                            .foregroundStyle(MemoriaTheme.plum)
                                    )
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(profile.name)
                                        .font(.headline)
                                        .foregroundStyle(MemoriaTheme.ink)
                                    Text("\(profile.type.capitalized)\(profile.relationship.map { " • \($0)" } ?? "")")
                                        .font(.caption)
                                        .foregroundStyle(MemoriaTheme.textSecondary)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(MemoriaTheme.canvas)
        .navigationTitle("People & Profiles")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isShowingCreatorSheet = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .foregroundStyle(MemoriaTheme.plum)
                }
                .accessibilityLabel("New Profile")
            }
        }
        .sheet(isPresented: $isShowingCreatorSheet) {
            ProfileEditorSheet(spaceId: spaceId, profile: nil) { created in
                profiles.append(created)
                persistLocalIfOffline()
            }
        }
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
            profiles = LocalStorageService.shared.loadLocalProfiles(forSpaceId: spaceId)
            errorMessage = nil
            return
        }
        do {
            let fetched = try await MemoriaAPIClient.shared.fetchProfiles(spaceId: spaceId)
            profiles = fetched
            try? LocalStorageService.shared.saveProfilesLocally(fetched, forSpaceId: spaceId)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func addProfile() async {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let rel = relationship.trimmingCharacters(in: .whitespacesAndNewlines)
        let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuthToken else {
            let local = SpaceProfileDTO(
                spaceId: spaceId,
                name: trimmed,
                relationship: rel.isEmpty ? nil : rel,
                type: profileType
            )
            profiles.append(local)
            try? LocalStorageService.shared.saveProfilesLocally(profiles, forSpaceId: spaceId)
            name = ""
            relationship = ""
            errorMessage = nil
            return
        }
        do {
            let created = try await MemoriaAPIClient.shared.createProfile(
                spaceId: spaceId,
                name: trimmed,
                type: profileType,
                relationship: rel.isEmpty ? nil : rel
            )
            profiles.append(created)
            name = ""
            relationship = ""
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func persistLocalIfOffline() {
        Task {
            let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
            if !hasAuthToken {
                try? LocalStorageService.shared.saveProfilesLocally(profiles, forSpaceId: spaceId)
            }
        }
    }
}

// MARK: - IOS-36: Profile Milestone Detail & Biographical Archive

public struct ProfileDetailView: View {
    @Environment(\.dismiss) private var dismiss

    public let spaceId: String
    @State private var profile: SpaceProfileDTO
    public var onUpdated: ((SpaceProfileDTO) -> Void)?
    public var onDeleted: ((String) -> Void)?

    @State private var taggedMemories: [Memory] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var isShowingEditor = false
    @State private var isShowingBookWizard = false

    public init(
        spaceId: String,
        profile: SpaceProfileDTO,
        onUpdated: ((SpaceProfileDTO) -> Void)? = nil,
        onDeleted: ((String) -> Void)? = nil
    ) {
        self.spaceId = spaceId
        self._profile = State(initialValue: profile)
        self.onUpdated = onUpdated
        self.onDeleted = onDeleted
    }

    public var body: some View {
        List {
            Section {
                HStack(spacing: 16) {
                    Circle()
                        .fill(MemoriaTheme.plumLight)
                        .frame(width: 64, height: 64)
                        .overlay(
                            Text(String(profile.name.prefix(1)).uppercased())
                                .font(.title2.bold())
                                .foregroundStyle(MemoriaTheme.plum)
                        )
                    VStack(alignment: .leading, spacing: 4) {
                        Text(profile.name)
                            .font(.title3.bold())
                            .foregroundStyle(MemoriaTheme.ink)
                        HStack(spacing: 6) {
                            Text(profile.type.capitalized)
                                .font(.caption2.weight(.semibold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(MemoriaTheme.sageLight)
                                .foregroundStyle(MemoriaTheme.sageFunc)
                                .clipShape(Capsule())
                            if let rel = profile.relationship, !rel.isEmpty {
                                Text(rel)
                                    .font(.caption)
                                    .foregroundStyle(MemoriaTheme.textSecondary)
                            }
                        }
                        if let birth = profile.birthDate, !birth.isEmpty {
                            Label("Born \(String(birth.prefix(10)))", systemImage: "calendar")
                                .font(.caption2)
                                .foregroundStyle(MemoriaTheme.plum)
                        }
                    }
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

            Section("Life Milestones & Chronological Archive (\(taggedMemories.count))") {
                if let birth = profile.birthDate, !birth.isEmpty {
                    HStack(spacing: 10) {
                        Image(systemName: "sparkles")
                            .foregroundStyle(MemoriaTheme.plum)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Milestone • Birth")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(MemoriaTheme.ink)
                            Text(String(birth.prefix(10)))
                                .font(.caption2)
                                .foregroundStyle(MemoriaTheme.textSecondary)
                        }
                    }
                }

                if isLoading && taggedMemories.isEmpty {
                    ProgressView("Loading biographical archive...")
                } else if taggedMemories.isEmpty {
                    Text("No memories or milestones tagged for this person yet.")
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                } else {
                    ForEach(taggedMemories) { memory in
                        NavigationLink {
                            MemoryDetailView(memory: memory)
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(memory.title)
                                        .font(.headline)
                                        .foregroundStyle(MemoriaTheme.ink)
                                    Spacer()
                                    Text(String(memory.capturedAt.prefix(10)))
                                        .font(.caption2.monospacedDigit())
                                        .foregroundStyle(MemoriaTheme.sageFunc)
                                }
                                if let location = memory.location, !location.isEmpty {
                                    Label(location, systemImage: "mappin.and.ellipse")
                                        .font(.caption2)
                                        .foregroundStyle(MemoriaTheme.textSecondary)
                                }
                                if let content = memory.content, !content.isEmpty {
                                    Text(content)
                                        .font(.caption)
                                        .foregroundStyle(MemoriaTheme.textPrimary)
                                        .lineLimit(2)
                                }
                            }
                            .padding(.vertical, 3)
                        }
                    }
                }
            }

            Section {
                Button {
                    isShowingBookWizard = true
                } label: {
                    Label("Generate Biography Book", systemImage: "book.closed.fill")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                }
                .tint(MemoriaTheme.plum)
            }
        }
        .scrollContentBackground(.hidden)
        .background(MemoriaTheme.canvas)
        .navigationTitle(profile.name)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Edit Profile") {
                    isShowingEditor = true
                }
                .foregroundStyle(MemoriaTheme.plum)
            }
        }
        .task {
            await loadTaggedMemories()
        }
        .sheet(isPresented: $isShowingEditor) {
            ProfileEditorSheet(
                spaceId: spaceId,
                profile: profile,
                onSaved: { updated in
                    profile = updated
                    onUpdated?(updated)
                },
                onDeleted: { deletedId in
                    onDeleted?(deletedId)
                    dismiss()
                }
            )
        }
        .sheet(isPresented: $isShowingBookWizard) {
            BookCreatorWizardView(
                initialSpaceId: spaceId,
                initialSelectedMemories: taggedMemories,
                initialTitle: "\(profile.name) Biography"
            )
        }
    }

    private func loadTaggedMemories() async {
        isLoading = true
        defer { isLoading = false }
        let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuthToken else {
            let local = LocalStorageService.shared.loadLocalMemories(forSpaceId: spaceId)
            taggedMemories = local
                .filter { $0.associatedProfileIds.contains(profile.id) }
                .sorted { $0.capturedAt < $1.capturedAt }
            errorMessage = nil
            return
        }
        do {
            let fetched = try await MemoriaAPIClient.shared.fetchMemories(spaceId: spaceId, profileId: profile.id)
            taggedMemories = fetched.sorted { $0.capturedAt < $1.capturedAt }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - IOS-37: Profile Creator & Editor Sheet

public struct ProfileEditorSheet: View {
    @Environment(\.dismiss) private var dismiss

    public let spaceId: String
    public let profile: SpaceProfileDTO?
    public var onSaved: ((SpaceProfileDTO) -> Void)?
    public var onDeleted: ((String) -> Void)?

    @State private var name: String
    @State private var relationship: String
    @State private var profileType: String
    @State private var hasBirthDate: Bool
    @State private var birthDate: Date
    @State private var isSaving = false
    @State private var showDeleteConfirm = false
    @State private var errorMessage: String?

    private let profileTypes = ["child", "parent", "individual", "couple", "pet"]

    public init(
        spaceId: String,
        profile: SpaceProfileDTO? = nil,
        onSaved: ((SpaceProfileDTO) -> Void)? = nil,
        onDeleted: ((String) -> Void)? = nil
    ) {
        self.spaceId = spaceId
        self.profile = profile
        self.onSaved = onSaved
        self.onDeleted = onDeleted
        self._name = State(initialValue: profile?.name ?? "")
        self._relationship = State(initialValue: profile?.relationship ?? "")
        self._profileType = State(initialValue: profile?.type ?? "individual")

        if let rawDate = profile?.birthDate, let parsed = Self.parseBirthDate(rawDate) {
            self._hasBirthDate = State(initialValue: true)
            self._birthDate = State(initialValue: parsed)
        } else {
            self._hasBirthDate = State(initialValue: false)
            self._birthDate = State(initialValue: Date())
        }
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("Biographical Identity (IOS-37)") {
                    TextField("Full Name", text: $name)
                    TextField("Relationship (e.g. Grandmother, Daughter)", text: $relationship)
                    Picker("Category", selection: $profileType) {
                        ForEach(profileTypes, id: \.self) { type in
                            Text(type.capitalized).tag(type)
                        }
                    }
                    Toggle("Include Birth Date", isOn: $hasBirthDate)
                    if hasBirthDate {
                        DatePicker("Birth Date", selection: $birthDate, in: ...Date(), displayedComponents: .date)
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.error)
                    }
                }

                if profile != nil {
                    Section {
                        Button(role: .destructive) {
                            showDeleteConfirm = true
                        } label: {
                            Label("Delete Profile", systemImage: "trash")
                        }
                    }
                }

                Section {
                    Text("Profile info is only visible to invited space members.")
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                }
            }
            .scrollContentBackground(.hidden)
            .background(MemoriaTheme.canvas)
            .navigationTitle(profile == nil ? "New Profile" : "Edit Profile")
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
                    .disabled(isSaving || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .foregroundStyle(MemoriaTheme.plum)
                }
            }
            .confirmationDialog(
                "Remove this profile from the directory? Existing memories remain preserved.",
                isPresented: $showDeleteConfirm,
                titleVisibility: .visible
            ) {
                Button("Delete Profile", role: .destructive) {
                    Task { await removeProfile() }
                }
                Button("Cancel", role: .cancel) {}
            }
        }
    }

    private static func parseBirthDate(_ raw: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.date(from: String(raw.prefix(10)))
    }

    private func formattedBirthDate() -> String? {
        guard hasBirthDate else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.string(from: birthDate)
    }

    private func save() async {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty else { return }
        let cleanRel = relationship.trimmingCharacters(in: .whitespacesAndNewlines)
        let birthStr = formattedBirthDate()
        isSaving = true
        defer { isSaving = false }

        let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuthToken else {
            let local = SpaceProfileDTO(
                id: profile?.id ?? UUID().uuidString,
                spaceId: spaceId,
                name: cleanName,
                relationship: cleanRel.isEmpty ? nil : cleanRel,
                type: profileType,
                birthDate: birthStr
            )
            onSaved?(local)
            dismiss()
            return
        }

        do {
            let saved: SpaceProfileDTO
            if let existing = profile {
                saved = try await MemoriaAPIClient.shared.updateProfile(
                    spaceId: spaceId,
                    profileId: existing.id,
                    name: cleanName,
                    relationship: cleanRel.isEmpty ? nil : cleanRel,
                    type: profileType,
                    birthDate: birthStr
                )
            } else {
                saved = try await MemoriaAPIClient.shared.createProfile(
                    spaceId: spaceId,
                    name: cleanName,
                    type: profileType,
                    relationship: cleanRel.isEmpty ? nil : cleanRel,
                    birthDate: birthStr
                )
            }
            onSaved?(saved)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func removeProfile() async {
        guard let existing = profile else { return }
        isSaving = true
        defer { isSaving = false }

        let hasAuthToken = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuthToken else {
            onDeleted?(existing.id)
            dismiss()
            return
        }

        do {
            try await MemoriaAPIClient.shared.deleteProfile(spaceId: spaceId, profileId: existing.id)
            onDeleted?(existing.id)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
