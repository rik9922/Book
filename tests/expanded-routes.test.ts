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

    // Collab list & revoke invitations
    await collabApp.inject({
      method: "POST",
      url: `/api/v1/collab/spaces/${spaceId}/members`,
      headers,
      payload: { userId: ownerId, role: "owner" },
    });
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
});
