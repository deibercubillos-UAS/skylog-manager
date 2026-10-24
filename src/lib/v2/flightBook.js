// Skylog V2.0 — Libro de Vuelo de UN vuelo (formato por casillas). Se baja al cerrar el vuelo y desde la bitácora.
import { fetchDutyContext } from './dutyContextClient';

export async function downloadFlightBook({ organizationId, flightId }) {
  const [{ generateFlightLogPdf }, ctxRes, dataRes] = await Promise.all([
    import('./reportGenerators'),
    fetchDutyContext(),
    fetch(`/api/reportes/vuelos?${new URLSearchParams({ organizationId, flightId })}`),
  ]);
  const data = await dataRes.json();
  if (!dataRes.ok) throw new Error(data.error || 'No se pudo generar el Libro de Vuelo');
  if (!data.flights?.length) throw new Error('No se encontró el vuelo');
  const ctx = ctxRes.ok ? await ctxRes.json() : {};
  const org = ctx.organizations?.find((o) => o.id === organizationId);
  await generateFlightLogPdf(data.flights, { orgName: org?.name, logoUrl: org?.logoUrl, extra: data });
}
