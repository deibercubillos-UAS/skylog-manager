'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { fmtDateMed } from '@/lib/formatters';
import { sailRoman, sailColor } from '@/lib/soraEngine';
import { resolveZone, riskIndex, ZONE_META } from '@/lib/safetyRiskDefaults';
import { computeRate, computeYearStats } from '@/lib/safetyIndicatorStats';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';
import { toast } from '@/lib/toast';

const SoraWizard = dynamic(() => import('@/components/sora/SoraWizard'), { ssr: false });
const AddBarrierPanel = dynamic(() => import('@/components/safety/AddBarrierPanel'), { ssr: false });
const RiskMatrixEditor = dynamic(() => import('@/components/safety/RiskMatrixEditor'), { ssr: false });
const AddHazardPanel = dynamic(() => import('@/components/safety/AddHazardPanel'), { ssr: false });
const AddIndicatorPanel = dynamic(() => import('@/components/safety/AddIndicatorPanel'), { ssr: false });
const IndicatorDetailPanel = dynamic(() => import('@/components/safety/IndicatorDetailPanel'), { ssr: false });

// Mismo visor real que usa /dashboard/safety/mapas (const duplicada a propósito —
// es una URL de referencia, no lógica de negocio).
const ARCGIS_UAS_URL =
  'https://aerocivil.maps.arcgis.com/apps/instant/media/index.html?appid=b4be4d501c8d4bcabd0c35297521c16e&center=-74.1;4.5&level=6';

// Orden fijado por docs/plan-mejora-sms-bitafly.md — Fase 1: los tabs nuevos
// (Evaluación de Riesgos, Indicadores SPI, Mejora Continua, Acciones
// Correctivas, Reportes de Seg. Operacional, Capacitación SMS) se insertan
// en sus fases respectivas en las posiciones ya reservadas aquí.
const TABS = [
  { id: 'sora',     label: 'Análisis SORA',           icon: 'analytics' },
  { id: 'riesgos',  label: 'Evaluación de Riesgos',   icon: 'grid_view' },
  { id: 'indicadores', label: 'Indicadores (SPI)',    icon: 'monitoring' },
  // ← Fases 4-5: Mejora Continua · Acciones Correctivas
  { id: 'reportes', label: 'Reportes SMS',            icon: 'health_and_safety' },
  // ← Fase 6: Reportes de Seguridad Operacional (plazos MOR/VOR)
  { id: 'barreras', label: 'Barreras de Seguridad',   icon: 'shield' },
  { id: 'mapas',    label: 'Mapas de restricción',    icon: 'map' },
  // ← Fase 7: Capacitación SMS
];

