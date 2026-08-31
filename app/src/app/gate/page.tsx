'use client';
import { useState } from 'react';

export default function Gate() {
  const [apId, setApId] = useState('2');
  const [payload, setPayload] = useState('{"type":"LaboratoryAccess","id":"cred_demo","validFrom":"2026-01-01","validUntil":"2027-12-31","areaScope":["Laboratorium"]}');
  const [result, setResult] = useState<any>(null);

  async function verify() {
    const res = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessPointId: Number(apId), presentation: payload }) });
    setResult(await res.json());
  }

  return (
    <div className="min-h-screen p-8 bg-zinc-950 text-white">
      <h1 className="text-3xl font-semibold mb-6">Gate Verifier</h1>
      <div className="max-w-xl space-y-4">
        <input className="w-full bg-zinc-900 border border-white/20 px-3 py-2 rounded" value={apId} onChange={(e) => setApId(e.target.value)} placeholder="Access Point ID" />
        <textarea className="w-full h-40 bg-zinc-900 border border-white/20 p-3 rounded font-mono text-sm" value={payload} onChange={(e) => setPayload(e.target.value)} />
        <button onClick={verify} className="bg-white text-black px-6 py-2 rounded">Verify</button>
        {result && (
          <pre className="mt-4 p-4 bg-black/60 rounded text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        )}
      </div>
      <a href="/dashboard" className="block mt-8 text-sm text-white/60">← Back</a>
    </div>
  );
}
