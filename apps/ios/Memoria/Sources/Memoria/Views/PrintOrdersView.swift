import SwiftUI

private enum PrintOrdersSheet: Identifiable {
    case checkout
    case timeline(PrintOrderDTO)

    var id: String {
        switch self {
        case .checkout: return "checkout"
        case .timeline(let order): return "timeline-\(order.id)"
        }
    }
}

public struct PrintOrdersView: View {
    @State private var catalog: PrintCatalogDTO?
    @State private var orders: [PrintOrderDTO] = []
    @State private var errorMessage: String?
    @State private var activeSheet: PrintOrdersSheet?

    public init() {}

    public var body: some View {
        List {
            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                }
            }

            Section {
                Button {
                    activeSheet = .checkout
                } label: {
                    Label("Order Physical Hardcover Copy", systemImage: "bag.badge.plus")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(MemoriaTheme.plum)
                }
            }

            Section("Pass-Through Print Catalog ($0 Markup)") {
                if let catalog {
                    ForEach(catalog.formats) { format in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(format.label)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(MemoriaTheme.ink)
                                Text(format.dimensionsCm)
                                    .font(.caption2)
                                    .foregroundStyle(MemoriaTheme.textSecondary)
                            }
                            Spacer()
                            Text("$\(format.baseCents / 100)")
                                .font(.subheadline.monospacedDigit().bold())
                                .foregroundStyle(MemoriaTheme.plum)
                        }
                    }
                } else {
                    Text("Square 8x8\" ($42) • Standard 8x10\" ($48) • Grand 12x12\" ($68)")
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                }
            }

            Section("Your Physical Print Orders (\(orders.count))") {
                if orders.isEmpty {
                    Text("No print orders placed yet. Tap Order Physical Hardcover Copy above or freeze an edition in Book Studio.")
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                } else {
                    ForEach(orders) { order in
                        Button {
                            activeSheet = .timeline(order)
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text("Order \(String(order.id.prefix(8)))")
                                        .font(.headline)
                                        .foregroundStyle(MemoriaTheme.ink)
                                    Spacer()
                                    Text(order.status.uppercased())
                                        .font(.caption2.weight(.semibold))
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 3)
                                        .background(MemoriaTheme.sageLight)
                                        .foregroundStyle(MemoriaTheme.sageFunc)
                                        .clipShape(Capsule())
                                }
                                HStack {
                                    Text("Total: $\(String(format: "%.2f", Double(order.totalCents) / 100.0)) \(order.currency)")
                                        .font(.caption)
                                        .foregroundStyle(MemoriaTheme.textSecondary)
                                    Spacer()
                                    Text("Track & Reorder ›")
                                        .font(.caption2.weight(.medium))
                                        .foregroundStyle(MemoriaTheme.plum)
                                }
                            }
                            .padding(.vertical, 4)
                            .contentShape(Rectangle())
                        }
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(MemoriaTheme.canvas)
        .navigationTitle("Print & Orders")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    activeSheet = .checkout
                } label: {
                    Label("New Order", systemImage: "plus.circle")
                        .foregroundStyle(MemoriaTheme.plum)
                }
            }
        }
        .sheet(item: $activeSheet) { sheet in
            switch sheet {
            case .checkout:
                PrintOrderCheckoutSheet { newOrder in
                    orders.insert(newOrder, at: 0)
                }
            case .timeline(let order):
                OrderDetailTimelineSheet(order: order) { reordered in
                    orders.insert(reordered, at: 0)
                }
            }
        }
        .task {
            await load()
        }
        .onAppear {
            Task { await load() }
        }
        .refreshable {
            await load()
        }
    }

    private func load() async {
        do {
            catalog = try await MemoriaAPIClient.shared.fetchBookCatalog()
        } catch {
            errorMessage = error.localizedDescription
        }
        if let fetchedOrders = try? await MemoriaAPIClient.shared.fetchMyOrders() {
            orders = fetchedOrders
        }
    }
}

// MARK: - IOS-52: Physical Print Checkout & Pass-Through Quote Sheet

public struct PrintOrderCheckoutSheet: View {
    @Environment(\.dismiss) private var dismiss

    public let initialBookId: String?
    public let initialSpaceId: String?
    public let initialFormat: String?
    public let initialEditionHash: String?
    public var onOrderPlaced: ((PrintOrderDTO) -> Void)?

