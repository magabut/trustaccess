'use client';

import { useState } from 'react';

type EventInfo = { name: string; capacity: number; main: boolean };
type EventCounts = Record<string, number>;

type Props = {
  events: Record<string, EventInfo>;
  counts: EventCounts;
  chosen: string[];
  hasMain: boolean;
  userName: string;
};

const errorText: Record<string, string> = {
  already_chosen: 'Sudah dipilih',
  quota_full: 'Kuota penuh',
  bad_main_choice: 'Kamu hanya bisa memilih 1 acara utama',
  invalid_event: 'Acara tidak valid',
  not_authenticated: 'Sesi berakhir, silakan login kembali',
  invalid_json_body: 'Permintaan tidak valid',
};

export default function EventPicker({ events, counts: initialCounts, chosen: initialChosen, hasMain, userName }: Props) {
  const [counts, setCounts] = useState<EventCounts>(initialCounts);
  const [chosen, setChosen] = useState<string[]>(initialChosen);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const mainSlugs = Object.keys(events).filter((s) => events[s].main);
  const bonusSlugs = Object.keys(events).filter((s) => !events[s].main);

  async function choose(slug: string) {
    setError(null);
    setBusy(slug);
    try {
      const res = await fetch('/api/events/choose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (data?.ok) {
        setCounts(data.counts);
        setChosen((prev) => (prev.includes(slug) ? prev : [...prev, slug]));
        if (events[slug].main) {
          window.location.href = '/dashboard';
        }
      } else {
        setError(errorText[data?.error] ?? 'Terjadi kesalahan');
      }
    } catch {
      setError('Terjadi kesalahan');
    } finally {
      setBusy(null);
    }
  }

  function renderCard(slug: string) {
    const ev = events[slug];
    const isChosen = chosen.includes(slug);
    const isFull = counts[slug] >= ev.capacity;
    const disabled = isChosen || isFull || busy !== null;
    return (
      <div key={slug} className={ev.main ? 'app-card border-2 border-blue-200 p-5' : 'app-card border-2 border-amber-200 p-5'}>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-lg font-semibold text-slate-900">{ev.name}</div>
          <span className={`text-xs font-medium tracking-[0.16em] ${ev.main ? 'text-blue-600' : 'text-amber-600'}`}>
            {ev.main ? 'ACARA UTAMA' : 'BONUS'}
          </span>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          {counts[slug]} / {ev.capacity} terisi
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => choose(slug)}
          className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition ${
            disabled
              ? 'cursor-not-allowed bg-slate-100 text-slate-400'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isChosen ? 'Sudah dipilih' : isFull ? 'Kuota penuh' : busy === slug ? 'Memilih...' : 'Pilih'}
        </button>
      </div>
    );
  }

  return (
    <div>
      {hasMain && (
        <div className="app-card mb-6 flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm text-slate-500">
              Acara utama dipilih:{' '}
              <span className="font-semibold text-slate-900">
                {chosen.filter((s) => events[s]?.main).map((s) => events[s].name).join(', ') || '—'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Terima kasih, {userName}. Kamu bisa memilih acara bonus atau langsung ke dashboard.</p>
          </div>
          <a
            href="/dashboard"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Go to Dashboard
          </a>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4">
        <h2 className="app-title text-xl font-semibold">Acara Utama</h2>
        <p className="app-muted text-sm">Pilih satu acara utama.</p>
      </div>
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {mainSlugs.map(renderCard)}
      </div>

      <div className="mb-4">
        <h2 className="app-title text-xl font-semibold">Acara Bonus</h2>
        <p className="app-muted text-sm">Bonus opsional, tidak menghalangi akses utama.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {bonusSlugs.map(renderCard)}
      </div>

      {!hasMain && chosen.some((s) => !events[s]?.main) && (
        <div className="mt-6 flex justify-end">
          <a
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Go to Dashboard
          </a>
        </div>
      )}
    </div>
  );
}
