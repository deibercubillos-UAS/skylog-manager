'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import FormBuilder from './_FormBuilder';
import { getOrgContext } from '@/lib/apiAuth';

const SMS_ROLES = ['superadmin', 'admin', 'gerente_sms'];
const STATUS_LABELS = {
  recibido:          { label: 'Recibido',          color: 'bg-sky-100 text-sky-700 border-sky-200' },
  en_investigacion:  { label: 'En investigación',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  cerrado:           { label: 'Cerrado',            color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  archivado:         { label: 'Archivado',          color: 'bg-slate-100 text-slate-500 border-slate-200' },
};
const VALID_STATUSES = Object.keys(STATUS_LABELS);
const SEVERITY_LABELS = {
  incidente:        { label: 'Incidente',        color: 'bg-blue-100 text-blue-700 border-blue-200' },
  incidente_grave:  { label: 'Incidente grave',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  accidente:        { label: 'Accidente',        color: 'bg-red-100 text-red-700 border-red-200' },
};
const VALID_SEVERITIES = Object.keys(SEVERITY_LABELS);

// ── Utilidades ────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.recibido;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase border ${s.color}`}>{s.label}</span>;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Abre una ventana con el QR en tamaño póster e invoca la impresión del navegador —
// pensado para colgar en el hangar junto al equipo, no un mockup de botón sin función real.
function printQR({ qrUrl, type, title, link }) {
  const w = window.open('', '_blank', 'width=480,height=640');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>QR ${escapeHtml(type)}</title><style>
    body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;text-align:center;padding:48px 24px;color:#1A202C;}
    img{width:280px;height:280px;border-radius:20px;border:1px solid #e2e8f0;}
    h1{font-size:20px;margin:24px 0 6px;text-transform:uppercase;letter-spacing:0.02em;}
    p{font-size:12px;color:#64748b;word-break:break-all;margin-top:8px;}
  </style></head><body>
    <h1>${escapeHtml(title)} · ${escapeHtml(type)}</h1>
    <img src="${qrUrl}" alt="QR" />
    <p>${escapeHtml(link)}</p>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

// ─────────────────────────────────────────────────────────────────────────────
export default function VorMorPage() {
  // Deep link desde Protocolos ("Editar formato" en cada tarjeta VOR/MOR) —
  // ?tab=config&type=VOR|MOR abre directo el editor en vez de la lista de
  // reportes (antes el link solo llevaba a /dashboard/vor-mor sin parámetros
  // y el usuario caía en la pestaña "Reportes VOR" por defecto, sin ver el
  // editor rediseñado).
  const searchParams = useSearchParams();
  const initialTab  = searchParams.get('tab') === 'config' ? 'config' : 'VOR';
  const initialType = searchParams.get('type') === 'MOR' ? 'MOR' : 'VOR';

  const [tab, setTab]           = useState(initialTab);   // 'VOR' | 'MOR' | 'config'
  const [profile, setProfile]   = useState(null);
  const [orgCode, setOrgCode]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [reports, setReports]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState(null);   // reporte abierto en modal
  const [detailLoading, setDetailLoading] = useState(false);

  // Config / definición de formulario
  const [vorDef, setVorDef] = useState(null);
  const [morDef, setMorDef] = useState(null);
  const [configForm, setConfigForm] = useState({ type: initialType, title: '', description: '', custom_fields: [] });
  const [savingConfig, setSavingConfig] = useState(false);

  // Modal: campos editables
  const [patchForm, setPatchForm] = useState({ status: '', assigned_to: '', internal_notes: '', investigation_summary: '', notify_reporter: false, notification_message: '' });
  const [patching, setPatching] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  const canEdit = SMS_ROLES.includes(profile?.role);
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL || 'https://bitafly.com';

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }

      const ctx = await getOrgContext(supabase);
      const prof = { id: ctx.user.id, role: ctx.role, organization_id: ctx.orgId };
      setProfile(prof);

      const { data: org } = await supabase.from('organizations')
        .select('unique_code, slug').eq('id', prof.organization_id).single();
      // Preferir slug (nombre empresa) sobre unique_code (NIT) para las URLs públicas
      setOrgCode(org?.slug || org?.unique_code);

      // Miembros SMS para asignación — vía organization_members (rol) +
      // profiles.active_organization_id (mismo criterio que notify.js: solo
      // cuentan los que tienen esta org como activa ahora mismo).
      const { data: memberRows } = await supabase.from('organization_members')
        .select('user_id')
        .eq('organization_id', prof.organization_id)
        .in('role', SMS_ROLES);
      const candidateIds = (memberRows || []).map(m => m.user_id);
      let members = [];
      if (candidateIds.length) {
        const { data: profs } = await supabase.from('profiles')
          .select('id, first_name, last_name, role')
          .eq('active_organization_id', prof.organization_id)
          .in('id', candidateIds);
        members = profs || [];
      }
      setTeamMembers(members);

      setLoading(false);
    }
    init();
  }, []);

  // ── Cargar reportes ─────────────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    if (!profile || tab === 'config') return;
    const { data: { session } } = await supabase.auth.getSession();
    const params = new URLSearchParams({ type: tab, page, limit: 20 });
    if (filterStatus) params.set('status', filterStatus);
    const res = await fetch(`/api/vor-mor?${params}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    const data = await res.json();
    setReports(data.data || []);
    setTotal(data.total || 0);
  }, [profile, tab, page, filterStatus]);

  useEffect(() => { loadReports(); }, [loadReports]);

  // ── Cargar definiciones para config tab ─────────────────────────────────────
  useEffect(() => {
    if (tab !== 'config' || !profile) return;
    async function loadDefs() {
      const { data: { session } } = await supabase.auth.getSession();
      const [vorRes, morRes] = await Promise.all([
        fetch('/api/vor-mor?type=VOR&limit=0', { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch('/api/vor-mor?type=MOR&limit=0', { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);

      // Obtener definiciones directamente de Supabase
      const { data: defs } = await supabase.from('vor_mor_definitions')
        .select('*').eq('organization_id', profile.organization_id);
      const vor = defs?.find(d => d.type === 'VOR');
      const mor = defs?.find(d => d.type === 'MOR');
      setVorDef(vor || null);
      setMorDef(mor || null);
      setConfigForm(p => ({
        ...p,
        type:          p.type,
        title:         (p.type === 'VOR' ? vor : mor)?.title || '',
        description:   (p.type === 'VOR' ? vor : mor)?.description || '',
        custom_fields: (p.type === 'VOR' ? vor : mor)?.custom_fields || [],
      }));
    }
    loadDefs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, profile]);

  // ── Cambiar de formato dentro de la config tab (VOR ↔ MOR) ──────────────────
  const switchConfigType = (t) => {
    const def = t === 'VOR' ? vorDef : morDef;
    setConfigForm({
      type:          t,
      title:         def?.title       || '',
      description:   def?.description || '',
      custom_fields: def?.custom_fields ?? [],
    });
  };

  // ── Abrir detalle ────────────────────────────────────────────────────────────
  const openDetail = async (id) => {
    setDetailLoading(true);
    setSelected(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/vor-mor/${id}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    const data = await res.json();
    setSelected(data);
    setPatchForm({
      status: data.status || 'recibido',
      severity: data.severity || '',
      assigned_to: data.assigned_to || '',
      internal_notes: data.internal_notes || '',
      investigation_summary: data.investigation_summary || '',
      notify_reporter: false,
      notification_message: '',
    });
    setDetailLoading(false);
  };

  // ── Guardar cambios del modal ────────────────────────────────────────────────
  const handlePatch = async () => {
    if (!selected) return;
    setPatching(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/vor-mor/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(patchForm),
    });
    if (res.ok) {
      toast.success('Reporte actualizado');
      setSelected(null);
      loadReports();
    } else {
      const e = await res.json();
      toast.error(e.error || 'Error al guardar');
    }
    setPatching(false);
  };

  // ── Guardar config formulario ────────────────────────────────────────────────
  const handleSaveConfig = async (e) => {
    e?.preventDefault();
    if (!configForm.title.trim()) return toast.error('El título es obligatorio');
    setSavingConfig(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/vor-mor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        type:          configForm.type,
        title:         configForm.title,
        description:   configForm.description,
        // Guardar el objeto delta completo (base_overrides + custom)
        // Si es array antiguo se migra al nuevo formato automáticamente
        custom_fields: Array.isArray(configForm.custom_fields)
          ? { base_overrides: {}, custom: configForm.custom_fields }
          : (configForm.custom_fields || { base_overrides: {}, custom: [] }),
      }),
    });
    if (res.ok) {
      toast.success(`Formulario ${configForm.type} guardado`);
      const { data: defs } = await supabase.from('vor_mor_definitions')
        .select('*').eq('organization_id', profile.organization_id);
      const vorUpdated = defs?.find(d => d.type === 'VOR') || null;
      const morUpdated = defs?.find(d => d.type === 'MOR') || null;
      setVorDef(vorUpdated);
      setMorDef(morUpdated);
      // actualizar custom_fields en el configForm con lo que viene de DB
      const updated = defs?.find(d => d.type === configForm.type);
      if (updated) setConfigForm(p => ({...p, custom_fields: updated.custom_fields || []}));
    } else {
      const err = await res.json();
      toast.error(err.error || 'Error al guardar');
    }
    setSavingConfig(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">
      Cargando reportes...
    </div>
  );

  const INPUT  = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all';
  const LABEL  = 'block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5';
  const TABS   = [
    { key: 'VOR', label: 'Reportes VOR', icon: 'volunteer_activism', color: 'sky' },
    { key: 'MOR', label: 'Reportes MOR', icon: 'warning',            color: 'rose' },
    { key: 'config', label: 'Configuración & QR', icon: 'qr_code',  color: 'slate' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">

      {/* Botón regreso */}
      <Link href="/dashboard/safety" className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Seguridad SMS
      </Link>

      {/* Header */}
      <header className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">
          Reportes de Ocurrencia
        </h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
          VOR · MOR · SMS Aeronáutico · RAC 100
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => {
          const active = tab === t.key;
          const colors = {
            sky:   active ? 'bg-sky-600 text-white shadow-sky-200 shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-sky-300',
            rose:  active ? 'bg-rose-600 text-white shadow-rose-200 shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-rose-300',
            slate: active ? 'bg-slate-800 text-white shadow-slate-200 shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400',
          };
          return (
            <button key={t.key} onClick={() => { setTab(t.key); setPage(1); setFilterStatus(''); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${colors[t.color]}`}>
              <span className="material-symbols-outlined text-base">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── CONFIG TAB ──────────────────────────────────────────────────────── */}
      {tab === 'config' && (
        <div className="space-y-5">

          {/* Selector de formato */}
          <div className="flex gap-2">
            {['VOR', 'MOR'].map(t => (
              <button key={t} type="button" onClick={() => switchConfigType(t)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                  configForm.type === t
                    ? (t === 'VOR' ? 'bg-orange-600 text-white shadow-md shadow-orange-200' : 'bg-rose-600 text-white shadow-md shadow-rose-200')
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}>
                Formato {t}
              </button>
            ))}
          </div>

          {canEdit ? (
            <form onSubmit={handleSaveConfig} className="space-y-5">

              {/* Hero */}
              <div className="bg-slate-900 rounded-3xl px-6 sm:px-8 py-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-400">Cumplimiento · Protocolos</span>
                    <span className={`text-[10px] font-black text-white px-2.5 py-0.5 rounded-full font-mono ${configForm.type === 'VOR' ? 'bg-orange-600' : 'bg-rose-600'}`}>{configForm.type}</span>
                  </div>
                  <input required value={configForm.title}
                    onChange={e => setConfigForm(p => ({...p, title: e.target.value}))}
                    placeholder={`Ej: Reporte ${configForm.type === 'VOR' ? 'Voluntario' : 'Obligatorio'} de Ocurrencia`}
                    className="w-full bg-transparent text-xl sm:text-2xl font-black text-white placeholder-white/30 outline-none tracking-tight" />
                  <input value={configForm.description}
                    onChange={e => setConfigForm(p => ({...p, description: e.target.value}))}
                    placeholder="Instrucciones visibles para el reportante..."
                    className="w-full bg-transparent text-xs font-semibold text-slate-300 placeholder-white/30 outline-none mt-1" />
                </div>
                <button type="submit" disabled={savingConfig}
                  className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black px-5 py-3 rounded-2xl text-xs uppercase tracking-widest transition-colors shrink-0">
                  {savingConfig ? (
                    <><span className="material-symbols-outlined animate-spin text-base">progress_activity</span>Guardando...</>
                  ) : (
                    <><span className="material-symbols-outlined text-base">save</span>Guardar cambios</>
                  )}
                </button>
              </div>

              {/* Campos + QR */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 items-start">
                <FormBuilder configForm={configForm} setConfigForm={setConfigForm} accent={configForm.type} />

                {orgCode && (() => {
                  const link  = `${appUrl}/${configForm.type.toLowerCase()}/${orgCode}`;
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(link)}`;
                  const accentText = configForm.type === 'VOR' ? 'text-orange-600' : 'text-rose-600';
                  return (
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
                      <span className={`text-xs font-black uppercase tracking-widest ${accentText}`}>Enlace y código QR</span>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Cualquier miembro de la tripulación puede escanear este código o abrir el enlace desde su
                        celular para diligenciar un reporte {configForm.type} en campo, sin acceso al panel completo.
                      </p>

                      <div className="flex justify-center py-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} alt={`QR ${configForm.type}`} className="size-40 rounded-2xl border border-slate-100" />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Enlace público del formato</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-600 truncate">{link}</div>
                          <button type="button" onClick={() => { navigator.clipboard.writeText(link); toast.success('Enlace copiado'); }}
                            className="flex items-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors shrink-0">
                            <span className="material-symbols-outlined text-sm">content_copy</span>Copiar
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <a href={qrUrl} download={`qr-${configForm.type.toLowerCase()}.png`}
                          className="flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl text-xs font-black transition-colors">
                          <span className="material-symbols-outlined text-sm">download</span>Descargar QR
                        </a>
                        <button type="button"
                          onClick={() => printQR({ qrUrl, type: configForm.type, title: configForm.title || configForm.type, link })}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black transition-colors ${configForm.type === 'VOR' ? 'bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100' : 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100'}`}>
                          <span className="material-symbols-outlined text-sm">print</span>Imprimir para hangar
                        </button>
                      </div>

                      <a href={link} target="_blank" rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors pt-1">
                        <span className="material-symbols-outlined text-sm">open_in_new</span>Ver formulario público
                      </a>
                    </div>
                  );
                })()}
              </div>
            </form>
          ) : (
            orgCode && (() => {
              const link  = `${appUrl}/${configForm.type.toLowerCase()}/${orgCode}`;
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
              return (
                <div className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col items-center gap-3 max-w-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt={`QR ${configForm.type}`} className="size-40 rounded-2xl border border-slate-100" />
                  <p className="text-xs text-slate-400 break-all text-center">{link}</p>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ── LISTA DE REPORTES ────────────────────────────────────────────────── */}
      {tab !== 'config' && (
        <div className="space-y-4">

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 rounded-2xl px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400">
              <option value="">Todos los estados</option>
              {VALID_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
            </select>
            <span className="text-xs text-slate-400 font-medium">{total} reporte{total !== 1 ? 's' : ''}</span>
          </div>

          {/* Tabla */}
          {reports.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">inbox</span>
              <p className="text-slate-400 font-bold uppercase text-sm mt-3">Sin reportes {tab}</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Fecha', 'Reportante', 'Descripción', 'Estado', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => openDetail(r.id)}>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {r.occurrence_date || new Date(r.created_at).toLocaleDateString('es-CO')}
                        </td>
                        <td className="px-4 py-3">
                          {r.is_anonymous
                            ? <span className="text-slate-400 italic text-xs">Anónimo</span>
                            : <span className="text-xs font-medium text-slate-700">{r.reporter_name}</span>
                          }
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-xs text-slate-600 truncate">{r.description}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {total > 20 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-40 transition-colors">
                    ← Anterior
                  </button>
                  <span className="text-xs text-slate-400">Página {page} de {Math.ceil(total / 20)}</span>
                  <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-40 transition-colors">
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL DETALLE / EDICIÓN ──────────────────────────────────────────── */}
      {(selected || detailLoading) && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>

            {detailLoading ? (
              <div className="p-16 text-center animate-pulse text-slate-300 font-black uppercase">Cargando...</div>
            ) : selected && (
              <div className="divide-y divide-slate-100">

                {/* Cabecera modal */}
                <div className={`px-6 py-5 flex items-start justify-between ${selected.type === 'VOR' ? 'bg-sky-50' : 'bg-rose-50'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black text-white ${selected.type === 'VOR' ? 'bg-sky-600' : 'bg-rose-600'}`}>{selected.type}</span>
                      <StatusBadge status={selected.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {selected.occurrence_date || new Date(selected.created_at).toLocaleDateString('es-CO')}
                      {selected.occurrence_time && ` · ${selected.occurrence_time}`}
                      {selected.location && ` · ${selected.location}`}
                    </p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Contenido */}
                <div className="p-6 space-y-5">

                  {/* Reportante */}
                  <div>
                    <p className={LABEL}>Reportante</p>
                    {selected.is_anonymous
                      ? <p className="text-sm text-slate-500 italic">Anónimo{selected.reporter_email ? ' (tiene email — puede recibir notificaciones)' : ''}</p>
                      : <p className="text-sm text-slate-800 font-medium">{selected.reporter_name}</p>
                    }
                  </div>

                  {/* Descripción */}
                  <div>
                    <p className={LABEL}>Descripción del evento</p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.description}</p>
                  </div>

                  {selected.immediate_actions && (
                    <div>
                      <p className={LABEL}>Acciones inmediatas</p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.immediate_actions}</p>
                    </div>
                  )}
                  {selected.contributing_factors && (
                    <div>
                      <p className={LABEL}>Factores contribuyentes</p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.contributing_factors}</p>
                    </div>
                  )}

                  {/* Autoevaluación del reportante — distinta de la clasificación oficial que asigna el equipo SMS abajo */}
                  {(selected.reported_severity || selected.related_barrier) && (
                    <div className="flex flex-wrap gap-2">
                      {selected.reported_severity && (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase border ${SEVERITY_LABELS[selected.reported_severity]?.color || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          Reportado como: {SEVERITY_LABELS[selected.reported_severity]?.label || selected.reported_severity}
                        </span>
                      )}
                      {selected.related_barrier && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase border bg-slate-100 text-slate-600 border-slate-200 inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">shield</span>
                          {selected.related_barrier.name}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Respuestas a campos personalizados */}
                  {selected.custom_responses && Object.keys(selected.custom_responses).length > 0 && (
                    <div>
                      <p className={LABEL}>Campos adicionales</p>
                      <div className="space-y-2">
                        {Object.entries(selected.custom_responses).map(([k, v]) => (
                          <div key={k} className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                            <p className="text-xs text-slate-400 font-bold">{k}</p>
                            <p className="text-sm text-slate-700 mt-0.5">{String(v)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Archivos adjuntos */}
                  {selected.attachments?.length > 0 && (
                    <div>
                      <p className={LABEL}>Archivos adjuntos ({selected.attachments.length})</p>
                      <ul className="space-y-1">
                        {selected.attachments.map((a, i) => (
                          <li key={i}>
                            <a href={`/api/vor-mor/attachment?path=${encodeURIComponent(a)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl px-3 py-2 border border-slate-100 transition-colors">
                              <span className="material-symbols-outlined text-slate-400 text-sm">attach_file</span>
                              <span className="truncate flex-1">{a.split('/').pop()}</span>
                              <span className="material-symbols-outlined text-slate-400 text-sm">open_in_new</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Panel de gestión (solo SMS roles) */}
                {canEdit && (
                  <div className="p-6 space-y-5 bg-slate-50 rounded-b-3xl">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Gestión del reporte</h4>

                    <div className="grid grid-cols-3 gap-4">
                      {/* Estado */}
                      <div>
                        <label className={LABEL}>Estado</label>
                        <select value={patchForm.status} onChange={e => setPatchForm(p => ({...p, status: e.target.value}))} className={INPUT}>
                          {VALID_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
                        </select>
                      </div>

                      {/* Severidad — mismo vocabulario RAC 100 que Reportes SMS (sms_reports) */}
                      <div>
                        <label className={LABEL}>Severidad</label>
                        <select value={patchForm.severity} onChange={e => setPatchForm(p => ({...p, severity: e.target.value}))} className={INPUT}>
                          <option value="">Sin clasificar</option>
                          {VALID_SEVERITIES.map(s => <option key={s} value={s}>{SEVERITY_LABELS[s].label}</option>)}
                        </select>
                      </div>

                      {/* Asignado a */}
                      <div>
                        <label className={LABEL}>Asignado a</label>
                        <select value={patchForm.assigned_to} onChange={e => setPatchForm(p => ({...p, assigned_to: e.target.value}))} className={INPUT}>
                          <option value="">Sin asignar</option>
                          {teamMembers.map(m => (
                            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Notas internas */}
                    <div>
                      <label className={LABEL}>Notas internas (no visibles al reportante)</label>
                      <textarea rows={3} value={patchForm.internal_notes} onChange={e => setPatchForm(p => ({...p, internal_notes: e.target.value}))} className={`${INPUT} resize-none`} placeholder="Observaciones del equipo SMS..." />
                    </div>

                    {/* Resumen investigación */}
                    <div>
                      <label className={LABEL}>Resumen de la investigación</label>
                      <textarea rows={3} value={patchForm.investigation_summary} onChange={e => setPatchForm(p => ({...p, investigation_summary: e.target.value}))} className={`${INPUT} resize-none`} placeholder="Hallazgos, conclusiones, acciones correctivas..." />
                    </div>

                    {/* Notificar al reportante */}
                    {(selected.reporter_email) && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={patchForm.notify_reporter}
                            onChange={e => setPatchForm(p => ({...p, notify_reporter: e.target.checked}))}
                            className="size-4 rounded" />
                          <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                            Enviar actualización al reportante por email
                          </span>
                        </label>
                        {patchForm.notify_reporter && (
                          <textarea rows={3} value={patchForm.notification_message}
                            onChange={e => setPatchForm(p => ({...p, notification_message: e.target.value}))}
                            className={`${INPUT} resize-none`}
                            placeholder="Mensaje para el reportante (no revelará su identidad)..." />
                        )}
                      </div>
                    )}

                    <button onClick={handlePatch} disabled={patching}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                      {patching ? (
                        <><span className="material-symbols-outlined animate-spin text-base">progress_activity</span> Guardando...</>
                      ) : (
                        <><span className="material-symbols-outlined text-base">save</span> Guardar cambios</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
