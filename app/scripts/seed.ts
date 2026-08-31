import { initDb } from '../src/lib/db';
import { runMigrations } from '../src/lib/db/migrate';
import { seedDemo } from '../src/lib/db/seed';
import { createClient } from '../src/lib/eid/client';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  await runMigrations(url);
  const db = await initDb(url);
  try {
    const client = createClient();
    const { orgId, counts } = await seedDemo(db, client);
    console.log({ orgId, counts });
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
