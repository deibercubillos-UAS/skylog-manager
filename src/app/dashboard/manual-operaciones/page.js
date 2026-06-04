'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * /dashboard/manual-operaciones
 *
 * Página de descarga de capítulos del Manual de Operaciones RAC 100.
 * Cada card representa un capítulo o sección del MO.
 * Solo muestra botón de descarga — sin editor en página.
 */

// Estado de disponibilidad de cada sección
const MANUALS = [
  {
    id: 'cap5',
    chapter: '5',
    code:    'MO-CAP5',
    title:   'Capítulo 5 — Procedimientos Operacionales',
    description: 'Pre-vuelo · En vuelo · Post-vuelo · Emergencias · Limitaciones operacionales RAC 100',
    icon: 'checklist_rtl',
    available: true,
    tags: ['RAC 100', 'JARUS SORA', 'F-OPS-001', 'F-OPS-002', 'F-MNT-003'],
  },
  {
    id: 'om-operaciones',
    chapter: 'om-operaciones',
    code:    'OM-OPS',
    title:   'OM — Operaciones',
    description: 'Planificación de operaciones · Coordinación AeroCivil · Gestión de autorizaciones · Análisis de riesgo',
    icon: 'flight_takeoff',
    available: false,
    tags: ['Próximamente'],
  },
  {
    id: 'om-sms',
    chapter: 'om-sms',
    code:    'OM-SMS',
    title:   'OM — SMS (Gestión de Seguridad)',
    description: 'Política SMS · Barreras operacionales · Reportes VOR/MOR · Indicadores de seguridad · OSOs JARUS',
    icon: 'health_and_safety',
    available: false,
    tags: ['Próximamente'],
  },
];

