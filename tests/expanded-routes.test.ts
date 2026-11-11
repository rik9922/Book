import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { BaseServiceConfigSchema, validateServiceConfig } from "@memory-capsule/contracts";
import { buildIdentityService } from "../services/identity-service/src/server.ts";
import { buildMemoryService } from "../services/memory-service/src/server.ts";
import { buildCollabService } from "../services/collab-service/src/server.ts";
import { buildBookService } from "../services/book-service/src/server.ts";
import { buildCommerceService } from "../services/commerce-service/src/server.ts";
import { buildMediaService } from "../services/media-service/src/server.ts";
import { buildNotificationService } from "../services/notification-service/src/server.ts";
import { buildGateway } from "../services/api-gateway/src/server.ts";

describe("Expanded Screen Inventory Backend Routes Suite", () => {
  const cfg = validateServiceConfig(BaseServiceConfigSchema);
  const signToken = (userId: string, email = "expanded@memoria.internal") =>
    jwt.sign({ sub: userId, email }, cfg.JWT_SECRET, { expiresIn: "1h" });

  test("1. Identity Service: Profile Update, Active Sessions List/Revoke & Account Deletion", async () => {
    const app = await buildIdentityService();
    const email = `expanded_id_${Date.now()}@memoria.internal`;

    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email, password: "StrongPassword123!", fullName: "Initial Name" },
    });
    assert.equal(regRes.statusCode, 201);
    const { accessToken } = JSON.parse(regRes.body).data;

    // Update profile
    const patchRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { fullName: "Updated Heirloom Name" },
    });
    assert.equal(patchRes.statusCode, 200);
    assert.equal(JSON.parse(patchRes.body).data.user.fullName, "Updated Heirloom Name");

    // List active sessions
    const sessRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/sessions",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(sessRes.statusCode, 200);
    const sessions = JSON.parse(sessRes.body).data;
    assert.ok(Array.isArray(sessions) && sessions.length >= 1);

    // Revoke session
    const revokeRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/auth/sessions/${sessions[0].id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(revokeRes.statusCode, 200);
    assert.equal(JSON.parse(revokeRes.body).data.revoked, true);

    // Wrong password rejected on account delete
    const badDel = await app.inject({
      method: "POST",
      url: "/api/v1/auth/account/delete",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { password: "WrongPassword!" },
    });
    assert.equal(badDel.statusCode, 401);

    // Valid password deletes account
    const delRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/account/delete",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { password: "StrongPassword123!" },
    });
    assert.equal(delRes.statusCode, 200);
    assert.equal(JSON.parse(delRes.body).data.deleted, true);

    await app.close();
  });

  test("2. Memory Service: Space/Profile CRUD, Trash Recovery, Collections, Comments & Export Bundle", async () => {
    const app = await buildMemoryService();
    const ownerId = crypto.randomUUID();
    const token = signToken(ownerId);
    const headers = { authorization: `Bearer ${token}` };

    // Create & update space
    const spRes = await app.inject({
      method: "POST",
      url: "/api/v1/spaces",
      headers,
      payload: { name: "Original Vault", type: "family" },
    });
    assert.equal(spRes.statusCode, 201);
    const space = JSON.parse(spRes.body).data;

    const spPatch = await app.inject({
      method: "PATCH",
      url: `/api/v1/spaces/${space.id}`,
      headers,
      payload: { name: "Renamed Vault", description: "Updated description" },
    });
    assert.equal(spPatch.statusCode, 200);
    assert.equal(JSON.parse(spPatch.body).data.name, "Renamed Vault");

    // Profile CRUD
    const profRes = await app.inject({
      method: "POST",
      url: `/api/v1/spaces/${space.id}/profiles`,
      headers,
      payload: { name: "Clara", type: "child", relationship: "Daughter" },
    });
    assert.equal(profRes.statusCode, 201);
    const prof = JSON.parse(profRes.body).data;

    const profPatch = await app.inject({
      method: "PATCH",
      url: `/api/v1/spaces/${space.id}/profiles/${prof.id}`,
      headers,
      payload: { relationship: "Eldest Daughter", birthDate: "2018-04-05" },
    });
    assert.equal(profPatch.statusCode, 200);
    const patchedProf = JSON.parse(profPatch.body).data;
    assert.equal(patchedProf.relationship, "Eldest Daughter");
    assert.equal(patchedProf.type, "child", "Partial PATCH omitting type must preserve existing profile type");
    assert.ok(String(patchedProf.birthDate).startsWith("2018-04-05"));

    const profClearPatch = await app.inject({
      method: "PATCH",
      url: `/api/v1/spaces/${space.id}/profiles/${prof.id}`,
      headers,
      payload: { relationship: null, birthDate: null },
    });
    assert.equal(profClearPatch.statusCode, 200);
    const clearedProf = JSON.parse(profClearPatch.body).data;
    assert.equal(clearedProf.type, "child");
    assert.ok(!clearedProf.relationship);
    assert.ok(!clearedProf.birthDate);

    // Create memory
    const memRes = await app.inject({
      method: "POST",
      url: "/api/v1/memories",
      headers,
      payload: {
        spaceId: space.id,
        title: "Lake Como Sunset",
        content: "Captured on 35mm film.",
        format: "story",
        capturedAt: new Date().toISOString(),
        associatedProfileIds: [prof.id],
        tags: ["summer"],
      },
    });
    assert.equal(memRes.statusCode, 201);
    const memory = JSON.parse(memRes.body).data;

    // Comments CRUD
    const cmtCreate = await app.inject({
      method: "POST",
      url: `/api/v1/memories/${memory.id}/comments`,
      headers,
      payload: { body: "I remember this evening!", authorName: "Elena" },
    });
    assert.equal(cmtCreate.statusCode, 201);
    const comment = JSON.parse(cmtCreate.body).data;

    const cmtList = await app.inject({
      method: "GET",
      url: `/api/v1/memories/${memory.id}/comments`,
      headers,
    });
    assert.equal(cmtList.statusCode, 200);
    assert.equal(JSON.parse(cmtList.body).data.length, 1);

    // Collections CRUD + Add/Remove Memory
    const colCreate = await app.inject({
      method: "POST",
      url: `/api/v1/spaces/${space.id}/collections`,
      headers,
      payload: { title: "Summer Retreats", description: "Lake photos" },
    });
    assert.equal(colCreate.statusCode, 201);
    const collection = JSON.parse(colCreate.body).data;

    const colAdd = await app.inject({
      method: "POST",
      url: `/api/v1/spaces/${space.id}/collections/${collection.id}/memories`,
      headers,
      payload: { memoryId: memory.id },
    });
    assert.equal(colAdd.statusCode, 200);
    assert.ok(JSON.parse(colAdd.body).data.memoryIds.includes(memory.id));

    const mem2Res = await app.inject({
      method: "POST",
      url: "/api/v1/memories",
      headers,
      payload: {
        spaceId: space.id,
        title: "Bellagio Harbor Morning",
        content: "Coffee by the ferry dock.",
        format: "story",
        capturedAt: new Date().toISOString(),
        associatedProfileIds: [prof.id],
      },
    });
    assert.equal(mem2Res.statusCode, 201);
    const memory2 = JSON.parse(mem2Res.body).data;

    await app.inject({
      method: "POST",
      url: `/api/v1/spaces/${space.id}/collections/${collection.id}/memories`,
      headers,
      payload: { memoryId: memory2.id, sortOrder: 1 },
    });

    const reorderRes = await app.inject({
      method: "PUT",
      url: `/api/v1/spaces/${space.id}/collections/${collection.id}/reorder`,
      headers,
      payload: { memoryIds: [memory2.id, memory.id] },
    });
    assert.equal(reorderRes.statusCode, 200);

    const colDetailRes = await app.inject({
      method: "GET",
      url: `/api/v1/spaces/${space.id}/collections/${collection.id}`,
      headers,
    });
    assert.equal(colDetailRes.statusCode, 200);
    const colDetail = JSON.parse(colDetailRes.body).data;
    assert.deepEqual(
      colDetail.memories.map((m: any) => m.id),
      [memory2.id, memory.id],
      "Collection detail must preserve reordered sort_order"
    );

    const colClearDesc = await app.inject({
      method: "PATCH",
      url: `/api/v1/spaces/${space.id}/collections/${collection.id}`,
      headers,
      payload: { title: "Summer Retreats Revised", description: null },
    });
    assert.equal(colClearDesc.statusCode, 200);
    assert.equal(JSON.parse(colClearDesc.body).data.title, "Summer Retreats Revised");
    assert.ok(!JSON.parse(colClearDesc.body).data.description);

    await app.inject({
      method: "DELETE",
      url: `/api/v1/spaces/${space.id}/collections/${collection.id}/memories/${memory2.id}`,
      headers,
    });
    await app.inject({ method: "DELETE", url: `/api/v1/memories/${memory2.id}`, headers });
    await app.inject({ method: "DELETE", url: `/api/v1/memories/${memory2.id}/permanent`, headers });

    // Export Bundle with SHA-256 verification
    const exportRes = await app.inject({
      method: "GET",
      url: `/api/v1/spaces/${space.id}/export`,
      headers,
    });
    assert.equal(exportRes.statusCode, 200);
    const bundle = JSON.parse(exportRes.body).data;
    assert.equal(bundle.schemaVersion, "memoria-export-v1");
    assert.match(bundle.integritySha256, /^[a-f0-9]{64}$/);
    assert.equal(bundle.memories.length, 1);
    assert.equal(bundle.collections.length, 1);

    // Soft-delete -> Trash -> Restore -> Soft-delete -> Permanent delete
    const delMem = await app.inject({
      method: "DELETE",
      url: `/api/v1/memories/${memory.id}`,
      headers,
    });
    assert.equal(delMem.statusCode, 200);

    const trashRes = await app.inject({
      method: "GET",
      url: `/api/v1/spaces/${space.id}/memories/trash`,
      headers,
    });
    assert.equal(trashRes.statusCode, 200);
    assert.equal(JSON.parse(trashRes.body).data.length, 1);

    const restoreRes = await app.inject({
      method: "POST",
      url: `/api/v1/memories/${memory.id}/restore`,
      headers,
      payload: {},
    });
    assert.equal(restoreRes.statusCode, 200);

    await app.inject({ method: "DELETE", url: `/api/v1/memories/${memory.id}`, headers });
    const permDel = await app.inject({
      method: "DELETE",
      url: `/api/v1/memories/${memory.id}/permanent`,
      headers,
    });
    assert.equal(permDel.statusCode, 200);
    assert.equal(JSON.parse(permDel.body).data.permanentlyDeleted, true);

    // Cleanup comment & profile & collection & space
    await app.inject({
      method: "DELETE",
      url: `/api/v1/memories/${memory.id}/comments/${comment.id}`,
      headers,
    });
    await app.inject({
      method: "DELETE",
      url: `/api/v1/spaces/${space.id}/collections/${collection.id}`,
      headers,
    });
    await app.inject({
      method: "DELETE",
      url: `/api/v1/spaces/${space.id}/profiles/${prof.id}`,
      headers,
    });
    const spDel = await app.inject({
      method: "DELETE",
      url: `/api/v1/spaces/${space.id}`,
      headers,
    });
    assert.equal(spDel.statusCode, 200);

    await app.close();
  });

  test("3. Book, Commerce & Collab Services: Catalog, Preflight, Quote, Receipt & Invite Management", async () => {
    const memoryApp = await buildMemoryService();
    const bookApp = await buildBookService();
    const commerceApp = await buildCommerceService();
    const collabApp = await buildCollabService();

    const ownerId = crypto.randomUUID();
    const token = signToken(ownerId);
    const headers = { authorization: `Bearer ${token}` };

    try {
      const spaceCreate = await memoryApp.inject({
        method: "POST",
        url: "/api/v1/spaces",
        headers,
        payload: { name: "Book Commerce Space", type: "family" },
      });
      assert.equal(spaceCreate.statusCode, 201);
      const spaceId = JSON.parse(spaceCreate.body).data.id;

    // Book catalog (public)
    const catRes = await bookApp.inject({ method: "GET", url: "/api/v1/books/catalog" });
    assert.equal(catRes.statusCode, 200);
    const catalog = JSON.parse(catRes.body).data;
    assert.equal(catalog.pricingPolicy, "zero_markup_pass_through");
    assert.equal(catalog.formats.length, 3);

    // Commerce quote
    const quoteRes = await commerceApp.inject({
      method: "POST",
      url: "/api/v1/orders/quote",
      headers,
      payload: {
        format: "hardcover_grand_12x12",
        binding: "french_morocco",
        paperWeight: "170gsm_lustre",
        quantity: 2,
        country: "CA",
      },
    });
    assert.equal(quoteRes.statusCode, 200);
    const quote = JSON.parse(quoteRes.body).data;
    assert.equal(quote.unitCents, 6800 + 2000 + 400);
    assert.equal(quote.shippingCents, 2400);
    assert.equal(quote.totalCents, (9200 * 2) + 2400);

    // Book preflight
    const bookCreate = await bookApp.inject({
      method: "POST",
      url: "/api/v1/books",
      headers,
      payload: {
        spaceId,
        title: "Bennett Anthology",
        coverTitle: "Bennett",
        format: "hardcover_standard_8x10",
      },
    });
    assert.equal(bookCreate.statusCode, 201);
    const book = JSON.parse(bookCreate.body).data;

    const preflightRes = await bookApp.inject({
      method: "POST",
      url: `/api/v1/books/${book.id}/preflight`,
      headers,
      payload: {},
    });
    assert.equal(preflightRes.statusCode, 200);
    const report = JSON.parse(preflightRes.body).data;
    assert.equal(report.passed, true);
    assert.ok(report.checks.length >= 4);

    // Commerce order, /orders/me, and receipt
    const orderRes = await commerceApp.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers,
      payload: {
        spaceId,
        bookId: book.id,
        quantity: 1,
        shippingAddress: {
          recipientName: "Elena Bennett",
          line1: "100 Oak St",
          city: "Portland",
          postalCode: "97205",
          country: "US",
        },
        printSpec: { paperWeight: "140gsm_matte", binding: "hardcover_linen" },
      },
    });
    assert.equal(orderRes.statusCode, 201);
    const order = JSON.parse(orderRes.body).data;

    const myOrdersRes = await commerceApp.inject({ method: "GET", url: "/api/v1/orders/me", headers });
    assert.equal(myOrdersRes.statusCode, 200);
    assert.ok(JSON.parse(myOrdersRes.body).data.some((o: any) => o.id === order.id));

    const receiptRes = await commerceApp.inject({
      method: "GET",
      url: `/api/v1/orders/${order.id}/receipt`,
      headers,
    });
    assert.equal(receiptRes.statusCode, 200);
    assert.ok(JSON.parse(receiptRes.body).data.receiptNumber.startsWith("MEM-"));

    // Collab list & revoke invitations WITHOUT manual member seeding (auto-seeded owner + BOLA block on outsider)
    const outsiderToken = signToken(crypto.randomUUID(), "outsider@memoria.internal");
    const hijackAttempt = await collabApp.inject({
      method: "POST",
      url: `/api/v1/collab/spaces/${spaceId}/members`,
      headers: { authorization: `Bearer ${outsiderToken}` },
      payload: { userId: ownerId, role: "owner" },
    });
    assert.equal(hijackAttempt.statusCode, 403, "Outsider must be blocked from hijacking space membership");

    const invCreate = await collabApp.inject({
      method: "POST",
      url: `/api/v1/collab/spaces/${spaceId}/invitations`,
      headers,
      payload: { inviteeEmail: "cousin@family.local", role: "contributor" },
    });
    assert.equal(invCreate.statusCode, 201);

    const invList = await collabApp.inject({
      method: "GET",
      url: `/api/v1/collab/spaces/${spaceId}/invitations`,
      headers,
    });
    assert.equal(invList.statusCode, 200);
    const list = JSON.parse(invList.body).data;
    assert.equal(list.length, 1);

    const invRevoke = await collabApp.inject({
      method: "DELETE",
      url: `/api/v1/collab/spaces/${spaceId}/invitations/${list[0].id}`,
      headers,
    });
    assert.equal(invRevoke.statusCode, 200);
    assert.equal(JSON.parse(invRevoke.body).data.revoked, true);

    // Clean up test space
      await memoryApp.inject({ method: "DELETE", url: `/api/v1/spaces/${spaceId}`, headers });
    } finally {
      await Promise.all([memoryApp.close(), bookApp.close(), commerceApp.close(), collabApp.close()]);
    }
  });

  test("5. Full Expansion Suite: Dynamic Order Pricing Parity, Book Curate/Chapters/Proof/Editions, Collab Roles/Share Links, Memory Timeline/History/Batch, Media Storage", async () => {
    const memoryApp = await buildMemoryService();
    const bookApp = await buildBookService();
    const commerceApp = await buildCommerceService();
    const collabApp = await buildCollabService();
    const mediaApp = await buildMediaService();

    const ownerId = crypto.randomUUID();
    const token = signToken(ownerId, "expansion-owner@memoria.internal");
    const headers = { authorization: `Bearer ${token}` };

    try {
      // Space setup
      const spRes = await memoryApp.inject({
        method: "POST",
        url: "/api/v1/spaces",
        headers,
        payload: { name: "Expansion Vault", type: "family" },
      });
      assert.equal(spRes.statusCode, 201);
      const spaceId = JSON.parse(spRes.body).data.id;

      // Batch offline memory sync + edit revision history + timeline/calendar/activity
      const batchRes = await memoryApp.inject({
        method: "POST",
        url: "/api/v1/memories/sync/batch",
        headers,
        payload: {
          mutations: [
            { spaceId, title: "Batch Heirloom Letter", content: "Initial draft", format: "story" },
          ],
        },
      });
      assert.equal(batchRes.statusCode, 200);
      const batchData = JSON.parse(batchRes.body).data;
      assert.equal(batchData.syncedCount, 1);
      const memId = batchData.items[0].id;

      const patchMem = await memoryApp.inject({
        method: "PATCH",
        url: `/api/v1/memories/${memId}`,
        headers,
        payload: { title: "Batch Heirloom Letter (Revised)", content: "Updated narrative" },
      });
      assert.equal(patchMem.statusCode, 200);

      const histRes = await memoryApp.inject({ method: "GET", url: `/api/v1/memories/${memId}/history`, headers });
      assert.equal(histRes.statusCode, 200);
      assert.ok(JSON.parse(histRes.body).data.length >= 1, "Expected memory revision history entry after PATCH");

      const tlRes = await memoryApp.inject({ method: "GET", url: `/api/v1/spaces/${spaceId}/timeline`, headers });
      assert.equal(tlRes.statusCode, 200);
      assert.ok(JSON.parse(tlRes.body).data.total >= 1);

      const calRes = await memoryApp.inject({ method: "GET", url: `/api/v1/spaces/${spaceId}/calendar`, headers });
      assert.equal(calRes.statusCode, 200);
      assert.ok(JSON.parse(calRes.body).data.totalMemories >= 1);

      const actRes = await memoryApp.inject({ method: "GET", url: `/api/v1/spaces/${spaceId}/activity`, headers });
      assert.equal(actRes.statusCode, 200);
      assert.ok(Array.isArray(JSON.parse(actRes.body).data));

      // Collab custom roles & passphrase-protected share links
      const roleCreate = await collabApp.inject({
        method: "POST",
        url: `/api/v1/collab/spaces/${spaceId}/roles`,
        headers,
        payload: { name: "Archivist", permissions: { can_create_memories: true, can_edit_books: true, can_invite: false } },
      });
      assert.equal(roleCreate.statusCode, 201);

      const shareCreate = await collabApp.inject({
        method: "POST",
        url: `/api/v1/collab/spaces/${spaceId}/share-links`,
        headers,
        payload: { label: "Reunion Link", passphrase: "vault-pass-2026" },
      });
      assert.equal(shareCreate.statusCode, 201);
      const shareLink = JSON.parse(shareCreate.body).data;

      const badVerify = await collabApp.inject({
        method: "POST",
        url: `/api/v1/collab/share-links/${shareLink.token}/verify`,
        payload: { passphrase: "wrong" },
      });
      assert.equal(badVerify.statusCode, 403);

      const okVerify = await collabApp.inject({
        method: "POST",
        url: `/api/v1/collab/share-links/${shareLink.token}/verify`,
        payload: { passphrase: "vault-pass-2026" },
      });
      assert.equal(okVerify.statusCode, 200);
      assert.equal(JSON.parse(okVerify.body).data.valid, true);

      // Book Studio: public books, curate, chapters, spread reorder, 2D proof, clone next edition
      const pubBooks = await bookApp.inject({ method: "GET", url: "/api/v1/public/books" });
      assert.equal(pubBooks.statusCode, 200);
      assert.ok(JSON.parse(pubBooks.body).data.items.length >= 2);

      const bookRes = await bookApp.inject({
        method: "POST",
        url: "/api/v1/books",
        headers,
        payload: { spaceId, title: "Winter Almanac", format: "hardcover_grand_12x12" },
      });
      assert.equal(bookRes.statusCode, 201);
      const bookId = JSON.parse(bookRes.body).data.id;
      const initialSpreadCount = JSON.parse(bookRes.body).data.spreads.length;

      const curateRes = await bookApp.inject({
        method: "POST",
        url: `/api/v1/books/${bookId}/curate`,
        headers,
        payload: { memoryIds: [memId], template: "fine_art_spread" },
      });
      assert.equal(curateRes.statusCode, 200);
      const curatedBook = JSON.parse(curateRes.body).data;
      assert.equal(curatedBook.spreads.length, initialSpreadCount + 1, "Curate must append a new spread for each curated memory");
      assert.equal(curatedBook.spreads[initialSpreadCount].leftPage.layoutType, "full_bleed_single");

      const chapRes = await bookApp.inject({
        method: "PUT",
        url: `/api/v1/books/${bookId}/chapters`,
        headers,
        payload: { chapters: [{ title: "Early Years", sortOrder: 0, memoryIds: [memId] }] },
      });
      assert.equal(chapRes.statusCode, 200);

      const proofRes = await bookApp.inject({ method: "GET", url: `/api/v1/books/${bookId}/proof`, headers });
      assert.equal(proofRes.statusCode, 200);
      assert.equal(JSON.parse(proofRes.body).data.bleedMm, 3);

      const editionRes = await bookApp.inject({
        method: "POST",
        url: `/api/v1/books/${bookId}/editions`,
        headers,
        payload: { label: "Second Printing" },
      });
      assert.equal(editionRes.statusCode, 201);

      // Commerce: Quote vs POST /orders exact parity!
      const quotePayload = {
        format: "hardcover_grand_12x12",
        quantity: 2,
        printSpec: { paperWeight: "170gsm_lustre", binding: "french_morocco" },
        shippingSpeed: "priority",
      };
      const quoteRes = await commerceApp.inject({
        method: "POST",
        url: "/api/v1/orders/quote",
        headers,
        payload: quotePayload,
      });
      assert.equal(quoteRes.statusCode, 200);
      const quote = JSON.parse(quoteRes.body).data;
      assert.equal(quote.shippingSpeed, "priority");
      assert.equal(quote.shippingCents, 900 + 1200);

      const orderRes = await commerceApp.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers,
        payload: {
          spaceId,
          bookId,
          quantity: 2,
          shippingSpeed: "priority",
          printSpec: { format: "hardcover_grand_12x12", paperWeight: "170gsm_lustre", binding: "french_morocco" },
          shippingAddress: {
            recipientName: "Elena Vance",
            line1: "100 Oak St",
            city: "Portland",
            postalCode: "97205",
            country: "US",
          },
        },
      });
      assert.equal(orderRes.statusCode, 201);
      const order = JSON.parse(orderRes.body).data;
      assert.equal(order.totalCents, quote.totalCents, "POST /orders totalCents must match POST /orders/quote exactly");

      const trackRes = await commerceApp.inject({ method: "GET", url: `/api/v1/orders/${order.id}/tracking`, headers });
      assert.equal(trackRes.statusCode, 200);
      assert.ok(Array.isArray(JSON.parse(trackRes.body).data.timeline));

      const reorderRes = await commerceApp.inject({ method: "POST", url: `/api/v1/orders/${order.id}/reorder`, headers, payload: {} });
      assert.equal(reorderRes.statusCode, 201);
      assert.equal(JSON.parse(reorderRes.body).data.totalCents, order.totalCents);

      // Media storage breakdown
      const storageRes = await mediaApp.inject({
        method: "GET",
        url: `/api/v1/media/spaces/${spaceId}/storage/breakdown`,
        headers,
      });
      assert.equal(storageRes.statusCode, 200);
      assert.equal(typeof JSON.parse(storageRes.body).data.usedBytes, "number");

      await memoryApp.inject({ method: "DELETE", url: `/api/v1/spaces/${spaceId}`, headers });
    } finally {
      await Promise.all([memoryApp.close(), bookApp.close(), commerceApp.close(), collabApp.close(), mediaApp.close()]);
    }
  });

  test("6. Identity Preferences/Tickets & Strict Admin RBAC Across Services + Gateway", async () => {
    const identityApp = await buildIdentityService();
    const commerceApp = await buildCommerceService();
    const gatewayApp = buildGateway();

    const regularUserId = crypto.randomUUID();
    const regularToken = signToken(regularUserId, "regular@memoria.internal");
    const superAdminToken = jwt.sign(
      { sub: crypto.randomUUID(), email: "superadmin@memoria.internal", role: "superadmin" },
      cfg.JWT_SECRET,
      { expiresIn: "1h" }
    );

    try {
      // Non-admin blocked across Identity Admin, Commerce Admin, and Gateway Admin!
      const idForbidden = await identityApp.inject({
        method: "GET",
        url: "/api/v1/admin/users",
        headers: { authorization: `Bearer ${regularToken}` },
      });
      assert.equal(idForbidden.statusCode, 403);

      const comForbidden = await commerceApp.inject({
        method: "GET",
        url: "/api/v1/admin/orders",
        headers: { authorization: `Bearer ${regularToken}` },
      });
      assert.equal(comForbidden.statusCode, 403);

      const gwForbidden = await gatewayApp.inject({
        method: "GET",
        url: "/api/v1/admin/overview/metrics",
        headers: { authorization: `Bearer ${regularToken}` },
      });
      assert.equal(gwForbidden.statusCode, 403);

      // Superadmin allowed across Identity Admin, Commerce Admin, Gateway Admin
      const idUsers = await identityApp.inject({
        method: "GET",
        url: "/api/v1/admin/users",
        headers: { authorization: `Bearer ${superAdminToken}` },
      });
      assert.equal(idUsers.statusCode, 200);

      const catalogList = await commerceApp.inject({
        method: "GET",
        url: "/api/v1/admin/catalog/formats",
        headers: { authorization: `Bearer ${superAdminToken}` },
      });
      assert.equal(catalogList.statusCode, 200);
      assert.ok(JSON.parse(catalogList.body).data.length >= 1);

      const gwMetrics = await gatewayApp.inject({
        method: "GET",
        url: "/api/v1/admin/overview/metrics",
        headers: { authorization: `Bearer ${superAdminToken}` },
      });
      assert.equal(gwMetrics.statusCode, 200);

      const flagToggle = await gatewayApp.inject({
        method: "PATCH",
        url: "/api/v1/admin/feature-flags/webgl_3d_reader",
        headers: { authorization: `Bearer ${superAdminToken}` },
        payload: { enabled: true, rolloutPercentage: 100 },
      });
      assert.equal(flagToggle.statusCode, 200);

      // Support ticket creation + admin reply
      const ticketRes = await identityApp.inject({
        method: "POST",
        url: "/api/v1/support/tickets",
        headers: { authorization: `Bearer ${regularToken}` },
        payload: { subject: "Foil Stamp Query", category: "print_orders", message: "Can we switch silver to gold?" },
      });
      assert.equal(ticketRes.statusCode, 201);
      const ticketId = JSON.parse(ticketRes.body).data.id;

      const replyRes = await identityApp.inject({
        method: "POST",
        url: `/api/v1/admin/tickets/${ticketId}/reply`,
        headers: { authorization: `Bearer ${superAdminToken}` },
        payload: { message: "Updated your edition foil specification.", newStatus: "resolved" },
      });
      assert.equal(replyRes.statusCode, 201);
      assert.equal(JSON.parse(replyRes.body).data.status, "resolved");
    } finally {
      await Promise.all([identityApp.close(), commerceApp.close(), gatewayApp.close()]);
    }
  });

  test("7. Security & Parity Regressions: Real 6-Digit OTP, Suspended Refresh Block, Dual-Custody Approval, Dynamic Pricing, Reorder Tracking & Notification Read", async () => {
    const identityApp = await buildIdentityService();
    const memoryApp = await buildMemoryService();
    const commerceApp = await buildCommerceService();
    const notificationApp = await buildNotificationService();
    const gatewayApp = buildGateway();

    const admin1Id = crypto.randomUUID();
    const admin2Id = crypto.randomUUID();
    const admin1Token = jwt.sign({ sub: admin1Id, email: "admin1@memoria.internal", role: "superadmin" }, cfg.JWT_SECRET, { expiresIn: "1h" });
    const admin2Token = jwt.sign({ sub: admin2Id, email: "admin2@memoria.internal", role: "superadmin" }, cfg.JWT_SECRET, { expiresIn: "1h" });

    try {
      // 1. Register user -> bogus OTP rejected -> real 6-digit OTP accepted
      const email = `otp_check_${Date.now()}@memoria.internal`;
      const regRes = await identityApp.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { email, password: "StrongPassword123!", fullName: "OTP Verifier" },
      });
      assert.equal(regRes.statusCode, 201);
      const regData = JSON.parse(regRes.body).data;
      assert.ok(regData.verificationCode && regData.verificationCode.length === 6);

      const bogusVerify = await identityApp.inject({
        method: "POST",
        url: "/api/v1/auth/verify-code",
        headers: { authorization: `Bearer ${regData.accessToken}` },
        payload: { code: "000000" },
      });
      assert.equal(bogusVerify.statusCode, 400, "Bogus 6-digit OTP must be rejected");

      const validVerify = await identityApp.inject({
        method: "POST",
        url: "/api/v1/auth/verify-code",
        headers: { authorization: `Bearer ${regData.accessToken}` },
        payload: { code: regData.verificationCode },
      });
      assert.equal(validVerify.statusCode, 200);
      assert.equal(JSON.parse(validVerify.body).data.verified, true);

      // 2. Suspend user -> refresh blocked (403) + restore active
      const suspendRes = await identityApp.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${regData.user.id}/status`,
        headers: { authorization: `Bearer ${admin1Token}` },
        payload: { status: "suspended" },
      });
      assert.equal(suspendRes.statusCode, 200);

      const suspendedRefresh = await identityApp.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: { refreshToken: regData.refreshToken },
      });
      assert.ok(
        suspendedRefresh.statusCode === 401 || suspendedRefresh.statusCode === 403,
        "Suspended user must not refresh tokens"
      );

      await identityApp.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${regData.user.id}/status`,
        headers: { authorization: `Bearer ${admin1Token}` },
        payload: { status: "active" },
      });

      // 3. Dual-custody access request: requester cannot self-approve; admin2 can approve
      const reqCreate = await identityApp.inject({
        method: "POST",
        url: "/api/v1/admin/access-requests",
        headers: { authorization: `Bearer ${admin1Token}` },
        payload: { reason: "Investigate customer print ticket #402" },
      });
      assert.equal(reqCreate.statusCode, 201);
      const accessReqId = JSON.parse(reqCreate.body).data.id;

      const selfApprove = await identityApp.inject({
        method: "POST",
        url: `/api/v1/admin/access-requests/${accessReqId}/approve`,
        headers: { authorization: `Bearer ${admin1Token}` },
        payload: {},
      });
      assert.equal(selfApprove.statusCode, 403, "Dual-custody must block self-approval");

      const peerApprove = await identityApp.inject({
        method: "POST",
        url: `/api/v1/admin/access-requests/${accessReqId}/approve`,
        headers: { authorization: `Bearer ${admin2Token}` },
        payload: {},
      });
      assert.equal(peerApprove.statusCode, 200);
      assert.equal(JSON.parse(peerApprove.body).data.status, "approved");

      // 4. Audit logs contain admin entries + ticket replies included
      const auditRes = await identityApp.inject({
        method: "GET",
        url: "/api/v1/admin/audit-logs",
        headers: { authorization: `Bearer ${admin1Token}` },
      });
      assert.equal(auditRes.statusCode, 200);
      assert.ok(JSON.parse(auditRes.body).data.length >= 1, "Audit logs must record admin mutations");

      const tCreate = await identityApp.inject({
        method: "POST",
        url: "/api/v1/support/tickets",
        headers: { authorization: `Bearer ${regData.accessToken}` },
        payload: { subject: "Scanner ICC Profile", message: "Which ICC profile for 1920 prints?" },
      });
      assert.equal(tCreate.statusCode, 201);
      const tId = JSON.parse(tCreate.body).data.id;

      await identityApp.inject({
        method: "POST",
        url: `/api/v1/admin/tickets/${tId}/reply`,
        headers: { authorization: `Bearer ${admin1Token}` },
        payload: { message: "Use sRGB IEC61966-2.1 lossless PNG/TIFF.", newStatus: "resolved" },
      });
      const myTicketsRes = await identityApp.inject({
        method: "GET",
        url: "/api/v1/support/tickets",
        headers: { authorization: `Bearer ${regData.accessToken}` },
      });
      assert.equal(myTicketsRes.statusCode, 200);
      const foundTicket = JSON.parse(myTicketsRes.body).data.find((t: any) => t.id === tId);
      assert.ok(foundTicket && foundTicket.replies.length === 1, "Customer ticket fetch must include admin replies");

      // 5. Dynamic catalog price & reorder tracking
      const origFormats = await commerceApp.inject({
        method: "GET",
        url: "/api/v1/admin/catalog/formats",
        headers: { authorization: `Bearer ${admin1Token}` },
      });
      const squareFmt = JSON.parse(origFormats.body).data.find((f: any) => f.formatId === "hardcover_square_8x8");
      const originalBase = squareFmt.baseCents;

      await commerceApp.inject({
        method: "PUT",
        url: "/api/v1/admin/catalog/formats/hardcover_square_8x8",
        headers: { authorization: `Bearer ${admin1Token}` },
        payload: { baseCents: 4500 },
      });
      const updatedQuote = await commerceApp.inject({
        method: "POST",
        url: "/api/v1/orders/quote",
        headers: { authorization: `Bearer ${regData.accessToken}` },
        payload: { format: "hardcover_square_8x8", binding: "hardcover_linen", paperWeight: "140gsm_matte", quantity: 1, country: "US" },
      });
      assert.equal(JSON.parse(updatedQuote.body).data.unitCents, 4500, "Admin catalog update must reflect in live quote");

      // Restore original price
      await commerceApp.inject({
        method: "PUT",
        url: "/api/v1/admin/catalog/formats/hardcover_square_8x8",
        headers: { authorization: `Bearer ${admin1Token}` },
        payload: { baseCents: originalBase },
      });

      // Space + Order + Reorder + Ship Tracking
      const spRes = await memoryApp.inject({
        method: "POST",
        url: "/api/v1/spaces",
        headers: { authorization: `Bearer ${regData.accessToken}` },
        payload: { name: "Regression Vault", type: "family" },
      });
      const spaceId = JSON.parse(spRes.body).data.id;

      const ordRes = await commerceApp.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { authorization: `Bearer ${regData.accessToken}` },
        payload: {
          spaceId,
          bookId: crypto.randomUUID(),
          format: "hardcover_square_8x8",
          quantity: 1,
          shippingAddress: { recipientName: "OTP Verifier", line1: "1 Main", city: "Austin", postalCode: "78701", country: "US" },
          printSpec: { format: "hardcover_square_8x8", binding: "hardcover_linen", paperWeight: "140gsm_matte" },
        },
      });
      assert.equal(ordRes.statusCode, 201);
      const ordId = JSON.parse(ordRes.body).data.id;

      const reordRes = await commerceApp.inject({
        method: "POST",
        url: `/api/v1/orders/${ordId}/reorder`,
        headers: { authorization: `Bearer ${regData.accessToken}` },
        payload: { quantity: 1 },
      });
      assert.equal(reordRes.statusCode, 201);
      const reordId = JSON.parse(reordRes.body).data.id;

      const shipReord = await commerceApp.inject({
        method: "POST",
        url: `/api/v1/admin/orders/${reordId}/ship`,
        headers: { authorization: `Bearer ${admin1Token}` },
        payload: { trackingNumber: "MEM-REORDER-777" },
      });
      assert.equal(shipReord.statusCode, 200);

      const trackReord = await commerceApp.inject({
        method: "GET",
        url: `/api/v1/orders/${reordId}/tracking`,
        headers: { authorization: `Bearer ${regData.accessToken}` },
      });
      assert.equal(trackReord.statusCode, 200);
      assert.equal(JSON.parse(trackReord.body).data.trackingNumber, "MEM-REORDER-777");

      // 6. Notification read supports both PATCH and POST + Gateway queues telemetry
      const notifCreate = await notificationApp.inject({
        method: "POST",
        url: "/api/v1/notifications",
        headers: { authorization: `Bearer ${regData.accessToken}` },
        payload: { userId: regData.user.id, type: "system", title: "Ready", body: "Edition ready" },
      });
      assert.equal(notifCreate.statusCode, 201);
      const notifId = JSON.parse(notifCreate.body).data.id;

      const notifPostRead = await notificationApp.inject({
        method: "POST",
        url: `/api/v1/notifications/${notifId}/read`,
        headers: { authorization: `Bearer ${regData.accessToken}` },
        payload: {},
      });
      assert.equal(notifPostRead.statusCode, 200);

      const gwQueues = await gatewayApp.inject({
        method: "GET",
        url: "/api/v1/admin/queues/telemetry",
        headers: { authorization: `Bearer ${admin1Token}` },
      });
      assert.equal(gwQueues.statusCode, 200);
      assert.ok(Array.isArray(JSON.parse(gwQueues.body).data.queues));

      await memoryApp.inject({ method: "DELETE", url: `/api/v1/spaces/${spaceId}`, headers: { authorization: `Bearer ${regData.accessToken}` } });
    } finally {
      await Promise.all([identityApp.close(), memoryApp.close(), commerceApp.close(), notificationApp.close(), gatewayApp.close()]);
    }
  });

  test("10. Book Space Route, Preserve-Order Curation & Postgres listBooks Spread Hydration via Gateway", async () => {
    const [identityApp, memoryApp, bookApp] = await Promise.all([
      buildIdentityService(),
      buildMemoryService(),
      buildBookService(),
    ]);
    const [idUrl, memUrl, bookUrl] = await Promise.all([
      identityApp.listen({ port: 0, host: "127.0.0.1" }),
      memoryApp.listen({ port: 0, host: "127.0.0.1" }),
      bookApp.listen({ port: 0, host: "127.0.0.1" }),
    ]);
    const gatewayApp = buildGateway({
      enableGrpcRouting: false,
      identityServiceUrl: idUrl,
      memoryServiceUrl: memUrl,
      bookServiceUrl: bookUrl,
    });
    const gwUrl = await gatewayApp.listen({ port: 0, host: "127.0.0.1" });

    try {
      const regRes = await fetch(`${gwUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `book_reg_${Date.now()}@memoria.internal`,
          password: "StrongPassword123!",
          fullName: "Book Curator",
        }),
      });
      const regJson: any = await regRes.json();
      assert.equal(regRes.status, 201);
      const token = regJson.data.accessToken as string;

      const spRes = await fetch(`${gwUrl}/api/v1/spaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "Book Regression Vault", type: "family" }),
      });
      const spJson: any = await spRes.json();
      assert.equal(spRes.status, 201);
      const spaceId = spJson.data.id as string;

      // Create space-scoped book via gateway
      const createBookRes = await fetch(`${gwUrl}/api/v1/spaces/${spaceId}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: "Custom Sequence Anthology",
          subtitle: "2026 -> 2020",
          format: "hardcover_standard_8x10",
          coverColor: "#76556F",
          foilStamping: "gold",
        }),
      });
      const createBookJson: any = await createBookRes.json();
      assert.equal(createBookRes.status, 201);
      const bookId = createBookJson.data.id as string;

      // Curate with preserveOrder: true putting 2026 memory BEFORE 2020 memory
      const curateRes = await fetch(`${gwUrl}/api/v1/books/${bookId}/curate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          template: "editorial_classic",
          preserveOrder: true,
          memories: [
            { id: crypto.randomUUID(), title: "Later 2026 Entry", content: "First spread", capturedAt: "2026-06-01T00:00:00Z" },
            { id: crypto.randomUUID(), title: "Earlier 2020 Entry", content: "Second spread", capturedAt: "2020-06-01T00:00:00Z" },
          ],
        }),
      });
      const curateJson: any = await curateRes.json();
      assert.equal(curateRes.status, 200);
      assert.equal(curateJson.data.spreads.length, 3);
      assert.equal(
        curateJson.data.spreads[1].leftPage.elements.find((e: any) => e.type === "heading").content,
        "Later 2026 Entry",
        "preserveOrder: true must keep caller's custom sequence"
      );

      // List space books via gateway -> PostgresBookRepository.listBooks must return hydrated spreads!
      const listRes = await fetch(`${gwUrl}/api/v1/spaces/${spaceId}/books`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listJson: any = await listRes.json();
      assert.equal(listRes.status, 200);
      const listedBook = listJson.data.find((b: any) => b.id === bookId);
      assert.ok(listedBook, "Created book must appear in space books list");
      assert.equal(listedBook.spreads.length, 3, "PostgresBookRepository.listBooks must hydrate persisted spreads");

      await fetch(`${gwUrl}/api/v1/spaces/${spaceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } finally {
      await Promise.all([gatewayApp.close(), identityApp.close(), memoryApp.close(), bookApp.close()]);
    }
  });

  test("11. Server-Backed Memory Reactions (GET/POST/PUT) with Space Access Isolation & Gateway Proxy", async () => {
    const [identityApp, memoryApp, collabApp] = await Promise.all([
      buildIdentityService(),
      buildMemoryService(),
      buildCollabService(),
    ]);
    const [idUrl, memUrl, collabUrl] = await Promise.all([
      identityApp.listen({ port: 0, host: "127.0.0.1" }),
      memoryApp.listen({ port: 0, host: "127.0.0.1" }),
      collabApp.listen({ port: 0, host: "127.0.0.1" }),
    ]);
    const gatewayApp = buildGateway({
      enableGrpcRouting: false,
      identityServiceUrl: idUrl,
      memoryServiceUrl: memUrl,
      collabServiceUrl: collabUrl,
    });
    const gwUrl = await gatewayApp.listen({ port: 0, host: "127.0.0.1" });

    try {
      const regRes = await fetch(`${gwUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `react_owner_${Date.now()}@memoria.internal`,
          password: "StrongPassword123!",
          fullName: "Reaction Steward",
        }),
      });
      const regJson: any = await regRes.json();
      assert.equal(regRes.status, 201);
      const ownerToken = regJson.data.accessToken as string;

      const outsiderRes = await fetch(`${gwUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `react_outsider_${Date.now()}@memoria.internal`,
          password: "StrongPassword123!",
          fullName: "Outsider User",
        }),
      });
      const outsiderToken = (await outsiderRes.json()).data.accessToken as string;

      const spRes = await fetch(`${gwUrl}/api/v1/spaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ name: "Reactions Vault", type: "family" }),
      });
      const spaceId = (await spRes.json()).data.id as string;

      const memRes = await fetch(`${gwUrl}/api/v1/spaces/${spaceId}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({
          title: "Grandmother Piano Recital",
          content: "Chopin nocturne in the parlor.",
          format: "story",
        }),
      });
      const memoryId = (await memRes.json()).data.id as string;

      // Unauthenticated 401
      const unauthGet = await fetch(`${gwUrl}/api/v1/memories/${memoryId}/reactions`);
      assert.equal(unauthGet.status, 401);

      // Non-member BOLA 403
      const outsiderGet = await fetch(`${gwUrl}/api/v1/memories/${memoryId}/reactions`, {
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });
      assert.equal(outsiderGet.status, 403);

      // Initial GET returns empty counts & selectedKinds
      const initGet = await fetch(`${gwUrl}/api/v1/memories/${memoryId}/reactions`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(initGet.status, 200);
      const initData = (await initGet.json()).data;
      assert.deepEqual(initData.counts, {});
      assert.deepEqual(initData.selectedKinds, []);

      // POST toggles heart on -> count 1
      const postOn = await fetch(`${gwUrl}/api/v1/memories/${memoryId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ kind: "heart" }),
      });
      assert.equal(postOn.status, 200);
      const postOnData = (await postOn.json()).data;
      assert.equal(postOnData.counts.heart, 1);
      assert.deepEqual(postOnData.selectedKinds, ["heart"]);
      assert.equal(postOnData.active, true);

      // PUT idempotently sets warmth active twice -> count stays 1
      const putWarmth1 = await fetch(`${gwUrl}/api/v1/memories/${memoryId}/reactions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ kind: "warmth", active: true }),
      });
      assert.equal(putWarmth1.status, 200);
      const putWarmth2 = await fetch(`${gwUrl}/api/v1/memories/${memoryId}/reactions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ kind: "warmth", active: true }),
      });
      const putWarmth2Data = (await putWarmth2.json()).data;
      assert.equal(putWarmth2Data.counts.warmth, 1);
      assert.equal(putWarmth2Data.counts.heart, 1);
      assert.ok(putWarmth2Data.selectedKinds.includes("heart"));
      assert.ok(putWarmth2Data.selectedKinds.includes("warmth"));

      // POST toggles heart off, PUT removes warmth -> counts drop to 0
      await fetch(`${gwUrl}/api/v1/memories/${memoryId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ kind: "heart" }),
      });
      const putWarmthOff = await fetch(`${gwUrl}/api/v1/memories/${memoryId}/reactions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ kind: "warmth", active: false }),
      });
      const afterOffData = (await putWarmthOff.json()).data;
      assert.equal(afterOffData.counts.heart || 0, 0);
      assert.equal(afterOffData.counts.warmth || 0, 0);
      assert.deepEqual(afterOffData.selectedKinds, []);

      // Invalid kind returns 400
      const invalidKindRes = await fetch(`${gwUrl}/api/v1/memories/${memoryId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ kind: "invalid_emoji" }),
      });
      assert.equal(invalidKindRes.status, 400);

      await fetch(`${gwUrl}/api/v1/spaces/${spaceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
    } finally {
      await Promise.all([gatewayApp.close(), identityApp.close(), memoryApp.close(), collabApp.close()]);
    }
  });
});
