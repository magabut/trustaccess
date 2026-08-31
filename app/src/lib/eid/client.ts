import type { EidClient, EidProfile, IssueInput, IssueOutput, VerificationResult } from '../types';

export class FakeEidClient implements EidClient {
  private issued = new Map<string, IssueOutput>();

  async exchangeCode(code: string): Promise<{ profile: EidProfile }> {
    return { profile: { id: `did:eid:${code}`, name: 'Demo User', email: `${code}@demo.id` } };
  }

  async issueCredential(input: IssueInput): Promise<IssueOutput> {
    const credentialId = `eid_${input.templateName}_${Date.now().toString(36)}`;
    const out: IssueOutput = { credentialId, qrPayload: JSON.stringify({ v: 1, credentialId, holder: input.holderEmail }) };
    this.issued.set(credentialId, out);
    return out;
  }

  async revokeCredential(credentialId: string): Promise<{ ok: boolean }> {
    this.issued.delete(credentialId);
    return { ok: true };
  }

  async verifyPresentation(payload: string): Promise<VerificationResult> {
    try {
      const p = JSON.parse(payload);
      if (p.credentialId && this.issued.has(p.credentialId)) {
        return { ok: true, credentials: [{ id: p.credentialId, type: 'AccessPass', holder: p.holder || 'demo', validFrom: new Date().toISOString(), validUntil: new Date(Date.now() + 86400000).toISOString(), claims: {}, revoked: false }] };
      }
    } catch {}
    return { ok: false, credentials: [] };
  }

  async startKyc(holderEmail: string): Promise<{ kycId: string }> {
    return { kycId: `kyc_${holderEmail.replace(/[^a-z0-9]/gi, '')}` };
  }
}

export function createClient(): EidClient {
  return new FakeEidClient();
}
