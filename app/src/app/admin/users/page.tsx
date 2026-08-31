import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import UsersManager from './UsersManager';

export default async function AdminUsers() {
  const sess = await getSession();
  if (!sess || sess.role !== 'admin') redirect('/login');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_60%)] p-8 text-slate-900">
      <div className="app-shell max-w-5xl">
        <div className="app-card mb-6 p-6">
          <h1 className="app-title text-3xl font-semibold">Manage Users</h1>
          <p className="app-muted mt-2">Admin only - list all users and assign personal to business/admin role.</p>
        </div>

        <UsersManager />

        <a href="/admin" className="mt-8 inline-block text-sm text-slate-500 hover:text-slate-900 transition">← Back</a>
      </div>
    </div>
  );
}
