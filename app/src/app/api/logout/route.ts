import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/session';

export async function POST(req: Request) {
  await destroySession();
  const acceptsJson = (req.headers.get('accept') || '').includes('application/json');
  if (acceptsJson) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.redirect(new URL('/login', req.url));
}
