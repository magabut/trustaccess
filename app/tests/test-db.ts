import { initDb, type DBSession } from '../src/lib/db';

export type TestDBSession = DBSession & {
  close(): Promise<void>;
};

function requireClosableDb(db: DBSession): TestDBSession {
  if (!('close' in db) || typeof db.close !== 'function') {
    throw new Error('PostgreSQL test adapter must provide DBSession.close()');
  }

  const close = db.close;
  return {
    ...db,
    close: async () => {
      await close();
    },
  };
}

export async function createTestDb(): Promise<TestDBSession | undefined> {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) return undefined;

  return requireClosableDb(await initDb(databaseUrl));
}

export async function closeTestDb(db: TestDBSession): Promise<void> {
  await db.close();
}
