'use client';

// Skylog V2.0 — Reportes: hub de descargas en PDF, a pedido explícito del
// usuario ("ahora creemos la sección de reportes"). Verificado contra
// `19-registros-obligatorios.md` (las 29 obligaciones de RAC 100 §100.535)
// — se agregaron Tiempos de Servicio (§100.540, obligación 10-11),
// Programación y Autorizaciones (expediente + análisis de riesgos,
// obligación 24-25) y ETA (Apéndice 1 §2.1), y se ampliaron Flota
// (firmware, obligación 7) y Mantenimiento (programa por modelo,
// obligación 3) — todo sobre datos que YA existen en V2. Deliberadamente
// SIN los formatos que siguen sin datos reales detrás (SPI, GAP, Manuales,
// VOR/MOR, Reporte Mensual, certificación anual de horas, retención de 5
// años) — documentado, no fabricado.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero } from '../_components/SectionHero';
import { Button } from '@skylog/ui';
import { TRAINING_TYPES, TRAINING_TYPE_LABELS } from '@/lib/v2/training';
import {
  generateFlightLogPdf,
  generateMaintenanceReportPdf,
  generateFleetReportPdf,
  generateBatteryReportPdf,
  generateCrewReportPdf,
  generateTrainingReportPdf,
  generateSupplierAuditReportPdf,
  generateDutyReportPdf,
  generateMissionsReportPdf,
  generateEtaReportPdf,
} from '@/lib/v2/reportGenerators';

