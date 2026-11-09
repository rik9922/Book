import SwiftUI
import PhotosUI

public struct MemoryCreateView: View {
    @Environment(\.dismiss) private var dismiss

    public let spaceId: String
    public var onCreated: ((Memory) -> Void)?

    @State private var title = ""
    @State private var content = ""
    @State private var location = ""
    @State private var tagsString = "family, heirloom"
    @State private var selectedItem: PhotosPickerItem?
    @State private var isSaving = false
    @State private var errorMessage: String?

    public init(spaceId: String, onCreated: ((Memory) -> Void)? = nil) {
        self.spaceId = spaceId
        self.onCreated = onCreated
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("Memory Details") {
                    TextField("Title (e.g. Anniversary Dinner)", text: $title)
                    TextField("Story / Content", text: $content, axis: .vertical)
                        .lineLimit(4...8)
                    TextField("Location", text: $location)
                    TextField("Tags (comma separated)", text: $tagsString)
                }

                Section("Media Asset") {
                    PhotosPicker(selection: $selectedItem, matching: .images) {
                        Label("Select Photo from Library", systemImage: "photo.badge.plus")
                            .foregroundStyle(MemoriaTheme.plum)
                    }

                    if selectedItem != nil {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(MemoriaTheme.success)
                            Text("Photo asset attached")
                                .font(.caption)
                                .foregroundStyle(MemoriaTheme.textSecondary)
                        }
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(MemoriaTheme.error)
                    }
                }
            }
            .navigationTitle("New Memory")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundStyle(MemoriaTheme.textSecondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save Memory") {
                        Task {
                            await saveMemory()
                        }
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
                    .foregroundStyle(MemoriaTheme.plum)
                }
            }
        }
    }

    private func saveMemory() async {
        isSaving = true
        errorMessage = nil

        let tags = tagsString
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        do {
            let memory = try await MemoriaAPIClient.shared.createMemory(
                spaceId: spaceId,
                title: title,
                content: content.isEmpty ? nil : content,
                format: "image",
                location: location.isEmpty ? nil : location,
                tags: tags,
                mediaIds: []
            )
            onCreated?(memory)
            dismiss()
        } catch {
            errorMessage = "Failed to save: \(error.localizedDescription)"
        }

        isSaving = false
    }
}
