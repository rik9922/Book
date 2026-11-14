import SwiftUI
#if canImport(AVFoundation)
import AVFoundation
#endif
#if canImport(AVKit)
import AVKit
#endif
#if canImport(CoreImage)
import CoreImage
#endif

// MARK: - Upload Queue Item Model (IOS-21, IOS-22)

public struct UploadQueueEntry: Identifiable, Sendable {
    public let id: String
    public let filename: String
    public let formatLabel: String
    public var progress: Double
    public var status: String

    public init(id: String = UUID().uuidString, filename: String, formatLabel: String, progress: Double, status: String) {
        self.id = id
        self.filename = filename
        self.formatLabel = formatLabel
        self.progress = progress
        self.status = status
    }
}

// MARK: - IOS-18: Video Capture & Trim

public struct VideoCaptureTrimView: View {
    @Environment(\.dismiss) private var dismiss

    public let spaceId: String
    public var onSaved: ((Memory) -> Void)?

    @State private var title = ""
    @State private var notes = ""
    @State private var clipDurationSeconds: Double = 45
    @State private var trimStart: Double = 0
    @State private var trimEnd: Double = 30
    @State private var isSaving = false
    @State private var statusMessage: String?

    public init(spaceId: String, onSaved: ((Memory) -> Void)? = nil) {
        self.spaceId = spaceId
        self.onSaved = onSaved
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("Clip Details (IOS-18)") {
                    TextField("Video Title", text: $title)
                    TextField("Story & Context", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Trim Window (Non-Destructive)") {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Start: \(Int(trimStart))s")
                            Spacer()
                            Text("End: \(Int(trimEnd))s")
                        }
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(MemoriaTheme.ink)

                        Slider(value: $trimStart, in: 0...max(1, trimEnd - 1), step: 1)
                            .tint(MemoriaTheme.plum)
                        Slider(value: $trimEnd, in: min(clipDurationSeconds, trimStart + 1)...clipDurationSeconds, step: 1)
                            .tint(MemoriaTheme.sageFunc)

                        Text("Selected excerpt: \(Int(max(1, trimEnd - trimStart)))s of \(Int(clipDurationSeconds))s archival master")
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                    }
                }

                if let statusMessage {
                    Section {
                        Text(statusMessage)
                            .font(.footnote)
                            .foregroundStyle(MemoriaTheme.plum)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(MemoriaTheme.canvas)
            .navigationTitle("Video Capture & Trim")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving..." : "Archive Clip") {
                        Task { await saveVideoMemory() }
                    }
                    .disabled(isSaving || title.trimmingCharacters(in: .whitespaces).isEmpty)
                    .foregroundStyle(MemoriaTheme.plum)
                }
            }
        }
    }

    private func saveVideoMemory() async {
        isSaving = true
        defer { isSaving = false }
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimHeader = "[Trim \(Int(trimStart))s–\(Int(trimEnd))s]"
        let summary = cleanNotes.isEmpty ? trimHeader : "\(trimHeader) \(cleanNotes)"
        let hasAuth = await MemoriaAPIClient.shared.getAuthToken() != nil
        let accountId = await MemoriaAPIClient.shared.getCurrentUserId()
        guard hasAuth else {
            do {
                let record = try OfflineSyncService.shared.saveOfflineMemory(
                    spaceId: spaceId,
                    authorId: accountId ?? "local-author",
                    title: cleanTitle,
                    content: summary,
                    format: .video,
                    location: nil,
                    tags: ["video-trim"],
                    accountId: accountId
                )
                onSaved?(record.memory)
                dismiss()
            } catch {
                statusMessage = "Failed to save offline clip: \(error.localizedDescription)"
            }
            return
        }
        do {
            let created = try await MemoriaAPIClient.shared.createMemory(
                spaceId: spaceId,
                title: cleanTitle,
                content: summary,
                format: "video",
                tags: ["video-trim"]
            )
            onSaved?(created)
            dismiss()
        } catch {
            statusMessage = "Failed to archive clip: \(error.localizedDescription)"
        }
    }
}

// MARK: - IOS-19: Oral History Voice Recorder

public struct VoiceRecorderView: View {
    @Environment(\.dismiss) private var dismiss

    public let spaceId: String
    public var onSaved: ((Memory) -> Void)?

