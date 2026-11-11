import SwiftUI

public struct ProfilesDirectoryView: View {
    public let spaceId: String
    @State private var profiles: [SpaceProfileDTO] = []
    @State private var name = ""
    @State private var relationship = ""
    @State private var profileType = "child"
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
                if profiles.isEmpty {
                    Text("No profiles in this memory space yet.")
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                } else {
                    ForEach(profiles) { profile in
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
        .scrollContentBackground(.hidden)
        .background(MemoriaTheme.canvas)
        .navigationTitle("People & Profiles")
        .task {
            await load()
        }
    }

    private func load() async {
        do {
            profiles = try await MemoriaAPIClient.shared.fetchProfiles(spaceId: spaceId)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func addProfile() async {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        do {
            let created = try await MemoriaAPIClient.shared.createProfile(
                spaceId: spaceId,
                name: trimmed,
                type: profileType,
                relationship: relationship.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            profiles.append(created)
            name = ""
            relationship = ""
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
