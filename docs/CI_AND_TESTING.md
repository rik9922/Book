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
   - Logs commit SHA, `swift --version`, and `xcodebuild -version`.
   - Runs `cd apps/ios/Memoria && swift test`.
   - Builds `apps/ios/Memoria.xcodeproj` (`scheme Memoria`, `generic/platform=iOS Simulator`, `CODE_SIGNING_ALLOWED=NO`).
   - Runs `xcodebuild test` on an available iOS Simulator (`MemoriaTests` + `MemoriaUITests`).