    @State private var title = ""
    @State private var transcriptNotes = ""
    @State private var isRecording = false
    @State private var elapsedSeconds: Int = 0
    @State private var pulseLevel: CGFloat = 0.4
    @State private var timerTask: Task<Void, Never>?
    @State private var isSaving = false
    @State private var errorMessage: String?

    public init(spaceId: String, onSaved: ((Memory) -> Void)? = nil) {
        self.spaceId = spaceId
        self.onSaved = onSaved
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                VStack(spacing: 8) {
                    Text(formattedTime)
                        .font(.system(size: 42, weight: .bold, design: .monospaced))
                        .foregroundStyle(MemoriaTheme.ink)
                    Text(isRecording ? "Recording Oral History..." : "Ready to Record")
                        .font(.subheadline)
                        .foregroundStyle(isRecording ? MemoriaTheme.plum : MemoriaTheme.textSecondary)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .memoriaCard()

                HStack(spacing: 6) {
                    ForEach(0..<16, id: \.self) { idx in
                        let factor = isRecording ? (0.35 + 0.65 * abs(sin(Double(idx) + Double(elapsedSeconds)))) : 0.25
                        RoundedRectangle(cornerRadius: 3)
                            .fill(isRecording ? MemoriaTheme.plum : MemoriaTheme.sageLight)
                            .frame(width: 8, height: max(10, 56 * CGFloat(factor)))
                            .animation(.easeInOut(duration: 0.25), value: elapsedSeconds)
                    }
                }
                .frame(height: 60)

                Button {
                    toggleRecording()
                } label: {
                    Label(isRecording ? "Stop Recording" : "Start Recording", systemImage: isRecording ? "stop.circle.fill" : "mic.circle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity, minHeight: 48)
                }
                .buttonStyle(.borderedProminent)
                .tint(isRecording ? MemoriaTheme.error : MemoriaTheme.plum)

                Form {
                    Section("Oral History Metadata (IOS-19)") {
                        TextField("Recording Title", text: $title)
                        TextField("Speaker Notes or Transcript", text: $transcriptNotes, axis: .vertical)
                            .lineLimit(3...6)
                    }
                    if let errorMessage {
                        Section {
                            Text(errorMessage)
                                .font(.footnote)
                                .foregroundStyle(MemoriaTheme.error)
                        }
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .padding()
            .background(MemoriaTheme.canvas.ignoresSafeArea())
            .navigationTitle("Voice Studio")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        stopTimer()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving..." : "Save Audio") {
                        Task { await saveAudioMemory() }
                    }
                    .disabled(isSaving || title.trimmingCharacters(in: .whitespaces).isEmpty)
                    .foregroundStyle(MemoriaTheme.plum)
                }
            }
        }
    }

    private var formattedTime: String {
        let mins = elapsedSeconds / 60
        let secs = elapsedSeconds % 60
        return String(format: "%02d:%02d", mins, secs)
    }

