import { Pool } from 'pg';

export interface DBSession {
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<{ lastInsertRowid: number }>;
  close(): Promise<void>;
}

let cached: DBSession | null = null;
let cachedPool: Pool | null = null;

function buildSession(pool: Pool): DBSession {
  return {
    async all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
      const res = await pool.query(sql, (params ?? []) as any[]);
      return res.rows as T[];
    },
    async get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined> {
      const res = await pool.query(sql, (params ?? []) as any[]);
      return (res.rows[0] as T) ?? undefined;
    },
    async run(sql: string, params?: unknown[]): Promise<{ lastInsertRowid: number }> {
      const res = await pool.query(sql, (params ?? []) as any[]);
      return { lastInsertRowid: Number(res.rows[0]?.id ?? 0) };
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}

export function initDb(url: string): Promise<DBSession> {
  const pool = new Pool({ connectionString: url });
  return Promise.resolve(buildSession(pool));
}

export function getDb(): DBSession {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const pool = new Pool({ connectionString: url });
  cachedPool = pool;
  cached = buildSession(pool);
  return cached;
}

export async function closeDb(): Promise<void> {
  if (cachedPool) {
    await cachedPool.end();
    cachedPool = null;
    cached = null;
  }
}
