import SwiftUI

public struct RootView: View {
    @State private var selectedTab = 0
    @State private var showLaunchSplash = true

    public init() {}

    public var body: some View {
        ZStack {
            TabView(selection: $selectedTab) {
                HomeFeedView()
                    .tabItem {
                        Label("Archive", systemImage: "photo.stack.fill")
                    }
                    .tag(0)

                FamilyCirclesView()
                    .tabItem {
                        Label("Circles", systemImage: "person.2.fill")
                    }
                    .tag(1)

                BookshelfView()
                    .tabItem {
                        Label("Bookshelf", systemImage: "books.vertical.fill")
                    }
                    .tag(2)

                SettingsView()
                    .tabItem {
                        Label("Settings", systemImage: "gearshape.fill")
                    }
                    .tag(3)
            }
            .tint(MemoriaTheme.plum)

            if showLaunchSplash {
                LaunchSplashView {
                    showLaunchSplash = false
                }
                .zIndex(10)
            }
        }
    }
}

