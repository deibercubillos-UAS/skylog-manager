'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { fmtDateMed } from '@/lib/formatters';
import { sailRoman, sailColor } from '@/lib/soraEngine';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';

const SoraWizard = dynamic(() => import('@/components/sora/SoraWizard'), { ssr: false });

// Mismo visor real que usa /dashboard/safety/mapas (const duplicada a propósito —
// es una URL de referencia, no lógica de negocio).
const ARCGIS_UAS_URL =
  'https://aerocivil.maps.arcgis.com/apps/instant/media/index.html?appid=b4be4d501c8d4bcabd0c35297521c16e&center=-74.1;4.5&level=6';

const TABS = [
  { id: 'sora',     label: 'Análisis SORA',           icon: 'analytics' },
  { id: 'barreras', label: 'Barreras de Seguridad',   icon: 'shield' },
  { id: 'reportes', label: 'Reportes SMS',            icon: 'health_and_safety' },
  { id: 'vormor',   label: 'VOR/MOR',                 icon: 'report' },
  { id: 'mapas',    label: 'Mapas de restricción',    icon: 'map' },
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
const VORMOR_STATUS = {
  recibido:         { label: 'Recibido',         cls: 'bg-sky-50 text-sky-600 border-sky-200' },
  en_investigacion: { label: 'En investigación', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  cerrado:          { label: 'Cerrado',          cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  archivado:        { label: 'Archivado',        cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};

const MAP_REFERENCE = [
  { icon: 'block',   color: 'text-red-600',    label: 'Zona Prohibida (P)',    desc: 'Vuelo absolutamente prohibido.' },
  { icon: 'warning', color: 'text-orange-600', label: 'Zona Restringida (R)',  desc: 'Requiere autorización previa de Aerocivil / UAEAC.' },
  { icon: 'flight',  color: 'text-blue-600',   label: 'CTR / TMA',             desc: 'Zona de control de aeródromo — coordinar con TWR.' },
  { icon: 'location_city', color: 'text-purple-600', label: 'Área Poblada',    desc: 'RAC 100 exige categoría BVLOS y seguro vigente.' },
];

function Pill({ map, value }) {
  const s = map[value] || { label: value || '—', cls: 'bg-slate-50 text-slate-500 border-slate-200' };
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
  const [tab, setTab]         = useState('sora');
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId]     = useState(null);
  const [showWizard, setShowWizard] = useState(false);

  const [sora, setSora]             = useState([]);
  const [barreras, setBarreras]     = useState([]);
  const [smsReports, setSmsReports] = useState([]);
  const [vorMor, setVorMor]         = useState([]);

  const loadAll = useCallback(async (organizationId) => {
    const [soraRes, defsRes, smsRes, vorMorRes] = await Promise.all([
      fetch('/api/sora/assessments').then(r => r.json()).catch(() => []),
      supabase.from('form_definitions').select('id,aircraft_model,label_text,field_number')
        .eq('organization_id', organizationId).eq('form_type', 'sora').order('field_number', { ascending: true }),
      supabase.from('sms_reports').select('id,severity,narrative,occurrence_date,created_at,status')
        .eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(100),
      fetch('/api/vor-mor?limit=50').then(r => r.json()).catch(() => ({ data: [] })),
    ]);
    setSora(Array.isArray(soraRes) ? soraRes : []);
    setBarreras((defsRes.data || []).map(d => ({ id: d.id, category: d.aircraft_model || 'General', label: d.label_text })));
    setSmsReports(smsRes.data || []);
    setVorMor(Array.isArray(vorMorRes?.data) ? vorMorRes.data : []);
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
    const cfgByTab = {
      barreras: { href: '/dashboard/safety-config', label: 'Nueva barrera', icon: 'add_circle' },
      reportes: { href: '/dashboard/sms', label: 'Nuevo reporte', icon: 'report' },
      vormor:   { href: '/dashboard/vor-mor', label: 'Nuevo reporte VOR/MOR', icon: 'report' },
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
  const smsStats = smsReports.length > 0 ? (() => {
    const yearCount = smsReports.filter(r => (r.created_at || '').startsWith(thisYear)).length;
    const inc   = smsReports.filter(r => r.severity === 'incidente').length;
    const grave = smsReports.filter(r => r.severity === 'incidente_grave').length;
    const acc   = smsReports.filter(r => r.severity === 'accidente').length;
    return [
      { key: 'year',  label: 'Reportes este año',  value: yearCount, icon: 'health_and_safety', iconColor: '#d97706' },
      { key: 'inc',   label: 'Incidentes',         value: inc,       icon: 'info', iconColor: '#2563eb' },
      { key: 'grave', label: 'Incidentes graves',  value: grave,     icon: 'warning', iconColor: grave > 0 ? '#d97706' : '#94a3b8' },
      { key: 'acc',   label: 'Accidentes',         value: acc,       icon: 'error', iconColor: acc > 0 ? '#dc2626' : '#94a3b8' },
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

          {/* ── Barreras ── */}
          {tab === 'barreras' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <TableShell title="Mitigaciones y OSOs configurados por tu organización"
                empty={barreras.length === 0 ? 'Sin barreras definidas — impórtalas desde Barreras de Seguridad' : null}>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {barreras.map(b => (
                    <div key={b.id} className="border border-slate-200 rounded-2xl p-4 space-y-2">
                      <span className="text-[9.5px] font-black uppercase tracking-wide text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{b.category}</span>
                      <p className="text-sm font-bold text-slate-800 leading-snug">{b.label}</p>
                    </div>
                  ))}
                </div>
              </TableShell>
              <div className="text-right">
                <Link href="/dashboard/safety-config" className="text-xs font-black text-orange-600 hover:text-orange-800 uppercase tracking-wide inline-flex items-center gap-1">
                  Gestionar barreras <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          )}

          {/* ── Reportes SMS ── */}
          {tab === 'reportes' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {smsStats && <KPIStrip variant="strip" items={smsStats} />}
              <TableShell title="Reportes SMS registrados por tu organización"
                empty={smsReports.length === 0 ? 'Sin reportes SMS registrados' : null}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <th className="px-5 py-3">Suceso</th><th className="px-4 py-3">Severidad</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {smsReports.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 max-w-xs"><p className="text-slate-700 font-medium truncate">{r.narrative || 'Sin narrativa'}</p></td>
                        <td className="px-4 py-3.5"><Pill map={SMS_SEVERITY} value={r.severity} /></td>
                        <td className="px-4 py-3.5 text-slate-500 font-medium whitespace-nowrap">{fmtDateMed(r.occurrence_date || r.created_at)}</td>
                        <td className="px-4 py-3.5"><Pill map={{}} value={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
              <div className="text-right">
                <Link href="/dashboard/sms" className="text-xs font-black text-orange-600 hover:text-orange-800 uppercase tracking-wide inline-flex items-center gap-1">
                  Emitir nuevo reporte <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          )}

          {/* ── VOR/MOR ── */}
          {tab === 'vormor' && (
            <div className="space-y-4 animate-in fade-in duration-200">
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
              <TableShell title="Reportes VOR/MOR recibidos"
                empty={vorMor.length === 0 ? 'Sin reportes VOR/MOR registrados' : null}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <th className="px-5 py-3">Reporte</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {vorMor.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 max-w-xs"><p className="text-slate-700 font-medium truncate">{r.description || 'Sin descripción'}</p></td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase border ${
                            r.type === 'MOR' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                          }`}>{r.type}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 font-medium whitespace-nowrap">{fmtDateMed(r.occurrence_date || r.created_at)}</td>
                        <td className="px-4 py-3.5"><Pill map={VORMOR_STATUS} value={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
              <div className="text-right">
                <Link href="/dashboard/vor-mor" className="text-xs font-black text-orange-600 hover:text-orange-800 uppercase tracking-wide inline-flex items-center gap-1">
                  Gestionar VOR/MOR <span className="material-symbols-outlined text-sm">arrow_forward</span>
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
