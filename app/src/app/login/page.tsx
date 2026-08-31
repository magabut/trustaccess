'use client';
import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function loginWithEid() {
    setLoading(true);
    const res = await fetch('/api/auth/eid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: email.split('@')[0] }) });
    const j = await res.json();
    if (j.ok) window.location.href = '/dashboard';
    else alert(j.error || 'login gagal');
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-sm p-8 border border-white/10 rounded-xl">
        <h1 className="text-2xl font-semibold mb-6">TrustAccess</h1>
        <input className="w-full bg-zinc-900 border border-white/20 px-3 py-2 rounded mb-3" placeholder="email@demo.id" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button onClick={loginWithEid} disabled={loading} className="w-full bg-white text-black py-2 rounded font-medium">Continue with e.id</button>
        <p className="text-xs text-white/50 mt-4">Demo mode — masukkan email apapun</p>
      </div>
    </div>
  );
}
