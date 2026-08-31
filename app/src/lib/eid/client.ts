import type { EidClient, EidProfile, IssueInput, IssueOutput, VerificationResult } from '../types';

const BASE = process.env.EID_BASE_URL || 'https://api.e.id';
const CLIENT_ID = process.env.EID_CLIENT_ID || '';
const CLIENT_SECRET = process.env.EID_CLIENT_SECRET || '';
const FAKE = process.env.EID_FAKE === '1' || !CLIENT_ID;

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

export class RealEidClient implements EidClient {
  private token: string | null = null;

  private async getToken(): Promise<string> {
    if (this.token) return this.token;
    const res = await fetch(`${BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'client_credentials' }),
    });
    const j = await res.json();
    this.token = j.access_token;
    return this.token!;
  }

  async exchangeCode(code: string): Promise<{ profile: EidProfile }> {
    const res = await fetch(`${BASE}/oauth/userinfo`, { headers: { Authorization: `Bearer ${code}` } });
    const p = await res.json();
    return { profile: { id: p.sub, name: p.name, email: p.email } };
  }

  async issueCredential(input: IssueInput): Promise<IssueOutput> {
    const tok = await this.getToken();
    const res = await fetch(`${BASE}/v1/credentials/issue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  }

  async revokeCredential(credentialId: string): Promise<{ ok: boolean }> {
    const tok = await this.getToken();
    const res = await fetch(`${BASE}/v1/credentials/${credentialId}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}` },
    });
    return res.json();
  }

  async verifyPresentation(payload: string): Promise<VerificationResult> {
    const tok = await this.getToken();
    const res = await fetch(`${BASE}/v1/verify/presentation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ presentation: payload }),
    });
    return res.json();
  }

  async startKyc(holderEmail: string): Promise<{ kycId: string }> {
    const tok = await this.getToken();
    const res = await fetch(`${BASE}/v1/kyc/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: holderEmail }),
    });
    return res.json();
  }
}

export function createClient(): EidClient {
  return FAKE ? new FakeEidClient() : new RealEidClient();
}
