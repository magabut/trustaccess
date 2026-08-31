import { describe, expect, it } from 'vitest';
import { closeTestDb, createTestDb } from './test-db';

describe('PostgreSQL DBSession', () => {
  it.skipIf(!process.env.TEST_DATABASE_URL)('runs parameterized queries and returns inserted row ids', async () => {
    const db = await createTestDb();
    if (!db) return;

    try {
      await db.run('CREATE TEMP TABLE adapter_test (id BIGSERIAL PRIMARY KEY, value TEXT NOT NULL)');
      const result = await db.run('INSERT INTO adapter_test (value) VALUES ($1)', ['ok']);
      const row = await db.get<{ value: string }>('SELECT value FROM adapter_test WHERE id = $1', [result.lastInsertRowid]);
      expect(result.lastInsertRowid).toBeGreaterThan(0);
      expect(row?.value).toBe('ok');
    } finally {
      await closeTestDb(db);
    }
  });

  it.skipIf(!process.env.TEST_DATABASE_URL)('rejects on database errors instead of crashing', async () => {
    const db = await createTestDb();
    if (!db) return;

    try {
      await expect(db.run('SELECT * FROM missing_table_xyz')).rejects.toThrow();
    } finally {
      await closeTestDb(db);
    }
  });
});
