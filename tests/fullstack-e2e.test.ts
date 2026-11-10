import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { buildGateway } from "../services/api-gateway/src/server.ts";
import { buildIdentityService } from "../services/identity-service/src/server.ts";
import { buildMemoryService } from "../services/memory-service/src/server.ts";
import { buildMediaService } from "../services/media-service/src/server.ts";
import { buildCollabService } from "../services/collab-service/src/server.ts";
import { buildBookService } from "../services/book-service/src/server.ts";
import { buildCommerceService } from "../services/commerce-service/src/server.ts";
import { buildNotificationService } from "../services/notification-service/src/server.ts";

describe("Full-Stack Vertical Slice E2E Suite (Auth -> Space -> Media -> Memory -> Book -> Order -> Notify)", () => {
  const closers: Array<() => Promise<unknown>> = [];

  after(async () => {
    for (const close of closers) {
      await close();
    }
  });

  test("End-to-End Family Heirloom Journey across all 7 microservices", async () => {
    const [
      identityApp,
      memoryApp,
      mediaApp,
      collabApp,
      bookApp,
      commerceApp,
      notificationApp,
    ] = await Promise.all([
      buildIdentityService(),
      buildMemoryService(),
      buildMediaService(),
      buildCollabService(),
      buildBookService(),
      buildCommerceService(),
      buildNotificationService(),
    ]);

    closers.push(
      () => identityApp.close(),
      () => memoryApp.close(),
      () => mediaApp.close(),
      () => collabApp.close(),
      () => bookApp.close(),
      () => commerceApp.close(),
      () => notificationApp.close()
    );

    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const email = `e2e_owner_${uniqueSuffix}@memoria.internal`;
    const password = "StrongArchivalPassword!2026";

    // 1. Register & Refresh Session
    const regRes = await identityApp.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email, password, fullName: "E2E Archivist" },
    });
    assert.equal(regRes.statusCode, 201);
    const regData = JSON.parse(regRes.body).data;
    assert.ok(regData.accessToken);
    assert.ok(regData.refreshToken);

    const refreshRes = await identityApp.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: regData.refreshToken },
    });
    assert.equal(refreshRes.statusCode, 200);
    const accessToken = JSON.parse(refreshRes.body).data.accessToken as string;
    const authHeader = { authorization: `Bearer ${accessToken}` };

    // 2. Create Memory Space + Profile + Collaborator
    const spaceRes = await memoryApp.inject({
      method: "POST",
      url: "/api/v1/spaces",
      headers: authHeader,
      payload: {
        name: `Vance Heritage Vault ${uniqueSuffix}`,
        type: "family",
        description: "End-to-end test archive",
      },
    });
    assert.equal(spaceRes.statusCode, 201);
    const spaceBody = JSON.parse(spaceRes.body).data;
    const space = spaceBody.space || spaceBody;
    assert.ok(space.id);

    const profileRes = await memoryApp.inject({
      method: "POST",
      url: `/api/v1/spaces/${space.id}/profiles`,
      headers: authHeader,
      payload: {
        name: "Clara Vance",
        type: "child",
        relationship: "Daughter",
      },
    });
    assert.equal(profileRes.statusCode, 201);

    const memberRes = await collabApp.inject({
      method: "POST",
      url: `/api/v1/collab/spaces/${space.id}/members`,
      headers: authHeader,
      payload: { userId: regData.user.id, role: "owner" },
    });
    assert.equal(memberRes.statusCode, 201);

    // 3. Signed Streaming Media Upload + Complete + HTTP 206 Byte Range Download
    const pngBuffer = await sharp({
      create: {
        width: 120,
        height: 80,
        channels: 3,
        background: { r: 247, g: 244, b: 238 },
      },
    })
      .png()
      .toBuffer();

    const uploadSessionRes = await mediaApp.inject({
      method: "POST",
      url: "/api/v1/media/upload-session",
      headers: authHeader,
      payload: {
        spaceId: space.id,
        fileName: "e2e-photo.png",
        mimeType: "image/png",
        fileSizeBytes: pngBuffer.length,
      },
    });
    assert.equal(uploadSessionRes.statusCode, 201);
    const uploadSession = JSON.parse(uploadSessionRes.body).data;
    const signedPutUrl = new URL(uploadSession.uploadUrl);

    const putRes = await mediaApp.inject({
      method: "PUT",
      url: `${signedPutUrl.pathname}${signedPutUrl.search}`,
      headers: { "content-type": "image/png" },
      payload: pngBuffer,
    });
    assert.equal(putRes.statusCode, 200);

    const completeRes = await mediaApp.inject({
      method: "POST",
      url: `/api/v1/media/${uploadSession.mediaId}/complete`,
      headers: authHeader,
      payload: {},
    });
    assert.equal(completeRes.statusCode, 200);

    // Poll until background derivative worker finishes generating thumb_sm
    let completedAsset: any = JSON.parse(completeRes.body).data;
    for (let attempt = 0; attempt < 20 && !completedAsset?.derivatives?.thumb_sm; attempt++) {
      await new Promise((r) => setTimeout(r, 50));
      const mediaGet = await mediaApp.inject({
        method: "GET",
        url: `/api/v1/media/${uploadSession.mediaId}`,
        headers: authHeader,
      });
      if (mediaGet.statusCode === 200) {
        completedAsset = JSON.parse(mediaGet.body).data;
      }
    }
    assert.ok(completedAsset.derivatives?.thumb_sm, "Expected async thumb_sm derivative");

    const rangeRes = await mediaApp.inject({
      method: "GET",
      url: completedAsset.derivatives.thumb_sm,
      headers: { ...authHeader, range: "bytes=0-63" },
    });
    assert.equal(rangeRes.statusCode, 206);
    assert.ok(rangeRes.headers["content-range"]?.startsWith("bytes 0-63/"));

    // 4. Create Memory referencing Media -> Search -> Favorite -> Delete check
    const memoryRes = await memoryApp.inject({
      method: "POST",
      url: `/api/v1/spaces/${space.id}/memories`,
      headers: authHeader,
      payload: {
        title: "Autumn Picnic at Oak Ridge",
        content: "Grandmother Clara brought homemade cider and archival albums.",
        format: "image",
        capturedAt: new Date().toISOString(),
        location: "Portland, OR",
        tags: ["autumn", "clara"],
        mediaIds: [uploadSession.mediaId],
      },
    });
    assert.equal(memoryRes.statusCode, 201);
    const createdMemory = JSON.parse(memoryRes.body).data;

    const searchRes = await memoryApp.inject({
      method: "GET",
      url: `/api/v1/spaces/${space.id}/memories/search?q=Autumn`,
      headers: authHeader,
    });
    assert.equal(searchRes.statusCode, 200);
    const searchData = JSON.parse(searchRes.body).data;
    const searchItems = Array.isArray(searchData) ? searchData : searchData.items || [];
    assert.ok(searchItems.some((m: { id: string }) => m.id === createdMemory.id));

    const favRes = await memoryApp.inject({
      method: "PATCH",
      url: `/api/v1/memories/${createdMemory.id}`,
      headers: authHeader,
      payload: { isFavorite: true },
    });
    assert.equal(favRes.statusCode, 200);
    assert.equal(JSON.parse(favRes.body).data.isFavorite, true);

    // 5. Book Studio: Create -> Customize Cover -> Edit Spread -> Freeze -> Reject Post-Freeze Edit
    const bookRes = await bookApp.inject({
      method: "POST",
      url: "/api/v1/books",
      headers: authHeader,
      payload: {
        spaceId: space.id,
        title: "Oak Ridge Anthology",
        format: "hardcover_standard_8x10",
        coverColor: "#76556F",
        foilStamping: "gold",
        coverTitle: "Oak Ridge",
      },
    });
    assert.equal(bookRes.statusCode, 201);
    const bookBody = JSON.parse(bookRes.body).data;
    const book = bookBody.book || bookBody;
    const initialSpreadId = book.spreads?.[0]?.id;
    assert.ok(initialSpreadId, "Expected initial spread created on book");

    const patchCoverRes = await bookApp.inject({
      method: "PATCH",
      url: `/api/v1/books/${book.id}`,
      headers: authHeader,
      payload: { coverColor: "#5F735E", coverTitle: "Oak Ridge Heritage" },
    });
    assert.equal(patchCoverRes.statusCode, 200);

    const putSpreadRes = await bookApp.inject({
      method: "PUT",
      url: `/api/v1/books/${book.id}/spreads/${initialSpreadId}`,
      headers: authHeader,
      payload: {
        spreadIndex: 0,
        leftPage: null,
        rightPage: {
          id: book.spreads[0].rightPage.id,
          pageNumber: 1,
          layoutType: "editorial_chapter_title",
          backgroundColor: "#F7F4EE",
          elements: [
            {
              id: book.spreads[0].rightPage.elements[0].id,
              type: "heading",
              x: 10,
              y: 30,
              width: 80,
              height: 15,
              rotation: 0,
              zIndex: 1,
              content: "Chapter I — Autumn",
              style: { fontFamily: "serif", fontSize: 32, color: "#20242C" },
            },
          ],
        },
      },
    });
    assert.equal(putSpreadRes.statusCode, 200);

    const freezeRes = await bookApp.inject({
      method: "POST",
      url: `/api/v1/books/${book.id}/freeze`,
      headers: authHeader,
      payload: {},
    });
    assert.equal(freezeRes.statusCode, 200);

    const blockedEditRes = await bookApp.inject({
      method: "PUT",
      url: `/api/v1/books/${book.id}/spreads/${initialSpreadId}`,
      headers: authHeader,
      payload: {
        spreadIndex: 0,
        leftPage: null,
        rightPage: null,
      },
    });
    assert.equal(blockedEditRes.statusCode, 409);

    // 6. Commerce Order + Notification Lifecycle
    const orderRes = await commerceApp.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: authHeader,
      payload: {
        spaceId: space.id,
        bookId: book.id,
        quantity: 1,
        shippingAddress: {
          recipientName: "Clara Vance",
          line1: "100 Linen Way",
          city: "Portland",
          postalCode: "97205",
          country: "US",
        },
        printSpec: {
          paperWeight: "170gsm_lustre",
          binding: "hardcover_linen",
        },
      },
    });
    assert.equal(orderRes.statusCode, 201);

    const notifyRes = await notificationApp.inject({
      method: "POST",
      url: "/api/v1/notifications",
      headers: authHeader,
      payload: {
        userId: regData.user.id,
        spaceId: space.id,
        type: "print_order_queued",
        title: "Print Edition Queued",
        body: "Your frozen heirloom book is queued for archival printing.",
      },
    });
    assert.equal(notifyRes.statusCode, 201);

    // 7. BOLA/IDOR Enforcement across Media, Book & Commerce + Gateway Cross-Context Routing
    const outsiderReg = await identityApp.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: `e2e_outsider_${uniqueSuffix}@memoria.internal`,
        password,
        fullName: "Outsider User",
      },
    });
    assert.equal(outsiderReg.statusCode, 201);
    const outsiderData = JSON.parse(outsiderReg.body).data;
    const outsiderHeaders = { authorization: `Bearer ${outsiderData.accessToken}` };

    const [mediaQuotaBola, book3dBola, orderListBola] = await Promise.all([
      mediaApp.inject({
        method: "GET",
        url: `/api/v1/media/spaces/${space.id}/quota`,
        headers: outsiderHeaders,
      }),
      bookApp.inject({
        method: "GET",
        url: `/api/v1/books/${book.id}/3d-model`,
        headers: outsiderHeaders,
      }),
      commerceApp.inject({
        method: "GET",
        url: `/api/v1/orders/spaces/${space.id}`,
        headers: outsiderHeaders,
      }),
    ]);
    assert.equal(mediaQuotaBola.statusCode, 403, "Outsider must be blocked from space media quota");
    assert.equal(book3dBola.statusCode, 403, "Outsider must be blocked from private book 3D model");
    assert.equal(orderListBola.statusCode, 403, "Outsider must be blocked from space print orders");

    // Invited collaborator sees the shared space in GET /api/v1/spaces
    const inviteRes = await collabApp.inject({
      method: "POST",
      url: `/api/v1/collab/spaces/${space.id}/invitations`,
      headers: authHeader,
      payload: { inviteeEmail: `e2e_outsider_${uniqueSuffix}@memoria.internal`, role: "contributor" },
    });
    assert.equal(inviteRes.statusCode, 201);
    const inviteToken = JSON.parse(inviteRes.body).data.inviteToken as string;

    const acceptRes = await collabApp.inject({
      method: "POST",
      url: "/api/v1/collab/invitations/accept",
      headers: outsiderHeaders,
      payload: { token: inviteToken },
    });
    assert.equal(acceptRes.statusCode, 200);

    const collabSpacesRes = await memoryApp.inject({
      method: "GET",
      url: "/api/v1/spaces",
      headers: outsiderHeaders,
    });
    assert.equal(collabSpacesRes.statusCode, 200);
    const collabSpaces = JSON.parse(collabSpacesRes.body).data as Array<{ id: string }>;
    assert.ok(
      collabSpaces.some((s) => s.id === space.id),
      "Invited collaborator must see shared space in GET /api/v1/spaces"
    );

    // Gateway routing for /api/v1/spaces/:spaceId/books and /api/v1/spaces/:spaceId/media
    const [mediaUrl, bookUrl, memoryUrl] = await Promise.all([
      mediaApp.listen({ port: 0, host: "127.0.0.1" }),
      bookApp.listen({ port: 0, host: "127.0.0.1" }),
      memoryApp.listen({ port: 0, host: "127.0.0.1" }),
    ]);

    const gateway = buildGateway({
      enableGrpcRouting: false,
      mediaServiceUrl: mediaUrl,
      bookServiceUrl: bookUrl,
      memoryServiceUrl: memoryUrl,
    });
    closers.push(() => gateway.close());

    const gwBooksRes = await gateway.inject({
      method: "GET",
      url: `/api/v1/spaces/${space.id}/books`,
      headers: authHeader,
    });
    assert.equal(gwBooksRes.statusCode, 200, `Gateway /spaces/:id/books failed: ${gwBooksRes.body}`);
    const gwBooks = JSON.parse(gwBooksRes.body).data as Array<{ id: string }>;
    assert.ok(gwBooks.some((b) => b.id === book.id));

    const gwMediaRes = await gateway.inject({
      method: "GET",
      url: `/api/v1/spaces/${space.id}/media`,
      headers: authHeader,
    });
    assert.equal(gwMediaRes.statusCode, 200, `Gateway /spaces/:id/media failed: ${gwMediaRes.body}`);
    const gwMedia = JSON.parse(gwMediaRes.body).data as Array<{ id: string }>;
    assert.ok(gwMedia.some((m) => m.id === uploadSession.mediaId));
  });
});
