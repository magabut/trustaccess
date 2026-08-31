import { initDb } from '../src/lib/db';
import { seedDemo } from '../src/lib/db/seed';

const db = initDb();
const { orgId, counts } = seedDemo(db);
console.log({ orgId, counts });
