import SwiftUI

// MARK: - IOS-01: Launch Splash View

public struct LaunchSplashView: View {
    public var onContinue: () -> Void

    @State private var opacity: Double = 1.0

    public init(onContinue: @escaping () -> Void) {
        self.onContinue = onContinue
    }

    public var body: some View {
        ZStack {
            MemoriaTheme.canvas.ignoresSafeArea()
            VStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(MemoriaTheme.plumLight)
                        .frame(width: 92, height: 92)
                    Image(systemName: "book.closed.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(MemoriaTheme.plum)
                }
                Text("Memoria")
                    .font(.largeTitle.bold())
                    .foregroundStyle(MemoriaTheme.ink)
                Text("Your memories, made timeless.")
                    .font(.subheadline)
                    .foregroundStyle(MemoriaTheme.textSecondary)
            }
        }
        .opacity(opacity)
        .onAppear {
            Task {
                try? await Task.sleep(nanoseconds: 650_000_000)
                withAnimation(.easeOut(duration: 0.35)) {
                    opacity = 0.0
                }
                try? await Task.sleep(nanoseconds: 350_000_000)
                onContinue()
            }
        }
        .onTapGesture {
            onContinue()
        }
    }
}

// MARK: - IOS-12 & IOS-13: Space Overview & Switcher Sheet

public struct SpaceOverviewSheet: View {
    @Environment(\.dismiss) private var dismiss

    @Binding public var activeSpaceId: String
    @State private var spaces: [MemorySpace] = []
    @State private var newSpaceName = ""
    @State private var newSpaceDesc = ""
    @State private var isCreating = false
    @State private var statusMessage: String?

    public init(activeSpaceId: Binding<String>) {
        self._activeSpaceId = activeSpaceId
    }

    public var body: some View {
        NavigationStack {
            List {
                Section("Active Family & Personal Spaces (IOS-12)") {
                    if spaces.isEmpty {
                        Button {
                            activeSpaceId = "space-demo"
                            dismiss()
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Bennett Heritage Vault (Demo)")
                                        .font(.headline)
                                        .foregroundStyle(MemoriaTheme.ink)
                                    Text("Default local specimen vault")
                                        .font(.caption)
                                        .foregroundStyle(MemoriaTheme.textSecondary)
                                }
                                Spacer()
                                if activeSpaceId == "space-demo" {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(MemoriaTheme.plum)
                                }
                            }
                        }
                    } else {
                        ForEach(spaces) { space in
                            Button {
                                activeSpaceId = space.id
                                dismiss()
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(space.name)
                                            .font(.headline)
                                            .foregroundStyle(MemoriaTheme.ink)
                                        if let desc = space.description, !desc.isEmpty {
                                            Text(desc)
                                                .font(.caption)
                                                .foregroundStyle(MemoriaTheme.textSecondary)
                                        }
                                    }
                                    Spacer()
                                    if activeSpaceId == space.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(MemoriaTheme.plum)
                                    }
                                }
                            }
                        }
                    }
                }

                Section("Create New Vault (IOS-13)") {
                    TextField("Vault Name (e.g. Rivera Family)", text: $newSpaceName)
                    TextField("Description (optional)", text: $newSpaceDesc)
                    Button(isCreating ? "Creating..." : "Create Vault") {
                        Task { await createSpace() }
                    }
                    .disabled(isCreating || newSpaceName.trimmingCharacters(in: .whitespaces).isEmpty)
                    .foregroundStyle(MemoriaTheme.plum)
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
            .navigationTitle("Memory Spaces")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task {
                if let fetched = try? await MemoriaAPIClient.shared.fetchSpaces() {
                    spaces = fetched
                }
            }
        }
    }

    private func createSpace() async {
        isCreating = true
        do {
            let created = try await MemoriaAPIClient.shared.createSpace(
                name: newSpaceName.trimmingCharacters(in: .whitespacesAndNewlines),
                description: newSpaceDesc.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            spaces.append(created)
            activeSpaceId = created.id
            newSpaceName = ""
            newSpaceDesc = ""
            statusMessage = "Vault created and selected."
        } catch {
            statusMessage = "Sign in first to sync a new remote vault."
        }
        isCreating = false
    }
}

// MARK: - IOS-23, IOS-24, IOS-25: Timeline, Calendar & Location View

public struct TimelineCalendarView: View {
    public enum BrowseMode: String, CaseIterable, Identifiable {
        case timeline = "Timeline"
        case calendar = "Calendar"
        case locations = "Locations"
        public var id: String { rawValue }
    }

    public let spaceId: String
    public let localMemories: [Memory]

    @State private var mode: BrowseMode = .timeline
    @State private var timelineGroups: [TimelineGroupDTO] = []
    @State private var anniversaries: [CalendarAnniversaryDTO] = []
    @State private var calendarDays: [String: [Memory]] = [:]

