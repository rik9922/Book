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
                        Label(selectedItem == nil ? "Select Photo from Library" : "Photo Selected", systemImage: "photo.badge.plus")
                            .foregroundStyle(Color(red: 0.89, green: 0.72, blue: 0.33))
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
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
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await saveMemory()
                        }
                    }
                    .disabled(title.isEmpty || isSaving)
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
            let created = try await MemoriaAPIClient.shared.createMemory(
                spaceId: spaceId,
                title: title,
                content: content,
                format: .photo,
                location: location.isEmpty ? nil : location,
                tags: tags
            )
            onCreated?(created)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
