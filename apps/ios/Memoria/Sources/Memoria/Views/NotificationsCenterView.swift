import SwiftUI

public struct NotificationsCenterView: View {
    @State private var notifications: [NotificationItemDTO] = []
    @State private var errorMessage: String?

    public init() {}

    public var body: some View {
        List {
            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.error)
                }
            }

            Section {
                Button("Mark All Notifications Read") {
                    Task { await markAllRead() }
                }
                .foregroundStyle(MemoriaTheme.plum)
            }

            Section("Recent Activity (\(notifications.count))") {
                if notifications.isEmpty {
                    Text("All caught up — no pending notifications.")
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                } else {
                    ForEach(notifications) { item in
                        HStack(alignment: .top, spacing: 10) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.title)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(MemoriaTheme.ink)
                                Text(item.body)
                                    .font(.caption)
                                    .foregroundStyle(MemoriaTheme.textSecondary)
                            }
                            Spacer()
                            if !item.isRead {
                                Button("Read") {
                                    Task { await markRead(item.id) }
                                }
                                .buttonStyle(.bordered)
                                .tint(MemoriaTheme.sageFunc)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(MemoriaTheme.canvas)
        .navigationTitle("Notifications")
        .task {
            await load()
        }
    }

    private func load() async {
        do {
            notifications = try await MemoriaAPIClient.shared.fetchNotifications()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func markRead(_ id: String) async {
        try? await MemoriaAPIClient.shared.markNotificationRead(id: id)
        await load()
    }

    private func markAllRead() async {
        try? await MemoriaAPIClient.shared.markAllNotificationsRead()
        await load()
    }
}