const REPORT_DEFS = [
  { key: 'vuelos', title: 'Libro de Vuelo', description: 'Vuelos registrados por rango de fechas.', icon: 'menu_book', tile: 'bg-blue-500 text-white', wash: 'from-blue-50 to-white', needsPeriod: true, needsAircraft: true },
  { key: 'mantenimiento', title: 'Mantenimiento', description: 'Eventos, eventos inesperados y programa por modelo.', icon: 'build', tile: 'bg-amber-500 text-white', wash: 'from-amber-50 to-white', needsPeriod: true, needsAircraft: true },
  { key: 'flota', title: 'Flota', description: 'Inventario, propiedad, firmware y ficha técnica por modelo — instantánea.', icon: 'flight', tile: 'bg-primary text-white', wash: 'from-primary-50 to-white', needsAircraft: true },
  { key: 'baterias', title: 'Baterías y Componentes', description: 'Estado vigente de baterías y componentes activos.', icon: 'battery_full', tile: 'bg-emerald-500 text-white', wash: 'from-emerald-50 to-white' },
  { key: 'tripulacion', title: 'Expediente de Tripulación', description: 'Roster con licencia y vigencia médica.', icon: 'groups', tile: 'bg-violet-500 text-white', wash: 'from-violet-50 to-white' },
  { key: 'capacitacion', title: 'Capacitación', description: 'Evaluaciones y cumplimiento por pista.', icon: 'school', tile: 'bg-red-500 text-white', wash: 'from-red-50 to-white', needsTrainingType: true },
  { key: 'proveedores', title: 'Auditoría de Proveedores', description: 'Auditorías con % de cumplimiento.', icon: 'storefront', tile: 'bg-sky-500 text-white', wash: 'from-sky-50 to-white', needsPeriod: true, needsSupplier: true },
  { key: 'duty', title: 'Tiempos de Servicio', description: 'Registro diario por piloto — §100.540.', icon: 'schedule', tile: 'bg-indigo-500 text-white', wash: 'from-indigo-50 to-white', needsPeriod: true },
  { key: 'programacion', title: 'Programación y Autorizaciones', description: 'Expediente por autorización + análisis de riesgos.', icon: 'event_available', tile: 'bg-teal-500 text-white', wash: 'from-teal-50 to-white', needsPeriod: true },
  { key: 'eta', title: 'Equipo Tecnológico Asociado', description: 'Ficha con número RETA.', icon: 'dns', tile: 'bg-fuchsia-500 text-white', wash: 'from-fuchsia-50 to-white' },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function monthAgoStr() {
  return new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
}

export default function ReportesPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [aircraftList, setAircraftList] = useState([]);
  const [supplierList, setSupplierList] = useState([]);

  const [selectedKey, setSelectedKey] = useState(null);
  const [from, setFrom] = useState(monthAgoStr());
  const [to, setTo] = useState(todayStr());
  const [aircraftId, setAircraftId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [trainingType, setTrainingType] = useState(TRAINING_TYPES[0]);
  const [busy, setBusy] = useState(false);
  const [reportError, setReportError] = useState(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/duty/context');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
        setContext(data);
        setOrganizationId(data.organizations?.[0]?.id || '');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadFilters = useCallback(async (orgId) => {
    if (!orgId) return;
    const [aRes, sRes] = await Promise.all([fetch(`/api/reportes/flota?organizationId=${orgId}`), fetch(`/api/proveedores/suppliers?organizationId=${orgId}`)]);
    const aData = await aRes.json();
    const sData = await sRes.json();
    if (aRes.ok) setAircraftList(aData.aircraft || []);
    if (sRes.ok) setSupplierList(sData.suppliers || []);
  }, []);

  useEffect(() => {
    if (organizationId && isManager) loadFilters(organizationId);
  }, [organizationId, isManager, loadFilters]);

  async function handleGenerate(def) {
    setBusy(true);
    setReportError(null);
    try {
      const orgName = currentOrg?.name;
      const logoUrl = currentOrg?.logoUrl;
      const periodLabel = `${from} a ${to}`;

      if (def.key === 'vuelos') {
        const qs = new URLSearchParams({ organizationId, from, to, ...(aircraftId && { aircraftId }) });
        const res = await fetch(`/api/reportes/vuelos?${qs}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error consultando vuelos');
        await generateFlightLogPdf(data.flights, { orgName, logoUrl, periodLabel });
      } else if (def.key === 'mantenimiento') {
        const qs = new URLSearchParams({ organizationId, from, to, ...(aircraftId && { aircraftId }) });
        const res = await fetch(`/api/reportes/mantenimiento?${qs}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error consultando mantenimiento');
        await generateMaintenanceReportPdf(data, { orgName, logoUrl, periodLabel });
      } else if (def.key === 'flota') {
        const qs = new URLSearchParams({ organizationId, ...(aircraftId && { aircraftId }) });
        const res = await fetch(`/api/reportes/flota?${qs}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error consultando la flota');
        await generateFleetReportPdf(data.aircraft, { orgName, logoUrl, models: data.models || [] });
      } else if (def.key === 'baterias') {
        const res = await fetch(`/api/reportes/baterias?organizationId=${organizationId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error consultando baterías');
        await generateBatteryReportPdf(data, { orgName, logoUrl });
      } else if (def.key === 'tripulacion') {
        const res = await fetch(`/api/reportes/tripulacion?organizationId=${organizationId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error consultando la tripulación');
        await generateCrewReportPdf(data.members, { orgName, logoUrl });
      } else if (def.key === 'capacitacion') {
        const res = await fetch(`/api/capacitacion/compliance?organizationId=${organizationId}&type=${trainingType}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error consultando capacitación');
        await generateTrainingReportPdf(data, { orgName, logoUrl, typeLabel: TRAINING_TYPE_LABELS[trainingType] });
      } else if (def.key === 'proveedores') {
        const qs = new URLSearchParams({ organizationId, from, to, ...(supplierId && { supplierId }) });
        const res = await fetch(`/api/reportes/proveedores?${qs}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error consultando auditorías');
        const scopeLabel = supplierId ? supplierList.find((s) => s.id === supplierId)?.name || 'Un proveedor' : 'Todos los proveedores';
        await generateSupplierAuditReportPdf(data.audits, { orgName, logoUrl, scopeLabel, periodLabel });
      } else if (def.key === 'duty') {
        const qs = new URLSearchParams({ organizationId, from, to });
        const res = await fetch(`/api/reportes/duty?${qs}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error consultando tiempos de servicio');
        await generateDutyReportPdf(data.periods, { orgName, logoUrl, periodLabel });
      } else if (def.key === 'programacion') {
        const qs = new URLSearchParams({ organizationId, from, to });
        const res = await fetch(`/api/reportes/programacion?${qs}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error consultando programación');
        await generateMissionsReportPdf(data.missions, { orgName, logoUrl, periodLabel });
      } else if (def.key === 'eta') {
        const res = await fetch(`/api/reportes/eta?organizationId=${organizationId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error consultando ETA');
        await generateEtaReportPdf(data.items, { orgName, logoUrl });
      }
    } catch (e) {
      setReportError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="Documentación" title="Reportes" description="Descarga en PDF de los formatos operativos disponibles." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div>
        <SectionHero eyebrow="Documentación" title="Reportes" description="Descarga en PDF de los formatos operativos disponibles." />
        <p className="text-sm text-navy-400 mt-4">Solo un gestor (Jefe de Pilotos, Gerente SMS, admin) puede generar reportes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHero eyebrow="Documentación" title="Reportes" description="Descarga en PDF de los formatos operativos disponibles — cada uno se genera al momento, con el logo y nombre de tu organización." metric={{ value: REPORT_DEFS.length, label: 'Formatos' }} />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {REPORT_DEFS.map((def) => (
          <button
            key={def.key}
            type="button"
            onClick={() => {
              setSelectedKey((k) => (k === def.key ? null : def.key));
              setReportError(null);
            }}
            className={`flex items-start gap-3 text-left rounded-2xl border p-4 bg-gradient-to-br ${def.wash} transition-all duration-200 ${
              selectedKey === def.key ? 'border-primary ring-1 ring-primary/30' : 'border-navy-100 hover:-translate-y-0.5 hover:shadow-md'
            }`}
          >
            <span className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 shadow-sm ${def.tile}`}>
              <span className="material-symbols-outlined text-xl">{def.icon}</span>
            </span>
            <div>
              <p className="text-sm font-bold text-navy">{def.title}</p>
              <p className="text-xs text-navy-400 mt-0.5">{def.description}</p>
            </div>
          </button>
        ))}
      </div>

      {REPORT_DEFS.map((def) => {
        if (selectedKey !== def.key) return null;
        return (
          <div key={def.key} className="bg-white rounded-2xl border border-navy-100 p-4">
            <p className="text-sm font-semibold text-navy mb-3">Generar — {def.title}</p>

            <div className="flex flex-wrap items-end gap-3 mb-4">
              {def.needsPeriod && (
                <>
                  <div>
                    <label className="text-xs font-medium text-navy-400 block mb-1">Desde</label>
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-sm border border-navy-200 rounded-lg px-2 py-1.5" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-navy-400 block mb-1">Hasta</label>
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-sm border border-navy-200 rounded-lg px-2 py-1.5" />
                  </div>
                </>
              )}
              {def.needsAircraft && (
                <div>
                  <label className="text-xs font-medium text-navy-400 block mb-1">Aeronave (opcional — vacío = toda la flota)</label>
                  <select value={aircraftId} onChange={(e) => setAircraftId(e.target.value)} className="text-sm border border-navy-200 rounded-lg px-2 py-1.5 min-w-[220px]">
                    <option value="">Todas las aeronaves</option>
                    {aircraftList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.serial_number} — {a.model_label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {def.needsSupplier && (
                <div>
                  <label className="text-xs font-medium text-navy-400 block mb-1">Proveedor (opcional — vacío = todos)</label>
                  <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="text-sm border border-navy-200 rounded-lg px-2 py-1.5 min-w-[220px]">
                    <option value="">Todos los proveedores</option>
                    {supplierList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {def.needsTrainingType && (
                <div>
                  <label className="text-xs font-medium text-navy-400 block mb-1">Pista</label>
                  <select value={trainingType} onChange={(e) => setTrainingType(e.target.value)} className="text-sm border border-navy-200 rounded-lg px-2 py-1.5 min-w-[180px]">
                    {TRAINING_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TRAINING_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {reportError && <p className="text-sm text-red-600 mb-3">{reportError}</p>}

            <Button onClick={() => handleGenerate(def)} disabled={busy}>
              <span className="material-symbols-outlined text-base align-middle mr-1">{busy ? 'hourglass_empty' : 'download'}</span>
              {busy ? 'Generando…' : 'Descargar PDF'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
