import SwiftUI

public struct FamilyCirclesView: View {
    @State private var spaces: [MemorySpace] = []
    @State private var notifications: [NotificationItemDTO] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showAuthSheet = false
    @State private var showInviteSheet = false
    @State private var governanceSpace: MemorySpace?

    public init() {}

    public var body: some View {
        NavigationStack {
            List {
                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                    }
                }

                Section("Your Memory Spaces") {
                    if spaces.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Sign in to sync your family vaults and collaborative circles.")
                                .font(.subheadline)
                                .foregroundStyle(MemoriaTheme.textSecondary)
                            Button("Sign In / Manage Account") {
                                showAuthSheet = true
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(MemoriaTheme.plum)
                        }
                        .padding(.vertical, 6)
                    } else {
                        ForEach(spaces) { space in
                            Button {
                                governanceSpace = space
                            } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(space.name)
                                            .font(.headline)
                                            .foregroundStyle(MemoriaTheme.ink)
                                        Spacer()
                                        Text(space.type.uppercased())
                                            .font(.caption2.weight(.semibold))
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 3)
                                            .background(MemoriaTheme.sageLight)
                                            .foregroundStyle(MemoriaTheme.sageFunc)
                                            .clipShape(Capsule())
                                    }
                                    if let desc = space.description, !desc.isEmpty {
                                        Text(desc)
                                            .font(.caption)
                                            .foregroundStyle(MemoriaTheme.textSecondary)
                                    }
                                    Text("Tap to manage members, roles & invitations ›")
                                        .font(.caption2)
                                        .foregroundStyle(MemoriaTheme.plum)
                                }
                                .padding(.vertical, 4)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                Section("Circle Tools") {
                    let activeSpace = spaces.first ?? MemorySpace(
                        id: "e8cf4fc3-137e-4397-883d-21cd6a7cb61f",
                        name: "Bennett Family Vault",
                        type: "family"
                    )
                    Button("Space Members & Governance") {
                        governanceSpace = activeSpace
                    }
                    .foregroundStyle(MemoriaTheme.plum)

                    NavigationLink("People & Profiles Directory") {
                        ProfilesDirectoryView(spaceId: activeSpace.id)
                    }
                    NavigationLink("Circle Activity Feed") {
                        SpaceActivityFeedView(spaceId: activeSpace.id)
                    }
                    NavigationLink("Notification Center") {
                        NotificationsCenterView()
                    }
                    Button("Accept Invitation Token") {
                        showInviteSheet = true
                    }
                    .foregroundStyle(MemoriaTheme.plum)
                }

                Section("Recent Family Notifications") {
                    if notifications.isEmpty {
                        Text("No new circle updates or print notifications.")
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                    } else {
                        ForEach(notifications) { item in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(item.title)
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(MemoriaTheme.ink)
                                    Spacer()
                                    if !item.isRead {
                                        Circle()
                                            .fill(MemoriaTheme.plum)
                                            .frame(width: 8, height: 8)
                                    }
                                }
                                Text(item.body)
                                    .font(.caption)
                                    .foregroundStyle(MemoriaTheme.textSecondary)
                            }
                            .padding(.vertical, 2)
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(MemoriaTheme.canvas)
            .navigationTitle("Family Circles")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAuthSheet = true
                    } label: {
                        Image(systemName: "person.crop.circle")
                            .foregroundStyle(MemoriaTheme.plum)
                    }
                }
            }
            .refreshable {
                await loadData()
            }
            .sheet(isPresented: $showAuthSheet) {
                AuthSheetView { _ in
                    Task { await loadData() }
                }
            }
            .sheet(isPresented: $showInviteSheet) {
                AuthSheetView(initialMode: .invite) { _ in
                    Task { await loadData() }
                }
            }
            .sheet(item: $governanceSpace) { space in
                SpaceGovernanceView(space: space)
            }
            .task {
                await loadData()
            }
        }
    }

    private func loadData() async {
        isLoading = true
        errorMessage = nil
        do {
            async let fetchedSpaces = MemoriaAPIClient.shared.fetchSpaces()
            async let fetchedNotes = MemoriaAPIClient.shared.fetchNotifications()
            self.spaces = try await fetchedSpaces
            self.notifications = (try? await fetchedNotes) ?? []
        } catch {
            self.errorMessage = "Offline or unauthenticated — tap the profile icon to sign in."
        }
        isLoading = false
    }
}

// MARK: - IOS-38, IOS-39, IOS-40: Space Members, Invitation Share & Role Governance

public struct SpaceGovernanceView: View {
    @Environment(\.dismiss) private var dismiss

    public let space: MemorySpace

    @State private var members: [SpaceMemberDTO] = []
    @State private var inviteEmail = ""
    @State private var inviteRole = "contributor"
    @State private var generatedInviteToken: String?
    @State private var sharePassphrase = ""
    @State private var generatedShareToken: String?
    @State private var isLoading = false
    @State private var statusMessage: String?
    @State private var errorMessage: String?

