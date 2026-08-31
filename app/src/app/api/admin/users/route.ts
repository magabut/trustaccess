import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';

type UserListRow = { id: number; email: string; name: string; role: string };

export async function GET() {
  const sess = await getSession();
  if (!sess || sess.role !== 'admin') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const db = getDb();
  const users = await db.all<UserListRow>('SELECT id, email, name, role FROM users ORDER BY id DESC');
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const sess = await getSession();
  if (!sess || sess.role !== 'admin') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { email, role } = await req.json();
  const db = getDb();
  await db.run('UPDATE users SET role = $1 WHERE email = $2', [role, email]);
  return NextResponse.json({ ok: true });
}
