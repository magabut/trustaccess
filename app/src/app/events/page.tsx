import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import { EVENTS } from '@/lib/events';
import { loadEventCounts, currentSlugs, hasMainChoice } from '@/lib/events-service';
import EventPicker from './EventPicker';

export default async function EventsPage() {
  const sess = await getSession();
  if (!sess) redirect('/login');

  const db = getDb();
  const counts = await loadEventCounts(db);
  const slugs = await currentSlugs(db, sess.email);
  const hasMain = hasMainChoice(slugs);

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
          <h1 className="app-title text-3xl font-semibold">Pilih Acara</h1>
          <p className="app-muted mt-2">
            {hasMain
              ? 'Kamu sudah memilih acara utama. Pilih bonus atau kembali ke dashboard.'
              : 'Pilih 1 acara utama dan opsional acara bonus.'}
          </p>
        </div>

        <EventPicker
          events={EVENTS}
          counts={counts}
          chosen={slugs}
          hasMain={hasMain}
          userName={sess.name}
        />
      </div>
    </div>
  );
}