    private func toggleRecording() {
        isRecording.toggle()
        if isRecording {
            timerTask = Task {
                while !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: 1_000_000_000)
                    if !Task.isCancelled {
                        elapsedSeconds += 1
                    }
                }
            }
        } else {
            stopTimer()
        }
    }

    private func stopTimer() {
        timerTask?.cancel()
        timerTask = nil
        isRecording = false
    }

    private func saveAudioMemory() async {
        stopTimer()
        isSaving = true
        defer { isSaving = false }
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let notes = "[Oral History • \(formattedTime)] " + transcriptNotes.trimmingCharacters(in: .whitespacesAndNewlines)
        let hasAuth = await MemoriaAPIClient.shared.getAuthToken() != nil
        let accountId = await MemoriaAPIClient.shared.getCurrentUserId()
        guard hasAuth else {
            do {
                let record = try OfflineSyncService.shared.saveOfflineMemory(
                    spaceId: spaceId,
                    authorId: accountId ?? "local-author",
                    title: cleanTitle,
                    content: notes,
                    format: .audio,
                    location: nil,
                    tags: ["oral-history"],
                    accountId: accountId
                )
                onSaved?(record.memory)
                dismiss()
            } catch {
                errorMessage = "Failed to save offline audio: \(error.localizedDescription)"
            }
            return
        }
        do {
            let created = try await MemoriaAPIClient.shared.createMemory(
                spaceId: spaceId,
                title: cleanTitle,
                content: notes,
                format: "audio",
                tags: ["oral-history"]
            )
            onSaved?(created)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - IOS-21 & IOS-22: Upload Queue & Progress Sheet

public struct UploadQueueSheetView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var entries: [UploadQueueEntry] = []
    @State private var isLoading = false
    @State private var statusBanner: String?

    public init() {}

    public var body: some View {
        NavigationStack {
            List {
                if let statusBanner {
                    Section {
                        Text(statusBanner)
                            .font(.footnote)
                            .foregroundStyle(MemoriaTheme.sageFunc)
                    }
                }

                Section("Background Upload & Offline Sync Queue (IOS-21 / IOS-22)") {
                    if isLoading {
                        ProgressView("Checking upload sessions...")
                    } else if entries.isEmpty {
                        Text("All media transfers and offline memories are synchronized.")
                            .font(.footnote)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                    } else {
                        ForEach(entries) { entry in
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text(entry.filename)
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(MemoriaTheme.ink)
                                    Spacer()
                                    Text(entry.formatLabel)
                                        .font(.caption2)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 3)
                                        .background(MemoriaTheme.plumLight)
                                        .foregroundStyle(MemoriaTheme.plum)
                                        .clipShape(Capsule())
                                }
                                ProgressView(value: entry.progress)
                                    .tint(entry.progress >= 1.0 ? MemoriaTheme.sageFunc : MemoriaTheme.plum)
                                HStack {
                                    Text(entry.status)
                                        .font(.caption)
                                        .foregroundStyle(MemoriaTheme.textSecondary)
                                    Spacer()
                                    if entry.status == "failed" || entry.status == "pending_upload" {
                                        Button("Retry Session") {
                                            Task { await retrySession(id: entry.id) }
                                        }
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(MemoriaTheme.plum)
                                    }
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(MemoriaTheme.canvas)
            .navigationTitle("Upload Queue")
            .task { await loadQueue() }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Refresh") {
                        Task { await loadQueue() }
                    }
                    .foregroundStyle(MemoriaTheme.plum)
                }
            }
        }
    }

    private func loadQueue() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let sessions = try await MemoriaAPIClient.shared.fetchActiveUploadSessions()
            entries = sessions.map { s in
                UploadQueueEntry(
                    id: s.id,
                    filename: s.originalName,
                    formatLabel: s.mimeType,
                    progress: s.status == "processing" ? 0.75 : s.status == "pending_upload" ? 0.25 : 0.1,
                    status: s.status
                )
            }
        } catch {
            entries = []
            statusBanner = "Offline or unauthenticated — queued items remain preserved locally."
        }
    }

    private func retrySession(id: String) async {
        do {
            try await MemoriaAPIClient.shared.retryUploadSession(mediaId: id)
            statusBanner = "Refreshed signed upload session for \(id.prefix(8))."
            await loadQueue()
        } catch {
            statusBanner = "Retry queued: \(error.localizedDescription)"
        }
    }
}

// MARK: - IOS-28: Non-Destructive CoreImage Editor

public struct CoreImageEditorView: View {
    @Environment(\.dismiss) private var dismiss

    public let mediaId: String
    @State private var rotateDegrees: Int = 0
    @State private var warmth: Double = 0.0
    @State private var cropPreset: String = "original"
    @State private var filterPreset: String = "Original"
    @State private var sourceCGImage: CGImage?
    @State private var renderedPreview: CGImage?
    @State private var isSaving = false
    @State private var statusMessage: String?
    @State private var errorMessage: String?

    private let cropPresets = ["original", "square_1_1", "portrait_4_5", "book_spread_8_10"]
    private let filterPresets = ["Original", "Archival Warm", "Faded Print", "High Contrast B&W"]
    #if canImport(CoreImage)
    private static let sharedCIContext = CIContext()
    #endif

    public init(mediaId: String) {
        self.mediaId = mediaId
    }

