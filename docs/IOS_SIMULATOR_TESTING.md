# iOS Simulator Testing Architecture & Automation

**Product**: Memoria  
**Tagline**: *Your memories, made timeless.*  
**Bundle Identifier**: `com.memoria.app`  
**Test Profile**: Simulator Testing & Realistic Media Injection  

---

## 1. Overview & Objective

Memoria relies on actual iOS Simulator instances and authentic synthetic media to test real-world user flows:
- Photo and video selection from the iOS Photos library (`PHPickerViewController` / `PhotosPicker`).
- Native audio recording and playback.
- Camera and microphone permission handling.
- Local disk caching and offline resilience.
- Microservice API synchronization with the Fastify API Gateway (`http://127.0.0.1:4000/api/v1`).

---

## 2. Simulator Automation Infrastructure

All simulator automation is implemented in `testing/ios/` and accessible via CLI scripts:

```
testing/
  ios/
    simulator/
      simulator-manager.ts     # Discovers runtimes, boots devices, overrides status bar, captures screenshots
    media-injection/
      media-injector.ts        # Executes xcrun simctl addmedia for photos & videos
    permissions/
      permission-manager.ts    # Grants/revokes camera, microphone, photos via simctl privacy
```

### 2.1 Tooling Commands Reference
- **List available devices**: `xcrun simctl list devices available -j`
- **Boot device**: `xcrun simctl boot <UDID>`
- **Clean status bar**: `xcrun simctl status_bar <UDID> override --time "9:41" --batteryState charged --batteryLevel 100`
- **Inject media into Photos**: `xcrun simctl addmedia <UDID> <filePath1> <filePath2> ...`
- **Grant permissions**: `xcrun simctl privacy <UDID> grant <service> <bundleId>`
- **Capture screenshot**: `xcrun simctl io <UDID> screenshot <outputPath.png>`
- **Shutdown device**: `xcrun simctl shutdown <UDID>`

---

## 3. Native iOS Application Foundation (`apps/ios/Memoria`)

The native iOS application is authored in Swift 6 & SwiftUI targeting iOS 17+.

### Key Architectural Layers:
1. **Domain Models (`Sources/Memoria/Models/`)**:
   - `Memory.swift`: Maps to PostgreSQL relational schema (`spaceId`, `authorId`, `title`, `content`, `format`, `capturedAt`, `location`, `tags`, `mediaIds`).
   - `MemorySpace.swift`: Space containers with ownership and role tags.
   - `Profile.swift`: Fictional family member profiles.
2. **Services (`Sources/Memoria/Services/`)**:
   - `MemoriaAPIClient.swift`: Actor-based HTTP client for public Fastify gateway endpoints.
   - `MediaImportService.swift`: Interacts with `PHPhotoLibrary` to inspect authorization and query injected simulator photos.
   - `LocalStorageService.swift`: JSON-based cache in `CachesDirectory/MemoriaCache` for offline resilience.
3. **SwiftUI Views (`Sources/Memoria/Views/`)**:
   - `HomeFeedView.swift`: Chronological memory cards with Living Archive Muted Plum styling and Soft Sage accents.
   - `MemoryCreateView.swift`: Form with `PhotosPicker` integration, tag chips, and API save action.
   - `BookshelfView.swift`: 3D miniature book presentation with leather-bound gradients.
   - `SettingsView.swift`: Real-time permission status indicators and cache controls.

---

## 4. Test Execution Workflow

To run the complete automated end-to-end simulator test:

```bash
# 1. Generate synthetic media and structured datasets
pnpm run test:fixtures:generate

# 2. Validate fixture integrity and checksums
pnpm run test:fixtures:validate

# 3. Inject media and grant permissions in simulator
pnpm run test:ios:inject

# 4. Run full end-to-end test suite
pnpm run test:ios:e2e

# 5. Run native Swift unit tests
pnpm run test:ios:swift
```

### Verified Test Evidence:
- **Simulator Device**: iPhone 17 Pro (`172114EF-2251-4A64-97E1-DBC8EA3ABBE2`)
- **Photos Injected**: 6 high-resolution photorealistic photos (2048x1536 / 2400x1600)
- **Videos Injected**: 2 MP4 H.264/AAC videos (1920x1080 / 1080x1920 portrait)
- **Permissions**: `photos: granted`, `camera: granted`, `microphone: granted`
- **Database Records Verified**: 6 memories persisted in PostgreSQL `memory_db`
- **Visual Screenshot**: `testing/reports/evidence/ios_simulator_e2e_verified_*.png`

