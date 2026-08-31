import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import AuditAutoRefresh from './AuditAutoRefresh';

type AuditEvent = {
  created_at: string;
  verdict: 'GRANT' | 'DENY' | string;
  pass_id: string | null;
  reasons: string;
};

export default async function Audit() {
  const sess = await getSession();
  if (!sess) redirect('/login');
  const db = getDb();
  const events = await db.all<AuditEvent>('SELECT created_at, verdict, pass_id, reasons FROM access_events ORDER BY created_at DESC LIMIT 30');
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#09090b_60%)] p-8 text-white">
      <div className="app-shell">
        <div className="app-card mb-6 p-6">
          <h1 className="app-title text-3xl font-semibold">Audit Trail</h1>
          <p className="app-muted mt-2">Last 30 access verification events.</p>
        </div>

        <AuditAutoRefresh />

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-white/60">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Verdict</th>
                <th className="px-4 py-3">Pass</th>
                <th className="px-4 py-3">Reasons</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-t border-white/10">
                  <td className="px-4 py-3 text-white/60">{e.created_at}</td>
                  <td className={`px-4 py-3 font-medium ${e.verdict === 'GRANT' ? 'text-emerald-300' : 'text-red-300'}`}>{e.verdict}</td>
                  <td className="px-4 py-3">{e.pass_id || '-'}</td>
                  <td className="px-4 py-3 text-white/70">{e.reasons}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <a href="/admin" className="mt-8 inline-block text-sm text-white/60 hover:text-white">← Back</a>
      </div>
    </div>
  );
}
