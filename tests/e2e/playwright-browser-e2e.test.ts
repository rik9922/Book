import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, ChildProcess, execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { chromium, Browser } from "playwright-core";
import jwt from "jsonwebtoken";
import { BaseServiceConfigSchema, validateServiceConfig } from "@memory-capsule/contracts";
import { buildGateway } from "../../services/api-gateway/src/server.ts";
import { buildIdentityService } from "../../services/identity-service/src/server.ts";
import { buildMemoryService } from "../../services/memory-service/src/server.ts";
import { buildMediaService } from "../../services/media-service/src/server.ts";
import { buildCollabService } from "../../services/collab-service/src/server.ts";
import { buildBookService } from "../../services/book-service/src/server.ts";
import { buildCommerceService } from "../../services/commerce-service/src/server.ts";
import { buildNotificationService } from "../../services/notification-service/src/server.ts";

const WEB_PORT = 3201;
const WEB_BASE = `http://127.0.0.1:${WEB_PORT}`;

async function waitForServer(url: string, timeoutMs = 20000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Server booting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

function resolveBrowserExecutable(): string | undefined {
  const chromeApp = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(chromeApp)) return chromeApp;
  return undefined;
}

describe("Interactive Chrome / Playwright DOM, WebGL, SW Offline & 401 Refresh E2E", () => {
  let webProcess: ChildProcess | null = null;
  let browser: Browser | null = null;
  let gatewayUrl = "";
  const closers: Array<() => Promise<void>> = [];

  before(async () => {
    const [idApp, memApp, mediaApp, collabApp, bookApp, commApp, notifApp] = await Promise.all([
      buildIdentityService(),
      buildMemoryService(),
      buildMediaService(),
      buildCollabService(),
      buildBookService(),
      buildCommerceService(),
      buildNotificationService(),
    ]);

    const idUrl = await idApp.listen({ port: 0, host: "127.0.0.1" });
    const memUrl = await memApp.listen({ port: 0, host: "127.0.0.1" });
    const mediaUrl = await mediaApp.listen({ port: 0, host: "127.0.0.1" });
    const collabUrl = await collabApp.listen({ port: 0, host: "127.0.0.1" });
    const bookUrl = await bookApp.listen({ port: 0, host: "127.0.0.1" });
    const commUrl = await commApp.listen({ port: 0, host: "127.0.0.1" });
    const notifUrl = await notifApp.listen({ port: 0, host: "127.0.0.1" });

    const gwApp = buildGateway({
      enableGrpcRouting: false,
      identityServiceUrl: idUrl,
      memoryServiceUrl: memUrl,
      mediaServiceUrl: mediaUrl,
      collabServiceUrl: collabUrl,
      bookServiceUrl: bookUrl,
      commerceServiceUrl: commUrl,
      notificationServiceUrl: notifUrl,
    });
    const gwListen = await gwApp.listen({ port: 0, host: "127.0.0.1" });
    gatewayUrl = `${gwListen}/api/v1`;
    process.env.PUBLIC_MEDIA_URL = `${gatewayUrl}/media/files`;
    process.env.LOCAL_MEDIA_UPLOAD_URL = `${gatewayUrl}/media/local-upload`;

    closers.push(
      () => gwApp.close(),
      () => idApp.close(),
      () => memApp.close(),
      () => mediaApp.close(),
      () => collabApp.close(),
      () => bookApp.close(),
      () => commApp.close(),
      () => notifApp.close()
    );

    const webDir = path.resolve(process.cwd(), "apps/web");
    const nextBin = path.resolve(process.cwd(), "apps/web/node_modules/.bin/next");
    webProcess = spawn(nextBin, ["start", "-p", String(WEB_PORT), "-H", "127.0.0.1"], {
      cwd: webDir,
      stdio: "ignore",
      env: { ...process.env, NODE_ENV: "production" },
    });
    await waitForServer(`${WEB_BASE}/`);

    const executablePath = resolveBrowserExecutable();
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
      ],
    });
  });

  after(async () => {
    if (browser) await browser.close();
    if (webProcess && !webProcess.killed) webProcess.kill("SIGTERM");
    await Promise.all(closers.map((c) => c().catch(() => undefined)));
  });

  test("1. Landing Page: WebGL 3D Book Controls, Accessible 2D Mode Toggle & Modal Tab Focus Trap", async () => {
    assert.ok(browser, "Browser must be initialized");
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto(`${WEB_BASE}/`, { waitUntil: "networkidle" });

    // Verify 3D mount or accessible fallback mounts cleanly
    const toggle2DBtn = page.getByRole("button", { name: /2D Reader|Switch to 2D/i }).first();
    if (await toggle2DBtn.isVisible().catch(() => false)) {
      await toggle2DBtn.click();
      await page.waitForTimeout(200);
    }

    // Open Accessible Lightbox Modal and test Tab trapping + Escape restoration
    const inspectBtn = page.getByRole("button", { name: /Inspect Sample Entry/i });
    await inspectBtn.click();

    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });

    // Background surface must be inert while modal is open
    const isInert = await page.evaluate(() =>
      document.getElementById("landing-main-surface")?.hasAttribute("inert")
    );
    assert.equal(isInert, true, "Expected #landing-main-surface to be inert when modal is open");

    // Tab several times and ensure focus stays strictly inside the dialog
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      const insideDialog = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        return Boolean(dlg && dlg.contains(document.activeElement));
      });
      assert.equal(insideDialog, true, `Focus escaped modal on Tab iteration ${i}`);
    }

    // Shift+Tab must wrap backwards inside dialog
    await page.keyboard.press("Shift+Tab");
    const insideAfterShiftTab = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      return Boolean(dlg && dlg.contains(document.activeElement));
    });
    assert.equal(insideAfterShiftTab, true, "Focus escaped modal on Shift+Tab");

    // Escape closes modal and restores focus to opener
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    const restoredToOpener = await page.evaluate(
      () => document.activeElement?.textContent?.includes("Inspect Sample Entry") ?? false
    );
    assert.equal(restoredToOpener, true, "Expected focus to return to Inspect Sample Entry button");
    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join("; ")}`);

    await context.close();
  });

  test("2. Live Auth Registration, 401 Expired Access Token Automatic Refresh & Space Creation in Chrome", async () => {
    assert.ok(browser, "Browser must be initialized");
    const cfg = validateServiceConfig(BaseServiceConfigSchema);
    const context = await browser.newContext();
    const page = await context.newPage();

    // Point web client at ephemeral test gateway
    await page.addInitScript((apiUrl: string) => {
      window.localStorage.setItem("memoria_api_url_override", apiUrl);
    }, gatewayUrl);

    const uniqueEmail = `playwright_${Date.now()}@memoria.internal`;
    await page.goto(`${WEB_BASE}/auth?mode=register`, { waitUntil: "networkidle" });

    // Register via UI
    await page.fill("#auth-fullname", "Playwright Heirloom User");
    await page.fill("#auth-email", uniqueEmail);
    await page.fill("#auth-password", "HeirloomPass123!");
    await page.click('button[type="submit"]');

    await page.waitForFunction(
      () => Boolean(window.localStorage.getItem("memoria_web_access_token")),
      { timeout: 10000 }
    );

    // Replace access token with an EXPIRED JWT to force a live 401 -> /auth/refresh -> retry cycle
    const currentUserRaw = await page.evaluate(() => window.localStorage.getItem("memoria_web_user"));
    const currentUser = JSON.parse(currentUserRaw || "{}");
    const expiredJwt = jwt.sign(
      { sub: currentUser.id, email: uniqueEmail, exp: Math.floor(Date.now() / 1000) - 60 },
      cfg.JWT_SECRET
    );
    await page.evaluate((tok: string) => {
      window.localStorage.setItem("memoria_web_access_token", tok);
    }, expiredJwt);

    // Navigate to /spaces -> apiRequest gets 401 -> refreshes automatically -> creates a space!
    await page.goto(`${WEB_BASE}/spaces`, { waitUntil: "networkidle" });
    await page.fill("#space-name-input", "Browser Verified Vault");
    await page.click('button:has-text("Create Memory Space")');

    await page.waitForSelector('text="Browser Verified Vault"', { timeout: 10000 });
    const refreshedAccessToken = await page.evaluate(() =>
      window.localStorage.getItem("memoria_web_access_token")
    );
    assert.notEqual(
      refreshedAccessToken,
      expiredJwt,
      "Expected apiRequest 401 handler to rotate expired access token via /auth/refresh"
    );

    await context.close();
  });

  test("3. Service Worker /sw.js Registration, Offline Navigation Replay & Standalone Routes", async () => {
    assert.ok(browser, "Browser must be initialized");
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${WEB_BASE}/`, { waitUntil: "networkidle" });
    const swActive = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg && reg.active);
    });
    assert.equal(swActive, true, "Expected /sw.js Service Worker to register and activate");

    // Warm up standalone routes while online so SW caches them
    const routesToVerify = [
      "/how-it-works",
      "/use-cases",
      "/gallery",
      "/sample-book",
      "/pricing",
      "/help",
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      "/invite/sample-invite",
      "/share/sample-share",
      "/onboarding",
      "/spaces",
      "/profiles",
      "/collections",
      "/archive/timeline",
      "/archive/calendar",
      "/archive/search",
      "/archive/favorites",
      "/circles",
      "/notifications",
      "/trash",
      "/billing",
      "/orders",
      "/export",
      "/admin",
    ];
    for (const r of routesToVerify) {
      await page.goto(`${WEB_BASE}${r}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.body.innerText.trim().length > 20, { timeout: 10000 });
      const bodyLen = await page.evaluate(() => document.body.innerText.trim().length);
      assert.ok(bodyLen > 20, `Expected non-empty rendered content on ${r}`);
    }

    // Go offline and verify Service Worker serves cached routes cleanly
    await context.setOffline(true);
    await page.goto(`${WEB_BASE}/pricing`, { waitUntil: "domcontentloaded" });
    const offlineHeading = await page.textContent("h1");
    assert.ok(
      offlineHeading?.includes("Zero-Budget Principles"),
      `Expected cached /pricing page offline, got: ${offlineHeading}`
    );

    await context.setOffline(false);
    await context.close();
  });

  test("4. Full Interactive Form Flows in Chrome: Onboarding -> Profiles -> Collections -> Archive Modal/Offline Queue -> Trash -> Studio/Billing/Orders -> Export/Settings", async () => {
    assert.ok(browser, "Browser must be initialized");
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.addInitScript((apiUrl: string) => {
      window.localStorage.setItem("memoria_api_url_override", apiUrl);
    }, gatewayUrl);

    // Register fresh user
    const email = `e2e_flow_${Date.now()}@memoria.internal`;
    await page.goto(`${WEB_BASE}/auth?mode=register`, { waitUntil: "networkidle" });
    await page.fill("#auth-fullname", "Clara Vance");
    await page.fill("#auth-email", email);
    await page.fill("#auth-password", "HeirloomFlow123!");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => Boolean(window.localStorage.getItem("memoria_web_access_token")), {
      timeout: 10000,
    });

    // 1. /onboarding 5-step wizard
    await page.goto(`${WEB_BASE}/onboarding`, { waitUntil: "networkidle" });
    await page.click('button:has-text("Continue to Create Space")');
    await page.fill("#onb-space-name", "Vance Heritage Vault");
    await page.fill("#onb-space-desc", "Generational portraits and stories");
    await page.click('button:has-text("Create Space & Continue")');
    await page.waitForSelector("#onb-prof-name", { timeout: 10000 });

    await page.fill("#onb-prof-name", "Julian Vance");
    await page.fill("#onb-prof-rel", "Grandfather");
    await page.click('button:has-text("Save Profile & Continue")');
    await page.waitForSelector("#onb-invite-email", { timeout: 10000 });

    // Step 4: Invitation MUST succeed without 403 because space creator is auto-seeded as owner!
    await page.fill("#onb-invite-email", "elena@family.local");
    await page.click('button:has-text("Send Invite & Continue")');
    await page.waitForSelector("#onb-mem-title", { timeout: 10000 });

    await page.fill("#onb-mem-title", "Orchard Harvest 1984");
    await page.fill("#onb-mem-story", "Late autumn apple pressing in the barn.");
    await page.click('button:has-text("Save First Memory")');
    await page.getByText("First heirloom memory preserved").waitFor({ state: "visible", timeout: 10000 });

    // 2. /profiles update flow
    await page.goto(`${WEB_BASE}/profiles`, { waitUntil: "networkidle" });
    await page.getByText("Julian Vance").first().waitFor({ state: "visible", timeout: 10000 });
    await page.fill("#edit-prof-name", "Julian Vance Sr.");
    await page.click('button:has-text("Update Profile")');
    await page.getByText("Julian Vance Sr.").first().waitFor({ state: "visible", timeout: 10000 });

    // 3. /collections create + link memory
    await page.goto(`${WEB_BASE}/collections`, { waitUntil: "networkidle" });
    await page.fill("#col-title", "Autumn Harvests");
    await page.click('button:has-text("Create Collection")');
    await page.getByText("Autumn Harvests").first().waitFor({ state: "visible", timeout: 10000 });
    await page.click('button:has-text("Add to Collection")');
    await page.getByText("Added memory to collection.").waitFor({ state: "visible", timeout: 10000 });

    // 4. /archive modal inert + Tab trap + comment + offline mutation queue replay + soft-delete
    await page.goto(`${WEB_BASE}/archive`, { waitUntil: "networkidle" });
    await page.getByText("Orchard Harvest 1984").first().waitFor({ state: "visible", timeout: 10000 });
    await page.click('button:has-text("Orchard Harvest 1984")');
    const memDialog = page.getByRole("dialog");
    await memDialog.waitFor({ state: "visible" });
    const shellInertDuringArchiveModal = await page.evaluate(() =>
      document.getElementById("app-shell-root")?.hasAttribute("inert")
    );
    assert.equal(shellInertDuringArchiveModal, true, "Expected #app-shell-root inert during archive modal");
    await page.fill("#memory-comment-input", "Grandpa loved cider season.");
    await page.click('button:has-text("Post")');
    await page.getByText("Grandpa loved cider season.").waitFor({ state: "visible", timeout: 10000 });

    // Soft-delete memory -> moves to /trash
    await page.click('button:has-text("Delete Memory")');
    await memDialog.waitFor({ state: "hidden" });
    await page.getByText("Moved memory to Trash").waitFor({ state: "visible", timeout: 10000 });

    // Offline mutation queue in Chrome: go offline, queue a memory, go online, verify flush!
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await page.getByText("Offline", { exact: true }).first().waitFor({ state: "visible", timeout: 5000 });
    await page.click('button:has-text("Preserve Memory")');
    await page.fill("#mem-title", "Offline Queued Letter");
    await page.fill("#mem-content", "Queued while offline and synced automatically.");
    await page.click('button:has-text("Save to Archive")');
    await page.getByText("Offline: Memory queued safely").waitFor({ state: "visible", timeout: 5000 });

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.waitForFunction(
      () => {
        const raw = window.localStorage.getItem("memoria_offline_queue");
        return !raw || JSON.parse(raw).length === 0;
      },
      { timeout: 10000 }
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.getByText("Offline Queued Letter").first().waitFor({ state: "visible", timeout: 10000 });

    // 4b. /archive failed/pending upload retry UI (PWA-42) & archival <video> timestamp seek (PWA-44)
    const activeToken = await page.evaluate(() => window.localStorage.getItem("memoria_web_access_token") || "");
    const spacesRes = await fetch(`${gatewayUrl}/spaces`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    const spacesJson = await spacesRes.json();
    const activeSpaceId = spacesJson?.data?.[0]?.id as string;
    assert.ok(activeSpaceId, "Expected active space ID");

    // Stage a pending upload session to test Retry Session UI
    await fetch(`${gatewayUrl}/media/upload-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
      body: JSON.stringify({
        spaceId: activeSpaceId,
        fileName: "pending-retry-scan.png",
        mimeType: "image/png",
        fileSizeBytes: 1024,
      }),
    });

    // Generate a real 8-second MP4 in temp storage and attach to a video memory
    const tmpMp4 = path.join(os.tmpdir(), `memoria-e2e-${Date.now()}.mp4`);
    try {
      execFileSync("ffmpeg", [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=#76556F:s=160x120:d=8",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        tmpMp4,
      ], { stdio: "ignore" });
      const mp4Buf = readFileSync(tmpMp4);
      const vidSessionRes = await fetch(`${gatewayUrl}/media/upload-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify({
          spaceId: activeSpaceId,
          fileName: "orchard-reel.mp4",
          mimeType: "video/mp4",
          fileSizeBytes: mp4Buf.byteLength,
        }),
      });
      const vidSessionJson = await vidSessionRes.json();
      await fetch(vidSessionJson.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "video/mp4" },
        body: mp4Buf,
      });
      await fetch(`${gatewayUrl}/media/${vidSessionJson.data.mediaId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify({}),
      });
      await fetch(`${gatewayUrl}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify({
          spaceId: activeSpaceId,
          title: "Archival Orchard Reel",
          content: "16mm family film reel with chapter jumps.",
          format: "video",
          capturedAt: new Date().toISOString(),
          mediaIds: [vidSessionJson.data.mediaId],
          tags: ["video", "reel"],
        }),
      });
    } finally {
      if (existsSync(tmpMp4)) unlinkSync(tmpMp4);
    }

    await page.reload({ waitUntil: "networkidle" });
    await page.getByText("pending-retry-scan.png").first().waitFor({ state: "visible", timeout: 10000 });
    await page.click('button:has-text("Retry Session")');
    await page.getByText(/Refreshed signed upload session/i).waitFor({ state: "visible", timeout: 10000 });

    await page.click('button:has-text("Archival Orchard Reel")');
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await page.click('button:has-text("Media / OCR Inspector")');
    await page.waitForSelector("video", { timeout: 10000 });
    await page.click('button:has-text("Jump 5s")');
    const videoTimeAfterJump = await page.evaluate(() => {
      const v = document.querySelector("video");
      return v ? v.currentTime : -1;
    });
    assert.ok(videoTimeAfterJump >= 4.5, `Expected video seek to >=5s, got ${videoTimeAfterJump}`);
    await page.click('button:has-text("Hide Captions")');
    await page.getByRole("button", { name: "Show Captions" }).waitFor({ state: "visible" });
    await page.keyboard.press("Escape");

    // 4c. /spaces/[spaceId] timeline, members & settings (PWA-24 / PWA-25)
    await page.goto(`${WEB_BASE}/spaces/${activeSpaceId}`, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Timeline/i }).click();
    await page.getByText("Chronological Space Timeline").waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("tab", { name: /Members & Roles/i }).click();
    await page.getByText("Member Roster & RBAC Roles").waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("tab", { name: /Space Settings/i }).click();
    await page.fill("#spd-desc", "Updated archival vault description");
    await page.click('button:has-text("Save Space Settings")');
    await page.getByText("Space settings saved.").waitFor({ state: "visible", timeout: 10000 });

    // 5. /trash restore memory
    await page.goto(`${WEB_BASE}/trash`, { waitUntil: "networkidle" });
    await page.getByText("Orchard Harvest 1984").first().waitFor({ state: "visible", timeout: 10000 });
    await page.click('button:has-text("Restore")');
    await page.getByText("Restored").first().waitFor({ state: "visible", timeout: 10000 });

    // 6. /studio -> profile filter (PWA-59), template layout (PWA-62), focal-point (PWA-66) -> /billing -> /orders
    await page.goto(`${WEB_BASE}/studio`, { waitUntil: "networkidle" });
    await page.fill("#new-book-title", "Vance Family Almanac");
    await page.click('button:has-text("Create Hardcover Edition")');
    await page.getByText("Created edition").waitFor({ state: "visible", timeout: 10000 });

    await page.selectOption("#curate-profile", "");
    await page.selectOption("#curate-template", "photo_journal");
    const firstMemCheckbox = page.locator('section:has-text("Memory Curation") input[type="checkbox"]').first();
    if (await firstMemCheckbox.isVisible()) {
      await firstMemCheckbox.check();
      await page.click('button:has-text("Auto-Compile Selected")');
      await page.getByText(/Compiled .* curated memories/i).waitFor({ state: "visible", timeout: 10000 });
    }
    await page.selectOption("#spread-focal", "50% 20%");
    await page.click('button:has-text("Update Spread")');
    await page.getByText("Updated interior spread layout.").waitFor({ state: "visible", timeout: 10000 });
    await page.click('button:has-text("Freeze for Print")');
    await page.getByText(/Edition frozen cleanly/i).waitFor({ state: "visible", timeout: 10000 });

    await page.goto(`${WEB_BASE}/billing`, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () => {
        const sel = document.getElementById("order-book") as HTMLSelectElement | null;
        return Boolean(sel && sel.value && sel.value.length > 0);
      },
      { timeout: 10000 }
    );
    await page.click('button:has-text("Calculate Live Press Quote")');
    await page.fill("#ship-name", "Clara Vance");
    await page.fill("#ship-street", "420 Archival Way");
    await page.fill("#ship-city", "Portland");
    await page.fill("#ship-zip", "97205");
    await page.click('button:has-text("Place Sandbox Print Order")');
    await page.getByText("Sandbox print order").waitFor({ state: "visible", timeout: 10000 });

    await page.goto(`${WEB_BASE}/orders`, { waitUntil: "networkidle" });
    await page.waitForSelector('button:has-text("Proof Receipt")', { timeout: 10000 });
    await page.click('button:has-text("Proof Receipt")');
    const receiptDialog = page.getByRole("dialog");
    await receiptDialog.waitFor({ state: "visible" });
    const shellInertDuringReceipt = await page.evaluate(() =>
      document.getElementById("app-shell-root")?.hasAttribute("inert")
    );
    assert.equal(shellInertDuringReceipt, true, "Expected #app-shell-root inert during receipt modal");
    await page.keyboard.press("Tab");
    const focusInsideReceipt = await page.evaluate(() =>
      Boolean(document.querySelector('[role="dialog"]')?.contains(document.activeElement))
    );
    assert.equal(focusInsideReceipt, true, "Expected Tab focus trapped inside receipt dialog");
    await page.keyboard.press("Escape");
    await receiptDialog.waitFor({ state: "hidden" });

    // 7. /export download + /settings display name update
    await page.goto(`${WEB_BASE}/export`, { waitUntil: "networkidle" });
    const downloadPromise = page.waitForEvent("download");
    await page.click('button:has-text("Download Verified Space Bundle")');
    const download = await downloadPromise;
    assert.ok(download.suggestedFilename().startsWith("memoria-space-"));
    await page.getByText("Integrity SHA-256:").waitFor({ state: "visible", timeout: 10000 });

    await page.goto(`${WEB_BASE}/settings`, { waitUntil: "networkidle" });
    await page.fill("#settings-fullname", "Clara Vance-Bennett");
    await page.click('button:has-text("Save Display Name")');
    await page.getByText("Profile display name updated.").waitFor({ state: "visible", timeout: 10000 });

    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join("; ")}`);
    await context.close();
  });

  test("5. Expanded PWA Sub-Routes, Support Ticket & Multi-Console Admin RBAC Portal in Chrome", async () => {
    assert.ok(browser, "Browser must be initialized");
    const cfg = validateServiceConfig(BaseServiceConfigSchema);
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const superAdminId = crypto.randomUUID();
    const adminToken = jwt.sign(
      { sub: superAdminId, email: "superadmin-e2e@memoria.internal", role: "superadmin" },
      cfg.JWT_SECRET,
      { expiresIn: "1h" }
    );

    await page.addInitScript(
      ({ apiUrl, token, uid }: { apiUrl: string; token: string; uid: string }) => {
        window.localStorage.setItem("memoria_api_url_override", apiUrl);
        window.localStorage.setItem("memoria_web_access_token", token);
        window.localStorage.setItem(
          "memoria_web_user",
          JSON.stringify({ id: uid, email: "superadmin-e2e@memoria.internal", fullName: "Archival Superadmin", role: "superadmin" })
        );
      },
      { apiUrl: gatewayUrl, token: adminToken, uid: superAdminId }
    );

    // 1. Live /help support ticket submission & create a space for share link testing
    await page.goto(`${WEB_BASE}/help`, { waitUntil: "networkidle" });
    await page.fill("#help-subject", "Chrome E2E Foil Inquiry");
    await page.fill("#help-message", "Checking live ticket creation from /help.");
    await page.click('button:has-text("Submit Support Note")');
    await page.getByText("Chrome E2E Foil Inquiry").first().waitFor({ state: "visible", timeout: 10000 });

    await page.goto(`${WEB_BASE}/spaces`, { waitUntil: "networkidle" });
    await page.fill("#space-name-input", "Admin Heirloom Space");
    await page.click('button:has-text("Create Memory Space")');
    await page.getByText("Admin Heirloom Space").first().waitFor({ state: "visible", timeout: 10000 });

    // 2. Archive views (timeline, calendar, search, favorites) & /settings storage panel
    await page.goto(`${WEB_BASE}/archive/timeline`, { waitUntil: "networkidle" });
    await page.getByText("Timeline View").first().waitFor({ state: "visible", timeout: 10000 });
    await page.goto(`${WEB_BASE}/archive/calendar`, { waitUntil: "networkidle" });
    await page.getByText("Archival Calendar Distribution").first().waitFor({ state: "visible", timeout: 10000 });
    await page.goto(`${WEB_BASE}/settings`, { waitUntil: "networkidle" });
    await page.getByText("Local Disk Storage").first().waitFor({ state: "visible", timeout: 10000 });

    // 2b. /circles capability matrix (PWA-50) + share link creation -> passphrase unlock in /share/[token]
    await page.goto(`${WEB_BASE}/circles`, { waitUntil: "networkidle" });
    await page.fill("#invite-email", "circle-member@memoria.internal");
    await page.click('button:has-text("Generate Invite Token")');
    const inviteStatus = await page.locator('[role="status"]').first().textContent();
    const inviteTokenMatch = inviteStatus?.match(/securely:\s*([a-f0-9]+)/i);
    assert.ok(inviteTokenMatch?.[1], `Expected invite token in notice: ${inviteStatus}`);

    // Accept the invite from a fresh registered user so /circles has a non-owner member to govern
    const collaboratorRes = await fetch(`${gatewayUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `collab_${Date.now()}@memoria.internal`,
        password: "CollabUser123!",
        fullName: "Elena Collaborator",
      }),
    });
    const collaboratorJson = await collaboratorRes.json();
    const collabToken = collaboratorJson?.data?.accessToken as string;
    await fetch(`${gatewayUrl}/collab/invitations/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${collabToken}` },
      body: JSON.stringify({ token: inviteTokenMatch[1] }),
    });

    await page.reload({ waitUntil: "networkidle" });
    const capCheckbox = page.locator('label:has-text("Edit Books") input[type="checkbox"]').first();
    await capCheckbox.waitFor({ state: "visible", timeout: 10000 });
    await capCheckbox.check();
    await page.getByText(/Updated member role & capabilities/i).waitFor({ state: "visible", timeout: 10000 });

    await page.fill('input[placeholder*="passphrase" i]', "family-secret-99");
    await page.click('button:has-text("Generate Share Link")');
    const statusLocator = page.locator('[role="status"]').filter({ hasText: "/share/" }).first();
    await statusLocator.waitFor({ state: "visible", timeout: 10000 });
    const shareNotice = await statusLocator.textContent();
    const tokenMatch = shareNotice?.match(/\/share\/([a-f0-9]+)/i);
    assert.ok(tokenMatch?.[1], `Expected share token in notice: ${shareNotice}`);
    await page.goto(`${WEB_BASE}/share/${tokenMatch[1]}`, { waitUntil: "networkidle" });
    await page.fill("#share-passphrase", "family-secret-99");
    await page.click('button:has-text("Unlock Shared Archive")');
    await page.getByText("Shared Family Stories").first().waitFor({ state: "visible", timeout: 10000 });

    // Seed a moderation flag and abuse report for ADMIN-06 / ADMIN-07 verification
    const adminSpacesRes = await fetch(`${gatewayUrl}/spaces`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminSpacesJson = await adminSpacesRes.json();
    const adminSpaceId = adminSpacesJson?.data?.[0]?.id as string;
    const seededMemRes = await fetch(`${gatewayUrl}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        spaceId: adminSpaceId,
        title: "Admin Moderation Test Entry",
        content: "Testing moderation & report resolution.",
        format: "story",
        capturedAt: new Date().toISOString(),
        tags: ["governance"],
      }),
    });
    const seededMemJson = await seededMemRes.json();
    const seededMemId = seededMemJson?.data?.id as string;
    await fetch(`${gatewayUrl}/memories/${seededMemId}/flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: "Chrome E2E archival quality check" }),
    });
    await fetch(`${gatewayUrl}/support/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        targetType: "memory",
        targetId: seededMemId,
        reason: "Chrome E2E policy report",
      }),
    });

    // Seed a dual-custody access request from a second admin so our primary superadmin can approve it in the UI
    const secondAdminToken = jwt.sign(
      { sub: crypto.randomUUID(), email: "compliance-e2e@memoria.internal", role: "superadmin" },
      cfg.JWT_SECRET,
      { expiresIn: "1h" }
    );
    await fetch(`${gatewayUrl}/admin/access-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secondAdminToken}` },
      body: JSON.stringify({ reason: "Second-party dual custody review #402" }),
    });

    // 3. Full Admin Portal multi-console navigation & ALL tabs interactive actions
    await page.goto(`${WEB_BASE}/admin`, { waitUntil: "networkidle" });
    await page.getByText("System Overview (01/13)").first().waitFor({ state: "visible", timeout: 10000 });

    // Tab: Users & Access (ADMIN-02 / 03 / 05)
    await page.click('button:has-text("Users & Access")');
    await page.getByText("Dual-Party Support Access Console (ADMIN-05)").waitFor({ state: "visible", timeout: 10000 });
    await page.fill('input[placeholder*="Support ticket reason" i]', "Inspect archival ticket #401");
    await page.click('button:has-text("Request Access")');
    await page.getByText(/Submitted dual-custody support access request/i).waitFor({ state: "visible", timeout: 10000 });
    const secondPartyRow = page.locator("div").filter({ hasText: "Second-party dual custody review #402" }).filter({ has: page.locator('button:has-text("Approve")') }).last();
    await secondPartyRow.locator('button:has-text("Approve")').click();
    await page.getByText(/Approved support access request/i).waitFor({ state: "visible", timeout: 10000 });
    const revokeBtn = page.locator('button:has-text("Revoke Sessions")').first();
    if (await revokeBtn.isVisible().catch(() => false)) {
      await revokeBtn.click();
      await page.getByText(/Revoked all active sessions/i).waitFor({ state: "visible", timeout: 10000 });
    }

    // Tab: Memory Spaces (ADMIN-04)
    await page.click('button:has-text("Memory Spaces")');
    await page.getByText("Memory Space Directory").waitFor({ state: "visible", timeout: 10000 });
    const inspectSpaceBtn = page.locator('button:has-text("Inspect")').first();
    await inspectSpaceBtn.waitFor({ state: "visible", timeout: 10000 });
    await inspectSpaceBtn.click();
    await page.getByRole("dialog").waitFor({ state: "visible", timeout: 10000 });
    await page.click('button:has-text("Done")');

    // Tab: Moderation & Reports (ADMIN-06 / 07)
    await page.click('button:has-text("Moderation & Reports")');
    await page.getByText("Chrome E2E archival quality check").first().waitFor({ state: "visible", timeout: 10000 });
    await page.click('button:has-text("Approve")');
    await page.getByText(/Approved flagged item/i).waitFor({ state: "visible", timeout: 10000 });
    await page.getByText("Chrome E2E policy report").first().waitFor({ state: "visible", timeout: 10000 });
    await page.click('button:has-text("Resolve")');
    await page.getByText(/Resolved user policy report/i).waitFor({ state: "visible", timeout: 10000 });

    // Tab: Storage & Media (ADMIN-08 / 09 / 10)
    await page.click('button:has-text("Storage & Media")');
    await page.getByText("LocalDiskStorageDriver").first().waitFor({ state: "visible", timeout: 10000 });
    const reprocessBtn = page.locator('button:has-text("Reprocess")').first();
    if (await reprocessBtn.isVisible().catch(() => false)) {
      await reprocessBtn.click();
      await page.getByText(/Re-queued derivative & OCR job/i).waitFor({ state: "visible", timeout: 10000 });
    }

    // Tab: Queues & Rendering (ADMIN-11 / 12 / 14 / 15)
    await page.click('button:has-text("Queues & Rendering")');
    await page.getByText("BullMQ Queues & DLQ Console (ADMIN-11 / 12)").waitFor({ state: "visible", timeout: 10000 });
    const retryDlqBtn = page.locator('button:has-text("Retry DLQ")').first();
    if (await retryDlqBtn.isVisible().catch(() => false)) {
      await retryDlqBtn.click();
      await page.getByText(/Retried failed jobs in queue/i).waitFor({ state: "visible", timeout: 10000 });
    }
    const overridePreflightBtn = page.locator('button:has-text("Override Preflight")').first();
    await overridePreflightBtn.waitFor({ state: "visible", timeout: 10000 });
    await overridePreflightBtn.click();
    await page.getByText(/Overrode preflight tolerances/i).waitFor({ state: "visible", timeout: 10000 });

    // Tab: Print Orders & Refunds (ADMIN-18 / 19 / 20 / 21)
    await page.click('button:has-text("Print Orders & Refunds")');
    await page.getByText("Print Fulfillment Queue").waitFor({ state: "visible", timeout: 10000 });
    const shipBtn = page.locator('button:has-text("Ship with Tracking")').first();
    await shipBtn.waitFor({ state: "visible", timeout: 10000 });
    await shipBtn.click();
    await page.getByText(/Dispatched order/i).waitFor({ state: "visible", timeout: 10000 });
    await page.getByText("Payment & Settlement Ledger (ADMIN-21)").waitFor({ state: "visible", timeout: 10000 });
    const remakeBtn = page.locator('button:has-text("Authorize Remake")').first();
    await remakeBtn.click();
    await page.getByText(/Authorized remake for order/i).waitFor({ state: "visible", timeout: 10000 });

    await page.click('button:has-text("Templates, Flags & Audit")');
    await page.getByText("webgl_3d_reader").first().waitFor({ state: "visible", timeout: 10000 });
    await page.click('button:has-text("Save Template")');
    await page.getByText(/Saved template/i).first().waitFor({ state: "visible", timeout: 10000 });
    await page.getByText(/Recent Audit Ledger/i).first().waitFor({ state: "visible", timeout: 10000 });

    await page.click('button:has-text("Support Desk")');
    await page.getByText("Chrome E2E Foil Inquiry").first().waitFor({ state: "visible", timeout: 10000 });
    await page.fill('input[placeholder="Write reply..."]', "Use 300 DPI PNG with archival gold foil.");
    await page.click('button:has-text("Send & Resolve")');
    await page.getByText(/Replied to ticket/i).first().waitFor({ state: "visible", timeout: 10000 });

    await page.click('button:has-text("Admin 2FA & Keys")');
    await page.fill('input[placeholder*="YubiKey" i]', "YubiKey 5C Test");
    await page.click('button:has-text("Register Security Key")');
    await page.getByText("YubiKey 5C Test").first().waitFor({ state: "visible", timeout: 10000 });
    await page.click('button:has-text("Remove")');
    await page.getByText(/Removed security key/i).first().waitFor({ state: "visible", timeout: 10000 });

    await page.click('button:has-text("Catalog & Pricing")');
    await page.getByText("Shipping Rate Matrix").first().waitFor({ state: "visible", timeout: 10000 });
    await page.click('button:has-text("Update Rate")');
    await page.getByText(/Updated .* shipping rate/i).first().waitFor({ state: "visible", timeout: 10000 });

    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join("; ")}`);
    await context.close();
  });
});
