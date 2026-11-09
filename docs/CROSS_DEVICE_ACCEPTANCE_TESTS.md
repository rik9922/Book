# Memoria — Cross-Device Acceptance Tests Specification

This document details the acceptance test scenarios verifying consistent cross-device operation between the Web/PWA client and native iOS application.

---

## 1. Acceptance Matrix

| Scenario | Primary Client | Secondary Client | Target Invariant | Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **1. Memory Creation Sync** | Web / PWA | Native iOS | Memory created on web appears on iOS | Automated API + Simulator Query |
| **2. Mobile Ingestion Sync** | Native iOS | Web / PWA | Memory created on iOS appears on web | Simulator submission + Database Query |
| **3. Media Asset Sharing** | Native iOS | Web / PWA | Image uploaded from simulator Photos displays on Web | SHA-256 binary download check |
| **4. Offline Survival** | Native iOS | Native iOS | App termination / reboot retains pending offline mutations | File inspect in Application Support |
| **5. Concurrent Edit Conflict** | Web / PWA | Native iOS | Conflict returns HTTP 409 and creates conflicting draft | API concurrency test suite |
| **6. 3D Book Layout Sync** | Web 3D Editor | iOS 3D Reader | Identical materials, dimensions, and page spreads render | Canonical Book JSON parity |

---

## 2. Test Execution Commands

```bash
# Execute native iOS Simulator E2E test with real synthetic media
pnpm run test:ios:e2e

# Execute backend communication & REST/gRPC translation tests
pnpm test
```

