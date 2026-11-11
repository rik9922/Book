import SwiftUI

public struct FamilyCirclesView: View {
    @State private var spaces: [MemorySpace] = []
    @State private var notifications: [NotificationItemDTO] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showAuthSheet = false

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
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }

                Section("Circle Tools") {
                    if let firstSpaceId = spaces.first?.id {
                        NavigationLink("People & Profiles Directory") {
                            ProfilesDirectoryView(spaceId: firstSpaceId)
                        }
                    }
                    NavigationLink("Notification Center") {
                        NotificationsCenterView()
                    }
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
