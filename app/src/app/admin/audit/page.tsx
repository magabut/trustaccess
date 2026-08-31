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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0e7ff_0%,#f8fafc_60%)] p-8 text-slate-900">
      <div className="app-shell">
        <div className="app-card mb-6 p-6">
          <h1 className="app-title text-3xl font-semibold">Audit Trail</h1>
          <p className="app-muted mt-2">Last 30 access verification events.</p>
        </div>

        <AuditAutoRefresh />

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Verdict</th>
                <th className="px-4 py-3 font-medium">Pass</th>
                <th className="px-4 py-3 font-medium">Reasons</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-500">{e.created_at}</td>
                  <td className={`px-4 py-3 font-medium ${e.verdict === 'GRANT' ? 'text-emerald-600' : 'text-red-600'}`}>{e.verdict}</td>
                  <td className="px-4 py-3">{e.pass_id || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{e.reasons}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <a href="/admin" className="mt-8 inline-block text-sm text-slate-500 hover:text-slate-900 transition">← Back</a>
      </div>
    </div>
  );
}
