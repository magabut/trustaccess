import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createClient } from '@/lib/eid/client';

type RegisterableRow = { id: number; credential_template: string };

export async function POST(req: Request) {
  const { token, email } = await req.json();
  const db = getDb();
  const reg = await db.get<RegisterableRow>('SELECT id, credential_template FROM registerables WHERE reg_token = $1', [token]);
  if (!reg) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const client = createClient();
  const kyc = await client.startKyc(email);
  const issued = await client.issueCredential({
    templateName: reg.credential_template,
    holderEmail: email,
    claims: { fullName: email.split('@')[0] },
  });

  await db.run(
    `INSERT INTO registrations (registerable_id, holder_email, kyc_ref, credential_id, payment_status, status, created_at)
     VALUES ($1,$2,$3,$4, 'paid', 'confirmed', $5)`,
    [reg.id, email, kyc.kycId, issued.credentialId, new Date().toISOString()],
  );

  return NextResponse.json({ ok: true, credentialId: issued.credentialId });
}
