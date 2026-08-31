import { NextResponse } from 'next/server';
import { createSession } from '@/lib/session';

const BASE = process.env.EID_BASE_URL || 'https://api-dev.e.id';
const CLIENT_ID = process.env.EID_CLIENT_ID || '';
const CLIENT_SECRET = process.env.EID_CLIENT_SECRET || '';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const redirectUri = `${url.origin}/api/auth/eid`;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/login?error=oauth_config_missing', url.origin));
  }

  if (!code) {
    // OAuth SSO v1.1: redirect user to verify-client endpoint.
    const authUrl = `${BASE}/api/v1.1/oauth/verify?client_id=${CLIENT_ID}&callback_url=${encodeURIComponent(redirectUri)}`;
    return NextResponse.redirect(authUrl);
  }

  // OAuth SSO v1.1: exchange authorization code.
  const tokenRes = await fetch(`${BASE}/api/v1.1/oauth/get-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenPayload = await tokenRes.json();
  const accessToken = tokenPayload?.data?.token;
  if (!tokenPayload?.status || !accessToken) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', url.origin));
  }

  // OAuth SSO v1.1: get user profile.
  const profileRes = await fetch(`${BASE}/api/v1.1/oauth/get-profile?scope=email:profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const profilePayload = await profileRes.json();
  const profile = profilePayload?.data;
  if (!profilePayload?.status || (!profile?.email && !profile?.id)) {
    return NextResponse.redirect(new URL('/login?error=profile_failed', url.origin));
  }

  await createSession(profile.email || profile.id, profile.name || profile.email?.split('@')[0] || 'User', 'host');
  return NextResponse.redirect(new URL('/dashboard', url.origin));
}
