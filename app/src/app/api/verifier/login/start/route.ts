import { NextResponse } from 'next/server';
import { createClient } from '@/lib/eid/client';
import type { VerificationSchemaItem } from '@/lib/types';

const client = createClient();

async function ensureLoginVerificationSchema(): Promise<string | null> {
  const listed = await client.listVerificationSchemas();
  const items = listed?.data?.items || [];
  const loginSchema = items.find((it: VerificationSchemaItem) => it?.event_type === 'LOGIN_VC');
  if (loginSchema?.id) return loginSchema.id;

  const docs = await client.listDocumentSchemas();
  const docItems = docs?.data?.items || [];
  const doc = docItems[0];
  if (!doc?.id) return null;

  const created = await client.createVerificationSchema({
    name: 'TrustAccess Login VC',
    description: 'Schema for Login VC flow',
    ttl: 1,
    presentation_limit: 0,
    expected_schemas: [
      {
        schema_id: doc.id,
        mandatory: true,
        required_fields: doc.required_fields?.length ? doc.required_fields : ['subject_id', 'email'],
      },
    ],
    custom_webhook_url: '',
    event_type: 'LOGIN_VC',
  });
  return created?.verification_id || null;
}

export async function POST() {
  try {
    const envSchemaId = process.env.EID_LOGIN_VERIFICATION_ID;

    // Prefer explicit schema when provided to avoid account-default static schema mismatch.
    if (envSchemaId) {
      const bySchema = await client.loginVcWithSchema(envSchemaId);
      if (bySchema?.status && bySchema?.data?.session_id) {
        return NextResponse.json({
          ok: true,
          sessionId: bySchema.data.session_id,
          status: bySchema.data.status,
          expiresAt: bySchema.data.expires_at,
          oauthUrl: bySchema.data.eid_oauth_url,
          qrData: bySchema.data.qr_data,
        });
      }
    }

    const payload = await client.loginVcStatic();
    if (!payload?.status || !payload?.data?.session_id) {
      const msg = String(payload?.message || '').toLowerCase();
      if (msg.includes('verifier doc schema')) {
        let schemaId = envSchemaId;
        if (!schemaId) {
          schemaId = await ensureLoginVerificationSchema();
        }

        if (schemaId) {
          const fallback = await client.loginVcWithSchema(schemaId);
          if (fallback?.status && fallback?.data?.session_id) {
            return NextResponse.json({
              ok: true,
              sessionId: fallback.data.session_id,
              status: fallback.data.status,
              expiresAt: fallback.data.expires_at,
              oauthUrl: fallback.data.eid_oauth_url,
              qrData: fallback.data.qr_data,
            });
          }
        }

        const fallbackVp = envSchemaId ? await client.createVPRequest(envSchemaId, 15) : null;
        if (fallbackVp?.status && fallbackVp?.data?.session_id) {
          return NextResponse.json({
            ok: true,
            sessionId: fallbackVp.data.session_id,
            status: fallbackVp.data.status,
            expiresAt: fallbackVp.data.expires_at,
            oauthUrl: fallbackVp.data.eid_oauth_url,
            qrData: fallbackVp.data.qr_data,
          });
        }
      }
      return NextResponse.json({ ok: false, error: payload?.message || 'login_vc_start_failed' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      sessionId: payload.data.session_id,
      status: payload.data.status,
      expiresAt: payload.data.expires_at,
      oauthUrl: payload.data.eid_oauth_url,
      qrData: payload.data.qr_data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'login_vc_start_exception';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
