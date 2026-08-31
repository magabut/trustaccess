import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/session';
import bcrypt from 'bcryptjs';

type LoginUserRow = { email: string; name: string; password_hash: string | null };

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'email & password required' }, { status: 400 });

  const db = getDb();
  const user = await db.get<LoginUserRow>('SELECT email, name, password_hash FROM users WHERE email = $1', [email]);
  if (!user || !user.password_hash) return NextResponse.json({ error: 'akun tidak ditemukan atau belum punya password' }, { status: 401 });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return NextResponse.json({ error: 'password salah' }, { status: 401 });

  await createSession(user.email, user.name);
  return NextResponse.json({ ok: true, user: { email: user.email, name: user.name } });
}
