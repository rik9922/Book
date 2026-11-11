import SwiftUI

@main
struct MemoriaApp: App {
    init() {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-UITestResetLocalArchive") {
            LocalStorageService.shared.clearArchive()
            KeychainTokenStore.shared.delete(forKey: "memoria_access_token")
            KeychainTokenStore.shared.delete(forKey: "memoria_refresh_token")
            UserDefaults.standard.removeObject(forKey: "memoria_active_space_id")
            UserDefaults.standard.removeObject(forKey: "memoria_biometric_lock")
            UserDefaults.standard.removeObject(forKey: "memoria_reduced_motion")
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
