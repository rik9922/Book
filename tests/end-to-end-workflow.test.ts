import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { Pool } from "pg";
import { buildIdentityService } from "../services/identity-service/src/server.ts";
import { buildMemoryService } from "../services/memory-service/src/server.ts";
import { buildMediaService } from "../services/media-service/src/server.ts";

describe("Phase 2 — Real End-to-End Workflow with PostgreSQL Persistence", () => {
  const identityDbUrl = process.env.IDENTITY_DATABASE_URL || "postgres://ritik@localhost:5432/identity_db";
  const memoryDbUrl = process.env.MEMORY_DATABASE_URL || "postgres://ritik@localhost:5432/memory_db";
  const mediaDbUrl = process.env.MEDIA_DATABASE_URL || "postgres://ritik@localhost:5432/media_db";

  const identityPool = new Pool({ connectionString: identityDbUrl });
  const memoryPool = new Pool({ connectionString: memoryDbUrl });
  const mediaPool = new Pool({ connectionString: mediaDbUrl });

  const testEmail = `e2e_user_${Date.now()}@heirloomcapsule.org`;
  const testPassword = "HeirloomSecurePass99!";
  let authToken = "";
  let userId = "";
  let spaceId = "";
  let profileId = "";
  let mediaId = "";
  let memoryId = "";

  before(async () => {
    // Clean any remnants of test accounts
    await identityPool.query("DELETE FROM users WHERE email LIKE 'e2e_user_%'");
  });

  after(async () => {
    await identityPool.end();
    await memoryPool.end();
    await mediaPool.end();
  });

  test("Step 1 & 2: User Registration, Scrypt Hashing, Session, and JWT Issuance in PostgreSQL", async () => {
    const identityApp = await buildIdentityService();

    // 1. Register User
    const regRes = await identityApp.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: testEmail,
        password: testPassword,
        fullName: "Arthur Pendelton",
      },
    });

    assert.equal(regRes.statusCode, 201, `Registration failed: ${regRes.body}`);
    const regData = JSON.parse(regRes.body).data;
    assert.equal(regData.user.email, testEmail);
    assert.ok(regData.accessToken, "JWT Access Token must be issued");
    authToken = regData.accessToken;
    userId = regData.user.id;

    // 2. Verify directly from PostgreSQL 'users' table
    const userRowRes = await identityPool.query("SELECT id, email, full_name, password_hash FROM users WHERE id = $1", [userId]);
    assert.equal(userRowRes.rows.length, 1, "User record must exist in PostgreSQL users table");
    const userRow = userRowRes.rows[0];
    assert.equal(userRow.email, testEmail);
    assert.ok(userRow.password_hash.includes(":"), "Password hash must be salted scrypt hash");

    // 3. Verify session in 'user_sessions' table
    const sessionRes = await identityPool.query("SELECT id, user_id FROM user_sessions WHERE user_id = $1", [userId]);
    assert.ok(sessionRes.rows.length >= 1, "User session must exist in PostgreSQL user_sessions table");

    // 4. Verify Login
    const loginRes = await identityApp.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });
    assert.equal(loginRes.statusCode, 200);
    const loginData = JSON.parse(loginRes.body).data;
    assert.ok(loginData.accessToken);

    await identityApp.close();
  });

  test("Step 3 & 4: Authenticated Space and Profile Creation with Real PostgreSQL Persistence", async () => {
    const memoryApp = await buildMemoryService();

    // 1. Create Space with Bearer token
    const spaceRes = await memoryApp.inject({
      method: "POST",
      url: "/api/v1/spaces",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        name: "Pendelton Heritage Space",
        description: "A century of letters, voice notes, and journeys",
        type: "family",
      },
    });

    assert.equal(spaceRes.statusCode, 201, `Space creation failed: ${spaceRes.body}`);
    const spaceData = JSON.parse(spaceRes.body).data;
    spaceId = spaceData.id;
    assert.equal(spaceData.ownerId, userId);

    // Verify row in PostgreSQL 'memory_spaces'
    const spaceRowRes = await memoryPool.query("SELECT id, owner_id, name, space_type FROM memory_spaces WHERE id = $1", [spaceId]);
    assert.equal(spaceRowRes.rows.length, 1);
    assert.equal(spaceRowRes.rows[0].name, "Pendelton Heritage Space");

    // 2. Create Space Profile (Son: Liam)
    const profileRes = await memoryApp.inject({
      method: "POST",
      url: `/api/v1/spaces/${spaceId}/profiles`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        name: "Liam Pendelton",
        relationship: "Son",
        type: "child",
        birthDate: "2018-06-15",
      },
    });

    assert.equal(profileRes.statusCode, 201);
    const profileData = JSON.parse(profileRes.body).data;
    profileId = profileData.id;

    // Verify row in PostgreSQL 'space_profiles'
    const profileRowRes = await memoryPool.query("SELECT id, name, relationship, profile_type FROM space_profiles WHERE id = $1", [profileId]);
    assert.equal(profileRowRes.rows.length, 1);
    assert.equal(profileRowRes.rows[0].name, "Liam Pendelton");

    await memoryApp.close();
  });

  test("Step 5 & 6: Real Binary Image Upload, Local Storage, Quota Accounting & Sharp Derivatives", async () => {
    try {
    const mediaApp = await buildMediaService();

    // 1. Generate a real test PNG image using Sharp (Forest Green, 400x300 px)
    const testImageBuffer = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 4,
        background: { r: 48, g: 76, b: 67, alpha: 1 }, // Forest Color
      },
    })
      .png()
      .toBuffer();

    const imageSizeBytes = testImageBuffer.length;
    assert.ok(imageSizeBytes > 0, "Test image buffer must have valid binary size");

    // 2. Request Direct Upload Session
    const sessionRes = await mediaApp.inject({
      method: "POST",
      url: "/api/v1/media/upload-session",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        spaceId,
        fileName: "pendelton-crest.png",
        mimeType: "image/png",
        fileSizeBytes: imageSizeBytes,
      },
    });

    assert.equal(sessionRes.statusCode, 201);
    const sessionData = JSON.parse(sessionRes.body).data;
    mediaId = sessionData.mediaId;
    const storageKey = sessionData.storageKey;
    assert.ok(sessionData.uploadUrl);

    // Verify initial row in PostgreSQL 'media_assets'
    const assetRowRes = await mediaPool.query("SELECT id, status, size_bytes FROM media_assets WHERE id = $1", [mediaId]);
    assert.equal(assetRowRes.rows.length, 1);
    assert.equal(assetRowRes.rows[0].status, "pending_upload");

    // 3. Stream binary image to local storage endpoint
    const uploadRes = await mediaApp.inject({
      method: "PUT",
      url: `/api/v1/media/local-upload?key=${encodeURIComponent(storageKey)}&contentType=image/png`,
      headers: {
        "content-type": "application/octet-stream",
      },
      payload: testImageBuffer,
    });

    assert.equal(uploadRes.statusCode, 200, `Binary upload failed: ${uploadRes.body}`);

    // 4. Confirm upload completion to trigger Sharp processing & quota accounting
    const completeRes = await mediaApp.inject({
      method: "POST",
      url: `/api/v1/media/${mediaId}/complete`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    assert.equal(completeRes.statusCode, 200);

    // 5. Verify Quota in 'space_storage_quotas' table
    const quotaRowRes = await mediaPool.query("SELECT space_id, used_bytes, max_bytes FROM space_storage_quotas WHERE space_id = $1", [spaceId]);
    assert.equal(quotaRowRes.rows.length, 1);
    assert.equal(Number(quotaRowRes.rows[0].used_bytes), imageSizeBytes);

    // 6. Wait for the background BullMQ worker to process image with Sharp
    let processedAsset: any = null;
    for (let i = 0; i < 40; i++) {
      const res = await mediaPool.query("SELECT id, status, derivatives, metadata FROM media_assets WHERE id = $1", [mediaId]);
      if (res.rows[0]?.status === "ready") {
        processedAsset = res.rows[0];
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(processedAsset, "Asset must be processed to 'ready' by BullMQ worker");

    const derivatives = typeof processedAsset.derivatives === "string" ? JSON.parse(processedAsset.derivatives) : processedAsset.derivatives;
    assert.ok(derivatives.thumb_sm, "Small thumbnail derivative URL must be set");
    assert.ok(derivatives.thumb_lg, "Large thumbnail derivative URL must be set");

    const metadata = typeof processedAsset.metadata === "string" ? JSON.parse(processedAsset.metadata) : processedAsset.metadata;
    assert.equal(metadata.width, 400, "Sharp must correctly extract 400px width from uploaded binary");
    assert.equal(metadata.height, 300, "Sharp must correctly extract 300px height from uploaded binary");

    // 7. Verify thumbnails can be fetched over HTTP
    const thumbSmRes = await mediaApp.inject({
      method: "GET",
      url: `/api/v1/media/files/derivatives/${mediaId}/thumb_sm.webp`,
    });
    assert.equal(thumbSmRes.statusCode, 200);
    assert.equal(thumbSmRes.headers["content-type"], "image/webp");

    await mediaApp.close();
    } catch (err) {
      console.error("Step 5 & 6 Failure:", err);
      throw err;
    }
  });

  test("Step 7 & 8: Create Memory Linked to Profile and Media Asset, and Query Timeline", async () => {
    const memoryApp = await buildMemoryService();

    // 1. Create Memory linking child profile and media
    const memoryRes = await memoryApp.inject({
      method: "POST",
      url: `/api/v1/spaces/${spaceId}/memories`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        title: "Liam painting the heirloom crest",
        content: "A peaceful Sunday afternoon creating memories with natural forest dyes.",
        format: "image",
        capturedAt: "2026-05-10T14:30:00Z",
        location: "Pendelton Study",
        associatedProfileIds: [profileId],
        mediaIds: [mediaId],
        tags: ["art", "milestone", "heirloom"],
      },
    });

    assert.equal(memoryRes.statusCode, 201, `Memory creation failed: ${memoryRes.body}`);
    const memoryData = JSON.parse(memoryRes.body).data;
    memoryId = memoryData.id;
    assert.equal(memoryData.title, "Liam painting the heirloom crest");

    // Verify row in PostgreSQL 'memories'
    const memRowRes = await memoryPool.query("SELECT id, title, space_id, format FROM memories WHERE id = $1", [memoryId]);
    assert.equal(memRowRes.rows.length, 1);
    assert.equal(memRowRes.rows[0].title, "Liam painting the heirloom crest");

    // 2. Query Space Archive Listing
    const archiveRes = await memoryApp.inject({
      method: "GET",
      url: `/api/v1/spaces/${spaceId}/memories`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    assert.equal(archiveRes.statusCode, 200);
    const archiveList = JSON.parse(archiveRes.body).data;
    assert.ok(archiveList.length >= 1);
    const found = archiveList.find((m: any) => m.id === memoryId);
    assert.ok(found);
    assert.deepEqual(found.associatedProfileIds, [profileId]);
    assert.deepEqual(found.mediaIds, [mediaId]);

    await memoryApp.close();
  });

  test("Step 9 & 10: Complete Persistence Verification Across Full Service Shutdown & Restart", async () => {
    try {
    // Re-initialize fresh service instances with no shared in-memory state
    const newIdentityApp = await buildIdentityService();
    const newMemoryApp = await buildMemoryService();
    const newMediaApp = await buildMediaService();

    // 1. Verify User Profile is retrieved from PostgreSQL
    const meRes = await newIdentityApp.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });
    assert.equal(meRes.statusCode, 200);
    const meData = JSON.parse(meRes.body).data;
    assert.equal(meData.user.email, testEmail);
    assert.equal(meData.user.fullName, "Arthur Pendelton");

    // 2. Verify Space is retrieved from PostgreSQL
    const spaceRes = await newMemoryApp.inject({
      method: "GET",
      url: `/api/v1/spaces/${spaceId}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });
    assert.equal(spaceRes.statusCode, 200);
    const space = JSON.parse(spaceRes.body).data;
    assert.equal(space.name, "Pendelton Heritage Space");

    // 3. Verify Profiles in Space are retrieved from PostgreSQL
    const profilesRes = await newMemoryApp.inject({
      method: "GET",
      url: `/api/v1/spaces/${spaceId}/profiles`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });
    assert.equal(profilesRes.statusCode, 200);
    const profiles = JSON.parse(profilesRes.body).data;
    assert.equal(profiles.length, 1);
    assert.equal(profiles[0].name, "Liam Pendelton");

    // 4. Verify Media Asset and Sharp Derivatives are retrieved from PostgreSQL
    const mediaRes = await newMediaApp.inject({
      method: "GET",
      url: `/api/v1/media/${mediaId}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });
    assert.equal(mediaRes.statusCode, 200);
    const media = JSON.parse(mediaRes.body).data;
    assert.equal(media.status, "ready");
    assert.equal(media.metadata.width, 400);
    assert.equal(media.metadata.height, 300);

    // 5. Verify Memory Detail is retrieved from PostgreSQL
    const memoryRes = await newMemoryApp.inject({
      method: "GET",
      url: `/api/v1/memories/${memoryId}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });
    assert.equal(memoryRes.statusCode, 200);
    const mem = JSON.parse(memoryRes.body).data;
    assert.equal(mem.title, "Liam painting the heirloom crest");
    assert.deepEqual(mem.mediaIds, [mediaId]);

    // 6. Verify Space Quota accounting persisted in PostgreSQL
    const quotaRes = await newMediaApp.inject({
      method: "GET",
      url: `/api/v1/media/spaces/${spaceId}/quota`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });
    assert.equal(quotaRes.statusCode, 200);
    const quota = JSON.parse(quotaRes.body).data;
    assert.ok(quota.usedBytes > 0);
    assert.equal(quota.maxBytes, 500 * 1024 * 1024);

    await newIdentityApp.close();
    await newMemoryApp.close();
    await newMediaApp.close();
    } catch (err) {
      console.error("Step 9 & 10 Failure:", err);
      throw err;
    }
  });
});
