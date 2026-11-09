import { DatabaseClient } from "./index.js";
import { createServiceLogger, Logger } from "@memory-capsule/logger";

const logger: Logger = createServiceLogger("db-inspector");

export interface TableInspection {
  tableName: string;
  rowCount: number;
  columns: Array<{ name: string; type: string; isNullable: boolean }>;
}

export class DatabaseInspector {
  private db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  async inspectTables(): Promise<TableInspection[]> {
    const isHealthy = await this.db.healthCheck();
    if (!isHealthy) {
      logger.warn("[Inspector] Database is offline or unreachable");
      return [];
    }

    try {
      const tablesRes = await this.db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);

      const tables: TableInspection[] = [];

      for (const row of tablesRes.rows || []) {
        const tableName = row.table_name;
        const colRes = await this.db.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position;
        `, [tableName]);

        const countRes = await this.db.query(`SELECT COUNT(*) as cnt FROM "${tableName}";`);
        const rowCount = parseInt(countRes.rows?.[0]?.cnt || "0", 10);

        tables.push({
          tableName,
          rowCount,
          columns: (colRes.rows || []).map((c: any) => ({
            name: c.column_name,
            type: c.data_type,
            isNullable: c.is_nullable === "YES",
          })),
        });
      }

      return tables;
    } catch (err) {
      logger.error({ err }, "[Inspector] Failed to inspect schema");
      return [];
    }
  }
}

