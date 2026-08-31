import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function Audit() {
  const sess = await getSession();
  if (!sess) redirect('/login');
  const db = getDb();
  const events = db.all<any>('SELECT * FROM access_events ORDER BY created_at DESC LIMIT 30');
  return (
    <div className="min-h-screen p-8 bg-zinc-950 text-white">
      <h1 className="text-3xl font-semibold mb-6">Audit Trail</h1>
      <table className="w-full text-sm border-collapse">
        <thead><tr className="text-left text-white/60"><th>Time</th><th>Verdict</th><th>Pass</th><th>Reasons</th></tr></thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i} className="border-t border-white/10">
              <td className="py-1 pr-4 text-white/60">{e.created_at}</td>
              <td className={e.verdict === 'GRANT' ? 'text-emerald-400' : 'text-red-400'}>{e.verdict}</td>
              <td>{e.pass_id}</td>
              <td className="text-white/70">{e.reasons}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <a href="/admin" className="block mt-8 text-sm text-white/60">← Back</a>
    </div>
  );
}
