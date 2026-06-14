// GET /api/socio/invite-info?token=<token>
// Endpoint público: devuelve info del partner para mostrar banner en /registro.
// No requiere auth.

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'token requerido' }, { status: 400 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { data: invite } = await admin
      .from('partner_invitations')
      .select('role, status, expires_at, partners:partner_id(name, type)')
      .eq('token', token)
      .maybeSingle();

    if (!invite) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
    if (invite.status !== 'pendiente') return NextResponse.json({ error: 'Invitación ya utilizada o expirada' }, { status: 410 });
    if (invite.expires_at < new Date().toISOString()) return NextResponse.json({ error: 'Invitación expirada' }, { status: 410 });

    return NextResponse.json({
      partner_name: invite.partners?.name,
      partner_type: invite.partners?.type,
      role:         invite.role,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
