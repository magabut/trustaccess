'use client';
import { useState } from 'react';

type VerificationTrace = {
  valid: boolean;
  reasons: string[];
  items?: Array<{ label: string; ok: boolean; detail?: string }>;
};

export default function VerifyDocument() {
  const [payload, setPayload] = useState('{"signature":true,"issuer":"Example University","holder":"panji@kampus.demo","validUntil":"2027-12-31"}');
  const [trace, setTrace] = useState<VerificationTrace | null>(null);

  async function check() {
    const res = await fetch('/api/verify/document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presentation: payload }) });
    const data = (await res.json()) as VerificationTrace;
    setTrace(data);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0b1022_0%,#09090b_55%)] p-8 text-white">
      <div className="app-shell max-w-5xl">
        <div className="app-card mb-6 p-6">
          <h1 className="app-title text-3xl font-semibold">Verify Document</h1>
          <p className="app-muted mt-2">Validate signature, issuer, holder, and expiration trace.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="app-card bg-black/20 p-5">
            <div className="app-muted mb-3 text-sm">Presentation Payload</div>
            <textarea className="h-64 w-full rounded border border-white/20 bg-zinc-900 p-3 font-mono text-sm" value={payload} onChange={(e) => setPayload(e.target.value)} />
            <button onClick={check} className="mt-3 rounded bg-white px-6 py-2 text-black">Verify</button>
          </div>

          <div className="app-card bg-black/20 p-5">
            <div className="app-muted mb-3 text-sm">Verification Trace</div>
            {trace ? (
              <pre className="max-h-72 overflow-auto rounded bg-black/60 p-3 text-sm">{JSON.stringify(trace, null, 2)}</pre>
            ) : (
              <div className="rounded border border-dashed border-white/20 p-6 text-center text-sm text-white/50">Belum ada hasil verifikasi</div>
            )}
          </div>
        </div>

        <a href="/dashboard" className="mt-8 inline-block text-sm text-white/60 hover:text-white">← Back</a>
      </div>
    </div>
  );
}
