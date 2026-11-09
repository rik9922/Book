import SwiftUI

public struct BookshelfView: View {
    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 0.05, green: 0.07, blue: 0.06).ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Heirloom Library")
                                .font(.largeTitle.bold())
                                .foregroundStyle(.white)
                            Text("Published digital editions and interactive 3D books")
                                .font(.subheadline)
                                .foregroundStyle(Color(red: 0.89, green: 0.72, blue: 0.33))
                        }
                        .padding(.horizontal)

                        // 3D Miniature Book Representation
                        VStack(spacing: 16) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(
                                        LinearGradient(
                                            colors: [Color(red: 0.07, green: 0.22, blue: 0.16), Color(red: 0.02, green: 0.10, blue: 0.07)],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .frame(height: 280)
                                    .shadow(color: .black.opacity(0.6), radius: 15, x: 0, y: 10)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color(red: 0.89, green: 0.72, blue: 0.33), lineWidth: 1.5)
                                    )

                                VStack(spacing: 16) {
                                    Image(systemName: "book.pages")
                                        .font(.system(size: 64))
                                        .foregroundStyle(Color(red: 0.89, green: 0.72, blue: 0.33))

                                    VStack(spacing: 4) {
                                        Text("THE BENNETT FAMILY")
                                            .font(.headline)
                                            .tracking(2)
                                            .foregroundStyle(.white)
                                        Text("Volume I • 1974–2026")
                                            .font(.caption)
                                            .foregroundStyle(Color(red: 0.89, green: 0.72, blue: 0.33))
                                    }

                                    Text("6 Chapters • 84 Pages • Digital Edition Frozen")
                                        .font(.caption2)
                                        .foregroundStyle(.white.opacity(0.7))
                                }
                            }
                            .padding(.horizontal)

                            HStack {
                                Button("Open 3D Reader") {}
                                    .buttonStyle(.borderedProminent)
                                    .tint(Color(red: 0.89, green: 0.72, blue: 0.33))

                                Button("Order Print Proof") {}
                                    .buttonStyle(.bordered)
                                    .tint(.white)
                            }
                            .padding(.top, 8)
                        }
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle("Bookshelf")
        }
    }
}

