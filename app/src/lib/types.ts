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
}
