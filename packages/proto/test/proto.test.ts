import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getIdentityProto,
  getMemoryProto,
  getMediaProto,
  getBookProto,
  createClientMetadata,
  verifyServiceAuth,
  createDeadline,
  grpcStatusToHttpStatus,
  grpc,
} from "../src/index.js";

test("Protocol Buffers & gRPC Foundation Suite", async (t) => {
  await t.test("1. Successfully loads Identity service proto definitions", () => {
    const proto = getIdentityProto();
    assert.ok(proto.IdentityService, "IdentityService constructor must exist");
  });

  await t.test("2. Successfully loads Memory service proto definitions", () => {
    const proto = getMemoryProto();
    assert.ok(proto.MemoryService, "MemoryService constructor must exist");
  });

  await t.test("3. Successfully loads Media and Book proto definitions", () => {
    const mediaProto = getMediaProto();
    const bookProto = getBookProto();
    assert.ok(mediaProto.MediaService, "MediaService constructor must exist");
    assert.ok(bookProto.BookService, "BookService constructor must exist");
  });

  await t.test("4. Metadata and Internal Service Authentication", () => {
    const meta = createClientMetadata({
      serviceToken: "test-secret-key",
      correlationId: "corr-12345",
      userId: "user-888",
      spaceId: "space-999",
    });

    assert.equal(meta.get("x-service-auth")[0], "test-secret-key");
    assert.equal(meta.get("x-correlation-id")[0], "corr-12345");
    assert.equal(meta.get("x-user-id")[0], "user-888");
    assert.equal(meta.get("x-space-id")[0], "space-999");

    assert.equal(verifyServiceAuth(meta, "test-secret-key"), true);
    assert.equal(verifyServiceAuth(meta, "wrong-key"), false);
  });

  await t.test("5. Deadlines and HTTP Error Mapping", () => {
    const deadline = createDeadline(5000);
    assert.ok(deadline.getTime() > Date.now() + 4000);

    assert.equal(grpcStatusToHttpStatus(grpc.status.OK), 200);
    assert.equal(grpcStatusToHttpStatus(grpc.status.NOT_FOUND), 404);
    assert.equal(grpcStatusToHttpStatus(grpc.status.UNAUTHENTICATED), 401);
    assert.equal(grpcStatusToHttpStatus(grpc.status.PERMISSION_DENIED), 403);
    assert.equal(grpcStatusToHttpStatus(grpc.status.DEADLINE_EXCEEDED), 504);
    assert.equal(grpcStatusToHttpStatus(grpc.status.INVALID_ARGUMENT), 400);
  });
});

