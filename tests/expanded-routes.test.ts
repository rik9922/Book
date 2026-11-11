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
      payload: { relationship: "Eldest Daughter" },
    });
    assert.equal(profPatch.statusCode, 200);
    assert.equal(JSON.parse(profPatch.body).data.relationship, "Eldest Daughter");

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

      const curateRes = await bookApp.inject({
        method: "POST",
        url: `/api/v1/books/${bookId}/curate`,
        headers,
        payload: { memoryIds: [memId], theme: "heirloom_serif" },
      });
      assert.equal(curateRes.statusCode, 200);
      assert.ok(JSON.parse(curateRes.body).data.spreads.length >= 1);

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
});