    @State private var spaces: [MemorySpace] = []
    @State private var selectedSpaceId: String
    @State private var books: [BookDocumentDTO] = []
    @State private var selectedBookId: String
    @State private var format: String
    @State private var binding = "hardcover_linen"
    @State private var paperWeight = "170gsm_lustre"
    @State private var quantity = 1
    @State private var shippingSpeed = "standard"
    @State private var recipientName = "Elena Bennett"
    @State private var streetLine = "420 Archival Way"
    @State private var city = "Portland"
    @State private var postalCode = "97205"
    @State private var country = "US"
    @State private var quote: OrderQuoteDTO?
    @State private var isLoadingQuote = false
    @State private var isSubmitting = false
    @State private var statusMessage: String?
    @State private var errorMessage: String?

    private let formats = [
        ("hardcover_square_8x8", "Square 8x8\" ($42)"),
        ("hardcover_standard_8x10", "Standard 8x10\" ($48)"),
        ("hardcover_grand_12x12", "Grand 12x12\" ($68)"),
    ]

    public init(
        initialBookId: String? = nil,
        initialSpaceId: String? = nil,
        initialFormat: String? = nil,
        initialEditionHash: String? = nil,
        onOrderPlaced: ((PrintOrderDTO) -> Void)? = nil
    ) {
        self.initialBookId = initialBookId
        self.initialSpaceId = initialSpaceId
        self.initialFormat = initialFormat
        self.initialEditionHash = initialEditionHash
        self.onOrderPlaced = onOrderPlaced
        self._selectedSpaceId = State(initialValue: initialSpaceId ?? "")
        self._selectedBookId = State(initialValue: initialBookId ?? "")
        self._format = State(initialValue: initialFormat ?? "hardcover_standard_8x10")
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("Edition & Format (IOS-52)") {
                    if !spaces.isEmpty {
                        Picker("Memory Space", selection: $selectedSpaceId) {
                            ForEach(spaces) { space in
                                Text(space.name).tag(space.id)
                            }
                        }
                    }
                    if !books.isEmpty {
                        Picker("Book Edition", selection: $selectedBookId) {
                            ForEach(books) { book in
                                Text(book.title).tag(book.id)
                            }
                        }
                    } else if let initialBookId {
                        Text("Edition: \(initialBookId)")
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                    }
                    Picker("Trim Size", selection: $format) {
                        ForEach(formats, id: \.0) { item in
                            Text(item.1).tag(item.0)
                        }
                    }
                    Picker("Binding", selection: $binding) {
                        Text("Bookcloth Linen ($0)").tag("hardcover_linen")
                        Text("French Morocco Leather (+$20)").tag("french_morocco")
                    }
                    Picker("Paper Stock", selection: $paperWeight) {
                        Text("140gsm Matte ($0)").tag("140gsm_matte")
                        Text("170gsm Satin Lustre (+$4)").tag("170gsm_lustre")
                    }
                    Stepper("Quantity: \(quantity)", value: $quantity, in: 1...20)
                }

                Section("Shipping Speed & Destination") {
                    Picker("Delivery Speed", selection: $shippingSpeed) {
                        Text("Standard Archival Parcel").tag("standard")
                        Text("Priority Insured Courier").tag("priority")
                    }
                    .pickerStyle(.segmented)

                    TextField("Recipient Name", text: $recipientName)
                    TextField("Street Address", text: $streetLine)
                    TextField("City", text: $city)
                    TextField("Postal Code", text: $postalCode)
                    TextField("Country Code (e.g. US)", text: $country)
                }

                Section("Pass-Through $0 Markup Breakdown") {
                    if isLoadingQuote {
                        ProgressView("Calculating press quote...")
                    } else {
                        let q = quote ?? localFallbackQuote
                        HStack {
                            Text("Unit Press Cost")
                            Spacer()
                            Text(formatCents(q.unitCents))
                        }
                        HStack {
                            Text("Subtotal (\(q.quantity)x)")
                            Spacer()
                            Text(formatCents(q.subtotalCents))
                        }
                        HStack {
                            Text("Shipping (\(q.estimatedDays))")
                            Spacer()
                            Text(formatCents(q.shippingCents))
                        }
                        HStack {
                            Text("Platform Markup")
                            Spacer()
                            Text("$0.00")
                                .foregroundStyle(MemoriaTheme.sageFunc)
                        }
                        HStack {
                            Text("Total")
                                .fontWeight(.bold)
                            Spacer()
                            Text(formatCents(q.totalCents))
                                .fontWeight(.bold)
                                .foregroundStyle(MemoriaTheme.plum)
                        }
                        Button("Refresh Live Press Quote") {
                            Task { await refreshQuote() }
                        }
                        .foregroundStyle(MemoriaTheme.plum)
                    }
                }

                if let statusMessage {
                    Section {
                        Text(statusMessage)
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.sageFunc)
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.error)
                    }
                }

                Section("Simulator & Apple Pay Sandbox") {
                    Button {
                        Task { await placeOrder() }
                    } label: {
                        HStack {
                            Spacer()
                            if isSubmitting {
                                ProgressView()
                            } else {
                                Label("Confirm & Place Print Order", systemImage: "apple.logo")
                                    .fontWeight(.semibold)
                            }
                            Spacer()
                        }
                    }
                    .disabled(isSubmitting || recipientName.trimmingCharacters(in: .whitespaces).isEmpty || streetLine.trimmingCharacters(in: .whitespaces).isEmpty)
                    .foregroundStyle(MemoriaTheme.plum)
                }
            }
            .scrollContentBackground(.hidden)
            .background(MemoriaTheme.canvas)
            .navigationTitle("Print Checkout")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task {
                await loadInitial()
            }
            .onChange(of: selectedSpaceId) { _, nextSpace in
                Task { await loadBooksForSpace(nextSpace) }
            }
            .onChange(of: format) { _, _ in Task { await refreshQuote() } }
            .onChange(of: binding) { _, _ in Task { await refreshQuote() } }
            .onChange(of: paperWeight) { _, _ in Task { await refreshQuote() } }
            .onChange(of: quantity) { _, _ in Task { await refreshQuote() } }
            .onChange(of: shippingSpeed) { _, _ in Task { await refreshQuote() } }
            .onChange(of: country) { _, _ in Task { await refreshQuote() } }
        }
    }

    private var localFallbackQuote: OrderQuoteDTO {
        let base = format == "hardcover_grand_12x12" ? 6800 : format == "hardcover_square_8x8" ? 4200 : 4800
        let bindSurcharge = binding == "french_morocco" ? 2000 : 0
        let paperSurcharge = paperWeight == "170gsm_lustre" ? 400 : 0
        let unit = base + bindSurcharge + paperSurcharge
        let sub = unit * quantity
        let isDomestic = country.trimmingCharacters(in: .whitespacesAndNewlines).uppercased() == "US"
        let baseShipping = isDomestic ? 900 : 2400
        let prioritySurcharge = shippingSpeed == "priority" ? (isDomestic ? 1200 : 1800) : 0
        let ship = baseShipping + prioritySurcharge
        let days = shippingSpeed == "priority"
            ? (isDomestic ? "2-3 business days" : "4-6 business days")
            : (isDomestic ? "5-7 business days" : "10-14 business days")
        return OrderQuoteDTO(
            currency: "USD",
            format: format,
            shippingSpeed: shippingSpeed,
            quantity: quantity,
            unitCents: unit,
            subtotalCents: sub,
            shippingCents: ship,
            taxCents: 0,
            totalCents: sub + ship,
            estimatedDays: days
        )
    }

    private func formatCents(_ cents: Int) -> String {
        String(format: "$%.2f", Double(cents) / 100.0)
    }

    private func loadInitial() async {
        if let fetchedSpaces = try? await MemoriaAPIClient.shared.fetchSpaces(), !fetchedSpaces.isEmpty {
            spaces = fetchedSpaces
            if selectedSpaceId.isEmpty {
                selectedSpaceId = fetchedSpaces[0].id
            }
            await loadBooksForSpace(selectedSpaceId)
        }
        await refreshQuote()
    }

    private func loadBooksForSpace(_ spaceId: String) async {
        guard !spaceId.isEmpty else { return }
        if let fetchedBooks = try? await MemoriaAPIClient.shared.fetchSpaceBooks(spaceId: spaceId) {
            books = fetchedBooks
            if selectedBookId.isEmpty || !fetchedBooks.contains(where: { $0.id == selectedBookId }) {
                selectedBookId = fetchedBooks.first?.id ?? selectedBookId
            }
        }
    }

    private func refreshQuote() async {
        isLoadingQuote = true
        defer { isLoadingQuote = false }
        if let liveQuote = try? await MemoriaAPIClient.shared.fetchOrderQuote(
            format: format,
            binding: binding,
            paperWeight: paperWeight,
            quantity: quantity,
            country: country,
            shippingSpeed: shippingSpeed
        ) {
            quote = liveQuote
        }
    }

    private func placeOrder() async {
        isSubmitting = true
        errorMessage = nil
        statusMessage = nil
        let targetSpaceId = selectedSpaceId.isEmpty ? "e8cf4fc3-137e-4397-883d-21cd6a7cb61f" : selectedSpaceId
        guard let targetBookId = (UUID(uuidString: selectedBookId) != nil ? selectedBookId : books.first?.id) else {
            errorMessage = "Sign in and create a book edition in your space before placing a physical print order."
            isSubmitting = false
            return
        }
        do {
            let order = try await MemoriaAPIClient.shared.createPrintOrder(
                spaceId: targetSpaceId,
                bookId: targetBookId,
                format: format,
                binding: binding,
                paperWeight: paperWeight,
                quantity: quantity,
                shippingSpeed: shippingSpeed,
                recipientName: recipientName.trimmingCharacters(in: .whitespacesAndNewlines),
                line1: streetLine.trimmingCharacters(in: .whitespacesAndNewlines),
                city: city.trimmingCharacters(in: .whitespacesAndNewlines),
                postalCode: postalCode.trimmingCharacters(in: .whitespacesAndNewlines),
                country: country.trimmingCharacters(in: .whitespacesAndNewlines),
                editionHash: initialEditionHash
            )
            onOrderPlaced?(order)
            statusMessage = "Print order #\(order.id.prefix(8)) confirmed."
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSubmitting = false
    }
}

