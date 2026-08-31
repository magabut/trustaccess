'use client';
import { useEffect, useState } from 'react';

interface Cred { id: string; type: string; document_title?: string; valid_until: string; status: string }

export default function Holder() {
  const [creds, setCreds] = useState<Cred[]>([]);

  useEffect(() => {
    // demo: fetch from local storage or static
    setCreds([
      { id: 'cred_1', type: 'SafetyInduction', document_title: 'Safety Induction Certificate', valid_until: '2027-12-31', status: 'active' },
      { id: 'cred_2', type: 'LaboratoryAccess', document_title: 'Laboratory Access', valid_until: '2027-08-29', status: 'active' },
    ]);
  }, []);

  return (
    <div className="min-h-screen p-8 bg-zinc-950 text-white">
      <h1 className="text-3xl font-semibold mb-6">My Credentials</h1>
      <div className="grid gap-4">
        {creds.map((c) => (
          <div key={c.id} className="border border-white/10 p-6 rounded">
            <div className="font-medium">{c.document_title}</div>
            <div className="text-sm text-white/60">{c.type} · Valid until {c.valid_until}</div>
            <div className="mt-2 text-emerald-400 text-sm">✓ {c.status.toUpperCase()}</div>
          </div>
        ))}
      </div>
      <a href="/dashboard" className="block mt-8 text-sm text-white/60">← Back</a>
    </div>
  );
}
