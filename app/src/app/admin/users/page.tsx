import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import UsersManager from './UsersManager';

export default async function AdminUsers() {
  const sess = await getSession();
  if (!sess || sess.role !== 'admin') redirect('/login');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1f2937_0%,#09090b_60%)] p-8 text-white">
      <div className="app-shell max-w-5xl">
        <div className="app-card mb-6 p-6">
          <h1 className="app-title text-3xl font-semibold">Manage Users</h1>
          <p className="app-muted mt-2">Admin only - list all users and assign personal to business/admin role.</p>
        </div>

        <UsersManager />

        <a href="/admin" className="mt-8 inline-block text-sm text-white/60 hover:text-white">← Back</a>
      </div>
    </div>
  );
}
