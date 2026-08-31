import { NextResponse } from 'next/server';
import { getDb, type DBSession } from '@/lib/db';

export async function checkHealth(db: Pick<DBSession, 'get'> = getDb()): Promise<boolean> {
  try {
    await db.get('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export function buildHealthResponse(ok: boolean): NextResponse {
  return NextResponse.json({ ok }, { status: ok ? 200 : 503 });
}

export async function GET() {
  return buildHealthResponse(await checkHealth());
}
