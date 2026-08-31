import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const sess = await getSession();
  if (!sess) redirect('/login');
  return (
    <div className="min-h-screen p-8 bg-zinc-950 text-white">
      <h1 className="text-3xl font-semibold mb-4">Dashboard</h1>
      <p className="text-white/60">Selamat datang, {sess.name}</p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/holder" className="block border border-white/10 p-6 rounded hover:bg-white/5">My Credentials</a>
        <a href="/gate" className="block border border-white/10 p-6 rounded hover:bg-white/5">Gate Verifier</a>
        <a href="/admin" className="block border border-white/10 p-6 rounded hover:bg-white/5">Admin</a>
      </div>
    </div>
  );
}