export default function ManualOperacionesPage() {
  const [org, setOrg]         = useState(null);
  const [stats, setStats]     = useState({ aircraft: 0, pilots: 0 });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState({}); // { [id]: boolean }
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: prof } = await supabase
          .from('profiles')
          .select('organization_id, role')
          .eq('id', user.id)
          .single();

        if (!prof?.organization_id) return;

        const [orgRes, aircraftRes, pilotsRes] = await Promise.all([
          supabase
            .from('organizations')
            .select('company_name,tax_id,tax_id_type,dan_number,legal_rep,logo_url')
            .eq('id', prof.organization_id)
            .single(),
          supabase
            .from('aircraft')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', prof.organization_id),
          supabase
            .from('pilots')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', prof.organization_id)
            .eq('is_active', true),
        ]);

        setOrg(orgRes.data);
        setStats({
          aircraft: aircraftRes.count || 0,
          pilots:   pilotsRes.count   || 0,
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleDownload(manual) {
    if (!manual.available || downloading[manual.id]) return;
    setDownloading(prev => ({ ...prev, [manual.id]: true }));
    setError(null);
    try {
      const res = await fetch(`/api/reports/manual?chapter=${manual.chapter}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      const anchor   = document.createElement('a');
      const dateStr  = new Date().toISOString().split('T')[0];
      const slug     = org?.company_name?.replace(/\s+/g, '-').toLowerCase() || 'operador';
      anchor.href    = url;
      anchor.download = `MO-Cap${manual.chapter}-${slug}-${dateStr}.docx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(prev => ({ ...prev, [manual.id]: false }));
    }
  }

  // Verificar datos mínimos de la organización
  const checks = org ? [
    { key: 'nombre',  label: 'Razón Social',        ok: !!org.company_name, link: '/dashboard/settings' },
    { key: 'nit',     label: 'NIT / Identificación', ok: !!org.tax_id,       link: '/dashboard/settings' },
    { key: 'dan',     label: 'Número DAN',           ok: !!org.dan_number,   link: '/dashboard/settings' },
    { key: 'rep',     label: 'Representante Legal',  ok: !!org.legal_rep,    link: '/dashboard/settings' },
    { key: 'logo',    label: 'Logo corporativo',     ok: !!org.logo_url,     link: '/dashboard/settings', optional: true },
    { key: 'flota',   label: `Flota (${stats.aircraft} aeronaves)`, ok: stats.aircraft > 0, link: '/dashboard/fleet' },
    { key: 'pilotos', label: `Personal (${stats.pilots} pilotos)`,  ok: stats.pilots > 0,   link: '/dashboard/pilots' },
  ] : [];

  const criticalMissing = checks.filter(c => !c.ok && !c.optional);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
          <p className="text-sm font-medium">Cargando información...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-28 lg:pb-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="material-symbols-outlined text-2xl text-orange-500">menu_book</span>
          <h1 className="text-xl font-black text-white">Manual de Operaciones</h1>
        </div>
        <p className="text-sm text-slate-400 ml-9">
          Genera los capítulos de tu MO en formato Word (.docx) pre-llenado con los datos de tu organización y el texto estándar RAC 100.
        </p>
      </div>

      {/* Error global */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-400 text-lg shrink-0">error</span>
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Estado de datos de la organización */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
          Estado de datos de la organización
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {checks.map(c => (
            <a
              key={c.key}
              href={c.ok ? undefined : c.link}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${c.ok
                  ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/20'
                  : c.optional
                    ? 'bg-slate-700/50 text-slate-400 border border-slate-600/40 hover:border-orange-500/40 hover:text-orange-400'
                    : 'bg-orange-900/30 text-orange-400 border border-orange-500/30 hover:border-orange-400/60'
                }`}
            >
              <span className="material-symbols-outlined text-sm shrink-0">
                {c.ok ? 'check_circle' : c.optional ? 'radio_button_unchecked' : 'warning'}
              </span>
              <span className="truncate">{c.label}</span>
              {!c.ok && <span className="material-symbols-outlined text-xs ml-auto shrink-0">chevron_right</span>}
            </a>
          ))}
        </div>
        {criticalMissing.length > 0 && (
          <p className="text-xs text-orange-400 mt-3 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">info</span>
            {criticalMissing.length} campo{criticalMissing.length > 1 ? 's' : ''} faltante{criticalMissing.length > 1 ? 's' : ''} — el documento se generará pero con campos en blanco.
          </p>
        )}
      </div>

      {/* Cards de capítulos */}
      <div className="space-y-3">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Documentos disponibles
        </p>

        {MANUALS.map(manual => (
          <div
            key={manual.id}
            className={`rounded-2xl border p-5 transition-colors
              ${manual.available
                ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
                : 'bg-slate-800/50 border-slate-700/50'
              }`}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Info izquierda */}
              <div className="flex items-start gap-3 min-w-0">
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                  ${manual.available ? 'bg-orange-600/20' : 'bg-slate-700/50'}`}>
                  <span className={`material-symbols-outlined text-xl
                    ${manual.available ? 'text-orange-400' : 'text-slate-500'}`}>
                    {manual.icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-xs font-black uppercase tracking-wider
                      ${manual.available ? 'text-orange-400' : 'text-slate-500'}`}>
                      {manual.code}
                    </span>
                    {manual.available && (
                      <span className="text-[10px] bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5 font-bold">
                        Disponible
                      </span>
                    )}
                  </div>
                  <p className={`font-black text-sm mb-1 ${manual.available ? 'text-white' : 'text-slate-400'}`}>
                    {manual.title}
                  </p>
                  <p className={`text-xs leading-relaxed ${manual.available ? 'text-slate-400' : 'text-slate-500'}`}>
                    {manual.description}
                  </p>
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {manual.tags.map(tag => (
                      <span key={tag}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold
                          ${manual.available
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-slate-700/50 text-slate-500'
                          }`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botón descarga */}
              <div className="flex-shrink-0">
                {manual.available ? (
                  <button
                    onClick={() => handleDownload(manual)}
                    disabled={downloading[manual.id]}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 active:bg-orange-700
                      disabled:opacity-60 disabled:cursor-not-allowed
                      text-white text-xs font-black uppercase tracking-wide
                      rounded-xl px-4 py-2.5 transition-colors whitespace-nowrap"
                  >
                    {downloading[manual.id] ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        Generando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">download</span>
                        Descargar .docx
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 font-semibold bg-slate-700/50 px-3 py-2 rounded-xl border border-slate-600/40 whitespace-nowrap">
                    Próximamente
                  </span>
                )}
              </div>
            </div>

            {/* Contenido del Word cuando está disponible */}
            {manual.available && (
              <div className="mt-4 pt-4 border-t border-slate-700/60">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
                  Contenido del documento
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] text-slate-400">
                  {[
                    'Portada con logo y datos org.',
                    'Control de cambios (editable)',
                    '5.1 Generalidades RAC 100',
                    '5.2 Procedimiento pre-vuelo',
                    '5.3 Procedimiento en vuelo',
                    '5.4 Procedimiento post-vuelo',
                    '5.5 Emergencias (6 escenarios)',
                    '5.6 Limitaciones operacionales',
                    'Anexo A: Flota activa',
                    'Anexo B: Pilotos autorizados',
                    'Anexo C: Formatos de referencia',
                    `${stats.aircraft} aeronaves · ${stats.pilots} pilotos`,
                  ].map((item, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-emerald-500">check</span>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Nota legal */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-bold text-slate-400">Nota:</span> El documento generado es una plantilla de apoyo con el texto estándar RAC 100. Debes revisar, completar y firmar el documento antes de presentarlo ante AeroCivil/UAEAC. Bitafly no reemplaza la asesoría de un profesional aeronáutico habilitado.
        </p>
      </div>
    </div>
  );
}
