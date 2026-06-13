'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { fmtDateTimeMed } from '@/lib/formatters';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const MANUALS = [
  {
    id:          'cap5',
    chapter:     '5',
    code:        'MO-CAP5',
    title:       'Capítulo 5 — Procedimientos Operacionales',
    description: 'Pre-vuelo · En vuelo · Post-vuelo · Emergencias · Limitaciones operacionales RAC 100',
    icon:        'checklist_rtl',
    available:   true,
    tags:        ['RAC 100', 'JARUS SORA', 'F-OPS-001', 'F-OPS-002', 'F-MNT-003'],
    contents: [
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
    ],
  },
  {
    id:          'om-operaciones',
    chapter:     'om-operaciones',
    code:        'OM-OPS',
    title:       'OM — Operaciones',
    description: 'Planificación · Coordinación AeroCivil · Gestión de autorizaciones · Análisis de riesgo',
    icon:        'flight_takeoff',
    available:   false,
    tags:        ['Próximamente'],
  },
  {
    id:          'om-sms',
    chapter:     'om-sms',
    code:        'OM-SMS',
    title:       'OM — SMS (Gestión de Seguridad)',
    description: 'Política SMS · Barreras operacionales · Reportes VOR/MOR · Indicadores · OSOs JARUS',
    icon:        'health_and_safety',
    available:   false,
    tags:        ['Próximamente'],
  },
];


