// Skylog V2.0 — Flota & Equipo, Fase 1. Modelo de UAS (30-entidades.md §3.1):
// la ficha técnica y el programa de mantenimiento (100.535(3)) cuelgan del
// MODELO, no de cada aeronave — evita repetir la misma ficha N veces para
// una flota de N unidades idénticas. RLS decide todo: cualquier miembro de
// la organización consulta el catálogo, solo un gestor lo administra.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const orgIds = (memberships || []).map((m) => m.organization_id);
  if (!organizationId || !orgIds.includes(organizationId)) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }

  const { data: models, error } = await supabase
    .from('aircraft_models')
    .select('*')
    .eq('organization_id', organizationId)
    .order('brand', { ascending: true });
  if (error) return Response.json({ error: 'Error consultando modelos' }, { status: 500 });

  return Response.json({ models, isManager: isDutyManager(memberships, organizationId) });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, brand, model, category, ...specs } = body;
  if (!organizationId || !brand || !model) {
    return Response.json({ error: 'organizationId, brand y model son requeridos' }, { status: 400 });
  }
  const CATEGORIES = ['ala_fija', 'ala_rotatoria', 'mixta'];
  if (category && !CATEGORIES.includes(category)) {
    return Response.json({ error: 'category debe ser uno de: ' + CATEGORIES.join(', ') }, { status: 400 });
  }

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede registrar modelos de aeronave' }, { status: 403 });
  }

  // Solo los atributos reales del esquema (31-esquema-datos.md §2) — nunca
  // insertar el body completo (mass-assignment).
  const ALLOWED = [
    'mtow_kg', 'pmbo_kg', 'max_ascent_speed_ms', 'max_descent_speed_ms', 'max_flight_speed_ms',
    'max_wind_ms', 'ceiling_m', 'endurance_min', 'range_m', 'temp_min_c', 'temp_max_c',
    'gnss_supported', 'ip_rating', 'c2_link', 'c2_limitations', 'obstacle_detection',
    'emergency_system', 'control_station',
  ];
  const extra = {};
  for (const key of ALLOWED) {
    if (specs[key] !== undefined) extra[key] = specs[key];
  }

  const { data, error } = await supabase
    .from('aircraft_models')
    .insert({ organization_id: organizationId, brand, model, category: category || null, ...extra })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ model: data });
}
