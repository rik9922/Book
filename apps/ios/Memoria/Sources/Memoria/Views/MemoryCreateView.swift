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

    private static func detectImageFormat(data: Data) -> (mimeType: String, ext: String) {
        let bytes = [UInt8](data.prefix(12))
        if bytes.count >= 4 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 {
            return ("image/png", "png")
        }
        if bytes.count >= 12 && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 &&
            bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50 {
            return ("image/webp", "webp")
        }
        if bytes.count >= 12 && bytes[4] == 0x66 && bytes[5] == 0x74 && bytes[6] == 0x79 && bytes[7] == 0x70 {
            return ("image/heic", "heic")
        }
        if bytes.count >= 3 && bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 {
            return ("image/gif", "gif")
        }
        return ("image/jpeg", "jpg")
    }

    private func saveMemory() async {
        isSaving = true
        errorMessage = nil

        let tags = tagsString
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanContent = content.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanLocation = location.trimmingCharacters(in: .whitespacesAndNewlines)

        let hasAuth = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuth else {
            let localMemory = Memory(
                spaceId: spaceId,
                authorId: "local-author",
                title: cleanTitle,
                content: cleanContent.isEmpty ? nil : cleanContent,
                format: selectedItem != nil ? .image : .story,
                location: cleanLocation.isEmpty ? nil : cleanLocation,
                tags: tags
            )
            try? LocalStorageService.shared.upsertLocalMemory(localMemory)
            onCreated?(localMemory)
            isSaving = false
            dismiss()
            return
        }

        do {
            var uploadedMediaIds: [String] = []
            if let selectedItem,
               let imageData = try await selectedItem.loadTransferable(type: Data.self) {
                let detected = Self.detectImageFormat(data: imageData)
                let mediaId = try await MemoriaAPIClient.shared.uploadMedia(
                    spaceId: spaceId,
                    fileName: "memory_\(UUID().uuidString.prefix(8)).\(detected.ext)",
                    mimeType: detected.mimeType,
                    data: imageData
                )
                uploadedMediaIds.append(mediaId)
            }

            let resolvedFormat = uploadedMediaIds.isEmpty ? "story" : "image"
            let memory = try await MemoriaAPIClient.shared.createMemory(
                spaceId: spaceId,
                title: cleanTitle,
                content: cleanContent.isEmpty ? nil : cleanContent,
                format: resolvedFormat,
                location: cleanLocation.isEmpty ? nil : cleanLocation,
                tags: tags,
                mediaIds: uploadedMediaIds
            )
            onCreated?(memory)
            dismiss()
        } catch {
            errorMessage = "Failed to save: \(error.localizedDescription)"
        }

        isSaving = false
    }
}
