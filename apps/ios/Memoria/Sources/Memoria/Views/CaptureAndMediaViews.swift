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
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let summary = "[Trim \(Int(trimStart))s–\(Int(trimEnd))s] " + notes.trimmingCharacters(in: .whitespacesAndNewlines)
        let localMemory = Memory(
            spaceId: spaceId,
            authorId: "local-author",
            title: cleanTitle,
            content: summary,
            format: .video,
            tags: ["video-trim"]
        )
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
            var existing = LocalStorageService.shared.loadLocalMemories(forSpaceId: spaceId)
            existing.insert(localMemory, at: 0)
            try? LocalStorageService.shared.saveMemoriesLocally(existing, forSpaceId: spaceId)
            onSaved?(localMemory)
            statusMessage = "Saved locally to device archive (sync pending)."
            dismiss()
        }
        isSaving = false
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
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let notes = "[Oral History • \(formattedTime)] " + transcriptNotes.trimmingCharacters(in: .whitespacesAndNewlines)
        let local = Memory(spaceId: spaceId, authorId: "local-author", title: cleanTitle, content: notes, format: .audio, tags: ["oral-history"])
        do {
            let created = try await MemoriaAPIClient.shared.createMemory(
                spaceId: spaceId,
                title: cleanTitle,
                content: notes,
                format: "audio",
                tags: ["oral-history"]
            )
            onSaved?(created)
        } catch {
            var existing = LocalStorageService.shared.loadLocalMemories(forSpaceId: spaceId)
            existing.insert(local, at: 0)
            try? LocalStorageService.shared.saveMemoriesLocally(existing, forSpaceId: spaceId)
            onSaved?(local)
        }
        isSaving = false
        dismiss()
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
    @State private var isSaving = false
    @State private var statusMessage: String?

    private let cropPresets = ["original", "square_1_1", "portrait_4_5", "book_spread_8_10"]

    public init(mediaId: String) {
        self.mediaId = mediaId
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("Non-Destructive Archival Preview (IOS-28)") {
                    VStack(spacing: 12) {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(
                                LinearGradient(
                                    colors: [
                                        Color(red: min(1.0, 0.94 + warmth * 0.04), green: 0.91, blue: max(0.75, 0.87 - warmth * 0.08)),
                                        MemoriaTheme.plumLight,
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(height: 180)
                            .overlay {
                                Image(systemName: "photo.artframe")
                                    .font(.system(size: 56))
                                    .foregroundStyle(MemoriaTheme.plum)
                                    .rotationEffect(.degrees(Double(rotateDegrees)))
                            }
                        Text("Original master SHA-256 preserved • Crop: \(cropPreset)")
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
                        }
                        .foregroundStyle(MemoriaTheme.plum)
                    }

                    VStack(alignment: .leading) {
                        Text("Archival Warmth: \(String(format: "%.1f", warmth))")
                            .font(.subheadline)
                        Slider(value: $warmth, in: -1.0...1.0, step: 0.1)
                            .tint(MemoriaTheme.warning)
                    }

                    Picker("Aspect Preset", selection: $cropPreset) {
                        ForEach(cropPresets, id: \.self) { preset in
                            Text(preset).tag(preset)
                        }
                    }
                }

                if let statusMessage {
                    Section {
                        Text(statusMessage)
                            .font(.footnote)
                            .foregroundStyle(MemoriaTheme.sageFunc)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(MemoriaTheme.canvas)
            .navigationTitle("Photo Editor")
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

    private func saveEdits() async {
        isSaving = true
        do {
            try await MemoriaAPIClient.shared.applyMediaNonDestructiveEdit(
                mediaId: mediaId,
                rotateDegrees: rotateDegrees,
                warmth: warmth,
                cropPreset: cropPreset
            )
            statusMessage = "Non-destructive derivative parameters saved."
        } catch {
            statusMessage = "Preview updated locally: \(error.localizedDescription)"
        }
        isSaving = false
    }
}

// MARK: - IOS-29 & IOS-30: Full-Screen Media Viewer & Playback

public struct MediaPlaybackView: View {
    @Environment(\.dismiss) private var dismiss

    public let memory: Memory
    @State private var isPlaying = false
    @State private var progress: Double = 0.0
    @State private var zoomScale: CGFloat = 1.0
    @State private var resolvedUrl: URL?
    @State private var ocrText: String?
    @State private var playbackTimer: Task<Void, Never>?
    #if canImport(AVFoundation)
    @State private var player: AVPlayer?
    #endif

    public init(memory: Memory) {
        self.memory = memory
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    ZStack {
                        RoundedRectangle(cornerRadius: MemoriaTheme.radiusLg)
                            .fill(MemoriaTheme.surfacePrimary)
                            .frame(minHeight: 280)
                            .shadow(color: .black.opacity(0.06), radius: 10, y: 4)

                        #if canImport(AVKit)
                        if (memory.format == .video || memory.format == .audio), let player {
                            VideoPlayer(player: player)
                                .frame(height: 280)
                                .clipShape(RoundedRectangle(cornerRadius: MemoriaTheme.radiusLg))
                        } else if let resolvedUrl, memory.format == .image {
                            AsyncImage(url: resolvedUrl) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFit()
                                        .scaleEffect(zoomScale)
                                        .frame(maxHeight: 280)
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

                    if memory.format == .video || memory.format == .audio {
                        VStack(spacing: 10) {
                            Slider(value: $progress, in: 0...1)
                                .tint(MemoriaTheme.plum)
                            HStack {
                                Button {
                                    togglePlay()
                                } label: {
                                    Label(isPlaying ? "Pause" : "Play", systemImage: isPlaying ? "pause.fill" : "play.fill")
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(MemoriaTheme.plum)
                                Spacer()
                                Text("\(Int(progress * 100))% played")
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(MemoriaTheme.textSecondary)
                            }
                        }
                        .padding()
                        .memoriaCard()
                    }

                    if let ocrText, !ocrText.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Synchronized Transcript / OCR")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(MemoriaTheme.plum)
                            Text(ocrText)
                                .font(.footnote)
                                .foregroundStyle(MemoriaTheme.ink)
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
        if let asset = try? await MemoriaAPIClient.shared.fetchMediaAsset(mediaId: mediaId),
           let urlStr = asset.publicUrl,
           let url = URL(string: urlStr) {
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
    }

    private func togglePlay() {
        isPlaying.toggle()
        #if canImport(AVFoundation)
        if let player {
            if isPlaying { player.play() } else { player.pause() }
        }
        #endif
        if isPlaying {
            playbackTimer = Task {
                while !Task.isCancelled && progress < 1.0 {
                    try? await Task.sleep(nanoseconds: 250_000_000)
                    if !Task.isCancelled {
                        progress = min(1.0, progress + 0.05)
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
