import { createAdminClient, createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── Guard: solo superadmin ──────────────────────────────────────────────────
async function requireSuperadmin() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado', status: 401 };
  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (prof?.role !== 'superadmin') return { error: 'Acceso denegado', status: 403 };
  return { admin, user };
}

// Genera un código a partir de las iniciales del nombre + sufijo aleatorio.
// Ej: "Escuela Águilas del Cielo" → "EAC-XB12". Garantiza unicidad en BD.
async function generateCode(admin, name) {
  const initials = String(name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // quitar acentos
    .toUpperCase()
    .split(/\s+/).filter(Boolean)
    .map(w => w[0])
    .join('')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4) || 'BF';

  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin chars ambiguos
  for (let attempt = 0; attempt < 12; attempt++) {
    let suffix = '';
    for (let i = 0; i < 4; i++) suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    const code = `${initials}-${suffix}`;
    const { data: exists } = await admin
      .from('partner_codes').select('id').eq('code', code).maybeSingle();
    if (!exists) return code;
  }
  // Fallback improbable
  return `${initials}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

// ── GET: listar socios con sus códigos y conteo de miembros ──────────────────
export async function GET() {
  const g = await requireSuperadmin();
  if (g.error) return NextResponse.json({ error: g.error }, { status: g.status });
  const { admin } = g;
  try {
    const [{ data: partners }, { data: codes }, { data: members }] = await Promise.all([
      admin.from('partners').select('*').order('created_at', { ascending: false }),
      admin.from('partner_codes').select('id, partner_id, code, active'),
      admin.from('partner_members').select('partner_id'),
    ]);
    const codesByPartner = {};
    (codes || []).forEach(c => { (codesByPartner[c.partner_id] ||= []).push(c); });
    const memberCount = {};
    (members || []).forEach(m => { memberCount[m.partner_id] = (memberCount[m.partner_id] || 0) + 1; });

    const result = (partners || []).map(p => ({
      ...p,
      codes: codesByPartner[p.id] || [],
      member_count: memberCount[p.id] || 0,
    }));
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST: crear socio (+ código) o agregar código a uno existente ────────────
export async function POST(request) {
  const g = await requireSuperadmin();
  if (g.error) return NextResponse.json({ error: g.error }, { status: g.status });
  const { admin, user } = g;
  try {
    const body = await request.json();

    // Agregar un código adicional a un socio existente
    if (body.action === 'add_code') {
      if (!body.partner_id) return NextResponse.json({ error: 'partner_id requerido' }, { status: 400 });
      const { data: partner } = await admin.from('partners').select('name').eq('id', body.partner_id).single();
      if (!partner) return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 });
      const code = await generateCode(admin, partner.name);
      const { data, error } = await admin.from('partner_codes')
        .insert({ partner_id: body.partner_id, code }).select().single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    // Crear socio
    const { type, name, parent_partner_id, commission_pct, free_seats_limit, free_days } = body;
    if (!['escuela', 'asesor'].includes(type)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

    const insert = {
      type,
      name: name.trim(),
      parent_partner_id: parent_partner_id || null,
      commission_pct: Number(commission_pct) || 0,
      free_seats_limit: free_seats_limit === '' || free_seats_limit == null ? null : parseInt(free_seats_limit, 10),
      free_days: parseInt(free_days, 10) || 90,
      created_by: user.id,
    };
    const { data: partner, error } = await admin.from('partners').insert(insert).select().single();
    if (error) throw error;

    const code = await generateCode(admin, partner.name);
    await admin.from('partner_codes').insert({ partner_id: partner.id, code });

    return NextResponse.json({ ...partner, codes: [{ code }] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: editar socio ──────────────────────────────────────────────────────
export async function PATCH(request) {
  const g = await requireSuperadmin();
  if (g.error) return NextResponse.json({ error: g.error }, { status: g.status });
  const { admin } = g;
  try {
    const { id, updateData } = await request.json();
    if (!id || !updateData) return NextResponse.json({ error: 'id y updateData requeridos' }, { status: 400 });

    const ALLOWED = ['name', 'status', 'commission_pct', 'free_seats_limit', 'free_days', 'parent_partner_id'];
    const safe = {};
    for (const [k, v] of Object.entries(updateData)) {
      if (!ALLOWED.includes(k)) continue;
      if (k === 'commission_pct') safe[k] = Number(v) || 0;
      else if (k === 'free_seats_limit') safe[k] = (v === '' || v == null) ? null : parseInt(v, 10);
      else if (k === 'free_days') safe[k] = parseInt(v, 10) || 90;
      else safe[k] = v;
    }
    if (!Object.keys(safe).length) return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 });

    const { data, error } = await admin.from('partners').update(safe).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE: desactivar socio (soft) ──────────────────────────────────────────
export async function DELETE(request) {
  const g = await requireSuperadmin();
  if (g.error) return NextResponse.json({ error: g.error }, { status: g.status });
  const { admin } = g;
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    const { error } = await admin.from('partners').update({ status: 'inactivo' }).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
