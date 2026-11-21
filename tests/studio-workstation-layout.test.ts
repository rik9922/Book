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

  test("3. AuthorStudioWorkspace implements unified archival workstation layout & /studio is compatibility redirect", async () => {
    const authorPath = path.join(repoRoot, "apps/web/src/components/author/AuthorStudioWorkspace.tsx");
    const legacyStudioPath = path.join(repoRoot, "apps/web/src/app/studio/page.tsx");
    assert.ok(fs.existsSync(authorPath), "AuthorStudioWorkspace.tsx must exist");
    assert.ok(fs.existsSync(legacyStudioPath), "studio/page.tsx compatibility redirect must exist");
    const content = fs.readFileSync(authorPath, "utf-8");
    const legacyContent = fs.readFileSync(legacyStudioPath, "utf-8");

    // /studio must be a lightweight redirect to /author (no competing book editor)
    assert.ok(
      legacyContent.includes("router.replace(targetHref)") && legacyContent.includes("/author"),
      "Legacy /studio page must redirect to /author preserving query params"
    );

    // Viewport & layout assertions in AuthorStudioWorkspace
    assert.ok(
      content.includes("hideSidebar={true}"),
      "Author Studio must render ClientStudioMount with hideSidebar={true} to prevent double-sidebar squishing"
    );
    assert.ok(
      content.includes("lg:col-span-7"),
      "Author Studio must allocate generous 7-column grid to 3D book canvas"
    );
    assert.ok(
      content.includes("lg:col-span-5"),
      "Author Studio must allocate 5-column grid to structured spread composition inspector"
    );

    // Unified 5 environments (Write, Structure/Curation, Design/Cover, Book Theater/Spreads, Publish/Preflight)
    assert.ok(
      content.includes('id: "write"') &&
        content.includes('id: "structure"') &&
        content.includes('id: "design"') &&
        content.includes('id: "preview"') &&
        content.includes('id: "publish"'),
      "Author Studio must provide unified 5-environment navigation"
    );

    // First-edition and empty-space resilience
    assert.ok(
      content.includes("handleBindFirstEdition"),
      "Author Studio must provide 1-click handleBindFirstEdition action when space has 0 editions"
    );
    assert.ok(
      content.includes("Bind First Edition from Vault"),
      "Author Studio must show prominent 1-click Bind First Edition CTA instead of empty void"
    );
    assert.ok(
      content.includes("createSpace({"),
      "Author Studio must auto-provision or initialize archive space when spaces list is empty"
    );

    // Controls & Workstation quick bar
    assert.ok(
      content.includes("BOOK_CAMERA_PRESETS"),
      "Author Studio workstation bar must provide quick angle switcher presets"
    );
    assert.ok(
      content.includes("BOOK_LEATHER_SWATCHES") && content.includes("BOOK_FOIL_SWATCHES"),
      "Author Studio must render canonical leather and foil swatches"
    );
  });

  test("4. Author Studio provides Spine controls, clean canvas viewport, non-lossy spread merging & guest resilience", async () => {
    const canvasPath = path.join(repoRoot, "apps/web/src/components/3d/ExperienceCanvas.tsx");
    const authorPath = path.join(repoRoot, "apps/web/src/components/author/AuthorStudioWorkspace.tsx");
    const canvasContent = fs.readFileSync(canvasPath, "utf-8");
    const authorContent = fs.readFileSync(authorPath, "utf-8");

    // Clean viewport without duplicate overlays
    assert.ok(
      canvasContent.includes("hideHud?: boolean"),
      "ExperienceCanvas must support hideHud option to suppress duplicate floating overlays"
    );
    assert.ok(
      authorContent.includes("hideHud={true}"),
      "Author Studio must mount 3D canvas with hideHud={true} for clean presentation"
    );
    assert.ok(
      canvasContent.includes("onToggle2DMode"),
      "ExperienceCanvas must support controlled 2D mode toggle"
    );

    // Spine & Cover designer controls
    assert.ok(
      authorContent.includes("spineTextInput") && authorContent.includes("spineText:"),
      "Author Studio must provide dedicated Spine inscription controls and persist spineText"
    );

    // Active spreads mapping & non-lossy element preservation
    assert.ok(
      authorContent.includes("theaterSpreads") && authorContent.includes("mapBookSpreadsToTheaterPreview"),
      "Author Studio must map persisted book spreads into 3D Book Theater"
    );
    assert.ok(
      authorContent.includes("mergeSpreadPageElementsNonLossy"),
      "Author Studio must use non-lossy spread element merger to preserve images and arbitrary elements"
    );

    // Guest sandbox resilience
    assert.ok(
      authorContent.includes("Guest Author Sandbox Mode"),
      "Author Studio must provide interactive sandbox when visitor is unauthenticated"
    );

    // Unit-test non-lossy spread element merging directly
    const { mergeSpreadPageElementsNonLossy, mapLegacyStudioTabToEnvironment } = await import(
      "../apps/web/src/lib/author-spread-utils"
    );
    const merged = mergeSpreadPageElementsNonLossy(
      [
        {
          id: "img-1",
          type: "image",
          x: 10,
          y: 10,
          width: 40,
          height: 40,
          rotation: 0,
          zIndex: 1,
          content: "media-asset-uuid-123",
          style: { cropShape: "rect" },
        },
        {
          id: "shape-1",
          type: "shape",
          x: 5,
          y: 5,
          width: 90,
          height: 2,
          rotation: 0,
          zIndex: 0,
          content: "divider",
        },
        {
          id: "h-1",
          type: "heading",
          x: 10,
          y: 55,
          width: 80,
          height: 12,
          rotation: 0,
          zIndex: 2,
          content: "Old Heading",
        },
      ],
      {
        heading: "Updated Heading",
        caption: "New Archival Caption",
        focalPoint: "50% 20%",
        createId: () => "cap-new",
      }
    );
    assert.equal(merged.length, 4, "Non-lossy merge must keep image, shape, heading, and append caption");
    const imgEl = merged.find((e) => e.id === "img-1");
    assert.ok(imgEl, "Existing image element must never be discarded on spread update");
    assert.equal(imgEl?.style?.objectPosition, "50% 20%", "Image focal point must update cleanly");
    assert.equal(imgEl?.style?.cropShape, "rect", "Existing image cropShape style must be preserved");
    assert.ok(merged.some((e) => e.id === "shape-1"), "Existing shape element must be preserved");
    assert.equal(merged.find((e) => e.id === "h-1")?.content, "Updated Heading");
    assert.equal(merged.find((e) => e.id === "cap-new")?.content, "New Archival Caption");

    assert.equal(mapLegacyStudioTabToEnvironment("cover"), "design");
    assert.equal(mapLegacyStudioTabToEnvironment("spreads"), "preview");
    assert.equal(mapLegacyStudioTabToEnvironment("curation"), "structure");
    assert.equal(mapLegacyStudioTabToEnvironment("preflight"), "publish");
  });
});
