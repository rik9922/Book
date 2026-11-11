import SwiftUI

public struct PrintOrdersView: View {
    @State private var catalog: PrintCatalogDTO?
    @State private var orders: [PrintOrderDTO] = []
    @State private var errorMessage: String?

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
                    Text("No print orders placed yet. Freeze an edition in Book Studio to order hardcover prints.")
                        .font(.caption)
                        .foregroundStyle(MemoriaTheme.textSecondary)
                } else {
                    ForEach(orders) { order in
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
                            Text("Total: $\(String(format: "%.2f", Double(order.totalCents) / 100.0)) \(order.currency)")
                                .font(.caption)
                                .foregroundStyle(MemoriaTheme.textSecondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(MemoriaTheme.canvas)
        .navigationTitle("Print & Orders")
        .task {
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
