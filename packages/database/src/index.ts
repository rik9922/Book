import { Pool, PoolConfig, QueryResult, QueryResultRow } from "pg";
import { createServiceLogger, Logger } from "@memory-capsule/logger";

const logger: Logger = createServiceLogger("database-client");

export interface DatabaseClient {
  query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
}

class RealDatabaseClient implements DatabaseClient {
  private pool: Pool;

  constructor(connectionString: string, config?: Partial<PoolConfig>) {
    this.pool = new Pool({
      connectionString,
      max: config?.max || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ...config,
    });

    this.pool.on("error", (err) => {
      logger.error({ err }, "[Postgres Pool] Unexpected error on idle client");
    });
  }

  async query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>> {
    const start = Date.now();
    try {
      const res = await this.pool.query<R>(text, params);
      const duration = Date.now() - start;
      logger.debug({ text, duration, rowCount: res.rowCount }, "[Postgres Query] Executed");
      return res;
    } catch (err) {
      logger.error({ err, text }, "[Postgres Query] Error executing query");
      throw err;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class InMemoryDatabaseClient implements DatabaseClient {
  private store = new Map<string, any[]>();

  async query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>> {
    logger.debug({ text, params }, "[InMemoryDatabaseClient] Simulated query");
    return {
      command: "SELECT",
      rowCount: 0,
      oid: 0,
      rows: [] as unknown as R[],
      fields: [],
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    this.store.clear();
  }
}

export function createDatabaseClient(connectionString?: string): DatabaseClient {
  const url = connectionString || process.env.DATABASE_URL;
  if (!url) {
    logger.warn("[DatabaseClient] No connection string provided — using in-memory mock client");
    return new InMemoryDatabaseClient();
  }

  try {
    return new RealDatabaseClient(url);
  } catch (err) {
    logger.warn({ err }, "[DatabaseClient] Connection error — using in-memory mock client");
    return new InMemoryDatabaseClient();
  }
}

export * from "./migrator.js";
export * from "./inspector.js";
export * from "./repositories.js";

