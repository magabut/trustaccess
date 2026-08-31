import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function Admin() {
  const sess = await getSession();
  if (!sess) redirect('/login');
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#f8fafc_55%)] p-8 text-slate-900">
      <div className="app-shell max-w-4xl">
        <div className="app-card mb-6 p-6">
          <h1 className="app-title text-3xl font-semibold">Admin Center</h1>
          <p className="app-muted mt-2">Manage verifier operations, users, and logs.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <a href="/admin/users" className="app-card p-5 transition hover:shadow-md">
            <div className="text-lg font-medium text-slate-900">Manage Users</div>
            <p className="mt-2 text-sm text-slate-500">Assign personal to business/admin.</p>
          </a>
          <a href="/admin/audit" className="app-card p-5 transition hover:shadow-md">
            <div className="text-lg font-medium text-slate-900">Audit Trail</div>
            <p className="mt-2 text-sm text-slate-500">Review verification activity.</p>
          </a>
          <a href="/verify/document" className="app-card p-5 transition hover:shadow-md">
            <div className="text-lg font-medium text-slate-900">Verify Document</div>
            <p className="mt-2 text-sm text-slate-500">Validate VC and signature traces.</p>
          </a>
        </div>

        <a href="/dashboard" className="mt-8 inline-block text-sm text-slate-500 hover:text-slate-900 transition">← Back</a>
      </div>
    </div>
  );
}
