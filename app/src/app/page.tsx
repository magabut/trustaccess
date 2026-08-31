import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-semibold tracking-tight text-slate-900">TrustAccess</div>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <Link href="/login" className="hover:text-slate-900 transition">Login</Link>
            <Link href="/gate" className="hover:text-slate-900 transition">Demo Gate</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 pt-20 pb-24">
        <div className="max-w-2xl">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs tracking-[2px] mb-4 border border-blue-100">BY E.ID</div>
          <h1 className="text-6xl font-semibold tracking-tighter leading-none mb-6 text-slate-900">
            Verify what people<br />are entitled to do.
          </h1>
          <p className="text-xl text-slate-500 mb-10">
            Trusted credential & access infrastructure.<br />
            One engine. Many real-world permissions.
          </p>
          <div className="flex gap-4">
            <Link href="/login" className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">Login with e.id</Link>
            <Link href="/gate" className="px-8 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition">Try Gate Verifier</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white py-16">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="text-blue-600 font-medium mb-2">CORE STORY</div>
            <div className="text-slate-600">IDENTITY → CREDENTIAL → TRUST → POLICY → PERMISSION → ACTION</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium mb-2">ONE ENGINE</div>
            <div className="text-slate-600">Campus, Office, Event, Parking, Residence, Industrial — same policy engine.</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium mb-2">POWERED BY</div>
            <div className="text-slate-600">e.id — identity, KYC, verifiable credentials, issuer, verifier.</div>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-400">
        <div className="max-w-5xl mx-auto px-6">TrustAccess — Hackathon build</div>
      </footer>
    </div>
  );
}
