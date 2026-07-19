// GET  /api/admin/master/addons?organization_id=  — lista add-ons de una org
// POST /api/admin/master/addons  { organization_id, addon_type, quantity, notes? }
//   — agrega un add-on (venta registrada a mano: transferencia, WhatsApp, etc.
//     mientras no hay checkout self-service de ePayco para esto — ver CLAUDE.md).
// DELETE /api/admin/master/addons  { id }  — cancela (soft) un add-on.
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { ADDON_PRICING } from '@/lib/addons';

export const dynamic = 'force-dynamic';

async function requireSuperadmin() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado', status: 401 };
  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (prof?.role !== 'superadmin') return { error: 'Acceso denegado', status: 403 };
  return { admin, user };
}

export async function GET(request) {
  const g = await requireSuperadmin();
  if (g.error) return NextResponse.json({ error: g.error }, { status: g.status });
  const { admin } = g;
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organization_id');
  if (!organizationId) return NextResponse.json({ error: 'organization_id requerido' }, { status: 400 });

  const { data, error } = await admin
    .from('addon_subscriptions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  const g = await requireSuperadmin();
  if (g.error) return NextResponse.json({ error: g.error }, { status: g.status });
  const { admin, user } = g;

  try {
    const { organization_id: organizationId, addon_type: addonType, quantity, notes } = await request.json();
    if (!organizationId) return NextResponse.json({ error: 'organization_id requerido' }, { status: 400 });
    if (!ADDON_PRICING[addonType]) return NextResponse.json({ error: 'addon_type inválido' }, { status: 400 });
    const qty = parseInt(quantity, 10) || 1;

    const { data, error } = await admin
      .from('addon_subscriptions')
      .insert({
        organization_id: organizationId,
        addon_type: addonType,
        quantity: qty,
        unit_price: ADDON_PRICING[addonType].monthly,
        billing: 'monthly',
        status: 'active',
        granted_by: user.id,
        notes: notes || null,
      })
      .select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const g = await requireSuperadmin();
  if (g.error) return NextResponse.json({ error: g.error }, { status: g.status });
  const { admin } = g;

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    const { error } = await admin
      .from('addon_subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
