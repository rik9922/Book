import SwiftUI

public struct OnboardingFlowView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selectedPurpose = "family"
    @State private var spaceName = ""
    @State private var spaceDesc = ""
    @State private var createdSpace: MemorySpace?
    @State private var profileName = ""
    @State private var inviteEmail = ""
    @State private var inviteRole = "contributor"
    @State private var generatedInviteToken: String?
    @State private var statusMessage: String?
    @State private var errorMessage: String?

    private let purposes = [
        ("family", "Family Heritage"),
        ("personal", "Childhood & Personal"),
        ("event", "Wedding & Milestone"),
        ("journey", "Travel Journal"),
    ]
    private let roles = ["admin", "contributor", "viewer"]

    public init() {}

    public var body: some View {
        NavigationStack {
            Form {
                Section("1. Choose Archival Purpose") {
                    Picker("Purpose", selection: $selectedPurpose) {
                        ForEach(purposes, id: \.0) { item in
                            Text(item.1).tag(item.0)
                        }
                    }
                }

                Section("2. Create First Memory Space") {
                    TextField("Space Title (e.g. Bennett Family Vault)", text: $spaceName)
                    TextField("Description (optional)", text: $spaceDesc)
                    Button("Create Memory Space") {
                        Task { await createFirstSpace() }
                    }
                    .tint(MemoriaTheme.plum)
                    .disabled(spaceName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }

                if let createdSpace {
                    Section("3. Create First Loved-One Profile (IOS-09)") {
                        TextField("Profile Name", text: $profileName)
                        Button("Add Profile to \(createdSpace.name)") {
                            Task { await createFirstProfile(spaceId: createdSpace.id) }
                        }
                        .tint(MemoriaTheme.sageFunc)
                        .disabled(profileName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }

                    Section("4. Invite Family Circle Member (IOS-10)") {
                        TextField("Family Member Email", text: $inviteEmail)
                        #if os(iOS)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                        #endif
                            .autocorrectionDisabled()
                        Picker("Circle Role", selection: $inviteRole) {
                            ForEach(roles, id: \.self) { role in
                                Text(role.capitalized).tag(role)
                            }
                        }
                        Button("Send Circle Invitation") {
                            Task { await sendInvitation(spaceId: createdSpace.id) }
                        }
                        .tint(MemoriaTheme.plum)
                        .disabled(inviteEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                        if let generatedInviteToken {
                            Text("Invite Token: \(generatedInviteToken)")
                                .font(.caption2.monospaced())
                                .foregroundStyle(MemoriaTheme.ink)
                        }
                    }
                }

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
            }
            .navigationTitle("Heirloom Setup")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func createFirstSpace() async {
        do {
            let space = try await MemoriaAPIClient.shared.createSpace(
                name: spaceName.trimmingCharacters(in: .whitespacesAndNewlines),
                type: selectedPurpose,
                description: spaceDesc
            )
            createdSpace = space
            statusMessage = "Space '\(space.name)' created."
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func createFirstProfile(spaceId: String) async {
        do {
            let prof = try await MemoriaAPIClient.shared.createProfile(
                spaceId: spaceId,
                name: profileName.trimmingCharacters(in: .whitespacesAndNewlines),
                type: "child",
                relationship: "Family"
            )
            statusMessage = "Profile '\(prof.name)' added. Invite family below or tap Done!"
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func sendInvitation(spaceId: String) async {
        do {
            let res = try await MemoriaAPIClient.shared.sendSpaceInvitation(
                spaceId: spaceId,
                inviteeEmail: inviteEmail.trimmingCharacters(in: .whitespacesAndNewlines),
                role: inviteRole
            )
            generatedInviteToken = res.inviteToken
            statusMessage = "Invitation dispatched to \(res.invitation.inviteeEmail) as \(res.invitation.role)."
            inviteEmail = ""
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
