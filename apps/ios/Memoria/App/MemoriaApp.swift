import SwiftUI

@main
struct MemoriaApp: App {
    init() {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-UITestResetLocalArchive") {
            LocalStorageService.shared.clearArchive()
        }
        #endif
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.light)
        }
    }
}
