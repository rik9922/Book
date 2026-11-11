import SwiftUI

public struct TrashRecoveryView: View {
    public let spaceId: String
    @State private var trashedMemories: [Memory] = []
    @State private var isLoading = false
    @State private var statusMessage: String?

    public init(spaceId: String) {
        self.spaceId = spaceId
    }

    public var body: some View {
        List {
            if let statusMessage {
                Section {
                    Text(statusMessage)
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.sageFunc)
                }
            }

            Section("30-Day Soft-Deleted Archive") {
                if isLoading && trashedMemories.isEmpty {
                    ProgressView("Checking Trash...")
                } else if trashedMemories.isEmpty {
                    Text("No deleted memories awaiting recovery.")
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                } else {
                    ForEach(trashedMemories) { memory in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(memory.title)
                                    .font(.headline)
                                    .foregroundStyle(MemoriaTheme.ink)
                                Text(String(memory.capturedAt.prefix(10)))
                                    .font(.caption2)
                                    .foregroundStyle(MemoriaTheme.textSecondary)
                            }
                            Spacer()
                            Button("Restore") {
                                Task { await restore(memory) }
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(MemoriaTheme.sageFunc)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(MemoriaTheme.canvas)
        .navigationTitle("Trash Recovery")
        .task {
            await load()
        }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        if let items = try? await MemoriaAPIClient.shared.fetchTrashMemories(spaceId: spaceId) {
            trashedMemories = items
        }
    }

    private func restore(_ memory: Memory) async {
        do {
            _ = try await MemoriaAPIClient.shared.restoreMemory(memoryId: memory.id)
            trashedMemories.removeAll { $0.id == memory.id }
            statusMessage = "Restored '\(memory.title)' to your Living Archive."
        } catch {
            statusMessage = error.localizedDescription
        }
    }
}
