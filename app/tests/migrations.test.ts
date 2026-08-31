import { describe, expect, it } from 'vitest';
import { runMigrations } from '../src/lib/db/migrate';
import { initDb } from '../src/lib/db';

const url = process.env.TEST_DATABASE_URL;

describe('postgres migrations', () => {
  it.skipIf(!url)('applies the initial schema idempotently', async () => {
    await runMigrations(url!);
    await runMigrations(url!);

    const db = await initDb(url!);
    try {
      const table = await db.get<{ exists: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') AS exists`,
      );
      const applied = await db.get<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM schema_migrations WHERE version = '001_initial'`,
      );
      expect(table?.exists).toBe(true);
      expect(applied?.count).toBe('1');
    } finally {
      await db.close();
    }
  });
});
