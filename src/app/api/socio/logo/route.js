import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { storagePut, storagePublicUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const BUCKET = 'partner-logos';
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];

async function getOwnerMembership(admin, userId) {
  const { data } = await admin
    .from('partner_members')
    .select('id, role, partner_id')
    .eq('profile_id', userId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle();
  return data;
}

// ── POST: subir/actualizar el logo del socio (solo owner) ───────────────────
export async function POST(request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const membership = await getOwnerMembership(admin, user.id);
    if (!membership) return NextResponse.json({ error: 'Solo el administrador del socio puede cambiar el logo.' }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'El logo no puede superar 2 MB.' }, { status: 400 });
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Formato no permitido (usa PNG, JPG, WEBP o SVG).' }, { status: 400 });

    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${membership.partner_id}/logo_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await storagePut({
      bucket: BUCKET, key: path, body: buffer, contentType: file.type, upsert: true,
    });
    if (upErr) throw upErr;

    const { data: pub } = storagePublicUrl({ bucket: BUCKET, key: path });
    const logoUrl = pub.publicUrl;

    const { error: updErr } = await admin.from('partners')
      .update({ logo_url: logoUrl }).eq('id', membership.partner_id);
    if (updErr) throw updErr;

    return NextResponse.json({ success: true, logo_url: logoUrl });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE: quitar el logo del socio ────────────────────────────────────────
export async function DELETE() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const membership = await getOwnerMembership(admin, user.id);
    if (!membership) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    await admin.from('partners').update({ logo_url: null }).eq('id', membership.partner_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
