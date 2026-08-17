'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { fmtDateMed } from '@/lib/formatters';
import { sailRoman, sailColor } from '@/lib/soraEngine';
import { resolveZone, riskIndex, ZONE_META } from '@/lib/safetyRiskDefaults';
import { computeCaseCompliance } from '@/lib/vorMorCompliance';
import { computeRate, computeYearStats } from '@/lib/safetyIndicatorStats';
import { getOrgContext } from '@/lib/apiAuth';
import { nextOccurrence } from '@/lib/trainingCompliance';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';
import { toast } from '@/lib/toast';

const SoraWizard = dynamic(() => import('@/components/sora/SoraWizard'), { ssr: false });
const AddBarrierPanel = dynamic(() => import('@/components/safety/AddBarrierPanel'), { ssr: false });
const RiskMatrixEditor = dynamic(() => import('@/components/safety/RiskMatrixEditor'), { ssr: false });
const AddHazardPanel = dynamic(() => import('@/components/safety/AddHazardPanel'), { ssr: false });
const AddIndicatorPanel = dynamic(() => import('@/components/safety/AddIndicatorPanel'), { ssr: false });
const IndicatorDetailPanel = dynamic(() => import('@/components/safety/IndicatorDetailPanel'), { ssr: false });
const GapAssessmentPanel = dynamic(() => import('@/components/safety/GapAssessmentPanel'), { ssr: false });
const GapQuestionsConfigPanel = dynamic(() => import('@/components/safety/GapQuestionsConfigPanel'), { ssr: false });
const AddSmsSessionPanel = dynamic(() => import('@/components/safety/AddSmsSessionPanel'), { ssr: false });
const SmsAttendancePanel = dynamic(() => import('@/components/safety/SmsAttendancePanel'), { ssr: false });

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
  { id: 'mejora',   label: 'Mejora Continua',         icon: 'trending_up' },
  { id: 'acciones', label: 'Acciones Correctivas',    icon: 'checklist' },
  { id: 'plazos',   label: 'Reportes de Seg. Operacional', icon: 'gavel' },
  { id: 'barreras', label: 'Barreras de Seguridad',   icon: 'shield' },
  { id: 'mapas',    label: 'Mapas de restricción',    icon: 'map' },
  { id: 'capacitacion-sms', label: 'Capacitación SMS', icon: 'school' },
];

// Agrupación puramente de presentación (mismo patrón de UX del pedido del
// usuario: 9 sub-tabs en una sola fila con scroll horizontal obligaban a
// "buscar a ciegas" — se agrupan por afinidad temática, en filas que envuelven
// (flex-wrap) en vez de desplazarse, para que todas queden visibles de una vez).
const TAB_GROUPS = [
  { label: 'Evaluación',    tabIds: ['sora', 'riesgos'] },
  { label: 'Desempeño',     tabIds: ['indicadores', 'mejora'] },
  { label: 'Cumplimiento',  tabIds: ['acciones', 'plazos'] },
  { label: 'Recursos',      tabIds: ['barreras', 'mapas', 'capacitacion-sms'] },
];