    private let editableRoles = ["admin", "contributor", "viewer"]

    public init(space: MemorySpace) {
        self.space = space
    }

    public var body: some View {
        NavigationStack {
            List {
                if let statusMessage {
                    Section {
                        Text(statusMessage)
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.sageFunc)
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.error)
                    }
                }

                Section("Space Members & Role Governance (IOS-38 / IOS-40)") {
                    if isLoading && members.isEmpty {
                        ProgressView("Loading circle members...")
                    } else if members.isEmpty {
                        Text("Sign in as a space member or steward to view and govern circle roles.")
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                    } else {
                        ForEach(members) { member in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(String(member.userId.prefix(12)))
                                        .font(.subheadline.monospaced())
                                        .foregroundStyle(MemoriaTheme.ink)
                                    Text("Joined \(String(member.joinedAt.prefix(10)))")
                                        .font(.caption2)
                                        .foregroundStyle(MemoriaTheme.textSecondary)
                                }
                                Spacer()
                                if member.role == "owner" {
                                    Text("OWNER")
                                        .font(.caption2.bold())
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(MemoriaTheme.plumLight)
                                        .foregroundStyle(MemoriaTheme.plum)
                                        .clipShape(Capsule())
                                } else {
                                    Menu {
                                        ForEach(editableRoles, id: \.self) { role in
                                            Button(role.capitalized) {
                                                Task { await updateRole(userId: member.userId, role: role) }
                                            }
                                        }
                                    } label: {
                                        Label(member.role.capitalized, systemImage: "chevron.down.circle")
                                            .font(.caption.weight(.semibold))
                                            .foregroundStyle(MemoriaTheme.plum)
                                    }
                                }
                            }
                        }
                    }
                }

                Section("Invite Family Member (IOS-39)") {
                    TextField("Recipient Email", text: $inviteEmail)
                    #if os(iOS)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                    #endif
                        .autocorrectionDisabled()
                    Picker("Role", selection: $inviteRole) {
                        ForEach(editableRoles, id: \.self) { role in
                            Text(role.capitalized).tag(role)
                        }
                    }
                    Button("Send Invitation") {
                        Task { await sendInvitation() }
                    }
                    .foregroundStyle(MemoriaTheme.plum)
                    .disabled(inviteEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                    if let generatedInviteToken {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Token: \(generatedInviteToken)")
                                .font(.caption2.monospaced())
                            ShareLink(item: "Join \(space.name) on Memoria with token: \(generatedInviteToken)") {
                                Label("Share Invitation Link", systemImage: "square.and.arrow.up")
                            }
                            .foregroundStyle(MemoriaTheme.sageFunc)
                        }
                    }
                }

                Section("Passphrase Share Link (IOS-39)") {
                    SecureField("Optional Passphrase", text: $sharePassphrase)
                    Button("Generate Share Link") {
                        Task { await generateShareLink() }
                    }
                    .foregroundStyle(MemoriaTheme.sageFunc)

                    if let generatedShareToken {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("/share/\(generatedShareToken)")
                                .font(.caption2.monospaced())
                            ShareLink(item: "https://memoria.local/share/\(generatedShareToken)") {
                                Label("Share Archive Link", systemImage: "square.and.arrow.up")
                            }
                            .foregroundStyle(MemoriaTheme.plum)
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(MemoriaTheme.canvas)
            .navigationTitle("Space Governance")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task {
                await loadMembers()
            }
        }
    }

    private func loadMembers() async {
        isLoading = true
        defer { isLoading = false }
        do {
            members = try await MemoriaAPIClient.shared.fetchSpaceMembers(spaceId: space.id)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func updateRole(userId: String, role: String) async {
        do {
            let updated = try await MemoriaAPIClient.shared.updateSpaceMemberRole(
                spaceId: space.id,
                userId: userId,
                role: role
            )
            if let idx = members.firstIndex(where: { $0.userId == userId }) {
                members[idx] = updated
            }
            statusMessage = "Updated role to \(role)."
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func sendInvitation() async {
        do {
            let res = try await MemoriaAPIClient.shared.sendSpaceInvitation(
                spaceId: space.id,
                inviteeEmail: inviteEmail.trimmingCharacters(in: .whitespacesAndNewlines),
                role: inviteRole
            )
            generatedInviteToken = res.inviteToken
            inviteEmail = ""
            statusMessage = "Invitation generated for \(res.invitation.inviteeEmail)."
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func generateShareLink() async {
        do {
            let link = try await MemoriaAPIClient.shared.createShareLink(
                spaceId: space.id,
                passphrase: sharePassphrase.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            generatedShareToken = link.token
            sharePassphrase = ""
            statusMessage = "Generated protected share link."
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
