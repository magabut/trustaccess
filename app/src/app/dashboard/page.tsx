import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const sess = await getSession();
  if (!sess) redirect('/login');
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#082f49_0%,#0a0a0a_55%)] p-8 text-white">
      <div className="app-shell">
        <div className="app-card mb-8 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="app-title text-3xl font-semibold">Dashboard</h1>
              <p className="app-muted mt-2">Selamat datang, {sess.name}</p>
              <p className="mt-1 text-sm text-sky-300/80">Verifier-focused workspace untuk TrustAccess</p>
            </div>

            <form action="/api/logout" method="post">
              <button type="submit" className="rounded border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white">
                Logout
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <a href="/gate" className="group rounded-xl border border-white/10 bg-black/20 p-6 transition hover:-translate-y-0.5 hover:bg-white/10">
            <div className="mb-2 text-xs tracking-[0.18em] text-sky-200">PRIMARY</div>
            <div className="text-xl font-semibold">Gate Verifier</div>
            <p className="mt-2 text-sm text-white/60">Create VP request, scan QR, and evaluate access decision.</p>
          </a>

          <a href="/verify/document" className="group rounded-xl border border-white/10 bg-black/20 p-6 transition hover:-translate-y-0.5 hover:bg-white/10">
            <div className="mb-2 text-xs tracking-[0.18em] text-emerald-200">DOCUMENT</div>
            <div className="text-xl font-semibold">Verify Document</div>
            <p className="mt-2 text-sm text-white/60">Check signature, issuer, holder, and validity trace.</p>
          </a>

          <a href="/admin/users" className="group rounded-xl border border-white/10 bg-black/20 p-6 transition hover:-translate-y-0.5 hover:bg-white/10">
            <div className="mb-2 text-xs tracking-[0.18em] text-amber-200">ADMIN</div>
            <div className="text-xl font-semibold">Manage Users</div>
            <p className="mt-2 text-sm text-white/60">Lihat seluruh user dan assign personal menjadi business/admin.</p>
          </a>

          <a href="/holder" className="rounded-xl border border-white/10 bg-black/20 p-6 transition hover:bg-white/10">
            <div className="text-lg font-medium">My Credentials</div>
            <p className="mt-2 text-sm text-white/60">View credential portfolio and validity.</p>
          </a>

          <a href="/admin/audit" className="rounded-xl border border-white/10 bg-black/20 p-6 transition hover:bg-white/10">
            <div className="text-lg font-medium">Audit Trail</div>
            <p className="mt-2 text-sm text-white/60">Review verification and access event logs.</p>
          </a>

          <a href="/admin" className="rounded-xl border border-white/10 bg-black/20 p-6 transition hover:bg-white/10">
            <div className="text-lg font-medium">Admin Center</div>
            <p className="mt-2 text-sm text-white/60">Administrative actions and settings.</p>
          </a>
        </div>
      </div>
    </div>
  );
}