const SORA_STATUS = {
  complete: { label: 'Completada', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  draft:    { label: 'Borrador',   cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  archived: { label: 'Archivada',  cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};
const HAZARD_SOURCE = {
  manual: { label: 'Manual', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  gap:    { label: 'GAP',    cls: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  spi:    { label: 'SPI',    cls: 'bg-purple-50 text-purple-600 border-purple-200' },
  vormor: { label: 'VOR/MOR', cls: 'bg-orange-50 text-orange-600 border-orange-200' },
};
const ACTION_STATUS = {
  pendiente:    { label: 'Pendiente',    cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  en_progreso:  { label: 'En progreso',  cls: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  completado:   { label: 'Completado',   cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
};
const ACTION_SOURCE_CLS = {
  case: 'bg-orange-50 text-orange-600',
  spi:  'bg-purple-50 text-purple-600',
  gap:  'bg-indigo-50 text-indigo-600',
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
  const router = useRouter();
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
  const [vorMor, setVorMor]         = useState([]);
  const [riskConfig, setRiskConfig] = useState({ probability: [], severity: [], tolerability: [] });
  const [hazards, setHazards]       = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [spiSubmission, setSpiSubmission] = useState(null);
  const [markingSpiSent, setMarkingSpiSent] = useState(false);
  const [gapQuestions, setGapQuestions] = useState([]);
  const [gapAssessments, setGapAssessments] = useState([]);
  const [gapPanel, setGapPanel] = useState(null); // null | assessment object
  const [creatingGap, setCreatingGap] = useState(false);
  const [gapConfigOpen, setGapConfigOpen] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [notifyingCaseId, setNotifyingCaseId] = useState(null);
  const [plazosTypeFilter, setPlazosTypeFilter] = useState('todos');
  const [smsSessions, setSmsSessions] = useState([]);
  const [sessionPanel, setSessionPanel] = useState(null);     // null | 'new' | session object
  const [attendancePanel, setAttendancePanel] = useState(null); // null | session object
  const [caseActions, setCaseActions] = useState([]);
  const [actionSourceFilter, setActionSourceFilter] = useState('todas');
  const [actionStatusFilter, setActionStatusFilter] = useState('abiertas');

  const spiReportYear = new Date().getFullYear() - 1; // año que corresponde reportar (vencido)

  const loadAll = useCallback(async (organizationId) => {
    const [soraRes, barriersRes, vorMorRes, riskConfigRes, hazardsRes, indicatorsRes, spiSubmissionRes, gapQuestionsRes, gapAssessmentsRes, caseActionsRes, smsSessionsRes] = await Promise.all([
      fetch('/api/sora/assessments').then(r => r.json()).catch(() => []),
      fetch('/api/safety/barriers').then(r => r.json()).catch(() => []),
      fetch('/api/vor-mor?limit=50').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/safety/risk-config').then(r => r.json()).catch(() => ({ probability: [], severity: [], tolerability: [] })),
      fetch('/api/safety/hazards').then(r => r.json()).catch(() => []),
      fetch('/api/safety/indicators').then(r => r.json()).catch(() => []),
      fetch(`/api/safety/indicators/submission?year=${new Date().getFullYear() - 1}`).then(r => r.json()).catch(() => null),
      fetch('/api/safety/gap/questions').then(r => r.json()).catch(() => []),
      fetch('/api/safety/gap/assessments').then(r => r.json()).catch(() => []),
      fetch('/api/safety/case/actions').then(r => r.json()).catch(() => []),
      fetch('/api/safety/training/sessions').then(r => r.json()).catch(() => []),
    ]);
    setSora(Array.isArray(soraRes) ? soraRes : []);
    setBarreras(Array.isArray(barriersRes) ? barriersRes : []);
    setVorMor(Array.isArray(vorMorRes?.data) ? vorMorRes.data : []);
    setRiskConfig(riskConfigRes?.probability ? riskConfigRes : { probability: [], severity: [], tolerability: [] });
    setHazards(Array.isArray(hazardsRes) ? hazardsRes : []);
    setIndicators(Array.isArray(indicatorsRes) ? indicatorsRes : []);
    setSpiSubmission(spiSubmissionRes?.year ? spiSubmissionRes : null);
    setGapQuestions(Array.isArray(gapQuestionsRes) ? gapQuestionsRes : []);
    setGapAssessments(Array.isArray(gapAssessmentsRes) ? gapAssessmentsRes : []);
    setCaseActions(Array.isArray(caseActionsRes) ? caseActionsRes : []);
    setSmsSessions(Array.isArray(smsSessionsRes) ? smsSessionsRes : []);
  }, []);

  useEffect(() => {
    (async () => {
      const ctx = await getOrgContext(supabase);
      if (!ctx.user) { setLoading(false); return; }
      if (!ctx.orgId) { setLoading(false); return; }
      setOrgId(ctx.orgId);
      await loadAll(ctx.orgId);
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

  const handleCreateGapAssessment = async () => {
    if (gapQuestions.length === 0) {
      toast.warn('No tienes preguntas visibles en el catálogo GAP — revisa "Configurar preguntas".');
      return;
    }
    setCreatingGap(true);
    try {
      const res = await fetch('/api/safety/gap/assessments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la evaluación.');
      setGapAssessments(prev => [{ ...data, responses: [] }, ...prev]);
      setGapPanel({ ...data, responses: [] });
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setCreatingGap(false);
    }
  };

  const handleLoadExampleIndicators = async () => {
    setLoadingExamples(true);
    try {
      const res = await fetch('/api/safety/indicators/examples', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar los indicadores de ejemplo.');
      toast.success(data.inserted > 0 ? `${data.inserted} indicador(es) de ejemplo agregado(s).` : 'Ya tenías todos los indicadores de ejemplo cargados.');
      if (orgId) loadAll(orgId);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoadingExamples(false);
    }
  };

  const handleNotifyCase = async (caseId) => {
    setNotifyingCaseId(caseId);
    try {
      const res = await fetch('/api/safety/case/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: caseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al marcar la radicación.');
      toast.success('Marcado como radicado en IRIS.');
      setVorMor(prev => prev.map(v => v.id === caseId ? { ...v, aerocivil_notified_at: data.aerocivil_notified_at } : v));
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setNotifyingCaseId(null);
    }
  };

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
    if (tab === 'mejora') {
      return (
        <div className="flex items-center gap-2">
          <button onClick={() => setGapConfigOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95">
            <span className="material-symbols-outlined text-base">tune</span>
            Configurar preguntas
          </button>
          <button onClick={handleCreateGapAssessment} disabled={creatingGap}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50">
            <span className="material-symbols-outlined text-base">add_circle</span>
            {creatingGap ? 'Creando...' : 'Nueva evaluación'}
          </button>
        </div>
      );
    }
    if (tab === 'capacitacion-sms') {
      return (
        <button onClick={() => setSessionPanel('new')}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95">
          <span className="material-symbols-outlined text-base">add_circle</span>
          Nueva sesión
        </button>
      );
    }
    const cfgByTab = {
      mapas: { href: '/dashboard/safety/mapas', label: 'Abrir visor completo', icon: 'open_in_new' },
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

  const gapPct = (assessment) => {
    const responses = assessment?.responses || [];
    const answered = responses.filter(r => r.response).length;
    if (!answered) return null;
    const si = responses.filter(r => r.response === 'si').length;
    return Math.round((si / answered) * 100);
  };

  const gapStats = gapAssessments.length > 0 ? (() => {
    const latest = gapAssessments[0];
    const previous = gapAssessments[1];
    const latestPct = gapPct(latest);
    const previousPct = gapPct(previous);
    const delta = latestPct !== null && previousPct !== null ? latestPct - previousPct : null;
    const openFindings = (latest?.responses || []).filter(r => r.response === 'no' && r.status !== 'completado').length;
    return [
      { key: 'total',   label: 'Evaluaciones',      value: gapAssessments.length, icon: 'fact_check', iconColor: '#ec5b13' },
      { key: 'latest',  label: 'Cumplimiento último', value: latestPct !== null ? `${latestPct}%` : '—', icon: 'insights', iconColor: '#4f46e5' },
      { key: 'delta',   label: 'Tendencia vs. anterior', value: delta !== null ? `${delta >= 0 ? '+' : ''}${delta} pts` : '—', icon: delta > 0 ? 'trending_up' : 'trending_down', iconColor: delta === null ? '#94a3b8' : delta >= 0 ? '#16a34a' : '#dc2626' },
      { key: 'open',    label: 'Hallazgos abiertos', value: openFindings, icon: 'flag', iconColor: openFindings > 0 ? '#d97706' : '#94a3b8' },
    ];
  })() : null;

  // ── Tablero consolidado de Acciones Correctivas: agregación de solo-lectura
  // sobre 3 fuentes ya existentes (casos SMS/VOR/MOR, planes de acción SPI,
  // hallazgos GAP) — sin tabla unificada nueva, la edición ocurre en el
  // origen (ver docs/plan-mejora-sms-bitafly.md, Fase 5).
  const questionById = useMemo(() => {
    const map = {};
    gapQuestions.forEach(q => { map[q.id] = q; });
    return map;
  }, [gapQuestions]);

  const correctiveActions = useMemo(() => {
    const rows = [];

    caseActions.forEach(a => {
      const isSms = !!a.sms_report_id;
      rows.push({
        id: `case-${a.id}`,
        source: 'case',
        sourceLabel: isSms ? 'SMS' : (a.vor_mor?.type || 'VOR/MOR'),
        title: a.label,
        context: a.sms_report?.narrative || a.vor_mor?.description || '',
        responsible: a.owner,
        due_date: a.due_date,
        status: a.done ? 'completado' : 'pendiente',
        onClick: () => router.push(`/dashboard/safety/case/${isSms ? a.sms_report_id : a.vor_mor_id}?source=${isSms ? 'sms' : 'vormor'}`),
      });
    });

    indicators.forEach(ind => {
      (ind.actions || []).forEach(act => {
        let estDue = null;
        if (act.execution_days) {
          const base = new Date(act.created_at);
          base.setDate(base.getDate() + Number(act.execution_days));
          estDue = base.toISOString().split('T')[0];
        }
        rows.push({
          id: `spi-${act.id}`,
          source: 'spi',
          sourceLabel: 'SPI',
          title: act.action_plan,
          context: ind.name,
          responsible: null,
          due_date: estDue,
          status: act.status,
          onClick: () => { setTab('indicadores'); setIndicatorPanel(ind); },
        });
      });
    });

    gapAssessments.forEach(assess => {
      (assess.responses || []).filter(r => r.response === 'no').forEach(r => {
        const q = questionById[r.question_id];
        rows.push({
          id: `gap-${r.id}`,
          source: 'gap',
          sourceLabel: 'GAP',
          title: q?.question_text || 'Hallazgo GAP',
          context: assess.title || `Autoevaluación ${fmtDateMed(assess.assessment_date)}`,
          responsible: r.responsible,
          due_date: r.evidence_date,
          status: r.status,
          onClick: () => { setTab('mejora'); setGapPanel(assess); },
        });
      });
    });

    return rows;
  }, [caseActions, indicators, gapAssessments, questionById, router]);

  const filteredActions = correctiveActions.filter(a => {
    if (actionSourceFilter !== 'todas' && a.source !== actionSourceFilter) return false;
    if (actionStatusFilter === 'abiertas' && a.status === 'completado') return false;
    if (actionStatusFilter === 'completadas' && a.status !== 'completado') return false;
    return true;
  });

  const todayISO = new Date().toISOString().split('T')[0];
  const actionsStats = correctiveActions.length > 0 ? (() => {
    const open = correctiveActions.filter(a => a.status !== 'completado');
    const overdue = open.filter(a => a.due_date && a.due_date < todayISO);
    return [
      { key: 'total',    label: 'Acciones totales', value: correctiveActions.length, icon: 'checklist', iconColor: '#ec5b13' },
      { key: 'open',     label: 'Abiertas',         value: open.length, icon: 'pending_actions', iconColor: open.length > 0 ? '#d97706' : '#94a3b8' },
      { key: 'overdue',  label: 'Vencidas',         value: overdue.length, icon: 'schedule', iconColor: overdue.length > 0 ? '#dc2626' : '#94a3b8' },
      { key: 'sources',  label: 'Fuentes',          value: `${[...new Set(correctiveActions.map(a => a.source))].length}/3`, icon: 'hub', iconColor: '#4f46e5' },
    ];
  })() : null;

  // ── Reportes de Seguridad Operacional: cumplimiento de plazo de
  // radicación en IRIS para cada caso VOR/MOR (Fase 6) ──
  const vorMorCompliance = useMemo(() => {
    return vorMor.map(v => ({ ...v, compliance: computeCaseCompliance(v) })).filter(v => v.compliance);
  }, [vorMor]);

  const filteredPlazos = vorMorCompliance.filter(v => plazosTypeFilter === 'todos' || v.type === plazosTypeFilter);

  const plazosStats = vorMorCompliance.length > 0 ? (() => {
    const morCases = vorMorCompliance.filter(v => v.type === 'MOR');
    const pending = vorMorCompliance.filter(v => v.compliance.status === 'pendiente');
    const overdue = vorMorCompliance.filter(v => v.compliance.status === 'vencido');
    const morOverdue = morCases.filter(v => v.compliance.status === 'vencido');
    return [
      { key: 'total',      label: 'Casos VOR/MOR',   value: vorMorCompliance.length, icon: 'gavel', iconColor: '#ec5b13' },
      { key: 'pending',    label: 'Pendientes',      value: pending.length, icon: 'pending_actions', iconColor: pending.length > 0 ? '#d97706' : '#94a3b8' },
      { key: 'overdue',    label: 'Vencidos',        value: overdue.length, icon: 'schedule', iconColor: overdue.length > 0 ? '#dc2626' : '#94a3b8' },
      { key: 'morOverdue', label: 'MOR vencidos (regulatorio)', value: morOverdue.length, icon: 'warning', iconColor: morOverdue.length > 0 ? '#dc2626' : '#94a3b8' },
    ];
  })() : null;

  // ── Capacitación SMS: cronograma de sesiones + asistencia (Fase 7) ──
  const thisYearISO = new Date().getFullYear().toString();
  const smsSessionStats = smsSessions.length > 0 ? (() => {
    const totalAttendance = smsSessions.reduce((s, sess) => s + (sess.attendance || []).length, 0);
    const attendanceThisYear = smsSessions.reduce(
      (s, sess) => s + (sess.attendance || []).filter(a => (a.attended_date || '').startsWith(thisYearISO)).length, 0
    );
    const uniqueAttendees = new Set();
    smsSessions.forEach(sess => (sess.attendance || []).forEach(a => uniqueAttendees.add(a.profile_id)));
    return [
      { key: 'total',     label: 'Sesiones en cronograma', value: smsSessions.length, icon: 'school', iconColor: '#ec5b13' },
      { key: 'attYear',   label: `Asistencias ${thisYearISO}`, value: attendanceThisYear, icon: 'event_available', iconColor: '#16a34a' },
      { key: 'attTotal',  label: 'Asistencias totales',    value: totalAttendance, icon: 'groups', iconColor: '#4f46e5' },
      { key: 'people',    label: 'Personal con asistencia', value: uniqueAttendees.size, icon: 'badge', iconColor: '#94a3b8' },
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

      {gapPanel && gapQuestions.length > 0 && (
        <GapAssessmentPanel
          assessment={gapAssessments.find(a => a.id === gapPanel.id) || gapPanel}
          questions={gapQuestions}
          onClose={() => setGapPanel(null)}
          onSuccess={() => { setGapPanel(null); if (orgId) loadAll(orgId); }}
        />
      )}

      {gapConfigOpen && (
        <GapQuestionsConfigPanel
          onClose={() => setGapConfigOpen(false)}
          onChanged={() => orgId && loadAll(orgId)}
        />
      )}

      {sessionPanel && (
        <AddSmsSessionPanel
          session={sessionPanel === 'new' ? null : sessionPanel}
          onClose={() => setSessionPanel(null)}
          onSuccess={() => { setSessionPanel(null); if (orgId) loadAll(orgId); }}
        />
      )}

      {attendancePanel && (
        <SmsAttendancePanel
          session={smsSessions.find(s => s.id === attendancePanel.id) || attendancePanel}
          onClose={() => setAttendancePanel(null)}
          onSuccess={() => orgId && loadAll(orgId)}
        />
      )}

      <PageHero
        eyebrow="Documentación"
        title="Seguridad SMS"
        description="Sistema de Gestión de Seguridad Operacional (SMS)"
        right={heroRight}
      />

      {/* Sub-tabs — agrupados por afinidad, en filas que envuelven (sin scroll
          horizontal) para que las 9 secciones queden visibles de una vez */}
      <div className="flex flex-wrap items-start gap-x-5 gap-y-2.5 border-b border-slate-200 pb-2.5">
        {TAB_GROUPS.map((g, gi) => (
          <div key={g.label} className={`flex items-start gap-1 ${gi > 0 ? 'md:pl-5 md:border-l md:border-slate-200' : ''}`}>
            <div className="flex flex-col gap-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-0.5">{g.label}</p>
              <div className="flex flex-wrap gap-1">
                {g.tabIds.map(id => {
                  const t = TABS.find(x => x.id === id);
                  if (!t) return null;
                  const active = tab === t.id;
                  return (
                    <button key={t.id} type="button" onClick={() => setTab(t.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
                        active ? 'bg-orange-50 border-orange-200 text-orange-600'
                               : 'bg-white border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}>
                      <span className="material-symbols-outlined text-base">{t.icon}</span>
                      <span className="text-xs font-black uppercase tracking-tight whitespace-nowrap">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
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

              {indicators.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center space-y-4">
                  <span className="material-symbols-outlined text-4xl text-orange-500">monitoring</span>
                  <p className="text-sm font-black text-slate-800">Aún no tienes indicadores SPI registrados</p>
                  <p className="text-xs font-semibold text-slate-500 max-w-md mx-auto">
                    Si no sabes por dónde empezar, carga un set de ejemplo (aterrizajes de emergencia, pérdida de
                    enlace, RTH por batería crítica, etc.) — son solo definiciones, sin datos inventados; luego
                    edítalas, bórralas o agrega las tuyas y empieza a capturar tus meses reales.
                  </p>
                  <button type="button" onClick={handleLoadExampleIndicators} disabled={loadingExamples}
                    className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50">
                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                    {loadingExamples ? 'Cargando...' : 'Cargar ejemplos de indicadores'}
                  </button>
                </div>
              ) : (
                <TableShell title="Catálogo de indicadores de desempeño en Seguridad Operacional (SPI)">
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
                          {ind.description && <p className="text-[10.5px] text-slate-500 leading-snug line-clamp-2">{ind.description}</p>}
                          <p className="text-[10.5px] text-slate-400">
                            {(ind.actions || []).length} plan(es) de acción · Mejora esperada {Math.round((ind.expected_improvement_pct || 0) * 100)}%
                          </p>
                          {!prevStats && <p className="text-[10px] font-bold text-amber-600">Sin línea base ({currentYear - 1} incompleto)</p>}
                        </button>
                      );
                    })}
                  </div>
                </TableShell>
              )}
            </div>
          )}

          {/* ── Mejora Continua (GAP) ── */}
          {tab === 'mejora' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {gapStats && <KPIStrip variant="strip" items={gapStats} />}
              <TableShell title="Autoevaluaciones GAP del SMS (Apéndice 1, MAUT-5.0-22-017 — 100 preguntas / 4 componentes)"
                empty={gapAssessments.length === 0 ? 'Sin evaluaciones registradas — crea la primera con "Nueva evaluación"' : null}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <th className="px-5 py-3">Evaluación</th><th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Progreso</th><th className="px-4 py-3">Cumplimiento (Sí)</th><th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {gapAssessments.map(a => {
                      const answered = (a.responses || []).filter(r => r.response).length;
                      const pct = gapPct(a);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setGapPanel(a)}>
                          <td className="px-5 py-3.5 font-bold text-slate-800">{a.title || 'Autoevaluación GAP'}</td>
                          <td className="px-4 py-3.5 text-slate-500 font-medium whitespace-nowrap">{fmtDateMed(a.assessment_date)}</td>
                          <td className="px-4 py-3.5 text-slate-500 font-medium">{answered}/{gapQuestions.length}</td>
                          <td className="px-4 py-3.5">
                            {pct !== null ? (
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${pct >= 80 ? 'bg-emerald-50 text-emerald-700' : pct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                {pct}%
                              </span>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="material-symbols-outlined text-base text-slate-300">chevron_right</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableShell>
            </div>
          )}

          {/* ── Acciones Correctivas (consolidado, solo-lectura) ── */}
          {tab === 'acciones' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {actionsStats && <KPIStrip variant="strip" items={actionsStats} />}
              <div className="flex flex-wrap items-center gap-2">
                {[['todas', 'Todas'], ['case', 'Casos SMS/VOR/MOR'], ['spi', 'Indicadores SPI'], ['gap', 'Mejora Continua']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setActionSourceFilter(val)}
                    className={`text-xs font-bold px-3.5 py-2 rounded-full transition-all ${
                      actionSourceFilter === val ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    {label}
                  </button>
                ))}
                <span className="w-px h-5 bg-slate-200 mx-1" />
                {[['abiertas', 'Abiertas'], ['completadas', 'Completadas'], ['todos', 'Todos los estados']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setActionStatusFilter(val)}
                    className={`text-xs font-bold px-3.5 py-2 rounded-full transition-all ${
                      actionStatusFilter === val ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              <TableShell title="Acciones correctivas de todas las fuentes — clic en una fila abre su pantalla de origen para editar"
                empty={filteredActions.length === 0 ? 'Sin acciones correctivas con estos filtros' : null}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <th className="px-5 py-3">Acción</th><th className="px-4 py-3">Fuente</th>
                      <th className="px-4 py-3">Responsable</th><th className="px-4 py-3">Plazo</th><th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredActions.map(a => {
                      const overdue = a.due_date && a.due_date < todayISO && a.status !== 'completado';
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={a.onClick}>
                          <td className="px-5 py-3.5 max-w-sm">
                            <p className="font-bold text-slate-800 truncate">{a.title}</p>
                            {a.context && <p className="text-xs text-slate-400 truncate">{a.context}</p>}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase ${ACTION_SOURCE_CLS[a.source]}`}>{a.sourceLabel}</span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 font-medium">{a.responsible || '—'}</td>
                          <td className={`px-4 py-3.5 font-medium whitespace-nowrap ${overdue ? 'text-red-600 font-black' : 'text-slate-500'}`}>
                            {a.due_date ? fmtDateMed(a.due_date) : '—'}
                          </td>
                          <td className="px-4 py-3.5"><Pill map={ACTION_STATUS} value={a.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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

          {/* ── Reportes de Seguridad Operacional (cumplimiento de plazo IRIS) ── */}
          {tab === 'plazos' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {plazosStats && <KPIStrip variant="strip" items={plazosStats} />}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-800 leading-relaxed">
                  <span className="font-black">MOR</span>: plazo regulatorio de 5 días hábiles (Directiva 02-24) para
                  radicar en IRIS desde la ocurrencia. <span className="font-black">VOR</span>: mismo mecanismo, como
                  plazo <span className="font-black">interno sugerido</span> — no es una obligación regulatoria.
                  &quot;Días hábiles&quot; excluye solo sábados/domingos (aproximación, sin calendario de festivos).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[['todos', 'Todos'], ['MOR', 'MOR'], ['VOR', 'VOR']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setPlazosTypeFilter(val)}
                    className={`text-xs font-bold px-3.5 py-2 rounded-full transition-all ${
                      plazosTypeFilter === val ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              <TableShell title="Cumplimiento de plazo de radicación en IRIS por caso VOR/MOR"
                empty={filteredPlazos.length === 0 ? 'Sin reportes VOR/MOR registrados' : null}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <th className="px-5 py-3">Reporte</th><th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Ocurrencia</th><th className="px-4 py-3">Plazo</th>
                      <th className="px-4 py-3">Estado</th><th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredPlazos.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 max-w-xs">
                          <Link href={`/dashboard/safety/case/${v.id}?source=vormor`} className="font-bold text-slate-800 hover:text-orange-600 truncate block">
                            {v.description || 'Sin descripción'}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase ${v.type === 'MOR' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>{v.type}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 font-medium whitespace-nowrap">{v.occurrence_date ? fmtDateMed(v.occurrence_date) : '—'}</td>
                        <td className="px-4 py-3.5 text-slate-500 font-medium whitespace-nowrap">{fmtDateMed(v.compliance.deadline)}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase ${
                            v.compliance.status === 'enviado' ? 'bg-emerald-50 text-emerald-600' : v.compliance.status === 'vencido' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {v.compliance.status === 'enviado' ? 'Radicado' : v.compliance.status === 'vencido' ? 'Vencido' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {v.compliance.status !== 'enviado' && (
                            <button type="button" onClick={() => handleNotifyCase(v.id)} disabled={notifyingCaseId === v.id}
                              className="text-[10.5px] font-black text-orange-600 hover:text-orange-800 uppercase disabled:opacity-50">
                              {notifyingCaseId === v.id ? 'Guardando...' : 'Marcar radicado'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
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

          {/* ── Capacitación SMS ── */}
          {tab === 'capacitacion-sms' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {smsSessionStats && <KPIStrip variant="strip" items={smsSessionStats} />}
              <TableShell title="Cronograma de capacitación SMS (Inducción, SORA, Factores Humanos, Cultura Justa, TEM, etc.)"
                empty={smsSessions.length === 0 ? 'Sin sesiones de capacitación SMS registradas' : null}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <th className="px-5 py-3">Tema</th><th className="px-4 py-3">Recurrencia</th>
                      <th className="px-4 py-3">Próxima ocurrencia</th><th className="px-4 py-3">Asistencias registradas</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {smsSessions.map(sess => {
                      const { date: nextDate } = nextOccurrence(sess);
                      const recLabel = { semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual', personalizado: `Cada ${sess.recurrence_days} días` }[sess.recurrence] || sess.recurrence;
                      return (
                        <tr key={sess.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setAttendancePanel(sess)}>
                          <td className="px-5 py-3.5">
                            <p className="font-black text-slate-900">{sess.topic}</p>
                            {sess.notes && <p className="text-xs text-slate-400 truncate max-w-xs">{sess.notes}</p>}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-600 whitespace-nowrap">{recLabel}</td>
                          <td className="px-4 py-3.5 text-slate-500 font-medium whitespace-nowrap">{fmtDateMed(nextDate)}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-700">{(sess.attendance || []).length}</td>
                          <td className="px-4 py-3.5 text-right">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setSessionPanel(sess); }}
                              className="size-8 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableShell>
            </div>
          )}
        </>
      )}
    </div>
  );
}
