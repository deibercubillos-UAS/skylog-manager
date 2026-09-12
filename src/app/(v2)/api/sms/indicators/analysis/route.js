// Skylog V2.0 — F3/SPI. Líneas de alerta, meta y activación de alerta para un
// indicador — calculadas en vivo sobre los datos mensuales ya capturados
// (13-herramientas-spi.md §3.2/§3.3/§9.2). No se persiste el resultado: D5
// dice que las líneas/meta se "congelan al cerrar el año" — ese cierre
// explícito y auditable (con reapertura documentada si se corrige un mes
// anterior) queda como pieza pendiente; por ahora esta ruta es de solo
// lectura/cálculo, siempre sobre el año anterior más reciente disponible.
import { createClientSSR } from '@/lib/supabaseServer';
import { computeAlertLines, computeTarget, evaluateAlertActivation } from '@skylog/domain';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const indicatorId = searchParams.get('indicatorId');
  const year = Number(searchParams.get('year'));
  if (!indicatorId || !year) return Response.json({ error: 'indicatorId y year son requeridos' }, { status: 400 });

  const { data: indicator, error: indicatorError } = await supabase
    .from('safety_indicators')
    .select('id, expected_improvement_pct')
    .eq('id', indicatorId)
    .maybeSingle();
  if (indicatorError) return Response.json({ error: 'Error verificando el indicador' }, { status: 500 });
  if (!indicator) return Response.json({ error: 'Indicador no encontrado' }, { status: 404 });

  const { data: monthly, error: monthlyError } = await supabase
    .from('safety_indicator_monthly')
    .select('year, month, rate')
    .eq('indicator_id', indicatorId)
    .in('year', [year - 1, year])
    .order('month');
  if (monthlyError) return Response.json({ error: monthlyError.message }, { status: 500 });

  const previousYearRates = (monthly || []).filter((m) => m.year === year - 1).map((m) => Number(m.rate));
  const currentYearRates = (monthly || []).filter((m) => m.year === year).map((m) => Number(m.rate));

  if (previousYearRates.length === 0) {
    return Response.json({ error: `Sin datos del año anterior (${year - 1}) — las líneas de alerta se calculan sobre ese año` }, { status: 409 });
  }

  const alertLines = computeAlertLines(previousYearRates);
  const target =
    indicator.expected_improvement_pct != null ? computeTarget(previousYearRates, Number(indicator.expected_improvement_pct)) : null;
  const activation = evaluateAlertActivation(currentYearRates, alertLines);

  return Response.json({ alertLines, target, activation, previousYearRates, currentYearRates });
}
