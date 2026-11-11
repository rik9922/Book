import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Memoria 3D Realism & Web App Connectivity Verification Suite", () => {
  const repoRoot = path.resolve(__dirname, "..");

  test("1. Archival PBR Texture Assets Verification", () => {
    const requiredTextures = [
      "leather_normal.png",
      "leather_roughness.png",
      "paper_texture.png",
      "page_edges.png",
      "ribbon_texture.png",
    ];

    for (const filename of requiredTextures) {
      const fullPath = path.join(repoRoot, "apps/web/public/textures", filename);
      assert.ok(
        fs.existsSync(fullPath),
        `Texture file ${filename} must exist in apps/web/public/textures`
      );
      const stat = fs.statSync(fullPath);
      assert.ok(stat.size > 1000, `Texture file ${filename} must have non-trivial byte size (got ${stat.size} bytes)`);
    }
  });

  test("2. Next.js API Proxy Rewrites Configuration", async () => {
    const nextConfigPath = path.join(repoRoot, "apps/web/next.config.ts");
    assert.ok(fs.existsSync(nextConfigPath), "next.config.ts must exist");
    const content = fs.readFileSync(nextConfigPath, "utf-8");
    assert.ok(
      content.includes("rewrites"),
      "next.config.ts must declare rewrites for /api/v1/:path*"
    );
    assert.ok(
      content.includes("/api/v1/:path*"),
      "next.config.ts rewrites must target /api/v1/:path*"
    );
  });

  test("3. AuthModal Component & Cookie Session Persistence Contract", () => {
    const modalPath = path.join(repoRoot, "apps/web/src/components/AuthModal.tsx");
    assert.ok(fs.existsSync(modalPath), "AuthModal.tsx must exist");
    const modalContent = fs.readFileSync(modalPath, "utf-8");
    assert.ok(
      modalContent.includes("saveStoredSession"),
      "AuthModal must persist session via saveStoredSession"
    );
    assert.ok(
      modalContent.includes("One-Click Demo Archival Curator"),
      "AuthModal must offer frictionless one-click demo access"
    );

    const apiPath = path.join(repoRoot, "apps/web/src/lib/api.ts");
    const apiContent = fs.readFileSync(apiPath, "utf-8");
    assert.ok(
      apiContent.includes("document.cookie"),
      "api.ts saveStoredSession must write session to browser cookies"
    );
    assert.ok(
      apiContent.includes("memoria:auth-change"),
      "api.ts saveStoredSession must dispatch memoria:auth-change event"
    );
  });

  test("4. 3D Book Turning Page Visibility & Spread Resolution", () => {
    const canvasPath = path.join(repoRoot, "apps/web/src/components/3d/ExperienceCanvas.tsx");
    const canvasContent = fs.readFileSync(canvasPath, "utf-8");
    assert.ok(
      canvasContent.includes("isActivelyTurning"),
      "ExperienceCanvas must gate turning page visibility to active page turns to prevent text clipping"
    );
    assert.ok(
      canvasContent.includes("canvas.width = 1536"),
      "ExperienceCanvas must render high-resolution 1536x2048 spread textures for crisp typography"
    );
    assert.ok(
      canvasContent.includes("leather_normal.png"),
      "ExperienceCanvas must bind tactile leather normal map"
    );
    assert.ok(
      canvasContent.includes("page_edges.png"),
      "ExperienceCanvas must bind stratified fore-edge page texture"
    );
    assert.ok(
      canvasContent.includes("createArchivalRibbonGeometry"),
      "ExperienceCanvas must generate supple catenary silk ribbon geometry"
    );
    assert.ok(
      canvasContent.includes("Archival Museum Display Mat"),
      "ExperienceCanvas must render archival presentation display mat for physical grounding"
    );
  });

  test("5. Multi-View Reactive Auth Subscription & Frictionless Navigation", () => {
    const pagesToCheck = [
      "apps/web/src/app/spaces/page.tsx",
      "apps/web/src/app/studio/page.tsx",
      "apps/web/src/components/ArchiveWorkspace.tsx",
      "apps/web/src/app/orders/page.tsx",
      "apps/web/src/app/dashboard/page.tsx",
      "apps/web/src/app/billing/page.tsx",
      "apps/web/src/app/profiles/page.tsx",
      "apps/web/src/app/collections/page.tsx",
      "apps/web/src/app/notifications/page.tsx",
    ];

    for (const relPath of pagesToCheck) {
      const fullPath = path.join(repoRoot, relPath);
      assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(
        content.includes("subscribeAuthChange"),
        `${relPath} must subscribe to reactive auth changes via subscribeAuthChange`
      );
      assert.ok(
        content.includes("openAuthModal"),
        `${relPath} must provide instant modal trigger via openAuthModal`
      );
    }
  });

  test("6. Seamless Account Registration & Cookie Eviction on Sign Out", () => {
    const authPanelPath = path.join(repoRoot, "apps/web/src/components/AuthFlowPanel.tsx");
    const authPanelContent = fs.readFileSync(authPanelPath, "utf-8");
    assert.ok(
      !authPanelContent.includes("if (!res.verificationToken)"),
      "AuthFlowPanel must not block registration redirect when verificationToken is present"
    );

    const apiPath = path.join(repoRoot, "apps/web/src/lib/api.ts");
    const apiContent = fs.readFileSync(apiPath, "utf-8");
    assert.ok(
      apiContent.includes("max-age=0"),
      "api.ts clearStoredSession must evict cookies with max-age=0"
    );
  });
});
