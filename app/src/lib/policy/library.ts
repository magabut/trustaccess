import type { Policy, DomainId } from '../types';

export const DEMO_POLICIES: Policy[] = [
  { id: 1, domain: 'campus', name: 'Pintu Utama Access', area: 'Ruang Umum', credential: 'AccessPass', prerequisites: [], openMinute: 420, closeMinute: 1260, description: 'GRANT ACCESS — campus main gate' },
  { id: 2, domain: 'campus', name: 'Laboratory Access', area: 'Laboratorium', credential: 'LaboratoryAccess', prerequisites: ['StudentCredential', 'SafetyInduction'], openMinute: 420, closeMinute: 1080, description: 'GRANT ACCESS — require student + safety induction' },
];
