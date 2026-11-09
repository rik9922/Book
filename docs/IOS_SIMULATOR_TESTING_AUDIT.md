# iOS Simulator Testing & Test Data Audit

**Project**: Memoria  
**Tagline**: *Your memories, made timeless.*  
**Date**: November 2026  
**Auditor**: Mobile QA Architect & Senior iOS Automation Engineer  
**Status**: APPROVED & IN PROGRESS  

---

## 1. Executive Summary

This audit assesses the repository's native iOS application readiness, simulator testing capabilities, media pipeline, and test-data generation infrastructure. The goal is to establish an automated, realistic end-to-end mobile testing system with $0 budget, synthetic family histories, photorealistic synthetic media, direct iOS Simulator injection, and verified UI workflows.

---

## 2. Environment & Tooling Audit

| Component | Detected Version | Status / Notes |
|---|---|---|
| **macOS Host** | Darwin arm64 (Apple Silicon) | Verified |
| **Xcode** | Xcode 27.2 (Build 27B52) | Verified (`/Applications/Xcode.app`) |
| **Swift Compiler** | Swift 6.4.2 (swiftlang-6.4.2.1.9) | Verified (`swift --version`) |
| **iOS Simulator SDK** | iOS 26.5 Runtimes | Verified via `xcrun simctl list` |
| **Available Simulators** | iPhone 17 Pro, iPhone 17, iPad Pro 11-inch (M5), etc. | Verified via `xcrun simctl list devices` |
| **Media Processing CLI** | `/opt/homebrew/bin/ffmpeg` | Verified installed |
| **Node.js Image Engine** | `sharp` v0.33 | Verified in `node_modules/sharp` |
| **Backend Microservices** | Fastify (REST + gRPC + JetStream) | 5 microservices running / verified |
| **Local Primary DB** | PostgreSQL 17 on `localhost:5432` | Verified with relational schemas |

---

## 3. Existing Application State & Gap Analysis

### 3.1 Existing Repository Assets
- **Web App (`apps/web`)**: Next.js 16 PWA with Three.js 3D book viewer, Memoria branding, and REST client.
- **Microservices (`services/*`)**:
  - `api-gateway` (Port 4000): Translates public REST to gRPC / internal services.
  - `identity-service` (Port 4001): JWT session validation, user registration, family workspace auth.
  - `memory-service` (Port 4002): Memory spaces, memory records, tagging, profile associations.
  - `media-service` (Port 4003): Signed upload sessions, derivatives processing, local disk driver.
  - `book-service` (Port 4004): Book creation, digital edition freeze, chapters.
- **Contracts (`packages/contracts`)**: Zod schemas, typed error hierarchy (`AppError`), service configs.

### 3.2 Gaps Identified for Native iOS Testing
1. **iOS Project Foundation**: The repository defines native iOS specifications (56 views in `docs/SCREEN_INVENTORY.md` and RealityKit 3D book architecture in `docs/IOS_3D_RENDERING.md`), but no Xcode workspace or Swift project directory existed under `apps/ios/`.
2. **Synthetic Test Data Engine**: Tests relied primarily on synthetic UUIDs and simple unit test strings rather than rich, cohesive family archives with real multimedia files.
3. **Simulator Automation Tooling**: No automated scripts existed to boot simulators, inject synthetic photos/videos into the iOS Photos library, manage simulator privacy permissions (`simctl privacy`), or capture visual evidence.
4. **Media Generation**: No local generator existed to create photorealistic synthetic family photos, real MP4 videos, M4A voice notes, and archival documents without relying on paid cloud APIs.

---

## 4. Architecture Plan & Priorities

### Priority 1: Synthetic Test Data & Media Engine (`testing/`)
- Implement a zero-cost local media generator utilizing `sharp` and `ffmpeg`.
- Cover 4 distinct scenarios: Family Gatherings, Travel Expeditions, Personal Milestones, and Everyday Lifestyle.
- Produce valid MP4 videos with H.264/AAC streams and real M4A audio voice notes.
- Define structured synthetic family models ("The Bennett Family") matching PostgreSQL schemas.

### Priority 2: iOS Simulator Automation Infrastructure (`testing/ios/`)
- Automate simulator discovery, boot, and status bar stabilization via `xcrun simctl`.
- Implement media injection via `xcrun simctl addmedia`.
- Implement privacy permission provisioning (`simctl privacy <device> grant photos com.memoria.app`).
- Implement automated screenshot capture and log aggregation.

### Priority 3: Native iOS Application Foundation (`apps/ios/Memoria/`)
- Create a modern SwiftUI application (`com.memoria.app`) targeting iOS 17+.
- Implement core views:
  - `Onboarding & Auth`: Sign-in and synthetic profile loader.
  - `Home Feed`: Chronological memory feed with media cards.
  - `Memory Creator`: System `PhotosPicker` (`PHPickerViewController`) integration, audio recorder, and metadata form.
  - `Memory Detail`: High-res image display, audio playback, and family story view.
  - `3D Bookshelf Teaser`: RealityKit/SwiftUI book preview.
  - `Settings`: Permissions status and offline cache inspector.
- Provide `Info.plist` with required privacy keys (`NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`).

### Priority 4: End-to-End Verification & Evidence Collection
- Execute end-to-end scenarios on the active iOS Simulator.
- Capture terminal logs, database records, and simulator screenshots.
- Record evidence in `docs/IOS_SIMULATOR_TESTING.md` and `docs/TEST_DATA_CATALOG.md`.

