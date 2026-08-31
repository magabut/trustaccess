import type {
  DocumentSchemaItem,
  EidClient,
  EidProfile,
  IssueInput,
  IssueOutput,
  VerificationResult,
  VerificationSchemaInput,
  VerificationSchemaItem,
  VerifierApiResponse,
  VerifierSessionData,
  VPResultData,
  VPSessionSimpleData,
} from '../types';

const BASE = process.env.EID_VERIFIER_BASE_URL || process.env.EID_BASE_URL || 'https://gateway-sandbox.e.id';
const CLIENT_ID = process.env.EID_CLIENT_ID || '';
const CLIENT_SECRET = process.env.EID_CLIENT_SECRET || '';
const FAKE = process.env.EID_FAKE === '1' || !CLIENT_ID;

export const EID_REQUEST_TIMEOUT_MS = 10_000;

/** Safe, serializable error for e.id verifier failures. Never embeds tokens or secrets. */
export class VerifierApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerifierApiError';
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = EID_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    if (controller.signal.aborted) throw new VerifierApiError('eid_request_timeout');
    throw new VerifierApiError('eid_network_error');
  } finally {
    clearTimeout(timer);
  }
}

/** Parse a JSON body without leaking raw response content into error messages. */
export async function parseJsonSafe<T>(res: Response): Promise<T> {
  const raw = await res.text().catch(() => '');
  let body: unknown = {};
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      throw new VerifierApiError(`eid_invalid_json status=${res.status}`);
    }
  }
  if (!res.ok) {
    throw new VerifierApiError(`eid_request_failed status=${res.status}`);
  }
  return body as T;
}

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

  async getVerifierToken(): Promise<string> { return 'fake-token'; }
  async createVerificationSchema(_schema: VerificationSchemaInput): Promise<{ verification_id: string }> { return { verification_id: 'vs_fake' }; }
  async createVPRequest(_verifierDocSchemaId: string, _expiresIn = 15): Promise<VerifierApiResponse<VerifierSessionData>> {
    return {
      status: true,
      data: {
        session_id: 'sess_fake',
        eid_oauth_url: 'https://wallet-sandbox.e.id/oauth/credential?c=ch_fake&q=qr_fake',
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
        status: 'PENDING',
        qr_data: { challenge: 'ch_fake', qr_token: 'qr_fake', event_type: 'VERIFICATION' },
      },
    };
  }
  async loginVcStatic(): Promise<VerifierApiResponse<VerifierSessionData>> {
    return {
      status: true,
      data: {
        session_id: 'sess_login_fake',
        eid_oauth_url: 'https://wallet-sandbox.e.id/oauth/credential?c=ch_login&q=qr_login',
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
        status: 'PENDING',
        qr_data: { challenge: 'ch_login', qr_token: 'qr_login', event_type: 'LOGIN_VC' },
      },
    };
  }

  async loginVcWithSchema(_verificationId: string): Promise<VerifierApiResponse<VerifierSessionData>> {
    return {
      status: true,
      data: {
        session_id: 'sess_login_schema_fake',
        eid_oauth_url: 'https://wallet-sandbox.e.id/oauth/credential?c=ch_schema&q=qr_schema',
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
        status: 'PENDING',
        qr_data: { challenge: 'ch_schema', qr_token: 'qr_schema', event_type: 'LOGIN_VC' },
      },
    };
  }

  async listDocumentSchemas(): Promise<VerifierApiResponse<{ items: DocumentSchemaItem[] }>> {
    return {
      status: true,
      data: {
        items: [{ id: 'doc_fake', required_fields: ['email', 'subject_id'] }],
      },
    };
  }

  async listVerificationSchemas(): Promise<VerifierApiResponse<{ current_page: number; items: VerificationSchemaItem[] }>> {
    return {
      status: true,
      data: {
        current_page: 1,
        items: [{ id: 'vs_fake', event_type: 'LOGIN_VC', name: 'Demo Login VC' }],
      },
    };
  }

  async getVPSessionSimple(_sessionId: string): Promise<VerifierApiResponse<VPSessionSimpleData>> {
    return { status: true, data: { status: 'APPROVED', holder_account: { id: 'holder_fake', username: 'demo-user' } } };
  }
  async getVPResultBySession(_sessionId: string): Promise<VerifierApiResponse<VPResultData>> {
    return {
      status: true,
      data: {
        holder_did: 'did:eid:demo-holder',
        presentation: { credentialSubject: { email: 'demo@eid.id', subject_id: 'sub_demo' } },
        status: 'APPROVED',
      },
    };
  }
}

export class RealEidClient implements EidClient {
  private token: string | null = null;

  private async parseJson<T>(res: Response): Promise<T> {
    return parseJsonSafe<T>(res);
  }

