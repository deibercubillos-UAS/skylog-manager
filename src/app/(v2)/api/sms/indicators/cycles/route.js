// Skylog V2.0 — F3/SPI. Ciclos de vuelo del mes — denominador único
// compartido por todos los indicadores de esa organización/mes
// (13-herramientas-spi.md §1/§3.1: "es un dato único por periodo, no uno por
// indicador").
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, year, month, cycles } = body;
  if (!organizationId || !year || !month || cycles == null) {
    return Response.json({ error: 'organizationId, year, month y cycles son requeridos' }, { status: 400 });
  }
  if (month < 1 || month > 12) return Response.json({ error: 'month debe estar entre 1 y 12' }, { status: 400 });
  if (cycles < 0) return Response.json({ error: 'cycles no puede ser negativo' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede capturar los ciclos del mes' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('organization_monthly_cycles')
    .upsert(
      { organization_id: organizationId, year, month, cycles, updated_by: personId, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id,year,month' }
    )
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ monthlyCycles: data });
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const year = searchParams.get('year');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  let query = supabase.from('organization_monthly_cycles').select('*').eq('organization_id', organizationId).order('month');
  if (year) query = query.eq('year', Number(year));

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ monthlyCycles: data });
}
