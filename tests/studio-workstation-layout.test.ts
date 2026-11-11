import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("3D Heirloom Book Studio Workstation Layout & Component Verification", () => {
  const repoRoot = path.resolve(__dirname, "..");

  test("1. ExperienceCanvas supports hideSidebar and expansive viewport aspect ratio", () => {
    const canvasPath = path.join(repoRoot, "apps/web/src/components/3d/ExperienceCanvas.tsx");
    assert.ok(fs.existsSync(canvasPath), "ExperienceCanvas.tsx must exist");
    const content = fs.readFileSync(canvasPath, "utf-8");

    assert.ok(
      content.includes("hideSidebar?: boolean"),
      "ExperienceCanvasProps must declare hideSidebar option"
    );
    assert.ok(
      content.includes("min-h-[520px]"),
      "ExperienceCanvas must offer minimum 520px+ viewport height"
    );
    assert.ok(
      content.includes("{!hideSidebar && ("),
      "ExperienceCanvas must conditionally hide internal sidebar when embedded in Studio"
    );
    assert.ok(
      content.includes("selectedLeatherId"),
      "ExperienceCanvas must accept controlled selectedLeatherId prop"
    );
    assert.ok(
      content.includes("selectedFoilId"),
      "ExperienceCanvas must accept controlled selectedFoilId prop"
    );
  });

  test("2. ClientStudioMount transparently forwards props to ExperienceCanvas", () => {
    const mountPath = path.join(repoRoot, "apps/web/src/components/3d/ClientStudioMount.tsx");
    assert.ok(fs.existsSync(mountPath), "ClientStudioMount.tsx must exist");
    const content = fs.readFileSync(mountPath, "utf-8");

    assert.ok(
      content.includes("ExperienceCanvasProps"),
      "ClientStudioMount must import and forward ExperienceCanvasProps"
    );
    assert.ok(
      content.includes("<ExperienceCanvas {...props} />"),
      "ClientStudioMount must spread all props to dynamic ExperienceCanvas"
    );
  });

  test("3. BookStudioPage implements unified archival workstation layout with expansive viewport", () => {
    const studioPath = path.join(repoRoot, "apps/web/src/app/studio/page.tsx");
    assert.ok(fs.existsSync(studioPath), "studio/page.tsx must exist");
    const content = fs.readFileSync(studioPath, "utf-8");

    // Viewport & layout assertions
    assert.ok(
      content.includes("hideSidebar={true}"),
      "Studio must render ClientStudioMount with hideSidebar={true} to prevent double-sidebar squishing"
    );
    assert.ok(
      content.includes("lg:col-span-7"),
      "Studio must allocate generous 7-column grid to 3D book canvas"
    );
    assert.ok(
      content.includes("lg:col-span-5"),
      "Studio must allocate 5-column grid to structured archival inspector"
    );

    // Inspector tabs
    assert.ok(
      content.includes("setActiveTab(\"cover\")") &&
        content.includes("setActiveTab(\"spreads\")") &&
        content.includes("setActiveTab(\"curation\")") &&
        content.includes("setActiveTab(\"preflight\")"),
      "Studio inspector must provide unified tabs for Binding, Spreads, Curation, and Preflight"
    );

    // First-edition and empty-space resilience
    assert.ok(
      content.includes("handleBindFirstEdition"),
      "Studio must provide 1-click handleBindFirstEdition action when space has 0 editions"
    );
    assert.ok(
      content.includes("Bind First Edition from Vault"),
      "Studio must show prominent 1-click Bind First Edition CTA instead of empty void"
    );
    assert.ok(
      content.includes("createSpace({"),
      "Studio must auto-provision or initialize archive space when spaces list is empty"
    );

    // Controls & Workstation quick bar
    assert.ok(
      content.includes("BOOK_CAMERA_PRESETS"),
      "Studio workstation bar must provide quick angle switcher presets"
    );
    assert.ok(
      content.includes("BOOK_LEATHER_SWATCHES") && content.includes("BOOK_FOIL_SWATCHES"),
      "Studio must render canonical leather and foil swatches"
    );
  });

  test("4. Studio provides Spine & Joint controls, clean canvas viewport without duplicate overlays, and guest resilience", () => {
    const canvasPath = path.join(repoRoot, "apps/web/src/components/3d/ExperienceCanvas.tsx");
    const studioPath = path.join(repoRoot, "apps/web/src/app/studio/page.tsx");
    const canvasContent = fs.readFileSync(canvasPath, "utf-8");
    const studioContent = fs.readFileSync(studioPath, "utf-8");

    // Clean viewport without duplicate overlays
    assert.ok(
      canvasContent.includes("hideHud?: boolean"),
      "ExperienceCanvas must support hideHud option to suppress duplicate floating overlays"
    );
    assert.ok(
      studioContent.includes("hideHud={true}"),
      "Studio must mount 3D canvas with hideHud={true} for clean presentation"
    );
    assert.ok(
      canvasContent.includes("onToggle2DMode"),
      "ExperienceCanvas must support controlled 2D mode toggle"
    );

    // Spine & Joint Archival inspection
    assert.ok(
      studioContent.includes("Spine Foil Inscription & Library Joint") ||
        studioContent.includes("editSpineText"),
      "Studio inspector must provide dedicated Spine & Joint controls"
    );
    assert.ok(
      studioContent.includes("spine_detail"),
      "Studio inspector must provide 1-click Spine & Joint camera angle trigger"
    );
    assert.ok(
      studioContent.includes("spineText:"),
      "Studio must save spineText in edition payload"
    );

    // Active spreads mapping & synchronization
    assert.ok(
      studioContent.includes("activeSpreads"),
      "Studio must compute and pass synchronized activeSpreads to 3D canvas"
    );
    assert.ok(
      studioContent.includes("mapRawSpreadsToPreview"),
      "Studio must map book spreads to preview format"
    );

    // Guest curator sandbox resilience
    assert.ok(
      studioContent.includes("Guest Curator Sandbox Mode"),
      "Studio must provide interactive sandbox when visitor is unauthenticated"
    );
  });
});
