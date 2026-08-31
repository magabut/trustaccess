import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createClient } from '@/lib/eid/client';

export async function POST(req: Request) {
  const { token, email } = await req.json();
  const db = getDb();
  const reg = db.get<any>('SELECT * FROM registerables WHERE reg_token = ?', [token]);
  if (!reg) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const client = createClient();
  const kyc = await client.startKyc(email);
  const issued = await client.issueCredential({
    templateName: reg.credential_template,
    holderEmail: email,
    claims: { fullName: email.split('@')[0] },
  });

  db.run(
    `INSERT INTO registrations (registerable_id, holder_email, kyc_ref, credential_id, payment_status, status, created_at)
     VALUES (?,?,?,?, 'paid', 'confirmed', datetime('now'))`,
    [reg.id, email, kyc.kycId, issued.credentialId],
  );

  return NextResponse.json({ ok: true, credentialId: issued.credentialId });
}
