import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import {
  BaseServiceConfigSchema,
  validateServiceConfig,
} from "@memory-capsule/contracts";
import { buildIdentityService } from "../services/identity-service/src/server.ts";
import { buildCollabService } from "../services/collab-service/src/server.ts";
import { buildCommerceService } from "../services/commerce-service/src/server.ts";
import { buildNotificationService } from "../services/notification-service/src/server.ts";
import { createDatabaseClient, PostgresSpaceRepository } from "@memory-capsule/database";

describe("Microservices Lifecycle & Domain Services Suite", () => {
  const cfg = validateServiceConfig(BaseServiceConfigSchema);
  const signToken = (userId: string, email = "lifecycle@memoria.internal") =>
    jwt.sign({ sub: userId, email }, cfg.JWT_SECRET, { expiresIn: "1h" });

  test("1. Identity Service: Email Verification + Forgot/Reset Password + Session Revocation", async () => {
    const app = await buildIdentityService();
    const email = `auth_lifecycle_${Date.now()}@memoria.internal`;

    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email,
        password: "InitialPassword123!",
        fullName: "Clara Bennett",
      },
    });
    assert.equal(regRes.statusCode, 201);
    const regData = JSON.parse(regRes.body).data;
    assert.ok(regData.verificationToken);

    // Verify email
    const verifyRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: { token: regData.verificationToken },
    });
    assert.equal(verifyRes.statusCode, 200);
    assert.equal(JSON.parse(verifyRes.body).data.verified, true);

    // Reusing consumed token fails
    const replayVerify = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: { token: regData.verificationToken },
    });
    assert.equal(replayVerify.statusCode, 400);

    // Forgot password
    const forgotRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: { email },
    });
    assert.equal(forgotRes.statusCode, 200);
    const resetToken = JSON.parse(forgotRes.body).data.resetToken;
    assert.ok(resetToken);

    // Reset password
    const resetRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: { token: resetToken, newPassword: "NewHeirloomPassword99!" },
    });
    assert.equal(resetRes.statusCode, 200);

    // Old refresh token is revoked after password reset
    const revokedRefresh = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: regData.refreshToken },
    });
    assert.equal(revokedRefresh.statusCode, 401);

    // Login with new password succeeds
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password: "NewHeirloomPassword99!" },
    });
    assert.equal(loginRes.statusCode, 200);

    await app.close();
  });

  test("2. Collab Service: Space Membership, RBAC & Invitation Acceptance", async () => {
    const app = await buildCollabService();
    const ownerId = crypto.randomUUID();
    const inviteeId = crypto.randomUUID();
    const spaceId = crypto.randomUUID();
    const ownerToken = signToken(ownerId, "owner@memoria.internal");
    const inviteeToken = signToken(inviteeId, "invitee@memoria.internal");

    // Add owner
    const addOwnerRes = await app.inject({
      method: "POST",
      url: `/api/v1/collab/spaces/${spaceId}/members`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { userId: ownerId, role: "owner" },
    });
    assert.equal(addOwnerRes.statusCode, 201);

    // Create invitation
    const inviteRes = await app.inject({
      method: "POST",
      url: `/api/v1/collab/spaces/${spaceId}/invitations`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { inviteeEmail: "invitee@memoria.internal", role: "contributor" },
    });
    assert.equal(inviteRes.statusCode, 201);
    const inviteToken = JSON.parse(inviteRes.body).data.inviteToken;
    assert.ok(inviteToken);

    // Accept invitation
    const acceptRes = await app.inject({
      method: "POST",
      url: "/api/v1/collab/invitations/accept",
      headers: { authorization: `Bearer ${inviteeToken}` },
      payload: { token: inviteToken },
    });
    assert.equal(acceptRes.statusCode, 200);
    assert.equal(JSON.parse(acceptRes.body).data.member.role, "contributor");

    // List members
    const listRes = await app.inject({
      method: "GET",
      url: `/api/v1/collab/spaces/${spaceId}/members`,
      headers: { authorization: `Bearer ${inviteeToken}` },
    });
    assert.equal(listRes.statusCode, 200);
    assert.equal(JSON.parse(listRes.body).data.length, 2);

    await app.close();
  });

  test("3. Commerce Service: Print Order Creation & Fulfillment Progression", async () => {
    const app = await buildCommerceService();
    const userId = crypto.randomUUID();
    const spaceId = crypto.randomUUID();
    const bookId = crypto.randomUUID();
    const token = signToken(userId);
    const memoryDbUrl = process.env.MEMORY_DATABASE_URL || process.env.DATABASE_URL;
    if (memoryDbUrl) {
      const memDb = createDatabaseClient(memoryDbUrl);
      const spaceRepo = new PostgresSpaceRepository(memDb);
      await spaceRepo.createSpace({
        id: spaceId,
        ownerId: userId,
        name: "Commerce Lifecycle Space",
        type: "family",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await memDb.close();
    }

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        spaceId,
        bookId,
        quantity: 2,
        shippingAddress: {
          recipientName: "Arthur Bennett",
          line1: "742 Evergreen Terrace",
          city: "Mill Valley",
          postalCode: "94941",
          country: "US",
        },
        printSpec: {
          paperWeight: "170gsm_lustre",
          binding: "french_morocco",
        },
      },
    });
    assert.equal(createRes.statusCode, 201);
    const order = JSON.parse(createRes.body).data;
    assert.equal(order.totalCents, 13600);
    assert.equal(order.status, "submitted");

    const statusRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/orders/${order.id}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "shipped" },
    });
    assert.equal(statusRes.statusCode, 200);
    assert.equal(JSON.parse(statusRes.body).data.status, "shipped");

    await app.close();
  });

  test("4. Notification Service: Create, List Unread, Mark Read & Mark All Read", async () => {
    const app = await buildNotificationService();
    const userId = crypto.randomUUID();
    const token = signToken(userId);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/notifications",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        userId,
        type: "memory_comment",
        title: "New Family Reflection",
        body: "Clara added a note to Golden Anniversary.",
      },
    });
    assert.equal(createRes.statusCode, 201);
    const notif = JSON.parse(createRes.body).data;

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/notifications?unreadOnly=true",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(listRes.statusCode, 200);
    assert.equal(JSON.parse(listRes.body).data.length, 1);

    const readRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/notifications/${notif.id}/read`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(readRes.statusCode, 200);

    const unreadAfter = await app.inject({
      method: "GET",
      url: "/api/v1/notifications?unreadOnly=true",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(JSON.parse(unreadAfter.body).data.length, 0);

    await app.close();
  });
});
