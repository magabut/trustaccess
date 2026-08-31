import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import { currentSlugs, hasMainChoice, loadEventCounts } from '@/lib/events-service';
import { EVENTS } from '@/lib/events';

type CountRow = { count: string | number | null };

function toCount(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

type DashboardStatsDb = Pick<ReturnType<typeof getDb>, 'get'>;

export async function getDashboardStats(db: DashboardStatsDb = getDb()) {
  const [users, events, granted] = await Promise.all([
    db.get<CountRow>('SELECT COUNT(*)::text AS count FROM users'),
    db.get<CountRow>('SELECT COUNT(*)::text AS count FROM access_events'),
    db.get<CountRow>("SELECT COUNT(*)::text AS count FROM access_events WHERE verdict = 'GRANT'"),
  ]);

  return {
    totalUsers: toCount(users?.count),
    totalCheckins: toCount(events?.count),
    totalGrantedCheckins: toCount(granted?.count),
  };
}

export default async function Dashboard() {
  const sess = await getSession();
  if (!sess) redirect('/login');
  const db = getDb();
  const mySlugs = await currentSlugs(db, sess.email);
  if (!hasMainChoice(mySlugs)) redirect('/events');
  const stats = await getDashboardStats();
  const counts = await loadEventCounts(db);
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#dbeafe_0%,#f8fafc_55%)] text-slate-900">
      <nav className="border-b border-slate-200 bg-white">
        <div className="app-shell flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <img src="/trust.png" alt="TrustAccess" className="h-8 w-8" />
            <div className="font-semibold tracking-tight text-slate-900">TrustAccess</div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">{sess.name}</span>
            <form action="/api/logout" method="post">
              <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
                Logout
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="app-shell px-6 py-8">
        <div className="app-card mb-8 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="app-title text-3xl font-semibold">Dashboard</h1>
              <p className="app-muted mt-2">Selamat datang, {sess.name}</p>
              <p className="mt-1 text-sm text-blue-600">Verifier-focused workspace untuk TrustAccess</p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="app-card p-5">
            <div className="text-xs font-medium tracking-[0.16em] text-blue-600">CHECK-IN</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalCheckins}</div>
            <p className="mt-1 text-sm text-slate-500">Total check-in events</p>
          </div>
          <div className="app-card p-5">
            <div className="text-xs font-medium tracking-[0.16em] text-emerald-600">GRANTED</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalGrantedCheckins}</div>
            <p className="mt-1 text-sm text-slate-500">Check-in dengan verdict GRANT</p>
          </div>
          <div className="app-card p-5">
            <div className="text-xs font-medium tracking-[0.16em] text-amber-600">USERS</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalUsers}</div>
            <p className="mt-1 text-sm text-slate-500">Total users terdaftar</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="app-title text-lg font-semibold mb-3">Acara</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Object.entries(EVENTS).map(([slug, event]) => (
              <div key={slug} className="app-card p-5">
                <div className="text-xs font-medium tracking-[0.16em] text-blue-600">{event.name.toUpperCase()}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{counts[slug]} / {event.capacity}</div>
                <p className="mt-1 text-sm text-slate-500">{event.main ? 'Main event' : 'Bonus event'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <a href="/gate" className="group app-card p-6 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-2 text-xs font-medium tracking-[0.18em] text-blue-600">PRIMARY</div>
            <div className="text-xl font-semibold text-slate-900">Gate Verifier</div>
            <p className="mt-2 text-sm text-slate-500">Create VP request, scan QR, and evaluate access decision.</p>
          </a>

          <a href="/verify/document" className="group app-card p-6 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-2 text-xs font-medium tracking-[0.18em] text-emerald-600">DOCUMENT</div>
            <div className="text-xl font-semibold text-slate-900">Verify Document</div>
            <p className="mt-2 text-sm text-slate-500">Check signature, issuer, holder, and validity trace.</p>
          </a>

          <a href="/admin/users" className="group app-card p-6 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-2 text-xs font-medium tracking-[0.18em] text-amber-600">ADMIN</div>
            <div className="text-xl font-semibold text-slate-900">Manage Users</div>
            <p className="mt-2 text-sm text-slate-500">Lihat seluruh user dan assign personal menjadi business/admin.</p>
          </a>

          <a href="/holder" className="app-card p-6 transition hover:shadow-md">
            <div className="text-lg font-medium text-slate-900">My Credentials</div>
            <p className="mt-2 text-sm text-slate-500">View credential portfolio and validity.</p>
          </a>

          <a href="/admin/audit" className="app-card p-6 transition hover:shadow-md">
            <div className="text-lg font-medium text-slate-900">Audit Trail</div>
            <p className="mt-2 text-sm text-slate-500">Review verification and access event logs.</p>
          </a>

          <a href="/admin" className="app-card p-6 transition hover:shadow-md">
            <div className="text-lg font-medium text-slate-900">Admin Center</div>
            <p className="mt-2 text-sm text-slate-500">Administrative actions and settings.</p>
          </a>
        </div>
      </div>
    </div>
  );
}
