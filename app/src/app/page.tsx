import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-semibold tracking-tight">TrustAccess</div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/login" className="hover:text-white/80">Login</Link>
            <Link href="/gate" className="hover:text-white/80">Demo Gate</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 pt-20 pb-24">
        <div className="max-w-2xl">
          <div className="inline-block px-3 py-1 rounded-full bg-white/5 text-xs tracking-[2px] mb-4">BY E.ID</div>
          <h1 className="text-6xl font-semibold tracking-tighter leading-none mb-6">
            Verify what people<br />are entitled to do.
          </h1>
          <p className="text-xl text-white/70 mb-10">
            Trusted credential & access infrastructure.<br />
            One engine. Many real-world permissions.
          </p>
          <div className="flex gap-4">
            <Link href="/login" className="px-8 py-3 bg-white text-black rounded font-medium">Login with e.id</Link>
            <Link href="/gate" className="px-8 py-3 border border-white/20 rounded hover:bg-white/5">Try Gate Verifier</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-16">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="text-white/60 mb-2">CORE STORY</div>
            <div>IDENTITY → CREDENTIAL → TRUST → POLICY → PERMISSION → ACTION</div>
          </div>
          <div>
            <div className="text-white/60 mb-2">ONE ENGINE</div>
            <div>Campus, Office, Event, Parking, Residence, Industrial — same policy engine.</div>
          </div>
          <div>
            <div className="text-white/60 mb-2">POWERED BY</div>
            <div>e.id — identity, KYC, verifiable credentials, issuer, verifier.</div>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 py-8 text-xs text-white/50">
        <div className="max-w-5xl mx-auto px-6">TrustAccess — Hackathon build</div>
      </footer>
    </div>
  );
}
