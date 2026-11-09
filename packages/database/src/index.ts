import { Pool, PoolClient, PoolConfig, QueryResult, QueryResultRow } from "pg";
import { createServiceLogger, Logger } from "@memory-capsule/logger";

export { PoolClient, QueryResult, QueryResultRow };

const logger: Logger = createServiceLogger("database-client");

export interface DatabaseClient {
  query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>>;
  transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
}

export interface DatabasePoolOptions extends Partial<PoolConfig> {
  statementTimeoutMs?: number;
}

class RealDatabaseClient implements DatabaseClient {
  private pool: Pool;

  constructor(connectionString: string, options?: DatabasePoolOptions) {
    const maxConnections = options?.max || (process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10);
    const statementTimeout = options?.statementTimeoutMs || (process.env.DB_STATEMENT_TIMEOUT_MS ? parseInt(process.env.DB_STATEMENT_TIMEOUT_MS, 10) : 5000);

    this.pool = new Pool({
      connectionString,
      max: maxConnections,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 2000,
      statement_timeout: statementTimeout,
      ...options,
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

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackErr) {
        logger.error({ rollbackErr }, "[Postgres Transaction] Rollback failed");
      }
      throw error;
    } finally {
      client.release();
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

  async transaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
    return fn({
      query: this.query.bind(this)
    });
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    this.store.clear();
  }
}

export function createDatabaseClient(connectionString?: string, options?: DatabasePoolOptions): DatabaseClient {
  const url = connectionString || process.env.DATABASE_URL;
  if (!url) {
    logger.warn("[DatabaseClient] No connection string provided — using in-memory mock client");
    return new InMemoryDatabaseClient();
  }

  try {
    return new RealDatabaseClient(url, options);
  } catch (err) {
    logger.warn({ err }, "[DatabaseClient] Connection error — using in-memory mock client");
    return new InMemoryDatabaseClient();
  }
}

export * from "./migrator.js";
export * from "./inspector.js";
export * from "./repositories.js";

