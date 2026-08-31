import type { DBSession } from '../db';
import type { IssueInput, IssueOutput } from '../types';
import { createClient } from '../eid/client';

export async function issueCredential(
  db: DBSession,
  orgId: number,
  input: IssueInput,
): Promise<IssueOutput> {
  const client = createClient();
  const out = await client.issueCredential(input);
  const now = new Date().toISOString();
  const validFrom = input.validFrom || now;
  const validUntil = input.validUntil || new Date(Date.now() + 365 * 86400000).toISOString();
  await db.run(
    `INSERT INTO issued_passes (org_id, credential_id, holder_email, template_name, document_title, issuer_label, description, category, status, source, valid_from, valid_until, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [orgId, out.credentialId, input.holderEmail, input.templateName, input.documentTitle || input.templateName, input.issuerLabel || 'TrustAccess', input.description || '', 'credential', 'active', 'admin', validFrom, validUntil, now],
  );
  return out;
}

export async function revokeCredential(db: DBSession, credentialId: string): Promise<{ ok: boolean }> {
  await db.run(`UPDATE issued_passes SET status = 'revoked' WHERE credential_id = $1`, [credentialId]);
  return { ok: true };
}
