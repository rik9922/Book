import SwiftUI
import Photos
import AVFoundation

public struct SettingsView: View {
    @State private var photoStatus = "Checking..."
    @State private var cameraStatus = "Checking..."
    @State private var microphoneStatus = "Checking..."
    @State private var cacheCleared = false
    @State private var showOnboarding = false
    @State private var showSupportHelp = false
    @State private var biometricLock = UserDefaults.standard.bool(forKey: "memoria_biometric_lock")
    @State private var reducedMotion = UserDefaults.standard.bool(forKey: "memoria_reduced_motion")
    @State private var isHydratingPreferences = true
    @State private var storageBreakdown: StorageBreakdownDTO?
    @State private var preferenceStatus: String?

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

                Section("Privacy & Security (IOS-54)") {
                    Toggle("Require Face ID / Biometric Lock", isOn: $biometricLock)
                        .tint(MemoriaTheme.plum)
                        .onChange(of: biometricLock) { _, nextVal in
                            UserDefaults.standard.set(nextVal, forKey: "memoria_biometric_lock")
                            guard !isHydratingPreferences else { return }
                            Task { await savePreferences() }
                        }
                    Toggle("Reduce 3D Book Animations", isOn: $reducedMotion)
                        .tint(MemoriaTheme.sageFunc)
                        .onChange(of: reducedMotion) { _, nextVal in
                            UserDefaults.standard.set(nextVal, forKey: "memoria_reduced_motion")
                            guard !isHydratingPreferences else { return }
                            Task { await savePreferences() }
                        }
                    if let preferenceStatus {
                        Text(preferenceStatus)
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.sageFunc)
                    }
                }

                Section("Offline Storage & Cache (IOS-55)") {
                    if let storageBreakdown {
                        HStack {
                            Text("Remote Vault Assets (\(storageBreakdown.assetCount))")
                            Spacer()
                            Text(ByteCountFormatter.string(fromByteCount: Int64(storageBreakdown.usedBytes), countStyle: .file))
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(MemoriaTheme.ink)
                        }
                    }
                    Button("Refresh Storage Breakdown") {
                        Task { await loadStorageBreakdown() }
                    }
                    .foregroundStyle(MemoriaTheme.plum)

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

                Section("Support & Help (IOS-56)") {
                    Button("Help Guides & Submit Support Ticket") {
                        showSupportHelp = true
                    }
                    .foregroundStyle(MemoriaTheme.plum)
                }

                Section("Application Identity") {
                    Button("Run Guided Archive Onboarding") {
                        showOnboarding = true
                    }
                    .foregroundStyle(MemoriaTheme.plum)

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
            .sheet(isPresented: $showOnboarding) {
                OnboardingFlowView()
            }
            .sheet(isPresented: $showSupportHelp) {
                SupportHelpSheetView()
            }
            .task {
                checkPermissions()
                await loadPreferences()
                await loadStorageBreakdown()
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

    private func loadPreferences() async {
        isHydratingPreferences = true
        defer { isHydratingPreferences = false }
        guard await MemoriaAPIClient.shared.getAuthToken() != nil else { return }
        if let prefs = try? await MemoriaAPIClient.shared.fetchPreferences() {
            if let bio = prefs.biometricLock {
                biometricLock = bio
                UserDefaults.standard.set(bio, forKey: "memoria_biometric_lock")
            }
            if let rm = prefs.reducedMotion {
                reducedMotion = rm
                UserDefaults.standard.set(rm, forKey: "memoria_reduced_motion")
            }
        }
    }

    private func savePreferences() async {
        UserDefaults.standard.set(biometricLock, forKey: "memoria_biometric_lock")
        UserDefaults.standard.set(reducedMotion, forKey: "memoria_reduced_motion")
        do {
            _ = try await MemoriaAPIClient.shared.updatePreferences(
                biometricLock: biometricLock,
                reducedMotion: reducedMotion
            )
            preferenceStatus = "Preferences synced to archival profile."
        } catch {
            preferenceStatus = "Saved locally on device (sign in to sync)."
        }
    }

    private func loadStorageBreakdown() async {
        guard await MemoriaAPIClient.shared.getAuthToken() != nil else { return }
        var targetSpaceId = UserDefaults.standard.string(forKey: "memoria_active_space_id")
        if let spaces = try? await MemoriaAPIClient.shared.fetchSpaces(), !spaces.isEmpty {
            if targetSpaceId == nil || !spaces.contains(where: { $0.id == targetSpaceId }) {
                targetSpaceId = spaces[0].id
            }
        }
        guard let spaceId = targetSpaceId else { return }
        storageBreakdown = try? await MemoriaAPIClient.shared.fetchStorageBreakdown(spaceId: spaceId)
    }
}