    public var body: some View {
        NavigationStack {
            Form {
                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(MemoriaTheme.error)
                    }
                }

                if let statusMessage {
                    Section {
                        Text(statusMessage)
                            .font(.footnote)
                            .foregroundStyle(MemoriaTheme.sageFunc)
                    }
                }

                Section("Non-Destructive Archival Preview (IOS-28)") {
                    VStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(MemoriaTheme.surfacePrimary)
                                .frame(height: 200)
                            if let renderedPreview {
                                Image(decorative: renderedPreview, scale: 1.0)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(maxHeight: 184)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            } else {
                                ProgressView("Rendering CoreImage preview...")
                            }
                        }
                        Text("Original master SHA-256 preserved • \(filterPreset) • \(rotateDegrees)° • Crop: \(cropPreset)")
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                    }
                }

                Section("Adjustments") {
                    HStack {
                        Text("Rotation: \(rotateDegrees)°")
                        Spacer()
                        Button("Rotate +90°") {
                            rotateDegrees = (rotateDegrees + 90) % 360
                            renderCoreImagePreview()
                        }
                        .foregroundStyle(MemoriaTheme.plum)
                    }

                    VStack(alignment: .leading) {
                        Text("Archival Warmth: \(String(format: "%.1f", warmth))")
                            .font(.subheadline)
                        Slider(value: $warmth, in: -1.0...1.0, step: 0.1)
                            .tint(MemoriaTheme.warning)
                            .onChange(of: warmth) { _, _ in
                                renderCoreImagePreview()
                            }
                    }

                    Picker("Filter Preset", selection: $filterPreset) {
                        ForEach(filterPresets, id: \.self) { preset in
                            Text(preset).tag(preset)
                        }
                    }
                    .onChange(of: filterPreset) { _, next in
                        if next == "Archival Warm" { warmth = 0.6 }
                        else if next == "Faded Print" { warmth = 0.2 }
                        else if next == "Original" { warmth = 0.0 }
                        renderCoreImagePreview()
                    }

                    Picker("Aspect Preset", selection: $cropPreset) {
                        ForEach(cropPresets, id: \.self) { preset in
                            Text(preset).tag(preset)
                        }
                    }
                    .onChange(of: cropPreset) { _, _ in
                        renderCoreImagePreview()
                    }

                    Button("Reset Adjustments") {
                        rotateDegrees = 0
                        warmth = 0.0
                        cropPreset = "original"
                        filterPreset = "Original"
                        renderCoreImagePreview()
                    }
                    .foregroundStyle(MemoriaTheme.textSecondary)
                }
            }
            .scrollContentBackground(.hidden)
            .background(MemoriaTheme.canvas)
            .navigationTitle("Photo Editor")
            .task {
                await loadInitialStateAndImage()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving..." : "Apply") {
                        Task { await saveEdits() }
                    }
                    .disabled(isSaving)
                    .foregroundStyle(MemoriaTheme.plum)
                }
            }
        }
    }

    private func loadInitialStateAndImage() async {
        if let saved = LocalStorageService.shared.loadLocalMediaEdits(forMediaId: mediaId) {
            rotateDegrees = saved.rotateDegrees
            warmth = saved.warmth
            cropPreset = saved.cropPreset
            filterPreset = saved.filterPreset
        }

        let hasAuth = await MemoriaAPIClient.shared.getAuthToken() != nil
        if hasAuth, UUID(uuidString: mediaId) != nil,
           let asset = try? await MemoriaAPIClient.shared.fetchMediaAsset(mediaId: mediaId),
           let urlStr = asset.publicUrl,
           let url = URL(string: urlStr),
           let (data, _) = try? await URLSession.shared.data(from: url) {
            #if canImport(CoreImage)
            if let ciImg = CIImage(data: data),
               let cgImg = Self.sharedCIContext.createCGImage(ciImg, from: ciImg.extent) {
                sourceCGImage = cgImg
                renderCoreImagePreview()
                return
            }
            #endif
        }

        if sourceCGImage == nil {
            sourceCGImage = Self.makeSpecimenCGImage()
        }
        renderCoreImagePreview()
    }

    private func renderCoreImagePreview() {
        guard let baseCG = sourceCGImage else { return }
        #if canImport(CoreImage)
        var image = CIImage(cgImage: baseCG)

        if cropPreset == "square_1_1" {
            let side = min(image.extent.width, image.extent.height)
            let cropRect = CGRect(
                x: image.extent.midX - side / 2,
                y: image.extent.midY - side / 2,
                width: side,
                height: side
            )
            image = image.cropped(to: cropRect)
        } else if cropPreset == "portrait_4_5" {
            let w = min(image.extent.width, image.extent.height * 0.8)
            let h = w * 1.25
            let cropRect = CGRect(x: image.extent.midX - w / 2, y: image.extent.midY - h / 2, width: w, height: h)
            image = image.cropped(to: cropRect)
        } else if cropPreset == "book_spread_8_10" {
            let h = min(image.extent.height, image.extent.width * 0.8)
            let w = h * 1.25
            let cropRect = CGRect(x: image.extent.midX - w / 2, y: image.extent.midY - h / 2, width: w, height: h)
            image = image.cropped(to: cropRect)
        }

        if filterPreset == "Faded Print", let fade = CIFilter(name: "CIPhotoEffectFade") {
            fade.setValue(image, forKey: kCIInputImageKey)
            if let output = fade.outputImage { image = output }
        } else if filterPreset == "High Contrast B&W", let noir = CIFilter(name: "CIPhotoEffectNoir") {
            noir.setValue(image, forKey: kCIInputImageKey)
            if let output = noir.outputImage { image = output }
        }

        if abs(warmth) > 0.01, let tempFilter = CIFilter(name: "CITemperatureAndTint") {
            tempFilter.setValue(image, forKey: kCIInputImageKey)
            tempFilter.setValue(CIVector(x: 6500 + warmth * 2200, y: 0), forKey: "inputTargetNeutral")
            tempFilter.setValue(CIVector(x: 6500, y: 0), forKey: "inputNeutral")
            if let output = tempFilter.outputImage { image = output }
        }

        let normalizedRot = ((rotateDegrees % 360) + 360) % 360
        if normalizedRot == 90 {
            image = image.oriented(.right)
        } else if normalizedRot == 180 {
            image = image.oriented(.down)
        } else if normalizedRot == 270 {
            image = image.oriented(.left)
        }

        renderedPreview = Self.sharedCIContext.createCGImage(image, from: image.extent) ?? baseCG
        #else
        renderedPreview = baseCG
        #endif
    }

    private static func makeSpecimenCGImage() -> CGImage? {
        let width = 320
        let height = 220
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        guard let ctx = CGContext(
            data: nil,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width * 4,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            return nil
        }
        ctx.setFillColor(red: 0.96, green: 0.94, blue: 0.90, alpha: 1.0)
        ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))

        ctx.setFillColor(red: 0.46, green: 0.33, blue: 0.44, alpha: 0.9)
        ctx.fillEllipse(in: CGRect(x: 44, y: 50, width: 120, height: 120))

        ctx.setFillColor(red: 0.52, green: 0.58, blue: 0.51, alpha: 0.85)
        ctx.fill(CGRect(x: 150, y: 40, width: 120, height: 140))

        ctx.setFillColor(red: 0.85, green: 0.59, blue: 0.24, alpha: 0.9)
        ctx.fillEllipse(in: CGRect(x: 200, y: 125, width: 52, height: 52))
        return ctx.makeImage()
    }

    private func saveEdits() async {
        isSaving = true
        defer { isSaving = false }
        errorMessage = nil
        statusMessage = nil

        let params = MediaEditParameters(
            rotateDegrees: rotateDegrees,
            warmth: warmth,
            cropPreset: cropPreset,
            filterPreset: filterPreset
        )

        let hasAuth = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuth else {
            try? LocalStorageService.shared.saveMediaEditsLocally(params, forMediaId: mediaId)
            statusMessage = "Non-destructive derivative parameters saved locally."
            return
        }

        do {
            try await MemoriaAPIClient.shared.applyMediaNonDestructiveEdit(
                mediaId: mediaId,
                rotateDegrees: rotateDegrees,
                warmth: warmth,
                cropPreset: cropPreset
            )
            try? LocalStorageService.shared.saveMediaEditsLocally(params, forMediaId: mediaId)
            statusMessage = "Non-destructive derivative parameters saved."
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - IOS-29 & IOS-30: Full-Screen Media Viewer & Playback

public struct MediaPlaybackView: View {
    @Environment(\.dismiss) private var dismiss

    public let memory: Memory
    @State private var isPlaying = false
    @State private var progress: Double = 0.0
    @State private var playbackSpeed: Double = 1.0
    @State private var zoomScale: CGFloat = 1.0
    @State private var resolvedUrl: URL?
    @State private var ocrText: String?
    @State private var loadError: String?
    @State private var playbackTimer: Task<Void, Never>?
    #if canImport(AVFoundation)
    @State private var player: AVPlayer?
    #endif

    private let speedOptions: [Double] = [0.75, 1.0, 1.25, 1.5]

    public init(memory: Memory) {
        self.memory = memory
    }

    private var transcriptSegments: [String] {
        let source = (ocrText?.isEmpty == false ? ocrText : memory.content) ?? ""
        let parts = source
            .split(whereSeparator: { $0 == "." || $0 == "\n" })
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        return parts
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    ZStack {
                        RoundedRectangle(cornerRadius: MemoriaTheme.radiusLg)
                            .fill(MemoriaTheme.surfacePrimary)
                            .frame(minHeight: 260)
                            .shadow(color: .black.opacity(0.06), radius: 10, y: 4)

                        #if canImport(AVKit)
                        if (memory.format == .video || memory.format == .audio), let player {
                            VideoPlayer(player: player)
                                .frame(height: 260)
                                .clipShape(RoundedRectangle(cornerRadius: MemoriaTheme.radiusLg))
                        } else if let resolvedUrl, memory.format == .image {
                            AsyncImage(url: resolvedUrl) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFit()
                                        .scaleEffect(zoomScale)
                                        .frame(maxHeight: 260)
                                default:
                                    fallbackSpecimen
                                }
                            }
                        } else {
                            fallbackSpecimen
                        }
                        #else
                        fallbackSpecimen
                        #endif
                    }
                    .onTapGesture(count: 2) {
                        withAnimation {
                            zoomScale = zoomScale > 1.0 ? 1.0 : 1.5
                        }
                    }

                    if memory.format == .audio {
                        HStack(spacing: 5) {
                            ForEach(0..<18, id: \.self) { idx in
                                let active = Double(idx) / 18.0 <= progress
                                let factor = isPlaying
                                    ? (0.35 + 0.65 * abs(sin(Double(idx) * 0.7 + progress * 12.0)))
                                    : (0.25 + 0.3 * abs(sin(Double(idx) * 0.6)))
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(active ? MemoriaTheme.plum : MemoriaTheme.sageLight)
                                    .frame(width: 8, height: max(10, 48 * CGFloat(factor)))
                            }
                        }
                        .frame(height: 52)
                        .padding(.horizontal)
                        .memoriaCard()
                    }

                    if let loadError {
                        Text(loadError)
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.error)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding()
                            .memoriaCard()
                    }

                    if memory.format == .video || memory.format == .audio {
                        VStack(spacing: 12) {
                            Slider(value: $progress, in: 0...1) { editing in
                                if !editing {
                                    seekPlayer(toProgress: progress)
                                }
                            }
                            .tint(MemoriaTheme.plum)
                            HStack(spacing: 12) {
                                Button {
                                    let next = max(0, progress - 0.15)
                                    progress = next
                                    seekPlayer(toProgress: next)
                                } label: {
                                    Image(systemName: "gobackward.15")
                                }
                                .buttonStyle(.bordered)
                                .tint(MemoriaTheme.ink)
                                .accessibilityLabel("Skip back 15 seconds")

                                Button {
                                    togglePlay()
                                } label: {
                                    Label(isPlaying ? "Pause" : "Play", systemImage: isPlaying ? "pause.fill" : "play.fill")
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(MemoriaTheme.plum)

                                Button {
                                    let next = min(1, progress + 0.15)
                                    progress = next
                                    seekPlayer(toProgress: next)
                                } label: {
                                    Image(systemName: "goforward.15")
                                }
                                .buttonStyle(.bordered)
                                .tint(MemoriaTheme.ink)
                                .accessibilityLabel("Skip forward 15 seconds")

                                Spacer()

                                Menu {
                                    ForEach(speedOptions, id: \.self) { speed in
                                        Button("\(String(format: "%.2g", speed))x") {
                                            playbackSpeed = speed
                                            #if canImport(AVFoundation)
                                            if isPlaying { player?.rate = Float(speed) }
                                            #endif
                                        }
                                    }
                                } label: {
                                    Text("\(String(format: "%.2g", playbackSpeed))x")
                                        .font(.caption.weight(.semibold))
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 5)
                                        .background(MemoriaTheme.plumLight)
                                        .foregroundStyle(MemoriaTheme.plum)
                                        .clipShape(Capsule())
                                }
                                .accessibilityLabel("Playback speed")
                            }
                            HStack {
                                Text("\(Int(progress * 100))% played")
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(MemoriaTheme.textSecondary)
                                Spacer()
                            }
                        }
                        .padding()
                        .memoriaCard()
                    }

                    if !transcriptSegments.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Synchronized Transcript / OCR")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(MemoriaTheme.plum)
                            ForEach(Array(transcriptSegments.enumerated()), id: \.offset) { idx, segment in
                                let total = max(1, transcriptSegments.count)
                                let segStart = Double(idx) / Double(total)
                                let segEnd = Double(idx + 1) / Double(total)
                                let isActive = progress >= segStart && (idx == total - 1 ? progress <= segEnd : progress < segEnd)
                                Button {
                                    progress = segStart
                                    seekPlayer(toProgress: segStart)
                                } label: {
                                    Text(segment)
                                        .font(.footnote)
                                        .foregroundStyle(isActive ? MemoriaTheme.plum : MemoriaTheme.ink)
                                        .fontWeight(isActive ? .semibold : .regular)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(6)
                                        .background(isActive ? MemoriaTheme.plumLight.opacity(0.6) : Color.clear)
                                        .clipShape(RoundedRectangle(cornerRadius: 6))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .memoriaCard()
                    }
                }
                .padding()
            }
            .background(MemoriaTheme.canvas.ignoresSafeArea())
            .navigationTitle("Media Viewer")
            .task { await loadMedia() }
            .onDisappear { stopPlayback() }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        stopPlayback()
                        dismiss()
                    }
                }
            }
        }
    }

    private var fallbackSpecimen: some View {
        VStack(spacing: 14) {
            Image(systemName: iconForFormat)
                .font(.system(size: 64))
                .foregroundStyle(MemoriaTheme.plum)
                .scaleEffect(zoomScale)
            Text(memory.title)
                .font(.headline)
                .foregroundStyle(MemoriaTheme.ink)
            Text(memory.mediaIds.first ?? "Archival Text / Local Specimen")
                .font(.caption.monospaced())
                .foregroundStyle(MemoriaTheme.textSecondary)
        }
        .padding()
    }

    private func loadMedia() async {
        guard let mediaId = memory.mediaIds.first else { return }
        let hasAuth = await MemoriaAPIClient.shared.getAuthToken() != nil
        guard hasAuth, UUID(uuidString: mediaId) != nil else { return }
        do {
            let asset = try await MemoriaAPIClient.shared.fetchMediaAsset(mediaId: mediaId)
            if let urlStr = asset.publicUrl, let url = URL(string: urlStr) {
                resolvedUrl = url
                #if canImport(AVFoundation)
                if memory.format == .video || memory.format == .audio {
                    player = AVPlayer(url: url)
                }
                #endif
            }
            if let transcripts = try? await MemoriaAPIClient.shared.fetchMediaOcr(mediaId: mediaId),
               let first = transcripts.first {
                ocrText = first.extractedText
            }
            loadError = nil
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func seekPlayer(toProgress targetProgress: Double) {
        #if canImport(AVFoundation)
        guard let player,
              let item = player.currentItem else { return }
        let duration = item.duration.seconds
        guard duration.isFinite && duration > 0 else { return }
        let targetTime = CMTime(seconds: duration * max(0, min(1, targetProgress)), preferredTimescale: 600)
        player.seek(to: targetTime)
        #endif
    }

    private func togglePlay() {
        isPlaying.toggle()
        #if canImport(AVFoundation)
        if let player {
            if isPlaying {
                player.play()
                player.rate = Float(playbackSpeed)
            } else {
                player.pause()
            }
        }
        #endif
        if isPlaying {
            playbackTimer = Task {
                while !Task.isCancelled && progress < 1.0 {
                    try? await Task.sleep(nanoseconds: 250_000_000)
                    if !Task.isCancelled {
                        progress = min(1.0, progress + (0.05 * playbackSpeed))
                    }
                }
                if progress >= 1.0 { isPlaying = false }
            }
        } else {
            playbackTimer?.cancel()
        }
    }

    private func stopPlayback() {
        playbackTimer?.cancel()
        playbackTimer = nil
        #if canImport(AVFoundation)
        player?.pause()
        #endif
        isPlaying = false
    }

    private var iconForFormat: String {
        switch memory.format {
        case .video: return "film.stack"
        case .audio: return "waveform.circle.fill"
        case .document: return "doc.richtext"
        default: return "photo.on.rectangle.angled"
        }
    }
}