const SORA_STATUS = {
  complete: { label: 'Completada', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  draft:    { label: 'Borrador',   cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  archived: { label: 'Archivada',  cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};
const SMS_SEVERITY = {
  incidente:       { label: 'Incidente',       cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  incidente_grave: { label: 'Incidente grave', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  accidente:       { label: 'Accidente',       cls: 'bg-red-50 text-red-600 border-red-200' },
};
const CASE_STATUS = {
  abierto:          { label: 'Abierto',          cls: 'bg-sky-50 text-sky-600 border-sky-200' },
  en_analisis:      { label: 'En análisis',      cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  recibido:         { label: 'Recibido',         cls: 'bg-sky-50 text-sky-600 border-sky-200' },
  en_investigacion: { label: 'En investigación', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  cerrado:          { label: 'Cerrado',          cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  archivado:        { label: 'Archivado',        cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};
const HAZARD_SOURCE = {
  manual: { label: 'Manual', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  gap:    { label: 'GAP',    cls: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  spi:    { label: 'SPI',    cls: 'bg-purple-50 text-purple-600 border-purple-200' },
  vormor: { label: 'VOR/MOR', cls: 'bg-orange-50 text-orange-600 border-orange-200' },
};
const HAZARD_STATUS = {
  abierto:  { label: 'Abierto',  cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  mitigado: { label: 'Mitigado', cls: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  cerrado:  { label: 'Cerrado',  cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
};

const BARRIER_CATEGORY_COLOR = {
  'Técnica': '#4f46e5', 'Procedimental': '#0d9488', 'Humana': '#d97706', 'Organizacional': '#7c3aed',
};
const BARRIER_STATUS_STYLE = {
  'Activa':      { color: '#16a34a', icon: 'check_circle' },
  'En revisión': { color: '#d97706', icon: 'schedule' },
  'Retirada':    { color: '#dc2626', icon: 'cancel' },
};

const MAP_REFERENCE = [
  { icon: 'block',   color: 'text-red-600',    label: 'Zona Prohibida (P)',    desc: 'Vuelo absolutamente prohibido.' },
  { icon: 'warning', color: 'text-orange-600', label: 'Zona Restringida (R)',  desc: 'Requiere autorización previa de Aerocivil / UAEAC.' },
  { icon: 'flight',  color: 'text-blue-600',   label: 'CTR / TMA',             desc: 'Zona de control de aeródromo — coordinar con TWR.' },
  { icon: 'location_city', color: 'text-purple-600', label: 'Área Poblada',    desc: 'RAC 100 exige categoría BVLOS y seguro vigente.' },
];

function Pill({ map, value }) {
  const s = map[value] || { label: value || 'Sin clasificar', cls: 'bg-slate-50 text-slate-500 border-slate-200' };
  return <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase border whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

function TableShell({ title, empty, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-500">{title}</p>
      </div>
      {empty ? (
        <p className="py-12 text-center text-xs font-black text-slate-300 uppercase tracking-widest">{empty}</p>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </div>
  );
}

export default function SafetyPage() {
  const searchParams = useSearchParams();
  const initialTab = TABS.some(t => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'sora';

  const [tab, setTab]         = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId]     = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [barrierPanel, setBarrierPanel] = useState(null); // null | 'new' | barrier object
  const [hazardPanel, setHazardPanel] = useState(null);   // null | 'new' | hazard object
  const [indicatorPanel, setIndicatorPanel] = useState(null); // null | 'new' | indicator object

  const [sora, setSora]             = useState([]);
  const [barreras, setBarreras]     = useState([]);
  const [smsReports, setSmsReports] = useState([]);
  const [vorMor, setVorMor]         = useState([]);
  const [riskConfig, setRiskConfig] = useState({ probability: [], severity: [], tolerability: [] });
  const [hazards, setHazards]       = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [spiSubmission, setSpiSubmission] = useState(null);
  const [markingSpiSent, setMarkingSpiSent] = useState(false);

  const spiReportYear = new Date().getFullYear() - 1; // año que corresponde reportar (vencido)

  const loadAll = useCallback(async (organizationId) => {
    const [soraRes, barriersRes, smsRes, vorMorRes, riskConfigRes, hazardsRes, indicatorsRes, spiSubmissionRes] = await Promise.all([
      fetch('/api/sora/assessments').then(r => r.json()).catch(() => []),
      fetch('/api/safety/barriers').then(r => r.json()).catch(() => []),
      supabase.from('sms_reports')
        .select('id,severity,narrative,occurrence_date,created_at,updated_at,status,owner:owner_id(full_name)')
        .eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(100),
      fetch('/api/vor-mor?limit=50').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/safety/risk-config').then(r => r.json()).catch(() => ({ probability: [], severity: [], tolerability: [] })),
      fetch('/api/safety/hazards').then(r => r.json()).catch(() => []),
      fetch('/api/safety/indicators').then(r => r.json()).catch(() => []),
      fetch(`/api/safety/indicators/submission?year=${new Date().getFullYear() - 1}`).then(r => r.json()).catch(() => null),
    ]);
    setSora(Array.isArray(soraRes) ? soraRes : []);
    setBarreras(Array.isArray(barriersRes) ? barriersRes : []);
    setSmsReports(smsRes.data || []);
    setVorMor(Array.isArray(vorMorRes?.data) ? vorMorRes.data : []);
    setRiskConfig(riskConfigRes?.probability ? riskConfigRes : { probability: [], severity: [], tolerability: [] });
    setHazards(Array.isArray(hazardsRes) ? hazardsRes : []);
    setIndicators(Array.isArray(indicatorsRes) ? indicatorsRes : []);
    setSpiSubmission(spiSubmissionRes?.year ? spiSubmissionRes : null);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
      if (!prof?.organization_id) { setLoading(false); return; }
      setOrgId(prof.organization_id);
      await loadAll(prof.organization_id);
      setLoading(false);
    })();
  }, [loadAll]);

  const handleMarkSpiSent = async () => {
    setMarkingSpiSent(true);
    try {
      const res = await fetch('/api/safety/indicators/submission', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year: spiReportYear }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'Error al guardar');
      toast.success('Marcado como enviado a Aerocivil');
      setSpiSubmission(prev => ({ ...prev, year: spiReportYear, sent: true }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setMarkingSpiSent(false);
    }
  };

  // ── Reportes SMS + VOR/MOR consolidados en una sola lista de casos ──
  const allCases = useMemo(() => {
    const smsRows = smsReports.map(r => ({
      id: r.id, source: 'sms',
      title: r.narrative || 'Reporte SMS sin narrativa',
      classLabel: 'SMS', classCls: 'bg-slate-100 text-slate-600',
      date: r.occurrence_date || r.created_at,
      updatedAt: r.updated_at,
      severity: r.severity, status: r.status,
      reporter: r.owner?.full_name || 'Equipo SMS',
    }));
    const vorMorRows = vorMor.map(r => ({
      id: r.id, source: 'vormor',
      title: r.description || 'Sin descripción',
      classLabel: r.type,
      classCls: r.type === 'MOR' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600',
      date: r.occurrence_date || r.created_at,
      updatedAt: r.updated_at,
      severity: r.severity, status: r.status,
      reporter: r.is_anonymous ? 'Anónimo' : (r.reporter_name || 'Anónimo'),
    }));
    return [...smsRows, ...vorMorRows].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [smsReports, vorMor]);

  // ── CTA del hero, cambia según la pestaña activa ──
  const heroRight = (() => {
    if (tab === 'sora') {
      return (
        <button onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95">
          <span className="material-symbols-outlined text-base">add_circle</span>
          Nueva evaluación
        </button>
      );
    }
    if (tab === 'barreras') {
      return (
        <button onClick={() => setBarrierPanel('new')}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95">
          <span className="material-symbols-outlined text-base">add_circle</span>
          Nueva barrera
        </button>
      );
    }
    if (tab === 'riesgos' && riskConfig.probability.length > 0) {
      return (
        <button onClick={() => setHazardPanel('new')}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95">
          <span className="material-symbols-outlined text-base">add_circle</span>
          Nuevo peligro
        </button>
      );
    }
    if (tab === 'indicadores') {
      return (
        <button onClick={() => setIndicatorPanel('new')}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95">
          <span className="material-symbols-outlined text-base">add_circle</span>
          Nuevo indicador
        </button>
      );
    }
    const cfgByTab = {
      reportes: { href: '/dashboard/sms', label: 'Nuevo reporte', icon: 'report' },
      mapas:    { href: '/dashboard/safety/mapas', label: 'Abrir visor completo', icon: 'open_in_new' },
    };
    const cfg = cfgByTab[tab];
    if (!cfg) return null;
    return (
      <Link href={cfg.href}
        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95">
        <span className="material-symbols-outlined text-base">{cfg.icon}</span>
        {cfg.label}
      </Link>
    );
  })();

  // ── Stats reales por pestaña ──
  const soraStats = sora.length > 0 ? (() => {
    const completed = sora.filter(a => a.status === 'complete').length;
    const draft     = sora.filter(a => a.status === 'draft').length;
    const avgSail   = Math.round(sora.reduce((s, a) => s + (a.sail_level || 1), 0) / sora.length);
    return [
      { key: 'total', label: 'Evaluaciones',   value: sora.length,        icon: 'assignment', iconColor: '#ec5b13' },
      { key: 'sail',  label: 'SAIL promedio',  value: sailRoman(avgSail), icon: 'analytics',  iconColor: '#4f46e5' },
      { key: 'ok',    label: 'Completadas',    value: completed,         icon: 'check_circle', iconColor: '#16a34a' },
      { key: 'draft', label: 'En borrador',    value: draft,             icon: 'schedule', iconColor: draft > 0 ? '#d97706' : '#94a3b8' },
    ];
  })() : null;

  const thisYear = new Date().getFullYear().toString();
  const repStats = allCases.length > 0 ? (() => {
    const yearCount = allCases.filter(c => (c.date || '').startsWith(thisYear)).length;
    const closed = allCases.filter(c => ['cerrado', 'archivado'].includes(c.status));
    const openCount = allCases.filter(c => !['cerrado', 'archivado'].includes(c.status)).length;
    const avgDays = closed.length > 0
      ? Math.round(closed.reduce((s, c) => s + Math.max(0, (new Date(c.updatedAt) - new Date(c.date)) / 86400000), 0) / closed.length)
      : null;
    return [
      { key: 'year',   label: 'Reportes este año',        value: yearCount,     icon: 'health_and_safety', iconColor: '#d97706' },
      { key: 'closed', label: 'Cerrados',                 value: closed.length, icon: 'check_circle', iconColor: '#16a34a' },
      { key: 'avg',    label: 'Tiempo prom. de cierre',   value: avgDays !== null ? `${avgDays}d` : '—', icon: 'schedule', iconColor: '#4f46e5' },
      { key: 'open',   label: 'Abiertos / en análisis',   value: openCount,     icon: 'pending_actions', iconColor: openCount > 0 ? '#d97706' : '#94a3b8' },
    ];
  })() : null;

  const hazardStats = hazards.length > 0 ? (() => {
    const abiertos  = hazards.filter(h => h.status === 'abierto').length;
    const mitigados = hazards.filter(h => h.status === 'mitigado').length;
    const cerrados  = hazards.filter(h => h.status === 'cerrado').length;
    const inaceptables = hazards.filter(h => resolveZone(riskConfig.tolerability, h.initial_probability_code, h.initial_severity_code) === 'inaceptable').length;
    return [
      { key: 'total',   label: 'Peligros registrados', value: hazards.length, icon: 'warning', iconColor: '#ec5b13' },
      { key: 'inacept', label: 'Riesgo inaceptable',   value: inaceptables,  icon: 'dangerous', iconColor: inaceptables > 0 ? '#dc2626' : '#94a3b8' },
      { key: 'abierto', label: 'Abiertos',              value: abiertos,      icon: 'pending_actions', iconColor: abiertos > 0 ? '#d97706' : '#94a3b8' },
      { key: 'cerrado', label: 'Mitigados / cerrados',  value: mitigados + cerrados, icon: 'check_circle', iconColor: '#16a34a' },
    ];
  })() : null;

  const currentYear = new Date().getFullYear();
  const indicatorStats = indicators.length > 0 ? (() => {
    let inAlert = 0, withBaseline = 0;
    indicators.forEach(ind => {
      const prevStats = computeYearStats(ind.monthly || [], currentYear - 1);
      if (!prevStats) return;
      withBaseline++;
      const thisYearRows = (ind.monthly || []).filter(m => m.period.startsWith(String(currentYear)));
      if (thisYearRows.some(m => computeRate(m.event_count, m.denominator_value) > prevStats.alert1)) inAlert++;
    });
    return [
      { key: 'total',    label: 'Indicadores',    value: indicators.length, icon: 'monitoring', iconColor: '#ec5b13' },
      { key: 'alert',    label: 'En alerta este año', value: inAlert, icon: 'trending_up', iconColor: inAlert > 0 ? '#dc2626' : '#94a3b8' },
      { key: 'baseline', label: 'Con línea base',  value: withBaseline, icon: 'query_stats', iconColor: '#4f46e5' },
      { key: 'sent',     label: `Envío ${spiReportYear}`, value: spiSubmission?.sent ? 'Enviado' : 'Pendiente', icon: spiSubmission?.sent ? 'check_circle' : 'pending_actions', iconColor: spiSubmission?.sent ? '#16a34a' : '#d97706' },
    ];
  })() : null;

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-left animate-in fade-in duration-500 pb-24">

      {showWizard && (
        <SoraWizard
          onClose={() => setShowWizard(false)}
          onSaved={() => { setShowWizard(false); if (orgId) loadAll(orgId); }}
        />
      )}

      {barrierPanel && (
        <AddBarrierPanel
          barrier={barrierPanel === 'new' ? null : barrierPanel}
          onClose={() => setBarrierPanel(null)}
          onSuccess={() => { setBarrierPanel(null); if (orgId) loadAll(orgId); }}
        />
      )}

      {hazardPanel && (
        <AddHazardPanel
          hazard={hazardPanel === 'new' ? null : hazardPanel}
          probability={riskConfig.probability}
          severity={riskConfig.severity}
          tolerability={riskConfig.tolerability}
          onClose={() => setHazardPanel(null)}
          onSuccess={() => { setHazardPanel(null); if (orgId) loadAll(orgId); }}
        />
      )}

      {indicatorPanel === 'new' && (
        <AddIndicatorPanel
          onClose={() => setIndicatorPanel(null)}
          onSuccess={() => { setIndicatorPanel(null); if (orgId) loadAll(orgId); }}
        />
      )}
      {indicatorPanel && indicatorPanel !== 'new' && (
        <IndicatorDetailPanel
          indicator={indicators.find(i => i.id === indicatorPanel.id) || indicatorPanel}
          onClose={() => setIndicatorPanel(null)}
          onSuccess={() => orgId && loadAll(orgId)}
        />
      )}

      <PageHero
        eyebrow="Cumplimiento"
        title="Seguridad SMS"
        description="Sistema de Gestión de Seguridad Operacional (SMS)"
        right={heroRight}
      />

      {/* Sub-tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 py-3 shrink-0 border-b-2 transition-colors ${
              tab === t.id ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            <span className="material-symbols-outlined text-base">{t.icon}</span>
            <span className="text-xs font-black uppercase tracking-tight whitespace-nowrap">{t.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center font-black text-slate-300 uppercase text-xs tracking-widest animate-pulse">Cargando...</div>
      ) : (
        <>
          {/* ── SORA ── */}
          {tab === 'sora' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {soraStats && <KPIStrip variant="strip" items={soraStats} />}
              <TableShell title="Evaluaciones de riesgo específico por operación (metodología SORA — JARUS)"
                empty={sora.length === 0 ? 'Sin evaluaciones SORA registradas' : null}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <th className="px-5 py-3">Operación</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Aeronave</th>
                      <th className="px-4 py-3">GRC</th><th className="px-4 py-3">ARC</th><th className="px-4 py-3">SAIL</th><th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {sora.map(a => {
                      const sc = sailColor(a.sail_level);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 min-w-[180px]">
                            <p className="font-black text-slate-900">{a.operation_name}</p>
                            {a.location_name && <p className="text-xs text-slate-400">{a.location_name}</p>}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 font-medium whitespace-nowrap">{fmtDateMed(a.operation_date)}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-700">{a.aircraft?.model || <span className="text-slate-300 font-normal">—</span>}</td>
                          <td className="px-4 py-3.5 font-black text-slate-700">{a.final_grc}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-600">{a.final_arc}</td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${sc.bg} ${sc.text} ${sc.border}`}>{sailRoman(a.sail_level)}</span>
                          </td>
                          <td className="px-4 py-3.5"><Pill map={SORA_STATUS} value={a.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableShell>
              <div className="text-right">
                <Link href="/dashboard/sora" className="text-xs font-black text-orange-600 hover:text-orange-800 uppercase tracking-wide inline-flex items-center gap-1">
                  Ver módulo completo <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          )}

          {/* ── Evaluación de Riesgos ── */}
          {tab === 'riesgos' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {hazardStats && <KPIStrip variant="strip" items={hazardStats} />}
              <RiskMatrixEditor
                probability={riskConfig.probability}
                severity={riskConfig.severity}
                tolerability={riskConfig.tolerability}
                onSaved={() => orgId && loadAll(orgId)}
              />
              {riskConfig.probability.length > 0 && (
                <TableShell title="Registro de peligros — probabilidad, gravedad y mitigación aplicada"
                  empty={hazards.length === 0 ? 'Sin peligros registrados — crea el primero con "Nuevo peligro"' : null}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        <th className="px-5 py-3">Peligro</th><th className="px-4 py-3">Origen</th>
                        <th className="px-4 py-3">Riesgo inicial</th><th className="px-4 py-3">Riesgo residual</th>
                        <th className="px-4 py-3">Responsable</th><th className="px-4 py-3">Plazo</th><th className="px-4 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {hazards.map(h => {
                        const initZone = resolveZone(riskConfig.tolerability, h.initial_probability_code, h.initial_severity_code);
                        const residZone = resolveZone(riskConfig.tolerability, h.residual_probability_code, h.residual_severity_code);
                        const initMeta = initZone ? ZONE_META[initZone] : null;
                        const residMeta = residZone ? ZONE_META[residZone] : null;
                        return (
                          <tr key={h.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setHazardPanel(h)}>
                            <td className="px-5 py-3.5 max-w-xs">
                              <p className="font-bold text-slate-800 truncate">{h.description}</p>
                              {h.mitigation && <p className="text-xs text-slate-400 truncate">{h.mitigation}</p>}
                            </td>
                            <td className="px-4 py-3.5"><Pill map={HAZARD_SOURCE} value={h.source} /></td>
                            <td className="px-4 py-3.5">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-black" style={{ background: initMeta?.bg || '#f1f5f9', color: initMeta?.color || '#64748b' }}>
                                {riskIndex(h.initial_probability_code, h.initial_severity_code)}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              {residMeta ? (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-black" style={{ background: residMeta.bg, color: residMeta.color }}>
                                  {riskIndex(h.residual_probability_code, h.residual_severity_code)}
                                </span>
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 font-medium">{h.responsible || '—'}</td>
                            <td className="px-4 py-3.5 text-slate-500 font-medium whitespace-nowrap">{h.due_date ? fmtDateMed(h.due_date) : '—'}</td>
                            <td className="px-4 py-3.5"><Pill map={HAZARD_STATUS} value={h.status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableShell>
              )}
            </div>
          )}

          {/* ── Indicadores (SPI) ── */}
          {tab === 'indicadores' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {indicatorStats && <KPIStrip variant="strip" items={indicatorStats} />}

              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
                <div>
                  <p className="text-xs font-black text-indigo-800">Envío anual a Aerocivil — Indicadores {spiReportYear}</p>
                  <p className="text-[11px] text-indigo-700">Plazo: 30 de marzo de {spiReportYear + 1}.</p>
                </div>
                {spiSubmission?.sent ? (
                  <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
                    <span className="material-symbols-outlined text-sm">check_circle</span>Enviado
                  </span>
                ) : (
                  <button type="button" onClick={handleMarkSpiSent} disabled={markingSpiSent}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-200 bg-white text-emerald-700 font-black text-xs uppercase hover:bg-emerald-50 transition-all disabled:opacity-50">
                    <span className="material-symbols-outlined text-sm">{markingSpiSent ? 'progress_activity' : 'check_circle'}</span>
                    {markingSpiSent ? 'Guardando...' : 'Marcar como enviado'}
                  </button>
                )}
              </div>

              <TableShell title="Catálogo de indicadores de desempeño en Seguridad Operacional (SPI)"
                empty={indicators.length === 0 ? 'Sin indicadores registrados — crea el primero con "Nuevo indicador"' : null}>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {indicators.map(ind => {
                    const prevStats = computeYearStats(ind.monthly || [], currentYear - 1);
                    const thisYearRows = (ind.monthly || []).filter(m => m.period.startsWith(String(currentYear)));
                    const inAlert = prevStats && thisYearRows.some(m => computeRate(m.event_count, m.denominator_value) > prevStats.alert1);
                    return (
                      <button key={ind.id} type="button" onClick={() => setIndicatorPanel(ind)}
                        className="text-left border border-slate-200 rounded-2xl p-4 space-y-2 hover:border-orange-300 hover:shadow-sm transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {ind.denominator_unit.replace('_', ' ')}
                          </span>
                          {inAlert && <span className="material-symbols-outlined text-base text-red-500">trending_up</span>}
                        </div>
                        <p className="text-sm font-bold text-slate-800 leading-snug">{ind.name}</p>
                        <p className="text-[10.5px] text-slate-400">
                          {(ind.actions || []).length} plan(es) de acción · Mejora esperada {Math.round((ind.expected_improvement_pct || 0) * 100)}%
                        </p>
                        {!prevStats && <p className="text-[10px] font-bold text-amber-600">Sin línea base ({currentYear - 1} incompleto)</p>}
                      </button>
                    );
                  })}
                </div>
              </TableShell>
            </div>
          )}

          {/* ── Barreras ── */}
          {tab === 'barreras' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <TableShell title="Mitigaciones y controles de seguridad activos por categoría de riesgo"
                empty={barreras.length === 0 ? 'Sin barreras registradas — crea la primera con "Nueva barrera"' : null}>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {barreras.map(b => {
                    const st = BARRIER_STATUS_STYLE[b.status] || BARRIER_STATUS_STYLE['Activa'];
                    return (
                      <button key={b.id} type="button" onClick={() => setBarrierPanel(b)}
                        className="text-left border border-slate-200 rounded-2xl p-4 space-y-2 hover:border-orange-300 hover:shadow-sm transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full"
                            style={{ color: BARRIER_CATEGORY_COLOR[b.category], background: `${BARRIER_CATEGORY_COLOR[b.category]}18` }}>
                            {b.category}
                          </span>
                          <span className="material-symbols-outlined text-base" style={{ color: st.color }}>{st.icon}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 leading-snug">{b.name}</p>
                        {b.description && <p className="text-xs text-slate-500 leading-snug line-clamp-2">{b.description}</p>}
                        <p className="text-[9.5px] font-black uppercase" style={{ color: st.color }}>{b.status}</p>
                      </button>
                    );
                  })}
                </div>
              </TableShell>
            </div>
          )}

          {/* ── Reportes SMS (consolidado: SMS + VOR/MOR) ── */}
          {tab === 'reportes' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {repStats && <KPIStrip variant="strip" items={repStats} />}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 bg-orange-50 border border-orange-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-600 text-base">description</span>
                    <span className="text-xs font-black text-orange-800">VOR — Voluntary Occurrence Report</span>
                  </div>
                  <p className="text-xs text-orange-700 mt-1.5 leading-snug">Reporte voluntario de cualquier situación que pudo afectar la seguridad, sin obligación regulatoria de notificarla.</p>
                </div>
                <div className="flex-1 bg-red-50 border border-red-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-600 text-base">gavel</span>
                    <span className="text-xs font-black text-red-800">MOR — Mandatory Occurrence Report</span>
                  </div>
                  <p className="text-xs text-red-700 mt-1.5 leading-snug">Reporte obligatorio ante AeroCivil por incidentes/accidentes definidos en el reglamento RAC 100.</p>
                </div>
              </div>
              <TableShell title="Todos los reportes SMS registrados — resumen consolidado (incluye VOR y MOR)"
                empty={allCases.length === 0 ? 'Sin reportes registrados' : null}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <th className="px-5 py-3">Reporte</th><th className="px-4 py-3">Clasificación</th><th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Severidad</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Seguimiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {allCases.map(c => (
                      <tr key={`${c.source}-${c.id}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 max-w-xs">
                          <p className="text-slate-700 font-medium truncate">{c.title}</p>
                          <p className="text-xs text-slate-400">Por {c.reporter}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase ${c.classCls}`}>{c.classLabel}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 font-medium whitespace-nowrap">{fmtDateMed(c.date)}</td>
                        <td className="px-4 py-3.5"><Pill map={SMS_SEVERITY} value={c.severity} /></td>
                        <td className="px-4 py-3.5"><Pill map={CASE_STATUS} value={c.status} /></td>
                        <td className="px-4 py-3.5">
                          <Link href={`/dashboard/safety/case/${c.id}?source=${c.source}`}
                            className="flex items-center gap-1.5 text-orange-600 hover:text-orange-800 font-black text-[10.5px] uppercase">
                            <span className="material-symbols-outlined text-sm">checklist</span>Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
              <div className="flex justify-end gap-5">
                <Link href="/dashboard/vor-mor" className="text-xs font-black text-slate-500 hover:text-orange-600 uppercase tracking-wide inline-flex items-center gap-1">
                  Gestionar VOR/MOR <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
                <Link href="/dashboard/sms" className="text-xs font-black text-orange-600 hover:text-orange-800 uppercase tracking-wide inline-flex items-center gap-1">
                  Emitir nuevo reporte <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          )}

          {/* ── Mapas ── */}
          {tab === 'mapas' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
              <div className="lg:col-span-2 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden" style={{ height: '440px' }}>
                <iframe
                  src={ARCGIS_UAS_URL}
                  title="Visor UAS Aerocivil Colombia — Restricciones espacio aéreo"
                  className="w-full h-full border-0"
                  allow="geolocation"
                  loading="lazy"
                />
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipos de restricción aérea</p>
                {MAP_REFERENCE.map(r => (
                  <div key={r.label} className="border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3">
                    <span className={`material-symbols-outlined text-base shrink-0 ${r.color}`}>{r.icon}</span>
                    <div>
                      <p className="text-xs font-black text-slate-800">{r.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{r.desc}</p>
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/safety/mapas" className="text-xs font-black text-orange-600 hover:text-orange-800 uppercase tracking-wide inline-flex items-center gap-1 pt-1">
                  Ver referencia completa <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
