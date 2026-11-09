import SwiftUI

public struct BookshelfView: View {
    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                MemoriaTheme.canvas.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Heirloom Library")
                                .font(.largeTitle.bold())
                                .foregroundStyle(MemoriaTheme.ink)
                            Text("Published digital editions and interactive 3D books")
                                .font(.subheadline)
                                .foregroundStyle(MemoriaTheme.textSecondary)
                        }
                        .padding(.horizontal)

                        // 3D Miniature Book Representation in Light Mode
                        VStack(spacing: 16) {
                            VStack(spacing: 20) {
                                Image(systemName: "book.pages")
                                    .font(.system(size: 64))
                                    .foregroundStyle(MemoriaTheme.plum)

                                VStack(spacing: 4) {
                                    Text("THE BENNETT FAMILY")
                                        .font(.headline)
                                        .tracking(2)
                                        .foregroundStyle(MemoriaTheme.ink)
                                    Text("Volume I • 1974–2026")
                                        .font(.caption)
                                        .foregroundStyle(MemoriaTheme.sageFunc)
                                }

                                Text("6 Chapters • 84 Pages • Digital Edition Frozen")
                                    .font(.caption2)
                                    .foregroundStyle(MemoriaTheme.textSecondary)

                                HStack(spacing: 12) {
                                    Button("Open 3D Reader") {}
                                        .buttonStyle(.borderedProminent)
                                        .tint(MemoriaTheme.plum)

                                    Button("Order Print Proof") {}
                                        .buttonStyle(.bordered)
                                        .tint(MemoriaTheme.ink)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 36)
                            .padding(.horizontal, 24)
                            .memoriaCard()
                            .padding(.horizontal)
                        }
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle("Bookshelf")
        }
    }
}
