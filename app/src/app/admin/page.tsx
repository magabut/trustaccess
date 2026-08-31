import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function Admin() {
  const sess = await getSession();
  if (!sess) redirect('/login');
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#111827_0%,#0a0a0a_55%)] p-8 text-white">
      <div className="app-shell max-w-4xl">
        <div className="app-card mb-6 p-6">
          <h1 className="app-title text-3xl font-semibold">Admin Center</h1>
          <p className="app-muted mt-2">Manage verifier operations, users, and logs.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <a href="/admin/users" className="rounded-xl border border-white/10 bg-black/20 p-5 transition hover:bg-white/10">
            <div className="text-lg font-medium">Manage Users</div>
            <p className="mt-2 text-sm text-white/60">Assign personal to business/admin.</p>
          </a>
          <a href="/admin/audit" className="rounded-xl border border-white/10 bg-black/20 p-5 transition hover:bg-white/10">
            <div className="text-lg font-medium">Audit Trail</div>
            <p className="mt-2 text-sm text-white/60">Review verification activity.</p>
          </a>
          <a href="/verify/document" className="rounded-xl border border-white/10 bg-black/20 p-5 transition hover:bg-white/10">
            <div className="text-lg font-medium">Verify Document</div>
            <p className="mt-2 text-sm text-white/60">Validate VC and signature traces.</p>
          </a>
        </div>

        <a href="/dashboard" className="mt-8 inline-block text-sm text-white/60 hover:text-white">← Back</a>
      </div>
    </div>
  );
}
