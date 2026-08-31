'use client';

import { useEffect, useState } from 'react';

type UserRow = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'host' | string;
};

export default function UsersManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    const data = (await res.json()) as { error?: string; users?: UserRow[] };
    if (!res.ok) {
      setError(data?.error || 'Gagal memuat user');
      setLoading(false);
      return;
    }
    setUsers(data.users || []);
    setError(null);
    setLoading(false);
  }

  async function updateRole(email: string, role: string) {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    if (res.ok) {
      setToast(`Role untuk ${email} berhasil diubah ke ${role}`);
      setTimeout(() => setToast(null), 2500);
      await loadUsers();
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  if (loading) return <div className="text-sm text-white/60">Loading users...</div>;
  if (error) return <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>;

  return (
    <div className="space-y-3">
      {toast && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {toast}
        </div>
      )}
      {users.map((u) => (
        <div key={u.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-medium">{u.name}</div>
            <div className="text-sm text-white/60">{u.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-white/15 px-2 py-1 text-xs text-white/60">{u.role}</span>
            <select
              value={u.role}
              onChange={(e) => updateRole(u.email, e.target.value)}
              className="rounded border border-white/20 bg-zinc-900 px-3 py-2 text-sm"
            >
              <option value="host">host (personal)</option>
              <option value="operator">operator</option>
              <option value="admin">admin (business)</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
