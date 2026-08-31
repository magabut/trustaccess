import { initDb, type DBSession } from '../src/lib/db';

export type TestDBSession = DBSession & {
  close(): Promise<void>;
};

export async function createTestDb(): Promise<TestDBSession | undefined> {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) return undefined;

  return (await initDb(databaseUrl)) as unknown as TestDBSession;
}

export async function closeTestDb(db: TestDBSession | undefined): Promise<void> {
  if (db && typeof db.close === 'function') await db.close();
}
