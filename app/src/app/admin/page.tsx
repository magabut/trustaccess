import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function Admin() {
  const sess = await getSession();
  if (!sess) redirect('/login');
  return (
    <div className="min-h-screen p-8 bg-zinc-950 text-white">
      <h1 className="text-3xl font-semibold mb-6">Admin</h1>
      <div className="grid gap-4 max-w-md">
        <a href="/admin/audit" className="border border-white/10 p-4 rounded">Audit Trail</a>
        <a href="/verify/document" className="border border-white/10 p-4 rounded">Verify Document</a>
      </div>
      <a href="/dashboard" className="block mt-8 text-sm text-white/60">← Back</a>
    </div>
  );
}
