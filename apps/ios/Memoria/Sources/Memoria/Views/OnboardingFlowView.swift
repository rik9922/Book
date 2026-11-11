import SwiftUI

public struct OnboardingFlowView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selectedPurpose = "family"
    @State private var spaceName = ""
    @State private var spaceDesc = ""
    @State private var createdSpace: MemorySpace?
    @State private var profileName = ""
    @State private var statusMessage: String?
    @State private var errorMessage: String?

    private let purposes = [
        ("family", "Family Heritage"),
        ("personal", "Childhood & Personal"),
        ("event", "Wedding & Milestone"),
        ("journey", "Travel Journal"),
    ]

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
                    Section("3. Create First Loved-One Profile") {
                        TextField("Profile Name", text: $profileName)
                        Button("Add Profile to \(createdSpace.name)") {
                            Task { await createFirstProfile(spaceId: createdSpace.id) }
                        }
                        .tint(MemoriaTheme.sageFunc)
                        .disabled(profileName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
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
            statusMessage = "Profile '\(prof.name)' added. Setup complete!"
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
