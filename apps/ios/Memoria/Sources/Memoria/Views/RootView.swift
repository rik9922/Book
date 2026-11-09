import SwiftUI

public struct RootView: View {
    @State private var selectedTab = 0

    public init() {}

    public var body: some View {
        TabView(selection: $selectedTab) {
            HomeFeedView()
                .tabItem {
                    Label("Archive", systemImage: "photo.stack.fill")
                }
                .tag(0)

            BookshelfView()
                .tabItem {
                    Label("Bookshelf", systemImage: "books.vertical.fill")
                }
                .tag(1)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(2)
        }
        .tint(Color(red: 0.89, green: 0.72, blue: 0.33))
    }
}

