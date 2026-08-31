'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type LegacyResult = Record<string, unknown>;
type VerifierStartResponse = { ok: boolean; sessionId?: string; status?: string; expiresAt?: string; oauthUrl?: string; qrData?: { challenge: string; qr_token: string; schema_id?: string; event_type?: string } };

export default function Gate() {
  const [apId, setApId] = useState('2');
  const [payload, setPayload] = useState('{"type":"LaboratoryAccess","id":"cred_demo","validFrom":"2026-01-01","validUntil":"2027-12-31","areaScope":["Laboratorium"]}');
  const [result, setResult] = useState<LegacyResult | null>(null);
  const [vp, setVp] = useState<VerifierStartResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function renderQr() {
      const url = vp?.oauthUrl;
      if (!url) {
        setQrDataUrl(null);
        return;
      }
      try {
        const QRCode = await import('qrcode');
        const q = await QRCode.toDataURL(url, { width: 220, margin: 1 });
        if (active) setQrDataUrl(q);
      } catch {
        if (active) setQrDataUrl(null);
      }
    }
    renderQr();
    return () => {
      active = false;
    };
  }, [vp]);

  async function createVP() {
    const res = await fetch('/api/verifier/login/start', { method: 'POST' });
    const data = (await res.json()) as VerifierStartResponse;
    setVp(data);
  }

  async function checkResult() {
    const sessionId = vp?.sessionId;
    if (!sessionId) return;
    const res = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'result', sessionId }) });
    setResult((await res.json()) as LegacyResult);
  }

  async function verifyLegacy() {
    const res = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessPointId: Number(apId), presentation: payload }) });
    setResult((await res.json()) as LegacyResult);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#dbeafe_0%,#f8fafc_60%)] p-8 text-slate-900">
      <div className="app-shell">
        <div className="app-card mb-6 p-6">
          <h1 className="app-title text-3xl font-semibold">Gate Verifier</h1>
          <p className="app-muted mt-2">Verifier flow + fallback legacy simulation.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="app-card bg-slate-50 p-5">
            <div className="app-muted mb-3 text-sm">e.id Verifier Flow</div>
            <button onClick={createVP} className="rounded-lg bg-emerald-600 px-5 py-2 text-white font-medium hover:bg-emerald-700 transition shadow-sm">Create VP Request</button>
            {vp && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <div className="app-muted mb-2 break-all text-xs">session: {vp?.sessionId || '-'}</div>
                {qrDataUrl && (
                  <div className="mb-3 flex justify-center">
                    <Image src={qrDataUrl} alt="VP QR" width={224} height={224} className="h-56 w-56 rounded-lg bg-white p-2 border border-slate-200" unoptimized />
                  </div>
                )}
                <a href={vp?.oauthUrl} target="_blank" className="text-xs underline text-blue-600 hover:text-blue-700">Open wallet link</a>
                <button onClick={checkResult} className="mt-3 block rounded-lg bg-blue-600 px-3 py-1.5 text-white text-sm font-medium hover:bg-blue-700 transition">Check Result</button>
              </div>
            )}
          </div>

          <div className="app-card bg-slate-50 p-5">
            <div className="app-muted mb-3 text-sm">Legacy Demo (manual JSON)</div>
            <input className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400" value={apId} onChange={(e) => setApId(e.target.value)} placeholder="Access Point ID" />
            <textarea className="mb-3 h-40 w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 placeholder:text-slate-400" value={payload} onChange={(e) => setPayload(e.target.value)} />
            <button onClick={verifyLegacy} className="rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 transition shadow-sm">Verify (Legacy)</button>
          </div>
        </div>

        {result && (
          <pre className="mt-6 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{JSON.stringify(result, null, 2)}</pre>
        )}

        <a href="/dashboard" className="mt-8 inline-block text-sm text-slate-500 hover:text-slate-900 transition">← Back</a>
      </div>
    </div>
  );
}
