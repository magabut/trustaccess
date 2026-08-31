'use client';
import Image from 'next/image';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#172554_0%,#09090b_45%,#020617_100%)] text-white" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [vcSessionId, setVcSessionId] = useState<string | null>(null);
  const [vcUrl, setVcUrl] = useState<string | null>(null);
  const [vcStatus, setVcStatus] = useState<string | null>(null);
  const [vcQrDataUrl, setVcQrDataUrl] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const checkingRef = useRef(false);

  const statusTone =
    vcStatus === 'APPROVED'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
      : vcStatus === 'REJECTED' || vcStatus === 'EXPIRED'
        ? 'border-red-500/40 bg-red-500/10 text-red-200'
        : 'border-amber-500/40 bg-amber-500/10 text-amber-200';

  useEffect(() => {
    let active = true;
    async function buildQr() {
      if (!vcUrl) {
        setVcQrDataUrl(null);
        return;
      }
      try {
        const QRCode = await import('qrcode');
        const dataUrl = await QRCode.toDataURL(vcUrl, { width: 220, margin: 1 });
        if (active) setVcQrDataUrl(dataUrl);
      } catch {
        if (active) setVcQrDataUrl(null);
      }
    }
    buildQr();
    return () => {
      active = false;
    };
  }, [vcUrl]);

  async function doLogin() {
    setLoading(true);
    const res = await fetch('/api/verifier/login/start', { method: 'POST' });
    const j = await res.json();
    if (!j.ok) {
      alert(j.error || 'gagal mulai Login VC');
      setLoading(false);
      return;
    }
    setVcSessionId(j.sessionId);
    setVcUrl(j.oauthUrl);
    setVcStatus(j.status || 'PENDING');
    setLoading(false);
  }

  const checkVcResult = useCallback(async () => {
    if (!vcSessionId) return;
    if (checkingRef.current) return;
    checkingRef.current = true;
    setIsChecking(true);
    try {
      const res = await fetch('/api/verifier/login/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: vcSessionId }),
      });
      const j = await res.json();
      setVcStatus(j.status || (j.approved ? 'APPROVED' : 'PENDING'));
      if (j.approved) {
        router.replace('/dashboard');
        return;
      }
    } catch {
      setVcStatus('PENDING');
    } finally {
      checkingRef.current = false;
      setIsChecking(false);
    }
  }, [router, vcSessionId]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#172554_0%,#09090b_45%,#020617_100%)] text-white">
      <div className="app-shell grid min-h-screen grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-2 lg:items-center">
        <section className="app-card p-8 backdrop-blur">
          <div className="mb-3 inline-flex rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-xs tracking-[0.2em] text-sky-200">VERIFIER FLOW</div>
          <h1 className="app-title text-4xl font-semibold">Sign in with trusted credential</h1>
          <p className="app-muted mt-4">TrustAccess memakai e.id Verifier API untuk login via QR + wallet approval, tanpa password.</p>
          <div className="app-muted mt-8 space-y-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">1. Start session</div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">2. Scan QR di aplikasi e.id</div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">3. Approve credential</div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">4. Session aktif otomatis</div>
          </div>
        </section>

        <section className="app-card w-full bg-zinc-950/70 p-8 shadow-2xl shadow-black/40">
          <h2 className="text-2xl font-semibold">TrustAccess Login</h2>

        {searchParams.get('error') && (
          <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-200">
            Login e.id gagal. Silakan ulangi scan QR.
          </div>
        )}

          <button onClick={doLogin} disabled={loading} className="mt-4 w-full rounded bg-white py-2 font-medium text-black disabled:opacity-60">
            {loading ? 'Processing...' : 'Start QR Login'}
          </button>

          {vcUrl && (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/80">
              <div className="mb-2 font-medium">Verifier Session</div>
              <div className="mb-3 break-all text-white/50">{vcSessionId}</div>
              {vcQrDataUrl && (
                <div className="mb-3 flex justify-center">
                  <Image src={vcQrDataUrl} alt="QR Login e.id" width={224} height={224} className="h-56 w-56 rounded-lg bg-white p-2" unoptimized />
                </div>
              )}
              <div className="mb-3 text-center text-white/60">Scan QR ini dari aplikasi e.id di HP</div>
              <div className={`mb-3 rounded border px-3 py-2 text-center ${statusTone}`}>Status: {vcStatus || 'PENDING'}</div>
              <div className="flex gap-2">
                <a href={vcUrl} target="_blank" className="flex-1 rounded border border-white/20 px-3 py-2 text-center hover:bg-white/10">Open Wallet Link</a>
                <button onClick={checkVcResult} className="flex-1 rounded bg-white px-3 py-2 text-black" disabled={isChecking}>{isChecking ? 'Checking...' : 'Check now'}</button>
              </div>
              <div className="mt-2 text-center text-[11px] text-white/50">Auto-check dimatikan. Klik Check now setelah approve di wallet.</div>
            </div>
          )}
          <p className="mt-4 text-xs text-white/50">Gunakan aplikasi e.id di HP untuk scan QR. Hanya wallet dengan credential valid yang bisa login.</p>
        </section>
      </div>
    </div>
  );
}
