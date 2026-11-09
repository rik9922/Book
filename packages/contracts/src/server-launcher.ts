import fs from "node:fs/promises";
import path from "node:path";
import { resolveServicePort, PORT_REGISTRY } from "./ports.js";

export interface FastifyLikeApp {
  listen: (opts: { port: number; host: string }) => Promise<string>;
  close: () => Promise<unknown>;
}

export interface ServiceListenOptions {
  serviceId: string;
  app: FastifyLikeApp;
  logger: {
    info: (obj: any, msg?: string) => void;
    error: (obj: any, msg?: string) => void;
    warn: (obj: any, msg?: string) => void;
  };
  port?: number;
  host?: string;
  grpcServer?: {
    forceShutdown: () => void;
    tryShutdown?: (cb: (err?: any) => void) => void;
  };
}

export const MEMORIA_PIDS_DIR = path.resolve(process.cwd(), ".memoria", "pids");

/**
 * Starts a Fastify microservice with validated port binding, explicit EADDRINUSE handling,
 * graceful SIGINT/SIGTERM termination, and PID registry tracking.
 */
export async function startServiceServer(options: ServiceListenOptions): Promise<string> {
  const { serviceId, app, logger, grpcServer } = options;
  const def = PORT_REGISTRY[serviceId];

  const port = options.port || resolveServicePort(serviceId);
  const host = options.host || def?.host || "127.0.0.1";

  // Register clean shutdown signals
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal, serviceId, port }, `[${serviceId}] Received ${signal}, shutting down gracefully...`);

    try {
      if (grpcServer) {
        if (typeof grpcServer.tryShutdown === "function") {
          grpcServer.tryShutdown(() => {});
        } else {
          grpcServer.forceShutdown();
        }
      }
      await app.close();

      // Clean up PID file
      const pidPath = path.join(MEMORIA_PIDS_DIR, `${serviceId}.json`);
      await fs.unlink(pidPath).catch(() => {});
      logger.info({ serviceId }, `[${serviceId}] Server closed and PID file released`);
      process.exit(0);
    } catch (closeErr) {
      logger.error({ err: closeErr, serviceId }, `[${serviceId}] Error during graceful shutdown`);
      process.exit(1);
    }
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  try {
    const address = await app.listen({ port, host });
    logger.info({ serviceId, address, port, host }, `[${serviceId}] Listening successfully at ${address}`);

    // Track PID file for dev orchestration
    try {
      await fs.mkdir(MEMORIA_PIDS_DIR, { recursive: true });
      const pidPath = path.join(MEMORIA_PIDS_DIR, `${serviceId}.json`);
      const pidRecord = {
        serviceId,
        serviceName: def?.serviceName || serviceId,
        pid: process.pid,
        port,
        host,
        startedAt: new Date().toISOString(),
        command: process.argv.join(" "),
      };
      await fs.writeFile(pidPath, JSON.stringify(pidRecord, null, 2), "utf-8");
    } catch {
      // Non-fatal if PID directory is restricted
    }

    return address;
  } catch (err: any) {
    if (err.code === "EADDRINUSE" || err.message?.includes("EADDRINUSE")) {
      logger.error(
        {
          err,
          serviceId,
          port,
          host,
          action: "Run 'pnpm run dev:ports:check' to identify the conflicting process or override via .env",
        },
        `[${serviceId}] FATAL: Port ${port} is already in use by another process.`
      );
    } else {
      logger.error(
        { err, serviceId, port, host },
        `[${serviceId}] FATAL: Failed to bind server on ${host}:${port}.`
      );
    }
    process.exit(1);
  }
}
