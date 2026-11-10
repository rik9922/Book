import SwiftUI
import Photos
import AVFoundation

public struct SettingsView: View {
    @State private var photoStatus = "Checking..."
    @State private var cameraStatus = "Checking..."
    @State private var microphoneStatus = "Checking..."
    @State private var cacheCleared = false

    public init() {}

    public var body: some View {
        NavigationStack {
            Form {
                Section("Permissions & Device Status") {
                    HStack {
                        Label("Photo Library", systemImage: "photo.on.rectangle.angled")
                            .foregroundStyle(MemoriaTheme.textPrimary)
                        Spacer()
                        Text(photoStatus)
                            .foregroundStyle(statusColor(photoStatus))
                    }

                    HStack {
                        Label("Camera", systemImage: "camera")
                            .foregroundStyle(MemoriaTheme.textPrimary)
                        Spacer()
                        Text(cameraStatus)
                            .foregroundStyle(statusColor(cameraStatus))
                    }

                    HStack {
                        Label("Microphone", systemImage: "mic")
                            .foregroundStyle(MemoriaTheme.textPrimary)
                        Spacer()
                        Text(microphoneStatus)
                            .foregroundStyle(statusColor(microphoneStatus))
                    }
                }

                Section("Offline Storage & Cache") {
                    Button("Clear Local Archive Cache") {
                        LocalStorageService.shared.clearCache()
                        cacheCleared = true
                    }
                    .foregroundStyle(MemoriaTheme.error)

                    if cacheCleared {
                        Text("Disposable image & feed cache cleared. Pending offline memories and book states were preserved.")
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                    }
                }

                Section("Application Identity") {
                    HStack {
                        Text("Product Name")
                            .foregroundStyle(MemoriaTheme.textPrimary)
                        Spacer()
                        Text("Memoria")
                            .bold()
                            .foregroundStyle(MemoriaTheme.ink)
                    }
                    HStack {
                        Text("Tagline")
                            .foregroundStyle(MemoriaTheme.textPrimary)
                        Spacer()
                        Text("Your memories, made timeless.")
                            .foregroundStyle(MemoriaTheme.textSecondary)
                    }
                    HStack {
                        Text("Design Theme")
                            .foregroundStyle(MemoriaTheme.textPrimary)
                        Spacer()
                        Text("Living Archive (Light)")
                            .font(.caption.weight(.medium))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(MemoriaTheme.sageLight)
                            .foregroundStyle(MemoriaTheme.sageFunc)
                            .clipShape(Capsule())
                    }
                }

                #if DEBUG
                Section("Developer Diagnostics") {
                    NavigationLink {
                        RenderingDiagnosticsView()
                    } label: {
                        Label("3D Rendering Engine Diagnostics", systemImage: "gauge.with.dots.needle.33percent")
                            .foregroundStyle(MemoriaTheme.plum)
                    }
                }
                #endif
            }
            .navigationTitle("Settings")
            .task {
                checkPermissions()
            }
        }
    }

    private func statusColor(_ status: String) -> Color {
        status == "Authorized" ? MemoriaTheme.success : MemoriaTheme.warning
    }

    private func checkPermissions() {
        let photoAuth = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        switch photoAuth {
        case .authorized, .limited:
            photoStatus = "Authorized"
        case .denied, .restricted:
            photoStatus = "Denied"
        case .notDetermined:
            photoStatus = "Not Determined"
        @unknown default:
            photoStatus = "Unknown"
        }

        let videoAuth = AVCaptureDevice.authorizationStatus(for: .video)
        switch videoAuth {
        case .authorized:
            cameraStatus = "Authorized"
        case .denied, .restricted:
            cameraStatus = "Denied"
        case .notDetermined:
            cameraStatus = "Not Determined"
        @unknown default:
            cameraStatus = "Unknown"
        }

        let audioAuth = AVCaptureDevice.authorizationStatus(for: .audio)
        switch audioAuth {
        case .authorized:
            microphoneStatus = "Authorized"
        case .denied, .restricted:
            microphoneStatus = "Denied"
        case .notDetermined:
            microphoneStatus = "Not Determined"
        @unknown default:
            microphoneStatus = "Unknown"
        }
    }
}
