import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function Revenue() {
  const sess = await getSession();
  if (!sess) redirect('/login');
  const db = getDb();
  const paid = (await db.get<any>("SELECT SUM(amount_cents)::int s FROM payments WHERE status='paid'"))?.s || 0;
  return (
    <div className="min-h-screen p-8 bg-zinc-950 text-white">
      <h1 className="text-3xl font-semibold mb-6">Revenue (Demo)</h1>
      <div className="text-4xl font-mono">Rp {(paid / 100).toLocaleString('id-ID')}</div>
      <p className="text-white/60 mt-2">Data demo — label jelas</p>
      <a href="/admin" className="block mt-8 text-sm text-white/60">← Back</a>
    </div>
  );
}
