import { initDb } from '../src/lib/db';
import { seedDemo } from '../src/lib/db/seed';
import { createClient } from '../src/lib/eid/client';

const db = initDb();
const client = createClient();
const { orgId, counts } = seedDemo(db, client);
console.log({ orgId, counts });