  private async getToken(): Promise<string> {
    if (this.token) return this.token;
    const res = await fetchWithTimeout(`${BASE}/api/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
    });
    const j = await this.parseJson<{ data?: { token?: string }; message?: string }>(res);
    this.token = j?.data?.token ?? null;
    if (!this.token) throw new VerifierApiError(`verifier_token_failed status=${res.status}`);
    return this.token!;
  }

  async exchangeCode(code: string): Promise<{ profile: EidProfile }> {
    const res = await fetchWithTimeout(`${BASE}/api/v1.1/oauth/get-profile?scope=email:profile`, { headers: { Authorization: `Bearer ${code}` } });
    const p = await this.parseJson<{ data?: { id?: string; sub?: string; name?: string; email?: string } }>(res);
    const d = p?.data ?? {};
    return { profile: { id: d.id || d.sub || '', name: d.name || 'User', email: d.email || '' } };
  }

  async issueCredential(input: IssueInput): Promise<IssueOutput> {
    const tok = await this.getToken();
    const res = await fetchWithTimeout(`${BASE}/api/v1/issuer/verifiable-credential/issue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return this.parseJson<IssueOutput>(res);
  }

  async revokeCredential(credentialId: string): Promise<{ ok: boolean }> {
    const tok = await this.getToken();
    const res = await fetchWithTimeout(`${BASE}/api/v1/issuer/verifiable-credential/revoke/${credentialId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}` },
    });
    return (await this.parseJson<{ ok?: boolean }>(res)) as { ok: boolean };
  }

  async verifyPresentation(payload: string): Promise<VerificationResult> {
    const tok = await this.getToken();
    const res = await fetchWithTimeout(`${BASE}/api/v1/verifier/presentation/scan`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_data: payload }),
    });
    const j = await this.parseJson<{
      status?: boolean;
      data?: {
        presentation?: {
          id?: string;
          type?: string | string[];
          credentialSubject?: Record<string, string | undefined>;
          issuanceDate?: string;
          expirationDate?: string;
        };
      };
    }>(res);
    const cred = j?.data?.presentation;
    if (!j?.status || !cred) return { ok: false, credentials: [] };
    return {
      ok: true,
      credentials: [{
        id: cred.id || `cred_${Date.now()}`,
        type: (Array.isArray(cred.type) ? cred.type[0] : cred.type) || 'VerifiableCredential',
        holder: cred?.credentialSubject?.email || cred?.credentialSubject?.subject_id || 'holder',
        validFrom: cred.issuanceDate || new Date().toISOString(),
        validUntil: cred.expirationDate || new Date(Date.now() + 86400000).toISOString(),
        claims: cred?.credentialSubject || {},
        revoked: false,
      }],
    };
  }

  async startKyc(holderEmail: string): Promise<{ kycId: string }> {
    const tok = await this.getToken();
    const res = await fetchWithTimeout(`${BASE}/v1/kyc/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: holderEmail }),
    });
    return (await this.parseJson<{ kycId?: string }>(res)) as { kycId: string };
  }

  // === Verifier API real ===
  async getVerifierToken(): Promise<string> {
    const res = await fetchWithTimeout(`${BASE}/api/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
    });
    const j = await this.parseJson<{ data?: { token?: string } }>(res);
    return j?.data?.token ?? '';
  }

  async createVerificationSchema(schema: VerificationSchemaInput): Promise<{ verification_id: string }> {
    const tok = await this.getVerifierToken();
    const res = await fetchWithTimeout(`${BASE}/api/v1/verifier/verification-schema`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(schema),
    });
    const j = await this.parseJson<VerifierApiResponse<{ id?: string; verification_id?: string }>>(res);
    return { verification_id: j?.data?.id || j?.data?.verification_id || '' };
  }

  async createVPRequest(verifierDocSchemaId: string, expiresIn = 15): Promise<VerifierApiResponse<VerifierSessionData>> {
    const tok = await this.getVerifierToken();
    const res = await fetchWithTimeout(`${BASE}/api/v1/verifier/presentation/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ verifier_doc_schema_id: verifierDocSchemaId, expires_in: expiresIn }),
    });
    return this.parseJson<VerifierApiResponse<VerifierSessionData>>(res);
  }

  async loginVcStatic(): Promise<VerifierApiResponse<VerifierSessionData>> {
    const tok = await this.getVerifierToken();
    const res = await fetchWithTimeout(`${BASE}/api/v1/auth/did/login`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}` },
    });
    return this.parseJson<VerifierApiResponse<VerifierSessionData>>(res);
  }

  async loginVcWithSchema(verificationId: string): Promise<VerifierApiResponse<VerifierSessionData>> {
    const tok = await this.getVerifierToken();
    const res = await fetchWithTimeout(`${BASE}/api/v1/auth/vc-login`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_id: verificationId }),
    });
    return this.parseJson<VerifierApiResponse<VerifierSessionData>>(res);
  }

  async listVerificationSchemas(): Promise<VerifierApiResponse<{ current_page: number; items: VerificationSchemaItem[] }>> {
    const tok = await this.getVerifierToken();
    const res = await fetchWithTimeout(`${BASE}/api/v1/verifier/verification-schema?page=1&per_page=20&sort_order=desc`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    return this.parseJson<VerifierApiResponse<{ current_page: number; items: VerificationSchemaItem[] }>>(res);
  }

  async listDocumentSchemas(): Promise<VerifierApiResponse<{ items: DocumentSchemaItem[] }>> {
    const tok = await this.getVerifierToken();
    const res = await fetchWithTimeout(`${BASE}/api/v1/verifier/document-schema?page=1&per_page=20`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    return this.parseJson<VerifierApiResponse<{ items: DocumentSchemaItem[] }>>(res);
  }

  async getVPSessionSimple(sessionId: string): Promise<VerifierApiResponse<VPSessionSimpleData>> {
    const tok = await this.getVerifierToken();
    const res = await fetchWithTimeout(`${BASE}/api/v1/verifier/presentation/simple/${sessionId}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    return this.parseJson<VerifierApiResponse<VPSessionSimpleData>>(res);
  }

  async getVPResultBySession(sessionId: string): Promise<VerifierApiResponse<VPResultData>> {
    const tok = await this.getVerifierToken();
    const res = await fetchWithTimeout(`${BASE}/api/v1/verifier/presentation/result/${sessionId}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    return this.parseJson<VerifierApiResponse<VPResultData>>(res);
  }
}

export function createClient(): EidClient {
  return FAKE ? new FakeEidClient() : new RealEidClient();
}