// MARK: - IOS-53: Order Status, Shipping Timeline & Reorder Detail Sheet

public struct OrderDetailTimelineSheet: View {
    @Environment(\.dismiss) private var dismiss

    public let order: PrintOrderDTO
    public var onReordered: ((PrintOrderDTO) -> Void)?

    @State private var tracking: OrderTrackingDTO?
    @State private var isReordering = false
    @State private var statusMessage: String?
    @State private var errorMessage: String?

    private let defaultStages = ["submitted", "preflight_passed", "in_production", "shipped", "delivered"]

    public init(order: PrintOrderDTO, onReordered: ((PrintOrderDTO) -> Void)? = nil) {
        self.order = order
        self.onReordered = onReordered
    }

    public var body: some View {
        NavigationStack {
            List {
                Section("Order Summary (IOS-53)") {
                    LabeledContent("Order ID", value: String(order.id.prefix(12)))
                    LabeledContent("Status", value: (tracking?.status ?? order.status).uppercased())
                    LabeledContent("Total", value: String(format: "$%.2f %@", Double(order.totalCents) / 100.0, order.currency))
                    if let tracking {
                        LabeledContent("Courier", value: tracking.carrier)
                        if let trackNum = tracking.trackingNumber {
                            LabeledContent("Tracking #", value: trackNum)
                        }
                        LabeledContent("ETA", value: tracking.estimatedDays)
                    }
                }

                Section("5-Step Fulfillment Progression") {
                    let stages: [OrderTrackingStageDTO] = tracking?.timeline ?? fallbackStages
                    ForEach(stages) { item in
                        HStack(spacing: 12) {
                            Image(systemName: item.completed ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(item.completed ? MemoriaTheme.sageFunc : MemoriaTheme.textTertiary)
                            Text(item.stage.replacingOccurrences(of: "_", with: " ").capitalized)
                                .font(.subheadline.weight(item.active ? .bold : .regular))
                                .foregroundStyle(item.completed ? MemoriaTheme.ink : MemoriaTheme.textSecondary)
                            Spacer()
                            if item.active {
                                Text("CURRENT")
                                    .font(.caption2.bold())
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(MemoriaTheme.plumLight)
                                    .foregroundStyle(MemoriaTheme.plum)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }

                if let statusMessage {
                    Section {
                        Text(statusMessage)
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.sageFunc)
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.error)
                    }
                }

                Section {
                    Button {
                        Task { await reorder() }
                    } label: {
                        Label(isReordering ? "Reordering Edition..." : "Reorder This Edition", systemImage: "arrow.clockwise.circle")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(MemoriaTheme.plum)
                    }
                    .disabled(isReordering)
                }
            }
            .scrollContentBackground(.hidden)
            .background(MemoriaTheme.canvas)
            .navigationTitle("Order Timeline")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task {
                tracking = try? await MemoriaAPIClient.shared.fetchOrderTracking(orderId: order.id)
            }
        }
    }

    private var fallbackStages: [OrderTrackingStageDTO] {
        let idx = defaultStages.firstIndex(of: order.status) ?? 0
        return defaultStages.enumerated().map { i, stage in
            OrderTrackingStageDTO(stage: stage, completed: i <= idx, active: i == idx)
        }
    }

    private func reorder() async {
        isReordering = true
        errorMessage = nil
        statusMessage = nil
        do {
            let created = try await MemoriaAPIClient.shared.reorderPrintOrder(orderId: order.id, quantity: 1)
            onReordered?(created)
            statusMessage = "Reordered edition as #\(created.id.prefix(8))."
        } catch {
            errorMessage = error.localizedDescription
        }
        isReordering = false
    }
}
