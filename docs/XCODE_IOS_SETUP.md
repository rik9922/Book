# Memoria — Native iOS & Xcode Development Setup

This document describes the native iOS application architecture, declarative Xcode project configuration, asset catalog, Simulator automation, and testing workflows for **Memoria**.

---

## 1. Overview & Toolchain

- **Target OS**: iOS 17.0+ (SwiftUI 6, Swift 6 Language Mode)
- **Host Tools**: Xcode 27.2 (or Xcode 15+), `xcrun simctl`, `xcodegen`
- **Official App Bundle ID**: `com.memoria.app`
- **Product Name**: `Memoria`
- **Project Location**: [`apps/ios/Memoria.xcodeproj`](../apps/ios/Memoria.xcodeproj)
- **Declarative Spec**: [`apps/ios/project.yml`](../apps/ios/project.yml)

---

## 2. Project Architecture

The iOS workspace uses a hybrid structure that provides both standalone Swift Package compatibility and a full native Xcode project with an iOS application bundle target (`.app`):

```text
apps/ios/
├── project.yml                    # Declarative XcodeGen specification
├── Memoria.xcodeproj              # Native Xcode Project (Git-trackable or regenerable)
└── Memoria/
    ├── Package.swift              # SwiftPM definition for cross-platform/CI testing
    ├── App/
    │   └── MemoriaApp.swift       # @main SwiftUI App entrypoint
    ├── Resources/
    │   ├── Info.plist             # Bundle permissions (Camera, Photos, Mic)
    │   └── Assets.xcassets/       # AppIcon (3D Emerald Book), AccentColor (#E3B854)
    ├── Sources/
    │   └── Memoria/
    │       ├── Models/            # Memory, Profile, MemorySpace, SpaceProfile
    │       ├── Services/          # MemoriaAPIClient, LocalStorageService, MediaImportService
    │       └── Views/             # RootView (TabView), HomeFeedView, BookshelfView, MemoryCreateView, SettingsView
    └── Tests/
        └── MemoriaTests/          # Swift Testing / XCTest suite
```

---

## 3. Developer Commands

All iOS and Xcode workflows are wired into the root [`package.json`](../package.json):

| Command | Action | Description |
| :--- | :--- | :--- |
| `pnpm run ios:open` | Open in Xcode | Launches Xcode with `Memoria.xcodeproj` |
| `pnpm run ios:sim` | Open Simulator | Launches the macOS iOS Simulator application |
| `pnpm run ios:generate` | Regenerate Project | Rebuilds `Memoria.xcodeproj` from `project.yml` |
| `pnpm run ios:build` | Build App (`.app`) | Compiles `Memoria` for the iOS Simulator using `xcodebuild` |
| `pnpm run ios:test` | Native iOS Tests | Executes unit tests inside the booted iOS Simulator |
| `pnpm run test:ios:swift` | SwiftPM Tests | Runs fast host-level SwiftPM tests via `swift test` |
| `pnpm run test:ios:e2e` | End-to-End Suite | Boots simulator, injects synthetic media, configures permissions, and verifies |

---

## 4. Visual Identity & Assets

- **App Icon**: Premium 3D emerald-green archival memory book with golden tree-of-life emblem and archival photographs, formatted as a 1024x1024 universal icon in `AppIcon.appiconset`.
- **Accent Color**: Archival Gold (`#E3B854` / `Color(red: 0.89, green: 0.72, blue: 0.33)`).
- **Background**: Deep Emerald Obsidian (`#0D120F` / `Color(red: 0.05, green: 0.07, blue: 0.06)`).

---

## 5. Privacy & Permissions

The application declares explicit user-facing privacy descriptions in [`apps/ios/Memoria/Resources/Info.plist`](../apps/ios/Memoria/Resources/Info.plist):

- `NSPhotoLibraryUsageDescription`: "Memoria needs access to your photos to archive and preserve family heirloom memories."
- `NSCameraUsageDescription`: "Memoria needs camera access to capture photographs for your heirloom memory archive."
- `NSMicrophoneUsageDescription`: "Memoria needs microphone access to record voice memories and oral histories."

Simulator test automation grants these automatically via `xcrun simctl privacy booted grant <service> com.memoria.app`.

