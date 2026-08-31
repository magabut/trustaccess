import { NextResponse } from 'next/server';
import { createSession } from '@/lib/session';
import { createClient } from '@/lib/eid/client';

export async function POST(req: Request) {
  const { code } = await req.json().catch(() => ({}));
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });
  const client = createClient();
  const { profile } = await client.exchangeCode(code);
  await createSession(profile.email, profile.name);
  return NextResponse.json({ ok: true, user: profile });
}
