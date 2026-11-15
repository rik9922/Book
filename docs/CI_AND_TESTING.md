# Memoria CI & Testing Architecture

**Workflow:** `.github/workflows/ci.yml`

## 1. Automated CI Jobs
1. **`backend-and-web` (`ubuntu-latest` + `postgres:17`):**
   - Logs commit SHA and toolchain versions (`node`, `pnpm`, `psql`, `tesseract`).
   - Runs `pnpm run check:quality` and `pnpm build`.
   - Applies all SQL migrations in `packages/database/migrations/*.sql` with `ON_ERROR_STOP=1`.
   - Runs `NODE_ENV=test node --import tsx --test --test-concurrency=1 tests/*.ts` (including `tests/backup-restore.test.ts` and `tests/security-and-processing.test.ts`).
   - Installs Playwright Chromium (`pnpm exec playwright-core install chromium --with-deps`) and runs `tests/e2e/*.ts`.
2. **`ios-swift-tests` (`macos-15`):**
   - Logs commit SHA, `swift --version`, `xcodebuild -version`, `node -v`, and `pnpm -v`.
   - Runs `cd apps/ios/Memoria && swift test` (`34/34` tests across `4` suites).
   - Starts local `postgresql@17` (`max_connections=300`), `redis`, and `nats-server -js`, creates `memory_capsule_ci`, applies `packages/database/migrations/*.sql`, builds backend packages/services (`pnpm --filter '!@memory-capsule/web' build`), and launches all 8 Node microservices + API Gateway (`NODE_ENV=development` on `127.0.0.1:4000`).
   - Builds `apps/ios/Memoria.xcodeproj` (`scheme Memoria`, `generic/platform=iOS Simulator`, `CODE_SIGNING_ALLOWED=NO`).
   - Runs `xcodebuild test` on an available iOS Simulator (`37/37` `MemoriaTests` + `2/2` `MemoriaUITests`, including live end-to-end API/Postgres verification).

## 2. Latest Verified CI Run & Physical-Device Limitations

- **Verified Green Run:** Commit `354234c` — GitHub Actions run `43709387139` (`backend-and-web` and `ios-swift-tests` both `success`).
- **Physical-Device Limitations:** Simulator CI uses `CODE_SIGNING_ALLOWED=NO` and cannot exercise physical iPhone GPU thermal throttling, hardware camera/microphone sensors, or live APNs push delivery.
