import SwiftUI
import Photos

public struct SettingsView: View {
    @State private var photoStatus = "Checking..."
    @State private var cacheCleared = false

    public init() {}

    public var body: some View {
        NavigationStack {
            Form {
                Section("Permissions & Device Status") {
                    HStack {
                        Label("Photo Library", systemImage: "photo.on.rectangle.angled")
                        Spacer()
                        Text(photoStatus)
                            .foregroundStyle(photoStatus == "Authorized" ? .green : .orange)
                    }

                    HStack {
                        Label("Camera", systemImage: "camera")
                        Spacer()
                        Text("Configured")
                            .foregroundStyle(.green)
                    }

                    HStack {
                        Label("Microphone", systemImage: "mic")
                        Spacer()
                        Text("Configured")
                            .foregroundStyle(.green)
                    }
                }

                Section("Offline Storage & Cache") {
                    Button("Clear Local Cache") {
                        LocalStorageService.shared.clearCache()
                        cacheCleared = true
                    }
                    .foregroundStyle(.red)

                    if cacheCleared {
                        Text("Cache cleared successfully.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Application Identity") {
                    HStack {
                        Text("Product Name")
                        Spacer()
                        Text("Memoria")
                            .bold()
                    }
                    HStack {
                        Text("Tagline")
                        Spacer()
                        Text("Your memories, made timeless.")
                            .foregroundStyle(.secondary)
                    }
                    HStack {
                        Text("Bundle Identifier")
                        Spacer()
                        Text("com.memoria.app")
                            .font(.caption.monospaced())
                    }
                    HStack {
                        Text("Build")
                        Spacer()
                        Text("1.0.0 (Simulator Test QA)")
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Settings")
            .task {
                let status = MediaImportService.shared.checkPhotoAuthorizationStatus()
                switch status {
                case .authorized: photoStatus = "Authorized"
                case .limited: photoStatus = "Limited"
                case .denied: photoStatus = "Denied"
                case .notDetermined: photoStatus = "Not Determined"
                }
            }
        }
    }
}