    public init(spaceId: String, localMemories: [Memory] = []) {
        self.spaceId = spaceId
        self.localMemories = localMemories
    }

    public var body: some View {
        VStack(spacing: 12) {
            Picker("Browse Mode", selection: $mode) {
                ForEach(BrowseMode.allCases) { item in
                    Text(item.rawValue).tag(item)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)

            List {
                switch mode {
                case .timeline:
                    if timelineGroups.isEmpty {
                        Section("Local Chronology") {
                            ForEach(localMemories) { memory in
                                NavigationLink {
                                    MemoryDetailView(memory: memory)
                                } label: {
                                    timelineRow(memory)
                                }
                            }
                        }
                    } else {
                        ForEach(timelineGroups) { group in
                            Section(group.yearMonth) {
                                ForEach(group.items) { memory in
                                    NavigationLink {
                                        MemoryDetailView(memory: memory)
                                    } label: {
                                        timelineRow(memory)
                                    }
                                }
                            }
                        }
                    }

                case .calendar:
                    if !anniversaries.isEmpty {
                        Section("Family Anniversaries & Birthdays") {
                            ForEach(anniversaries) { item in
                                HStack {
                                    Image(systemName: "gift.fill")
                                        .foregroundStyle(MemoriaTheme.warning)
                                    VStack(alignment: .leading) {
                                        Text(item.name)
                                            .font(.subheadline.weight(.semibold))
                                        Text("\(item.relationship ?? "Family") • \(item.birthDate ?? "")")
                                            .font(.caption)
                                            .foregroundStyle(MemoriaTheme.textSecondary)
                                    }
                                }
                            }
                        }
                    }
                    Section("Dated Captures") {
                        let sortedDays = calendarDays.keys.sorted(by: >)
                        if sortedDays.isEmpty {
                            ForEach(localMemories) { memory in
                                timelineRow(memory)
                            }
                        } else {
                            ForEach(sortedDays, id: \.self) { day in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(day)
                                        .font(.caption.bold())
                                        .foregroundStyle(MemoriaTheme.plum)
                                    ForEach(calendarDays[day] ?? []) { memory in
                                        Text(memory.title)
                                            .font(.subheadline)
                                    }
                                }
                            }
                        }
                    }

                case .locations:
                    Section("Locations Index (IOS-24)") {
                        let located = localMemories.filter { ($0.location ?? "").isEmpty == false }
                        if located.isEmpty {
                            Text("No geotagged or location-labeled captures in current view.")
                                .font(.caption)
                                .foregroundStyle(MemoriaTheme.textSecondary)
                        } else {
                            ForEach(located) { memory in
                                NavigationLink {
                                    MemoryDetailView(memory: memory)
                                } label: {
                                    Label {
                                        VStack(alignment: .leading) {
                                            Text(memory.title)
                                                .font(.subheadline.weight(.semibold))
                                            Text(memory.location ?? "")
                                                .font(.caption)
                                                .foregroundStyle(MemoriaTheme.sageFunc)
                                        }
                                    } icon: {
                                        Image(systemName: "mappin.and.ellipse")
                                            .foregroundStyle(MemoriaTheme.plum)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
        }
        .background(MemoriaTheme.canvas)
        .navigationTitle("Timeline & Calendar")
        .task {
            if let tl = try? await MemoriaAPIClient.shared.fetchTimeline(spaceId: spaceId) {
                timelineGroups = tl.groups
            }
            if let cal = try? await MemoriaAPIClient.shared.fetchCalendar(spaceId: spaceId) {
                calendarDays = cal.days
                anniversaries = cal.anniversaries
            }
        }
    }

    private func timelineRow(_ memory: Memory) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(memory.title)
                .font(.headline)
                .foregroundStyle(MemoriaTheme.ink)
            Text(String(memory.capturedAt.prefix(10)))
                .font(.caption)
                .foregroundStyle(MemoriaTheme.textSecondary)
        }
        .padding(.vertical, 2)
    }
}

// MARK: - IOS-27: Edit Memory Sheet

public struct EditMemorySheet: View {
    @Environment(\.dismiss) private var dismiss

    public let memory: Memory
    public var onUpdated: ((Memory) -> Void)?

    @State private var title: String
    @State private var content: String
    @State private var location: String
    @State private var isSaving = false
    @State private var errorMessage: String?

    public init(memory: Memory, onUpdated: ((Memory) -> Void)? = nil) {
        self.memory = memory
        self.onUpdated = onUpdated
        self._title = State(initialValue: memory.title)
        self._content = State(initialValue: memory.content ?? "")
        self._location = State(initialValue: memory.location ?? "")
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("Edit Archival Metadata (IOS-27)") {
                    TextField("Memory Title", text: $title)
                    TextField("Location", text: $location)
                    TextField("Story Narrative", text: $content, axis: .vertical)
                        .lineLimit(4...8)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(Color.red)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(MemoriaTheme.canvas)
            .navigationTitle("Edit Memory")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving..." : "Save") {
                        Task { await saveChanges() }
                    }
                    .disabled(isSaving || title.trimmingCharacters(in: .whitespaces).isEmpty)
                    .foregroundStyle(MemoriaTheme.plum)
                }
            }
        }
    }

    private func saveChanges() async {
        isSaving = true
        errorMessage = nil
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            let updated = try await MemoriaAPIClient.shared.editMemory(
                memoryId: memory.id,
                title: cleanTitle,
                content: content.trimmingCharacters(in: .whitespacesAndNewlines),
                location: location.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            onUpdated?(updated)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}

// MARK: - IOS-41: Space Activity Feed View

public struct SpaceActivityFeedView: View {
    public let spaceId: String

    @State private var items: [SpaceActivityItemDTO] = []
    @State private var isLoading = false

    public init(spaceId: String) {
        self.spaceId = spaceId
    }

    public var body: some View {
        List {
            Section("Circle Activity Stream (IOS-41)") {
                if items.isEmpty && !isLoading {
                    Text("No recent circle edits or additions recorded yet.")
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                } else {
                    ForEach(items) { item in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(item.kind.replacingOccurrences(of: "_", with: " ").capitalized)
                                    .font(.caption2.weight(.semibold))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(MemoriaTheme.plumLight)
                                    .foregroundStyle(MemoriaTheme.plum)
                                    .clipShape(Capsule())
                                Spacer()
                                Text(String(item.timestamp.prefix(10)))
                                    .font(.caption2)
                                    .foregroundStyle(MemoriaTheme.textSecondary)
                            }
                            Text(item.title)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(MemoriaTheme.ink)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(MemoriaTheme.canvas)
        .navigationTitle("Circle Activity")
        .task {
            isLoading = true
            items = (try? await MemoriaAPIClient.shared.fetchSpaceActivity(spaceId: spaceId)) ?? []
            isLoading = false
        }
    }
}

// MARK: - IOS-56: Support & Help Center Sheet

public struct SupportHelpSheetView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var subject = ""
    @State private var category = "archive"
    @State private var message = ""
    @State private var isSubmitting = false
    @State private var confirmationText: String?
    @State private var errorText: String?

    private let categories = ["archive", "print_orders", "billing", "privacy", "bug_report"]

    public init() {}

    public var body: some View {
        NavigationStack {
            Form {
                Section("Archival Help Guides (IOS-56)") {
                    Text("• 3D Books: Tap any cover in Bookshelf to inspect, then open Studio or 3D Reader.")
                        .font(.caption)
                    Text("• Offline Vaults: Memories captured offline sync automatically when reconnected.")
                        .font(.caption)
                }

                Section("Contact Memoria Support") {
                    Picker("Topic", selection: $category) {
                        ForEach(categories, id: \.self) { cat in
                            Text(cat.replacingOccurrences(of: "_", with: " ").capitalized).tag(cat)
                        }
                    }
                    TextField("Subject", text: $subject)
                    TextField("Describe your question or issue", text: $message, axis: .vertical)
                        .lineLimit(4...8)
                }

                if let errorText {
                    Section {
                        Text(errorText)
                            .font(.footnote)
                            .foregroundStyle(Color.red)
                    }
                }

                if let confirmationText {
                    Section {
                        Text(confirmationText)
                            .font(.footnote)
                            .foregroundStyle(MemoriaTheme.sageFunc)
                    }
                }

                Section {
                    Button(isSubmitting ? "Submitting..." : "Send Support Request") {
                        Task { await submitTicket() }
                    }
                    .disabled(isSubmitting || subject.trimmingCharacters(in: .whitespaces).count < 3 || message.trimmingCharacters(in: .whitespaces).count < 5)
                    .foregroundStyle(MemoriaTheme.plum)
                }
            }
            .scrollContentBackground(.hidden)
            .background(MemoriaTheme.canvas)
            .navigationTitle("Support & Help")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    private func submitTicket() async {
        isSubmitting = true
        errorText = nil
        confirmationText = nil
        do {
            let ticket = try await MemoriaAPIClient.shared.submitSupportTicket(
                subject: subject.trimmingCharacters(in: .whitespacesAndNewlines),
                category: category,
                message: message.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            confirmationText = "Ticket #\(ticket.id.prefix(8)) submitted with status: \(ticket.status)."
            subject = ""
            message = ""
        } catch {
            errorText = error.localizedDescription
        }
        isSubmitting = false
    }
}
