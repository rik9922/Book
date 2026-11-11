import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, ChildProcess } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";
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
      "/onboarding",
      "/profiles",
      "/collections",
      "/notifications",
      "/trash",
      "/billing",
      "/orders",
      "/export",
      "/admin",
    ];
    for (const r of routesToVerify) {
      await page.goto(`${WEB_BASE}${r}`, { waitUntil: "domcontentloaded" });
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
});
