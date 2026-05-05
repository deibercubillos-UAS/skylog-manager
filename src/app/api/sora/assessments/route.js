import { NextResponse }     from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function getSession(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const { data: prof } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();
  return { user, prof };
}

// ─── GET: list assessments for the org ───────────────────────────────────────
export async function GET() {
  try {
    const supabase         = await createClientSSR();
    const { prof }         = await getSession(supabase);
    if (!prof?.organization_id) return NextResponse.json([], { status: 200 });

    const { data, error } = await supabase
      .from('sora_assessments')
      .select(`
        id, operation_name, operation_date, location_name,
        intrinsic_grc, final_grc, initial_arc, final_arc, sail_level,
        status, sail_complete, created_at,
        aircraft:aircraft_id(model, serial_number),
        pilot:pilot_id(name)
      `)
      .eq('organization_id', prof.organization_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST: create new assessment ─────────────────────────────────────────────
export async function POST(request) {
  try {
    const supabase        = await createClientSSR();
    const { user, prof }  = await getSession(supabase);

    if (!prof?.organization_id)
      return NextResponse.json({ error: 'Sin organización' }, { status: 403 });

    const body = await request.json();

    // Strip client-side extras; keep only DB columns
    const {
      operation_name, operation_date, aircraft_id, pilot_id,
      location_name, notes,
      ua_dimension, op_scenario, intrinsic_grc,
      m1_population, m2_effect, m3_emergency, final_grc,
      op_height_m, airspace_class, initial_arc,
      strategic_m1, strategic_m2, strategic_m3, final_arc,
      sail_level, oso_checklist, sail_complete, status,
    } = body;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('sora_assessments')
      .insert({
        organization_id: prof.organization_id,
        created_by:      user.id,
        operation_name:  operation_name?.trim(),
        operation_date:  operation_date || null,
        aircraft_id:     aircraft_id   || null,
        pilot_id:        pilot_id      || null,
        location_name:   location_name?.trim() || null,
        notes:           notes?.trim()         || null,
        ua_dimension:    ua_dimension,
        op_scenario:     op_scenario,
        intrinsic_grc:   intrinsic_grc,
        m1_population:   m1_population,
        m2_effect:       m2_effect,
        m3_emergency:    m3_emergency,
        final_grc:       final_grc,
        op_height_m:     Number(op_height_m) || 30,
        airspace_class:  airspace_class,
        initial_arc:     initial_arc,
        strategic_m1:    strategic_m1,
        strategic_m2:    strategic_m2,
        strategic_m3:    strategic_m3,
        final_arc:       final_arc,
        sail_level:      sail_level,
        oso_checklist:   oso_checklist || {},
        sail_complete:   sail_complete ?? false,
        status:          status || 'complete',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
