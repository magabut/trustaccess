'use client';
import { useState } from 'react';

export default function VerifyDocument() {
  const [payload, setPayload] = useState('{"signature":true,"issuer":"Example University","holder":"panji@kampus.demo","validUntil":"2027-12-31"}');
  const [trace, setTrace] = useState<any>(null);

  async function check() {
    const res = await fetch('/api/verify/document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presentation: payload }) });
    setTrace(await res.json());
  }

  return (
    <div className="min-h-screen p-8 bg-zinc-950 text-white">
      <h1 className="text-3xl font-semibold mb-6">Verify Document</h1>
      <div className="max-w-xl space-y-4">
        <textarea className="w-full h-40 bg-zinc-900 border border-white/20 p-3 rounded font-mono text-sm" value={payload} onChange={(e) => setPayload(e.target.value)} />
        <button onClick={check} className="bg-white text-black px-6 py-2 rounded">Verify</button>
        {trace && <pre className="mt-4 p-4 bg-black/60 rounded text-sm">{JSON.stringify(trace, null, 2)}</pre>}
      </div>
    </div>
  );
}