function fmtSize(bytes) {
  if (!bytes) return null;
  return bytes > 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export default function ManualOperacionesPage() {
  const [org,     setOrg]     = useState(null);
  const [stats,   setStats]   = useState({ aircraft: 0, pilots: 0 });
  const [loading, setLoading] = useState(true);

  // Por chapter: { hasCustomVersion, updatedAt, size }
  const [versionInfo, setVersionInfo] = useState({});

  // Estados de operación por chapter id
  const [busy, setBusy] = useState({});   // { [id]: 'downloading'|'uploading'|'resetting' }
  const [msg,  setMsg]  = useState({});   // { [id]: { type:'ok'|'err', text } }

  const fileInputRefs = useRef({});

  // ── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: prof } = await supabase
          .from('profiles').select('organization_id,role').eq('id', user.id).single();
        if (!prof?.organization_id) return;

        const [orgRes, acRes, piRes] = await Promise.all([
          supabase.from('organizations')
            .select('company_name,tax_id,tax_id_type,dan_number,legal_rep,logo_url')
            .eq('id', prof.organization_id).single(),
          supabase.from('aircraft').select('id', { count: 'exact', head: true }).eq('organization_id', prof.organization_id),
          supabase.from('pilots').select('id', { count: 'exact', head: true }).eq('organization_id', prof.organization_id).eq('is_active', true),
        ]);

        setOrg(orgRes.data);
        setStats({ aircraft: acRes.count || 0, pilots: piRes.count || 0 });

        // Cargar estado de versión de cada capítulo disponible
        const vInfo = {};
        await Promise.all(
          MANUALS.filter(m => m.available).map(async m => {
            const res = await fetch(`/api/reports/manual?chapter=${m.chapter}&meta=true`);
            if (res.ok) vInfo[m.id] = await res.json();
          })
        );
        setVersionInfo(vInfo);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Helpers de estado ────────────────────────────────────────────────────
  function setBusyState(id, state) { setBusy(p => ({ ...p, [id]: state })); }
  function clearBusy(id)           { setBusy(p => ({ ...p, [id]: null })); }
  function setOk(id, text)         { setMsg(p => ({ ...p, [id]: { type: 'ok',  text } })); }
  function setErr(id, text)        { setMsg(p => ({ ...p, [id]: { type: 'err', text } })); }
  function clearMsg(id)            { setMsg(p => ({ ...p, [id]: null })); }

  // ── Descargar ────────────────────────────────────────────────────────────
  async function handleDownload(manual) {
    if (busy[manual.id]) return;
    setBusyState(manual.id, 'downloading');
    clearMsg(manual.id);
    try {
      const res = await fetch(`/api/reports/manual?chapter=${manual.chapter}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      const blob   = await res.blob();
      const url    = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const slug   = org?.company_name?.replace(/\s+/g, '-').toLowerCase() || 'operador';
      const date   = new Date().toISOString().split('T')[0];
      anchor.href     = url;
      anchor.download = `MO-Cap${manual.chapter}-${slug}-${date}.docx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(manual.id, e.message);
    } finally {
      clearBusy(manual.id);
    }
  }

  // ── Subir versión editada ────────────────────────────────────────────────
  async function handleUpload(manual, file) {
    if (!file || busy[manual.id]) return;
    if (file.size > 20_000_000) { setErr(manual.id, 'Archivo demasiado grande (máx 20 MB)'); return; }
    if (!file.name.endsWith('.docx')) { setErr(manual.id, 'Solo se aceptan archivos .docx'); return; }

    setBusyState(manual.id, 'uploading');
    clearMsg(manual.id);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/reports/manual?chapter=${manual.chapter}`, { method: 'POST', body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);

      // Actualizar estado de versión
      const metaRes = await fetch(`/api/reports/manual?chapter=${manual.chapter}&meta=true`);
      if (metaRes.ok) {
        const meta = await metaRes.json();
        setVersionInfo(p => ({ ...p, [manual.id]: meta }));
      }
      setOk(manual.id, '✓ Versión personalizada guardada. La próxima descarga usará este archivo.');
    } catch (e) {
      setErr(manual.id, e.message);
    } finally {
      clearBusy(manual.id);
      // Limpiar el input para permitir subir el mismo archivo otra vez
      if (fileInputRefs.current[manual.id]) fileInputRefs.current[manual.id].value = '';
    }
  }

  // ── Restablecer plantilla ─────────────────────────────────────────────────
  async function handleReset(manual) {
    if (busy[manual.id]) return;
    if (!window.confirm('¿Eliminar la versión personalizada y volver a la plantilla RAC 100 auto-generada?')) return;
    setBusyState(manual.id, 'resetting');
    clearMsg(manual.id);
    try {
      const res  = await fetch(`/api/reports/manual?chapter=${manual.chapter}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setVersionInfo(p => ({ ...p, [manual.id]: { hasCustomVersion: false, updatedAt: null, size: null } }));
      setOk(manual.id, '↩ Versión personalizada eliminada. Se generará la plantilla base en la próxima descarga.');
    } catch (e) {
      setErr(manual.id, e.message);
    } finally {
      clearBusy(manual.id);
    }
  }

  // ── Checks de datos ───────────────────────────────────────────────────────
  const checks = org ? [
    { key: 'nombre', label: 'Razón Social',        ok: !!org.company_name, link: '/dashboard/settings' },
    { key: 'nit',    label: 'NIT / Identificación', ok: !!org.tax_id,       link: '/dashboard/settings' },
    { key: 'dan',    label: 'Número DAN',           ok: !!org.dan_number,   link: '/dashboard/settings' },
    { key: 'rep',    label: 'Representante Legal',  ok: !!org.legal_rep,    link: '/dashboard/settings' },
    { key: 'logo',   label: 'Logo corporativo',     ok: !!org.logo_url,     link: '/dashboard/settings', optional: true },
    { key: 'flota',  label: `Flota (${stats.aircraft})`, ok: stats.aircraft > 0, link: '/dashboard/fleet' },
    { key: 'pilots', label: `Pilotos (${stats.pilots})`, ok: stats.pilots > 0,   link: '/dashboard/pilots' },
  ] : [];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
        <p className="text-sm font-medium">Cargando...</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-28 lg:pb-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="material-symbols-outlined text-2xl text-orange-500">menu_book</span>
          <h1 className="text-xl font-black text-white">Manual de Operaciones</h1>
        </div>
        <p className="text-sm text-slate-400 ml-9">
          Descarga cada capítulo en Word (.docx), edítalo localmente y sube tu versión para que quede guardada en la plataforma.
        </p>
      </div>

      {/* Checks de datos */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
          Datos de la organización
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {checks.map(c => (
            <a key={c.key} href={c.ok ? undefined : c.link}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${c.ok
                  ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/20'
                  : c.optional
                    ? 'bg-slate-700/50 text-slate-400 border border-slate-600/40 hover:border-orange-500/40 hover:text-orange-400'
                    : 'bg-orange-900/30 text-orange-400 border border-orange-500/30 hover:border-orange-400/60'
                }`}>
              <span className="material-symbols-outlined text-sm shrink-0">
                {c.ok ? 'check_circle' : c.optional ? 'radio_button_unchecked' : 'warning'}
              </span>
              <span className="truncate">{c.label}</span>
              {!c.ok && <span className="material-symbols-outlined text-xs ml-auto shrink-0">chevron_right</span>}
            </a>
          ))}
        </div>
      </div>

      {/* Cards de capítulos */}
      <div className="space-y-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Documentos</p>

        {MANUALS.map(manual => {
          const vi      = versionInfo[manual.id] || {};
          const isCustom = vi.hasCustomVersion;
          const isBusy   = !!busy[manual.id];
          const feedback = msg[manual.id];

          return (
            <div key={manual.id}
              className={`rounded-2xl border transition-colors
                ${manual.available ? 'bg-slate-800 border-slate-700' : 'bg-slate-800/50 border-slate-700/50'}`}>

              {/* Cabecera */}
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                    ${manual.available ? 'bg-orange-600/20' : 'bg-slate-700/50'}`}>
                    <span className={`material-symbols-outlined text-xl
                      ${manual.available ? 'text-orange-400' : 'text-slate-500'}`}>
                      {manual.icon}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`text-xs font-black uppercase tracking-wider
                        ${manual.available ? 'text-orange-400' : 'text-slate-500'}`}>
                        {manual.code}
                      </span>
                      {manual.available && (
                        isCustom ? (
                          <span className="text-[10px] bg-sky-900/40 text-sky-400 border border-sky-500/30 rounded-full px-2 py-0.5 font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">edit_document</span>
                            Versión personalizada
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5 font-bold">
                            Plantilla RAC 100
                          </span>
                        )
                      )}
                    </div>
                    <p className={`font-black text-sm mb-0.5 ${manual.available ? 'text-white' : 'text-slate-400'}`}>
                      {manual.title}
                    </p>
                    <p className={`text-xs ${manual.available ? 'text-slate-400' : 'text-slate-500'}`}>
                      {manual.description}
                    </p>

                    {/* Info de versión personalizada */}
                    {isCustom && vi.updatedAt && (
                      <p className="text-[11px] text-sky-400/70 mt-1">
                        Guardada el {fmtDateTimeMed(vi.updatedAt)}
                        {vi.size ? ` · ${fmtSize(vi.size)}` : ''}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mt-2">
                      {manual.tags.map(t => (
                        <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold
                          ${manual.available ? 'bg-slate-700 text-slate-300' : 'bg-slate-700/50 text-slate-500'}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Badge "Próximamente" */}
                  {!manual.available && (
                    <span className="flex-shrink-0 text-xs text-slate-500 font-semibold bg-slate-700/50 px-3 py-2 rounded-xl border border-slate-600/40">
                      Próximamente
                    </span>
                  )}
                </div>
              </div>

              {/* Controles (solo capítulos disponibles) */}
              {manual.available && (
                <div className="px-5 pb-5 space-y-3">

                  {/* Mensaje de feedback */}
                  {feedback && (
                    <div className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2 border
                      ${feedback.type === 'ok'
                        ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-900/30 border-red-500/30 text-red-300'}`}>
                      <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">
                        {feedback.type === 'ok' ? 'check_circle' : 'error'}
                      </span>
                      <span>{feedback.text}</span>
                      <button onClick={() => clearMsg(manual.id)}
                        className="ml-auto text-slate-400 hover:text-white shrink-0">
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="flex flex-wrap gap-2">

                    {/* 1. Descargar */}
                    <button
                      onClick={() => handleDownload(manual)}
                      disabled={isBusy}
                      className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700
                        disabled:opacity-50 disabled:cursor-not-allowed
                        text-white text-xs font-black uppercase tracking-wide
                        rounded-xl px-4 py-2.5 transition-colors">
                      {busy[manual.id] === 'downloading'
                        ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        : <span className="material-symbols-outlined text-sm">download</span>
                      }
                      {busy[manual.id] === 'downloading' ? 'Descargando...' : isCustom ? 'Descargar mi versión' : 'Descargar plantilla'}
                    </button>

                    {/* 2. Subir versión editada */}
                    <>
                      <input
                        ref={el => fileInputRefs.current[manual.id] = el}
                        type="file"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={e => handleUpload(manual, e.target.files?.[0])}
                      />
                      <button
                        onClick={() => fileInputRefs.current[manual.id]?.click()}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-600 active:bg-sky-800
                          disabled:opacity-50 disabled:cursor-not-allowed
                          text-white text-xs font-black uppercase tracking-wide
                          rounded-xl px-4 py-2.5 transition-colors">
                        {busy[manual.id] === 'uploading'
                          ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          : <span className="material-symbols-outlined text-sm">upload_file</span>
                        }
                        {busy[manual.id] === 'uploading' ? 'Guardando...' : isCustom ? 'Actualizar versión' : 'Subir mi versión'}
                      </button>
                    </>

                    {/* 3. Restablecer plantilla (solo si hay versión personalizada) */}
                    {isCustom && (
                      <button
                        onClick={() => handleReset(manual)}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-800
                          disabled:opacity-50 disabled:cursor-not-allowed
                          text-slate-300 text-xs font-semibold
                          rounded-xl px-3 py-2.5 transition-colors">
                        {busy[manual.id] === 'resetting'
                          ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          : <span className="material-symbols-outlined text-sm">restart_alt</span>
                        }
                        {busy[manual.id] === 'resetting' ? 'Restableciendo...' : 'Restablecer plantilla'}
                      </button>
                    )}
                  </div>

                  {/* Contenido del Word */}
                  <details className="group">
                    <summary className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-300 transition-colors select-none flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs group-open:rotate-90 transition-transform">chevron_right</span>
                      Ver contenido del documento
                    </summary>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] text-slate-400 pt-2 border-t border-slate-700/60">
                      {[...(manual.contents || []), `${stats.aircraft} aeronaves · ${stats.pilots} pilotos`].map((item, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-emerald-500">check</span>
                          {item}
                        </span>
                      ))}
                    </div>
                  </details>

                  {/* Flujo de trabajo */}
                  <div className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-3">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">
                      Flujo de trabajo
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 bg-slate-700 rounded-lg px-2 py-1">
                        <span className="material-symbols-outlined text-xs text-orange-400">download</span>
                        1. Descargar
                      </span>
                      <span className="material-symbols-outlined text-xs text-slate-600">arrow_forward</span>
                      <span className="flex items-center gap-1 bg-slate-700 rounded-lg px-2 py-1">
                        <span className="material-symbols-outlined text-xs text-blue-400">edit</span>
                        2. Editar en Word
                      </span>
                      <span className="material-symbols-outlined text-xs text-slate-600">arrow_forward</span>
                      <span className="flex items-center gap-1 bg-slate-700 rounded-lg px-2 py-1">
                        <span className="material-symbols-outlined text-xs text-sky-400">upload_file</span>
                        3. Subir .docx
                      </span>
                      <span className="material-symbols-outlined text-xs text-slate-600">arrow_forward</span>
                      <span className="flex items-center gap-1 bg-slate-700 rounded-lg px-2 py-1">
                        <span className="material-symbols-outlined text-xs text-emerald-400">cloud_done</span>
                        4. Guardado
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Nota */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-1">
        <p className="text-xs text-slate-400 font-bold">Importante</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Al subir una versión personalizada, esta queda guardada en la plataforma y se descargará en lugar de la plantilla base. Los cambios en flota o pilotos <strong className="text-slate-400">no se reflejan automáticamente</strong> en tu versión personalizada — descarga la plantilla base, actualiza los Anexos A y B manualmente en Word, y vuelve a subir. Para volver a la plantilla auto-generada usa <strong className="text-slate-400">"Restablecer plantilla"</strong>.
        </p>
        <p className="text-xs text-slate-500 leading-relaxed mt-1">
          Este documento es una plantilla de apoyo RAC 100. Revisa, completa y firma antes de presentar ante AeroCivil/UAEAC.
        </p>
      </div>
    </div>
  );
}
