// Skylog V2.0 — SMS-G: paquete mensual único de RAC 100 §100.535(a)(26) —
// estadística de operaciones + indicadores SPI + reportes MOR del período,
// agregado en vivo (nunca persistido como snapshot) + el estado de envío
// ya registrado si existe. Ver 40-sms.md §5.9 sub-frente SMS-G.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { redactReporterIdentity } from '@skylog/domain';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const period = searchParams.get('period'); // 'YYYY-MM'
  if (!organizationId || !/^\d{4}-\d{2}$/.test(period || '')) {
    return Response.json({ error: 'organizationId y period (YYYY-MM) son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede ver el paquete mensual' }, { status: 403 });
  }

  const [year, month] = period.split('-').map(Number);
  const from = `${period}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${period}-${String(lastDay).padStart(2, '0')}`;

  const [flightsRes, spiRes, morRes, statusRes] = await Promise.all([
    supabase.from('flights').select('id, total_time, mission_type, visual_condition').eq('organization_id', organizationId).gte('takeoff_at', from).lte('takeoff_at', `${to}T23:59:59`),
    supabase.from('safety_indicator_monthly').select('events, rate, indicator:indicator_id(name)').eq('organization_id', organizationId).eq('year', year).eq('month', month),
    supabase
      .from('sms_reports')
      .select('id, event_code, description, severity, filed_at, created_at, reported_by, confidentiality_level, reporter:reported_by(full_name)')
      .eq('organization_id', organizationId)
      .eq('route', 'mor')
      .gte('created_at', from)
      .lte('created_at', `${to}T23:59:59`)
      .order('created_at', { ascending: false }),
    supabase.from('sms_monthly_reports').select('*, sentBy:sent_by(full_name)').eq('organization_id', organizationId).eq('period', period).maybeSingle(),
  ]);

  const errors = [flightsRes, spiRes, morRes, statusRes].map((r) => r.error).filter(Boolean);
  if (errors.length) return Response.json({ error: errors[0].message }, { status: 500 });

  const flights = flightsRes.data || [];
  const byMissionType = {};
  const byCondition = {};
  let totalHours = 0;
  for (const f of flights) {
    totalHours += Number(f.total_time) || 0;
    if (f.mission_type) byMissionType[f.mission_type] = (byMissionType[f.mission_type] || 0) + 1;
    if (f.visual_condition) byCondition[f.visual_condition] = (byCondition[f.visual_condition] || 0) + 1;
  }

  // SMS-H (40-sms.md §5.9, RAC 219 §219.115-140) — un MOR 'confidencial'
  // solo expone la identidad del notificante al Gerente SMS (o a sí mismo);
  // este paquete mensual circula más ampliamente que el caso individual, así
  // que la redacción importa aún más aquí.
  const viewerRole = memberships.find((m) => m.organization_id === organizationId)?.role;
  const morReports = (morRes.data || []).map((r) => redactReporterIdentity(r, { viewerRole, viewerPersonId: personId }));

  return Response.json({
    period,
    operationalStats: { totalFlights: flights.length, totalHours: Number(totalHours.toFixed(1)), byMissionType, byCondition },
    indicators: (spiRes.data || []).map((r) => ({ name: r.indicator?.name || '—', events: r.events, rate: r.rate })),
    morReports,
    status: statusRes.data || null,
  });
}
