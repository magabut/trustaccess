import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

export async function runMigrations(poolOrUrl: string | Pool): Promise<void> {
  const pool =
    typeof poolOrUrl === 'string' ? new Pool({ connectionString: poolOrUrl }) : poolOrUrl;
  const ownsPool = typeof poolOrUrl === 'string';

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const appliedRes = await pool.query('SELECT version FROM schema_migrations');
    const applied = new Set(appliedRes.rows.map((r) => r.version as string));

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      if (applied.has(version)) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  } finally {
    if (ownsPool) await pool.end();
  }
}
