import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { SESSION_COOKIE } from '../config';

const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-secret-change-me');

export interface Session {
  email: string;
  name: string;
}

export async function createSession(email: string, name: string): Promise<void> {
  const token = await new SignJWT({ email, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { email: payload.email as string, name: payload.name as string };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
