import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import net from "node:net";
import { createEventBus } from "@memory-capsule/events";
import { createJobManager } from "@memory-capsule/jobs";
import { createDomainEvent } from "@memory-capsule/contracts";

async function canConnectTcp(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 600 });
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

describe("Live Redis BullMQ & NATS JetStream Daemon Consumer Verification", () => {
  test("1. BullMQ Worker executes job against live Redis daemon (127.0.0.1:6379)", async (t) => {
    const redisUp = await canConnectTcp("127.0.0.1", 6379);
    if (!redisUp) {
      t.skip("Local Redis daemon on 127.0.0.1:6379 not running");
      return;
    }

    const prevFlag = process.env.ENABLE_TEST_REDIS;
    process.env.ENABLE_TEST_REDIS = "true";
    const jobManager = createJobManager("redis://127.0.0.1:6379");

    try {
      const queueName = `memoria-live-test-${Date.now()}`;
      const expectedToken = crypto.randomUUID();
      const processed = new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timed out waiting for live BullMQ worker")), 8000);
        jobManager.registerWorker<{ token: string }>(queueName, async (job) => {
          clearTimeout(timer);
          resolve(job.data.token);
        });
      });

      await jobManager.addJob(queueName, "verify-live-redis", { token: expectedToken });
      const actual = await processed;
      assert.equal(actual, expectedToken);
    } finally {
      await jobManager.close();
      if (prevFlag === undefined) delete process.env.ENABLE_TEST_REDIS;
      else process.env.ENABLE_TEST_REDIS = prevFlag;
    }
  });

  test("2. NATS JetStream durable consumer receives & acks event on live NATS daemon (127.0.0.1:4222)", async (t) => {
    const natsUp = await canConnectTcp("127.0.0.1", 4222);
    if (!natsUp) {
      t.skip("Local NATS JetStream daemon on 127.0.0.1:4222 not running");
      return;
    }

    const prevFlag = process.env.ENABLE_TEST_NATS;
    process.env.ENABLE_TEST_NATS = "true";
    const bus = await createEventBus("nats://127.0.0.1:4222");

    try {
      const subject = `test.live.${Date.now()}`;
      const durableName = `durable_live_${Date.now()}`;
      const expectedNonce = crypto.randomUUID();

      const received = new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timed out waiting for NATS JetStream consumer")), 8000);
        bus
          .subscribe<{ nonce: string }>(
            subject,
            async (ev) => {
              if (ev.data?.nonce === expectedNonce) {
                clearTimeout(timer);
                resolve(ev.data.nonce);
              }
            },
            { durableName }
          )
          .catch(reject);
      });

      await new Promise((r) => setTimeout(r, 150));
      const event = createDomainEvent("test.live.verified", "test-harness", {
        nonce: expectedNonce,
      });
      await bus.publish(subject, event);

      const actualNonce = await received;
      assert.equal(actualNonce, expectedNonce);
    } finally {
      await bus.close();
      if (prevFlag === undefined) delete process.env.ENABLE_TEST_NATS;
      else process.env.ENABLE_TEST_NATS = prevFlag;
    }
  });
});
