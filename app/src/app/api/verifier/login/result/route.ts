import { NextResponse } from 'next/server';
import { createClient } from '@/lib/eid/client';
import { createSession } from '@/lib/session';
import { getDb } from '@/lib/db';

const client = createClient();

type UserRow = { id: number; name: string; email: string; role: string; eid_subject: string | null };

export async function POST(req: Request) {
  let sessionId: string | undefined;
  try {
    const body = await req.json();
    sessionId = typeof body?.sessionId === 'string' ? body.sessionId : undefined;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json_body' }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'sessionId required' }, { status: 400 });
  }

  try {
    const simple = await client.getVPSessionSimple(sessionId);
    const simpleStatus = String(simple?.data?.status || '').toUpperCase();

    let result: Awaited<ReturnType<typeof client.getVPResultBySession>> | null = null;
    try {
      result = await client.getVPResultBySession(sessionId);
    } catch {
      result = null;
    }

    const resultStatus = String(result?.data?.status || '').toUpperCase();
    const approved = simpleStatus === 'APPROVED' || resultStatus === 'APPROVED';

    if (!approved) {
      const status = simpleStatus || resultStatus || 'PENDING';
      return NextResponse.json({ ok: true, approved: false, status });
    }

    const data = result?.data;
    const subject = (data?.presentation?.credentialSubject || {}) as Record<string, unknown>;
    const holderHint = String(simple?.data?.holder_account?.username || data?.holder_did || 'holder');
    const email = String(subject.email || (holderHint.includes('@') ? holderHint : `${holderHint}@eid.local`));
    const name = String(subject.name || subject.full_name || email.split('@')[0]);
    const eidSubject = data?.holder_did || null;

    const db = getDb();
    const existing = await db.get<UserRow>('SELECT id, name, email, role, eid_subject FROM users WHERE email = $1', [email]);
    if (!existing) {
      await db.run(
        'INSERT INTO users (org_id, eid_subject, name, email, role, password_hash) VALUES ($1, $2, $3, $4, $5, NULL)',
        [1, eidSubject, name, email, 'host'],
      );
    } else {
      await db.run('UPDATE users SET name = $1, eid_subject = COALESCE($2, eid_subject) WHERE email = $3', [name, eidSubject, email]);
    }

    const resolved = await db.get<UserRow>('SELECT id, name, email, role, eid_subject FROM users WHERE email = $1', [email]);
    const role = resolved?.role || 'host';

    await createSession(email, name, role);
    return NextResponse.json({ ok: true, approved: true, status: 'APPROVED', user: { email, name, role } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'login_vc_result_exception';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
