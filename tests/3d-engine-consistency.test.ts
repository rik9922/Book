import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  ARCHIVAL_PAPER_MATERIAL_SPEC,
  BOOK_3D_HIERARCHY,
  BOOK_3D_REQUIRED_NODES,
  BOOK_ANIMATION_CONTRACT,
  BOOK_CAMERA_PRESETS,
  BOOK_FOIL_SWATCHES,
  BOOK_LEATHER_SWATCHES,
  BOOK_LIGHTING_INTENT,
  Book3DConfigurationSchema,
  Book3DManifestSchema,
  CANONICAL_BOOK_3D_MANIFEST,
  CANONICAL_SAMPLE_SPREADS,
  SILK_RIBBON_MATERIAL_SPEC,
  buildFoilMaterialSpec,
  buildLeatherMaterialSpec,
  computeCoverHingeAngle,
  computePageCurlDisplacement,
  computePageTurnAngle,
  evaluateCubicBezierEaseInOut,
  resolveCameraPreset,
  resolveFoilSwatch,
  resolveLeatherSwatch,
  toRealityKitMaterialParams,
  toThreeMaterialParams,
} from "@memory-capsule/contracts";
import { buildBookService } from "../services/book-service/src/server.ts";

function sha256File(filePath: string): string {
  const bytes = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function parseGlb(filePath: string) {
  const buf = fs.readFileSync(filePath);
  const magic = buf.toString("ascii", 0, 4);
  const version = buf.readUInt32LE(4);
  const totalLength = buf.readUInt32LE(8);

  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.readUInt32LE(16);
  const jsonText = buf.toString("utf8", 20, 20 + jsonLen).trim();
  const gltf = JSON.parse(jsonText);

  const binHeaderOffset = 20 + jsonLen;
  const binLen = buf.readUInt32LE(binHeaderOffset);
  const binType = buf.readUInt32LE(binHeaderOffset + 4);
  const binData = buf.subarray(binHeaderOffset + 8, binHeaderOffset + 8 + binLen);

  return { buf, magic, version, totalLength, jsonType, binType, gltf, binData };
}

describe("Memoria Unified Cross-Platform 3D Book Engine Consistency Suite", () => {
  const webGlbPath = path.resolve("apps/web/public/models/memoria_heirloom_book.glb");
  const legacyGlbPath = path.resolve("apps/web/public/models/heirloom_book.glb");
  const webUsdzPath = path.resolve("apps/web/public/models/MemoriaHeirloomBook.usdz");
  const iosUsdzPath = path.resolve("apps/ios/Memoria/Resources/Models/MemoriaHeirloomBook.usdz");
  const manifestPath = path.resolve("packages/contracts/src/book-3d-manifest.json");

  test("1. Manifest Checksums & Binary Byte-Size Parity (GLB + USDZ)", () => {
    assert.ok(fs.existsSync(manifestPath), "book-3d-manifest.json must exist");
    const manifestJson = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const parsed = Book3DManifestSchema.parse(manifestJson);

    assert.equal(parsed.modelId, "memoria_heirloom_book_v2");
    assert.equal(parsed.version, "2.0.0");

    // GLB targets
    assert.ok(fs.existsSync(webGlbPath));
    assert.ok(fs.existsSync(legacyGlbPath));
    assert.equal(fs.statSync(webGlbPath).size, parsed.assets.glb.byteSize);
    assert.equal(sha256File(webGlbPath), parsed.assets.glb.sha256);
    assert.equal(sha256File(legacyGlbPath), parsed.assets.glb.sha256);

    // USDZ targets
    assert.ok(fs.existsSync(webUsdzPath));
    assert.ok(fs.existsSync(iosUsdzPath));
    assert.equal(fs.statSync(webUsdzPath).size, parsed.assets.usdz.byteSize);
    assert.equal(sha256File(webUsdzPath), parsed.assets.usdz.sha256);
    assert.equal(sha256File(iosUsdzPath), parsed.assets.usdz.sha256);
  });

  test("2. GLB Binary Structure, Node Hierarchy, PBR & CCW Winding Verification", () => {
    const parsed = parseGlb(webGlbPath);
    assert.equal(parsed.magic, "glTF");
    assert.equal(parsed.version, 2);
    assert.equal(parsed.totalLength, parsed.buf.byteLength);
    assert.equal(parsed.jsonType, 0x4e4f534a);
    assert.equal(parsed.binType, 0x004e4942);

    const nodes: Array<{ name: string; mesh?: number; children?: number[]; translation?: number[] }> =
      parsed.gltf.nodes;
    const nodeNames = new Set(nodes.map((n) => n.name));
    for (const reqNode of BOOK_3D_REQUIRED_NODES) {
      assert.ok(nodeNames.has(reqNode), `Missing required GLB node: ${reqNode}`);
    }

    const frontHinge = nodes.find((n) => n.name === BOOK_3D_HIERARCHY.frontCoverHinge);
    assert.ok(frontHinge?.children && frontHinge.children.length === 3);
    const frontChildrenNames = new Set(frontHinge.children.map((idx) => nodes[idx].name));
    assert.ok(frontChildrenNames.has(BOOK_3D_HIERARCHY.frontCover));
    assert.ok(frontChildrenNames.has(BOOK_3D_HIERARCHY.emblem));
    assert.ok(frontChildrenNames.has(BOOK_3D_HIERARCHY.cornerGuards));

    const pageHinge = nodes.find((n) => n.name === BOOK_3D_HIERARCHY.turningPageHinge);
    assert.ok(pageHinge?.children && pageHinge.children.length === 1);
    assert.equal(nodes[pageHinge.children[0]].name, BOOK_3D_HIERARCHY.turningPageLeaf);
    assert.ok(pageHinge.translation && pageHinge.translation.length === 3);
    assert.ok(Math.abs(pageHinge.translation[0] - 0.005) < 1e-6);
    assert.ok(Math.abs(pageHinge.translation[1] - 0.0099) < 1e-6);
    assert.ok(Math.abs(pageHinge.translation[2] - 0) < 1e-6);

    // Verify vertex/triangle totals & CCW winding against normals
    let totalVertices = 0;
    let totalTriangles = 0;
    for (const mesh of parsed.gltf.meshes) {
      for (const prim of mesh.primitives) {
        const posAcc = parsed.gltf.accessors[prim.attributes.POSITION];
        const normAcc = parsed.gltf.accessors[prim.attributes.NORMAL];
        const idxAcc = parsed.gltf.accessors[prim.indices];
        totalVertices += posAcc.count;
        totalTriangles += idxAcc.count / 3;

        const posView = parsed.gltf.bufferViews[posAcc.bufferView];
        const normView = parsed.gltf.bufferViews[normAcc.bufferView];
        const idxView = parsed.gltf.bufferViews[idxAcc.bufferView];

        const readVec3 = (view: { byteOffset: number }, index: number): [number, number, number] => {
          const offset = view.byteOffset + index * 12;
          return [
            parsed.binData.readFloatLE(offset),
            parsed.binData.readFloatLE(offset + 4),
            parsed.binData.readFloatLE(offset + 8),
          ];
        };

        for (let t = 0; t < idxAcc.count; t += 3) {
          const i0 = parsed.binData.readUInt16LE(idxView.byteOffset + t * 2);
          const i1 = parsed.binData.readUInt16LE(idxView.byteOffset + (t + 1) * 2);
          const i2 = parsed.binData.readUInt16LE(idxView.byteOffset + (t + 2) * 2);

          const p0 = readVec3(posView, i0);
          const p1 = readVec3(posView, i1);
          const p2 = readVec3(posView, i2);
          const n0 = readVec3(normView, i0);

          const ux = p1[0] - p0[0];
          const uy = p1[1] - p0[1];
          const uz = p1[2] - p0[2];
          const vx = p2[0] - p0[0];
          const vy = p2[1] - p0[1];
          const vz = p2[2] - p0[2];

          const cx = uy * vz - uz * vy;
          const cy = uz * vx - ux * vz;
          const cz = ux * vy - uy * vx;
          const dot = cx * n0[0] + cy * n0[1] + cz * n0[2];
          assert.ok(
            dot > 0,
            `Mesh '${mesh.name}' triangle ${t / 3} winding must match outward normal (dot=${dot})`
          );
        }
      }
    }

    assert.equal(totalVertices, CANONICAL_BOOK_3D_MANIFEST.topology.totalVertices);
    assert.equal(totalTriangles, CANONICAL_BOOK_3D_MANIFEST.topology.totalTriangles);

    // Regression: TurningPageLeaf at rest must stay inside TextBlock (y < FrontCover bottom 0.011m)
    const pageMesh = parsed.gltf.meshes.find((m: { name: string }) => m.name === "TurningPageMesh");
    assert.ok(pageMesh, "TurningPageMesh must exist");
    const pagePosAcc = parsed.gltf.accessors[pageMesh.primitives[0].attributes.POSITION];
    const maxPageWorldY = pageHinge.translation[1] + pagePosAcc.max[1];
    assert.ok(
      maxPageWorldY < 0.011,
      `TurningPageLeaf rest max Y (${maxPageWorldY}) must remain below closed FrontCover (0.011m)`
    );

    // Regression: SilkRibbonBookmark must rest on top of TextBlock (>= 0.011m)
    const ribbonMesh = parsed.gltf.meshes.find((m: { name: string }) => m.name === "RibbonMesh");
    assert.ok(ribbonMesh, "RibbonMesh must exist");
    const ribbonPosAcc = parsed.gltf.accessors[ribbonMesh.primitives[0].attributes.POSITION];
    assert.ok(
      ribbonPosAcc.max[1] >= 0.011,
      `SilkRibbonBookmark max Y (${ribbonPosAcc.max[1]}) must rest on top of TextBlock (>= 0.011m)`
    );
  });

  test("3. USDZ Hierarchy Parity & Apple usdchecker Validation", () => {
    const usdaContent = execFileSync("unzip", ["-p", webUsdzPath, "*.usda"], {
      encoding: "utf-8",
    });

    assert.ok(usdaContent.includes(`defaultPrim = "${BOOK_3D_HIERARCHY.root}"`));
    assert.ok(usdaContent.includes('metersPerUnit = 1'));
    assert.ok(usdaContent.includes('upAxis = "Y"'));
    assert.ok(usdaContent.includes(`def Xform "${BOOK_3D_HIERARCHY.frontCoverHinge}"`));
    assert.ok(usdaContent.includes(`def Xform "${BOOK_3D_HIERARCHY.turningPageHinge}"`));
    assert.ok(usdaContent.includes('double3 xformOp:translate = (0.00500, 0.00990, 0.00000)'));

    for (const node of BOOK_3D_REQUIRED_NODES) {
      assert.ok(usdaContent.includes(`"${node}"`), `USDZ missing prim '${node}'`);
    }

    for (const matName of Object.keys(CANONICAL_BOOK_3D_MANIFEST.materials)) {
      assert.ok(usdaContent.includes(`def Material "${matName}"`), `USDZ missing material '${matName}'`);
    }

    if (process.platform === "darwin") {
      const result = execFileSync("xcrun", ["usdchecker", webUsdzPath], { encoding: "utf-8" });
      assert.ok(result.includes("Success!"), `usdchecker did not report Success: ${result}`);
    }
  });

  test("4. Shared 3D Contracts, Material Adapters, Camera Presets & Kinematics", () => {
    const defaultCfg = Book3DConfigurationSchema.parse({});
    assert.equal(defaultCfg.leatherId, "plum");
    assert.equal(defaultCfg.foilId, "gold");
    assert.equal(defaultCfg.isOpen, false);
    assert.equal(defaultCfg.cameraPreset, "hero");

    // Swatches
    assert.equal(BOOK_LEATHER_SWATCHES.length, 5);
    assert.equal(BOOK_LEATHER_SWATCHES[0].id, "plum");
    assert.equal(BOOK_LEATHER_SWATCHES[0].hex, "#76556F");
    assert.equal(BOOK_FOIL_SWATCHES.length, 4);
    assert.equal(BOOK_CAMERA_PRESETS.length, 5);
    assert.equal(CANONICAL_SAMPLE_SPREADS.length, 4);
    assert.equal(BOOK_LIGHTING_INTENT.backgroundHex, "#F7F4EE");

    // Material Adapter Parity (Three.js vs RealityKit)
    for (const swatch of BOOK_LEATHER_SWATCHES) {
      const pbr = buildLeatherMaterialSpec(swatch);
      const three = toThreeMaterialParams(pbr);
      const rk = toRealityKitMaterialParams(pbr);
      assert.equal(three.color, rk.baseColorHex);
      assert.equal(three.metalness, rk.metallic);
      assert.equal(three.roughness, rk.roughness);
      assert.equal(three.clearcoat, rk.clearcoat);
    }

    const blindFoil = resolveFoilSwatch("blind_emboss");
    const navyLeather = resolveLeatherSwatch("navy");
    const blindPbr = buildFoilMaterialSpec(blindFoil, navyLeather);
    assert.equal(blindPbr.baseColorHex, navyLeather.accentHex);

    // Camera Presets
    const closeup = resolveCameraPreset("emblem_closeup");
    assert.equal(closeup.id, "emblem_closeup");
    assert.ok(closeup.maxDistance > closeup.minDistance);

    // Paper & Ribbon specs match manifest
    assert.equal(ARCHIVAL_PAPER_MATERIAL_SPEC.roughness, 0.95);
    assert.equal(SILK_RIBBON_MATERIAL_SPEC.baseColorHex, "#849483");

    // Kinematics
    assert.equal(evaluateCubicBezierEaseInOut(-1), 0);
    assert.equal(evaluateCubicBezierEaseInOut(0), 0);
    assert.ok(Math.abs(evaluateCubicBezierEaseInOut(0.5) - 0.5) < 1e-6);
    assert.equal(evaluateCubicBezierEaseInOut(1), 1);
    assert.equal(evaluateCubicBezierEaseInOut(2), 1);
    assert.equal(evaluateCubicBezierEaseInOut(Number.NaN), 0);

    assert.equal(computeCoverHingeAngle(0), 0);
    assert.equal(computeCoverHingeAngle(1), BOOK_ANIMATION_CONTRACT.openAngleRadians);
    assert.ok(BOOK_ANIMATION_CONTRACT.openAngleRadians > 0, "Open angle must swing +Z upward");

    assert.equal(computePageTurnAngle(0), 0);
    assert.equal(computePageTurnAngle(1), BOOK_ANIMATION_CONTRACT.pageTurnEndRadians);
    assert.ok(computePageCurlDisplacement(1, 0.015, 0.5) > computePageCurlDisplacement(0, 0.015, 0.5));
  });

  test("5. Book Service Versioned 3D Manifest & Binary Asset Delivery Endpoints", async () => {
    const app = await buildBookService();

    // Manifest endpoint
    const manifestRes = await app.inject({
      method: "GET",
      url: "/api/v1/books/3d/manifest",
    });
    assert.equal(manifestRes.statusCode, 200);
    const manifestBody = JSON.parse(manifestRes.body);
    assert.equal(manifestBody.success, true);
    assert.equal(manifestBody.data.manifest.modelId, "memoria_heirloom_book_v2");
    assert.equal(manifestBody.data.engineContracts.leatherSwatches[0].id, "plum");
    const manifestEtag = manifestRes.headers.etag as string;
    assert.ok(manifestEtag);

    // Conditional 304 on manifest
    const manifest304 = await app.inject({
      method: "GET",
      url: "/api/v1/books/3d/manifest/2.0.0",
      headers: { "if-none-match": manifestEtag },
    });
    assert.equal(manifest304.statusCode, 304);

    // Unknown manifest version -> 404
    const manifest404 = await app.inject({
      method: "GET",
      url: "/api/v1/books/3d/manifest/v99",
    });
    assert.equal(manifest404.statusCode, 404);

    // Binary GLB download
    const glbRes = await app.inject({
      method: "GET",
      url: "/api/v1/books/3d/assets/memoria_heirloom_book.glb?v=2.0.0",
    });
    assert.equal(glbRes.statusCode, 200);
    assert.equal(glbRes.headers["content-type"], "model/gltf-binary");
    assert.equal(glbRes.headers["x-asset-sha256"], CANONICAL_BOOK_3D_MANIFEST.assets.glb.sha256);
    assert.ok(String(glbRes.headers["cache-control"]).includes("immutable"));
    assert.deepEqual(glbRes.rawPayload, fs.readFileSync(webGlbPath));

    // Conditional 304 on binary GLB
    const glb304 = await app.inject({
      method: "GET",
      url: "/api/v1/books/3d/assets/memoria_heirloom_book.glb",
      headers: { "if-none-match": glbRes.headers.etag as string },
    });
    assert.equal(glb304.statusCode, 304);

    // Binary USDZ download
    const usdzRes = await app.inject({
      method: "GET",
      url: "/api/v1/books/3d/assets/MemoriaHeirloomBook.usdz?v=2.0.0",
    });
    assert.equal(usdzRes.statusCode, 200);
    assert.equal(usdzRes.headers["content-type"], "model/vnd.usdz+zip");
    assert.equal(usdzRes.headers["x-asset-sha256"], CANONICAL_BOOK_3D_MANIFEST.assets.usdz.sha256);
    assert.deepEqual(usdzRes.rawPayload, fs.readFileSync(webUsdzPath));

    // Path traversal / unknown asset -> 404
    const traversalRes = await app.inject({
      method: "GET",
      url: "/api/v1/books/3d/assets/..%2F..%2Fpackage.json",
    });
    assert.equal(traversalRes.statusCode, 404);

    // Sample book 3D model config
    const sampleRes = await app.inject({
      method: "GET",
      url: "/api/v1/books/sample/3d-model",
    });
    assert.equal(sampleRes.statusCode, 200);
    const sampleBody = JSON.parse(sampleRes.body);
    assert.equal(sampleBody.data.configuration.leatherId, "plum");
    assert.equal(sampleBody.data.configuration.foilId, "gold");

    // Created book 3D model config resolution
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/books",
      payload: {
        spaceId: "12345678-1234-4234-8234-123456789012",
        title: "Autumn Chronicle",
        coverColor: "#16233B",
        foilStamping: "silver",
      },
    });
    assert.equal(createRes.statusCode, 201);
    const createdBook = JSON.parse(createRes.body).data;

    const book3dRes = await app.inject({
      method: "GET",
      url: `/api/v1/books/${createdBook.id}/3d-model`,
    });
    assert.equal(book3dRes.statusCode, 200);
    const book3dBody = JSON.parse(book3dRes.body);
    assert.equal(book3dBody.data.configuration.leatherId, "navy");
    assert.equal(book3dBody.data.configuration.foilId, "silver");

    // Regression: Default #304C43 maps to emerald, "none" maps to blind_emboss, and long titles clamp cleanly without 500
    const longTitleRes = await app.inject({
      method: "POST",
      url: "/api/v1/books",
      payload: {
        spaceId: "12345678-1234-4234-8234-123456789012",
        title: "The Comprehensive Bennett Multi-Generational Family Chronicle & Heirloom Edition 2026",
        foilStamping: "none",
      },
    });
    assert.equal(longTitleRes.statusCode, 201);
    const longBook = JSON.parse(longTitleRes.body).data;

    const longBook3dRes = await app.inject({
      method: "GET",
      url: `/api/v1/books/${longBook.id}/3d-model`,
    });
    assert.equal(longBook3dRes.statusCode, 200);
    const longBook3dBody = JSON.parse(longBook3dRes.body);
    assert.equal(longBook3dBody.data.configuration.leatherId, "emerald");
    assert.equal(longBook3dBody.data.configuration.foilId, "blind_emboss");
    assert.ok(longBook3dBody.data.configuration.coverTitle.length <= 60);
    assert.ok(longBook3dBody.data.configuration.spineText.length <= 40);

    await app.close();
  });

  test("6. Swift Book3DContract.swift Parity Lock Against Manifest & TS Contracts", () => {
    const swiftPath = path.resolve("apps/ios/Memoria/Sources/Memoria/Models/Book3DContract.swift");
    const swiftSrc = fs.readFileSync(swiftPath, "utf-8");

    for (const nodeName of BOOK_3D_REQUIRED_NODES) {
      assert.ok(swiftSrc.includes(`"${nodeName}"`), `Swift contract missing node ${nodeName}`);
    }
    for (const swatch of BOOK_LEATHER_SWATCHES) {
      assert.ok(
        swiftSrc.includes(`"${swatch.hex}"`),
        `Swift contract missing leather swatch hex ${swatch.hex}`
      );
    }
    for (const preset of BOOK_CAMERA_PRESETS) {
      assert.ok(
        swiftSrc.includes(`"${preset.label}"`),
        `Swift contract missing camera preset ${preset.label}`
      );
    }
    assert.ok(swiftSrc.includes(`openAngleRadians: Float = ${BOOK_ANIMATION_CONTRACT.openAngleRadians}`));
    assert.ok(swiftSrc.includes(`pageTurnEndRadians: Float = ${BOOK_ANIMATION_CONTRACT.pageTurnEndRadians}`));
    assert.ok(swiftSrc.includes(`"${CANONICAL_BOOK_3D_MANIFEST.version}"`));
    assert.ok(swiftSrc.includes('"The Bennett Heritage"'));
  });
});
