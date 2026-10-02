// Skylog V2.0 — Flota & Equipo, Fase 4a. Programa de mantenimiento POR
// MODELO (100.535(3)) — un programa por modelo, nunca por aeronave. GET
// devuelve todos los programas de la organización con sus tareas
// embebidas; POST crea el programa de un modelo si todavía no existe
// (idempotente: si ya existe, simplemente lo devuelve — evita que dos
// clics accidentales dupliquen el programa).
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

  const { data: programs, error } = await supabase
    .from('maintenance_programs')
    .select('*, model:model_id(brand, model, category), tasks:maintenance_tasks(*)')
    .eq('organization_id', organizationId);
  if (error) return Response.json({ error: 'Error consultando programas de mantenimiento' }, { status: 500 });

  return Response.json({ programs, isManager: isDutyManager(memberships, organizationId) });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, modelId } = body;
  if (!organizationId || !modelId) {
    return Response.json({ error: 'organizationId y modelId son requeridos' }, { status: 400 });
  }

  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede crear un programa de mantenimiento' }, { status: 403 });
  }

  const { data: model, error: modelError } = await supabase
    .from('aircraft_models')
    .select('id')
    .eq('id', modelId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (modelError) return Response.json({ error: 'Error verificando el modelo' }, { status: 500 });
  if (!model) return Response.json({ error: 'El modelo no pertenece a esta organización' }, { status: 400 });

  const { data: existing } = await supabase.from('maintenance_programs').select('*, model:model_id(brand, model, category), tasks:maintenance_tasks(*)').eq('model_id', modelId).maybeSingle();
  if (existing) return Response.json({ program: existing });

  const { data, error } = await supabase
    .from('maintenance_programs')
    .insert({ organization_id: organizationId, model_id: modelId, created_by: personId })
    .select('*, model:model_id(brand, model, category), tasks:maintenance_tasks(*)')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ program: data });
}
