import { NextResponse } from 'next/server';
import { verifyDocument } from '@/lib/document/verify';

export async function POST(req: Request) {
  const { presentation } = await req.json();
  let claims: Record<string, unknown> = {};
  try {
    claims = JSON.parse(presentation);
  } catch {
    return NextResponse.json({ valid: false, reasons: ['Invalid JSON'] });
  }
  const trace = verifyDocument(claims);
  return NextResponse.json(trace);
}
