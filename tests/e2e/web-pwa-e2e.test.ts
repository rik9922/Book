import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, ChildProcess } from "node:child_process";
import path from "node:path";

const WEB_PORT = 3199;
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

async function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Server still booting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for Next.js server at ${url}`);
}

describe("Web PWA Production Server & Routes E2E Suite", () => {
  let webProcess: ChildProcess | null = null;

  before(async () => {
    const webDir = path.resolve(process.cwd(), "apps/web");
    const nextBin = path.resolve(process.cwd(), "apps/web/node_modules/.bin/next");
    webProcess = spawn(nextBin, ["start", "-p", String(WEB_PORT), "-H", "127.0.0.1"], {
      cwd: webDir,
      stdio: "ignore",
      env: { ...process.env, NODE_ENV: "production" },
    });
    await waitForServer(`${BASE_URL}/`);
  });

  after(() => {
    if (webProcess && !webProcess.killed) {
      webProcess.kill("SIGTERM");
    }
  });

  const expectedRoutes = [
    "/",
    "/how-it-works",
    "/use-cases",
    "/gallery",
    "/sample-book",
    "/pricing",
    "/help",
    "/onboarding",
    "/auth",
    "/dashboard",
    "/spaces",
    "/profiles",
    "/collections",
    "/notifications",
    "/archive",
    "/trash",
    "/circles",
    "/studio",
    "/billing",
    "/orders",
    "/export",
    "/settings",
    "/admin",
  ];

  for (const route of expectedRoutes) {
    test(`Route ${route} renders SSR HTML with HTTP 200 and Living Archive palette`, async () => {
      const res = await fetch(`${BASE_URL}${route}`);
      assert.equal(res.status, 200, `Expected 200 for ${route}`);
      const html = await res.text();
      assert.ok(html.includes("Memoria"), `Expected Memoria branding on ${route}`);
      assert.ok(html.includes("#F7F4EE") || html.includes("bg-[#F7F4EE]"), `Expected Linen Cream canvas on ${route}`);
    });
  }

  test("PWA manifest.webmanifest & Service Worker sw.js are valid and non-empty", async () => {
    const manifestRes = await fetch(`${BASE_URL}/manifest.webmanifest`);
    assert.equal(manifestRes.status, 200);
    const manifest = (await manifestRes.json()) as {
      name: string;
      background_color: string;
      icons: unknown[];
    };
    assert.ok(manifest.name.includes("Memoria"));
    assert.equal(manifest.background_color, "#F7F4EE");
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);

    const swRes = await fetch(`${BASE_URL}/sw.js`);
    assert.equal(swRes.status, 200);
    const swText = await swRes.text();
    assert.ok(swText.includes("CACHE_NAME") || swText.includes("memoria"));
  });
});
