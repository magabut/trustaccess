export type Verdict = 'GRANT' | 'DENY';
export type PassStatus = 'active' | 'revoked' | 'expired';
export type AccessSource = 'admin' | 'self' | 'delegated';
export type ActuatorKind = 'open_gate' | 'open_locker';

export interface CredentialData {
  id: string;
  type: string;
  holder: string;
  validFrom: string;
  validUntil: string;
  claims: Record<string, unknown>;
  revoked: boolean;
  areaScope?: string[];
}

export interface VerificationResult {
  ok: boolean;
  credentials: CredentialData[];
}

export interface GateRule {
  id: number;
  accessPointId: number;
  requiredType: string;
  prerequisites: string[];
  openMinute: number;
  closeMinute: number;
  areaScope: string[];
}

export interface GateDecision {
  verdict: Verdict;
  score: number;
  reasons: string[];
  usedPassId?: string;
  passChecks?: { passId: string; matched: boolean; note: string }[];
}

export interface AccessLogItem {
  passId: string;
  accessPointId: number;
  hour: number;
  verdict: string;
  tsMs: number;
}

export interface AnomalyReport {
  passId: string;
  severity: 'medium' | 'high';
  reasons: string[];
}

export interface ActuatorResult {
  ok: boolean;
  detail: string;
}

export interface EidProfile {
  id: string;
  name: string;
  email: string;
}

export interface IssueInput {
  templateName: string;
  holderEmail: string;
  claims: Record<string, unknown>;
  validFrom?: string;
  validUntil?: string;
  documentTitle?: string;
  issuerLabel?: string;
  description?: string;
}

export interface IssueOutput {
  credentialId: string;
  qrPayload: string;
}

export interface EidClient {
  exchangeCode(code: string): Promise<{ profile: EidProfile }>;
  issueCredential(input: IssueInput): Promise<IssueOutput>;
  revokeCredential(credentialId: string): Promise<{ ok: boolean }>;
  verifyPresentation(payload: string): Promise<VerificationResult>;
  startKyc(holderEmail: string): Promise<{ kycId: string }>;

  // Verifier API (real e.id)
  getVerifierToken(): Promise<string>;
  createVerificationSchema(schema: VerificationSchemaInput): Promise<{ verification_id: string }>;
  createVPRequest(verifierDocSchemaId: string, expiresIn?: number): Promise<VerifierApiResponse<VerifierSessionData>>;
  loginVcStatic(): Promise<VerifierApiResponse<VerifierSessionData>>;
  loginVcWithSchema(verificationId: string): Promise<VerifierApiResponse<VerifierSessionData>>;
  listDocumentSchemas(): Promise<VerifierApiResponse<{ items: DocumentSchemaItem[] }>>;
  listVerificationSchemas(): Promise<VerifierApiResponse<{ current_page: number; items: VerificationSchemaItem[] }>>;
  getVPSessionSimple(sessionId: string): Promise<VerifierApiResponse<VPSessionSimpleData>>;
  getVPResultBySession(sessionId: string): Promise<VerifierApiResponse<VPResultData>>;
}

export interface VerificationSchemaInput {
  name: string;
  description?: string;
  ttl?: number;
  presentation_limit?: number;
  expected_schemas: Array<{
    schema_id: string;
    mandatory: boolean;
    required_fields: string[];
  }>;
  custom_webhook_url?: string;
  event_type?: 'VERIFICATION' | 'LOGIN_VC';
}

export interface VerifierSessionData {
  session_id: string;
  eid_oauth_url: string;
  expires_at: string;
  status: string;
  qr_data?: { challenge: string; qr_token: string; schema_id?: string; event_type?: string };
}

export interface DocumentSchemaItem {
  id: string;
  required_fields?: string[];
}

export interface VerificationSchemaItem {
  id: string;
  event_type?: string;
  name?: string;
}

export interface VPSessionSimpleData {
  status: string;
  holder_account?: { id?: string; username?: string };
}

export interface VPResultData {
  holder_did?: string;
  presentation?: { credentialSubject?: Record<string, unknown> };
  status?: string;
}

export interface VerifierApiResponse<T> {
  status: boolean;
  message?: string;
  data: T;
}

export interface TraceItem {
  label: string;
  ok: boolean;
  detail?: string;
}

export interface DocumentVerificationTrace {
  valid: boolean;
  items: TraceItem[];
  reasons: string[];
}

export type DomainId = string;

export interface Policy {
  id: number;
  domain: DomainId;
  name: string;
  area: string;
  credential: string;
  prerequisites: string[];
  openMinute: number;
  closeMinute: number;
  description: string;
}
