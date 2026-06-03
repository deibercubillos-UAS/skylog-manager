'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

const SMS_ROLES = ['superadmin', 'admin', 'gerente_sms'];
const STATUS_LABELS = {
  recibido:          { label: 'Recibido',          color: 'bg-sky-100 text-sky-700 border-sky-200' },
  en_investigacion:  { label: 'En investigación',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  cerrado:           { label: 'Cerrado',            color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  archivado:         { label: 'Archivado',          color: 'bg-slate-100 text-slate-500 border-slate-200' },
};
const VALID_STATUSES = Object.keys(STATUS_LABELS);

// ── Utilidades ────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.recibido;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase border ${s.color}`}>{s.label}</span>;
}

function QRCard({ url, label, color }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  return (
    <div className={`bg-white rounded-3xl border ${color === 'sky' ? 'border-sky-200' : 'border-rose-200'} p-5 flex flex-col items-center gap-3`}>
      <div className={`${color === 'sky' ? 'bg-sky-600' : 'bg-rose-600'} text-white px-3 py-1 rounded-full text-xs font-black uppercase`}>{label}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrUrl} alt={`QR ${label}`} className="size-40 rounded-2xl border border-slate-100" />
      <p className="text-xs text-slate-400 break-all text-center max-w-[180px]">{url}</p>
      <div className="flex gap-2">
        <a href={qrUrl} download={`qr-${label.toLowerCase()}.png`}
          className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors">
          <span className="material-symbols-outlined text-sm">download</span> QR
        </a>
        <button onClick={() => { navigator.clipboard.writeText(url); toast.success('URL copiada'); }}
          className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors">
          <span className="material-symbols-outlined text-sm">content_copy</span> URL
        </button>
        <a href={url} target="_blank" rel="noreferrer"
          className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors">
          <span className="material-symbols-outlined text-sm">open_in_new</span>
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function VorMorPage() {
  const [tab, setTab]           = useState('VOR');   // 'VOR' | 'MOR' | 'config'
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
  const [configForm, setConfigForm] = useState({ type: 'VOR', title: '', description: '', custom_fields: [] });
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

      const { data: prof } = await supabase.from('profiles')
        .select('id, role, organization_id')
        .eq('id', session.user.id).single();
      setProfile(prof);

      const { data: org } = await supabase.from('organizations')
        .select('unique_code, slug').eq('id', prof.organization_id).single();
      // Preferir slug (nombre empresa) sobre unique_code (NIT) para las URLs públicas
      setOrgCode(org?.slug || org?.unique_code);

      // Miembros SMS para asignación
      const { data: members } = await supabase.from('profiles')
        .select('id, first_name, last_name, role')
        .eq('organization_id', prof.organization_id)
        .in('role', SMS_ROLES);
      setTeamMembers(members || []);

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
        Seguridad Operacional
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
        <div className="space-y-8">

          {/* QR Codes */}
          {orgCode && (
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Códigos QR de acceso</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <QRCard url={`${appUrl}/vor/${orgCode}`} label="VOR" color="sky" />
                <QRCard url={`${appUrl}/mor/${orgCode}`} label="MOR" color="rose" />
              </div>
            </section>
          )}

          {/* Editor de formulario + campos personalizados */}
          {canEdit && (
            <FormBuilder
              configForm={configForm} setConfigForm={setConfigForm}
              vorDef={vorDef} morDef={morDef}
              savingConfig={savingConfig} handleSaveConfig={handleSaveConfig}
              INPUT={INPUT} LABEL={LABEL}
            />
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
                          <li key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                            <span className="material-symbols-outlined text-slate-400 text-sm">attach_file</span>
                            <span className="truncate flex-1">{a.split('/').pop()}</span>
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

                    <div className="grid grid-cols-2 gap-4">
                      {/* Estado */}
                      <div>
                        <label className={LABEL}>Estado</label>
                        <select value={patchForm.status} onChange={e => setPatchForm(p => ({...p, status: e.target.value}))} className={INPUT}>
                          {VALID_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
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

// ─────────────────────────────────────────────────────────────────────────────
//  FormBuilder — editor completo VOR/MOR con campos base + campos custom
//
//  Arquitectura de ahorro en Supabase:
//  - BASE_FIELDS viven en código (vorMorFields.js) → 0 bytes en DB por campo base
//  - DB guarda solo DELTAS: { base_overrides: {fieldId: {hidden,label,required}}, custom: [...] }
//  - Para 100k orgs: 100k filas con ~1-3 KB c/u = ~150 MB total (trivial)
// ─────────────────────────────────────────────────────────────────────────────

import { BASE_FIELDS, SECTION_LABELS, parseFormConfig, estimateConfigBytes } from '@/lib/vorMorFields';

const FIELD_TYPES = [
  { value: 'text',     label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'date',     label: 'Fecha' },
  { value: 'select',   label: 'Lista desplegable' },
  { value: 'checkbox', label: 'Casilla sí/no' },
];

function FormBuilder({ configForm, setConfigForm, vorDef, morDef, savingConfig, handleSaveConfig }) {
  // Estado local del builder
  const [newField, setNewField]         = useState({ label: '', type: 'text', required: false, placeholder: '', options: '' });
  const [editCustomIdx, setEditCustomIdx] = useState(null);
  const [editCustom, setEditCustom]       = useState(null);
  const [editBaseId, setEditBaseId]       = useState(null);   // qué campo base se está editando (label/placeholder)

  // Parsear config actual del configForm
  const config    = parseFormConfig(configForm.custom_fields);
  const overrides = config.base_overrides || {};
  const custom    = config.custom || [];

  // Helpers para actualizar config
  const updateConfig = (newConfig) => {
    setConfigForm(p => ({ ...p, custom_fields: newConfig }));
  };

  const setOverride = (fieldId, patch) => {
    const current = overrides[fieldId] || {};
    const merged  = { ...current, ...patch };
    // Limpiar keys con valor default para no guardar basura
    if (merged.hidden === false)    delete merged.hidden;
    if (merged.required !== undefined) {
      const base = BASE_FIELDS.find(f => f.id === fieldId);
      if (merged.required === base?.required) delete merged.required;
    }
    const newOvs = { ...overrides, [fieldId]: merged };
    if (Object.keys(merged).length === 0) delete newOvs[fieldId];
    updateConfig({ base_overrides: newOvs, custom });
  };

  const switchType = (t) => {
    const def = t === 'VOR' ? vorDef : morDef;
    setConfigForm(p => ({
      ...p,
      type:          t,
      title:         def?.title       || '',
      description:   def?.description || '',
      custom_fields: def?.custom_fields ?? [],
    }));
    setEditBaseId(null); setEditCustomIdx(null);
  };

  // ── Custom fields ──────────────────────────────────────────────────────────
  const addCustomField = () => {
    if (!newField.label.trim()) return;
    const field = {
      id:          crypto.randomUUID(),
      label:       newField.label.trim(),
      type:        newField.type,
      required:    newField.required,
      placeholder: newField.placeholder.trim(),
      options:     newField.type === 'select' ? newField.options.split('\n').map(o => o.trim()).filter(Boolean) : [],
    };
    updateConfig({ base_overrides: overrides, custom: [...custom, field] });
    setNewField({ label: '', type: 'text', required: false, placeholder: '', options: '' });
  };

  const removeCustomField = (idx) => {
    updateConfig({ base_overrides: overrides, custom: custom.filter((_, i) => i !== idx) });
  };

  const moveCustomField = (idx, dir) => {
    const arr = [...custom];
    const t   = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    updateConfig({ base_overrides: overrides, custom: arr });
  };

  const saveEditCustom = () => {
    const updated = {
      ...editCustom,
      label:   editCustom.label.trim(),
      options: editCustom.type === 'select' ? editCustom.options.split('\n').map(o => o.trim()).filter(Boolean) : [],
    };
    const arr = [...custom];
    arr[editCustomIdx] = updated;
    updateConfig({ base_overrides: overrides, custom: arr });
    setEditCustomIdx(null); setEditCustom(null);
  };

  const FI  = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all';
  const FL  = 'block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5';
  const accentBtn = configForm.type === 'VOR' ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white';

  // Tamaño estimado del JSON que se guardará
  const sizeBytes = estimateConfigBytes({ base_overrides: overrides, custom });
  const activeOverrides = Object.keys(overrides).length;
  const hiddenCount     = Object.values(overrides).filter(o => o.hidden).length;

  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Header fijo */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Configurar formulario</h3>
          {/* Indicador de tamaño DB */}
          <span className={`text-xs font-mono px-2 py-1 rounded-lg ${sizeBytes < 2000 ? 'bg-emerald-50 text-emerald-600' : sizeBytes < 5000 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
            ~{sizeBytes} B en DB
          </span>
        </div>
        {/* Selector VOR / MOR */}
        <div className="flex gap-2 mt-4">
          {['VOR','MOR'].map(t => (
            <button key={t} type="button" onClick={() => switchType(t)}
              className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${configForm.type === t ? (t === 'VOR' ? 'bg-sky-600 text-white' : 'bg-rose-600 text-white') : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t}
            </button>
          ))}
          {(activeOverrides > 0 || custom.length > 0) && (
            <span className="ml-auto text-xs text-slate-400 self-center">
              {hiddenCount > 0 && `${hiddenCount} ocultos · `}{custom.length} campos extra
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveConfig} className="p-6 space-y-6">

        {/* ── Encabezado del formulario ── */}
        <div className="space-y-3">
          <div>
            <label className={FL}>Título *</label>
            <input required value={configForm.title}
              onChange={e => setConfigForm(p => ({...p, title: e.target.value}))}
              className={FI} placeholder={`Ej: Reporte ${configForm.type === 'VOR' ? 'Voluntario' : 'Obligatorio'} de Ocurrencia`} />
          </div>
          <div>
            <label className={FL}>Instrucciones para el reportante</label>
            <textarea rows={2} value={configForm.description}
              onChange={e => setConfigForm(p => ({...p, description: e.target.value}))}
              className={`${FI} resize-none`} placeholder="Texto visible en el encabezado del formulario público..." />
          </div>
        </div>

        {/* ── CAMPOS BASE ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className={FL + ' mb-0'}>Campos base — mostrar / ocultar / personalizar</label>
            <span className="text-xs text-slate-400 italic">Solo se guardan cambios</span>
          </div>

          <div className="space-y-2">
            {/* Agrupar por sección para mejor lectura */}
            {Object.entries(
              BASE_FIELDS.reduce((acc, f) => {
                if (!acc[f.section]) acc[f.section] = [];
                acc[f.section].push(f);
                return acc;
              }, {})
            ).map(([sec, secFields]) => (
              <div key={sec} className="border border-slate-100 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{SECTION_LABELS[sec]}</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {secFields.map(baseField => {
                    const ov     = overrides[baseField.id] || {};
                    const isHidden   = baseField.hideable ? (ov.hidden === true) : false;
                    const isRequired = ov.required ?? baseField.required;
                    const currLabel  = ov.label ?? baseField.label;
                    const isEditing  = editBaseId === baseField.id;

                    return (
                      <div key={baseField.id} className={`transition-all ${isHidden ? 'opacity-40' : ''}`}>
                        <div className="flex items-center gap-3 px-4 py-3">
                          {/* Toggle visible / oculto */}
                          <button type="button"
                            onClick={() => baseField.hideable && setOverride(baseField.id, { hidden: !isHidden })}
                            disabled={!baseField.hideable}
                            title={baseField.hideable ? (isHidden ? 'Mostrar campo' : 'Ocultar campo') : 'Este campo no se puede ocultar'}
                            className={`shrink-0 transition-colors ${!baseField.hideable ? 'opacity-30 cursor-not-allowed text-slate-400' : isHidden ? 'text-slate-300 hover:text-slate-500' : 'text-emerald-500 hover:text-emerald-600'}`}>
                            <span className="material-symbols-outlined text-lg">
                              {isHidden ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>

                          {/* Etiqueta */}
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-medium ${isHidden ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                              {currLabel}
                            </span>
                            {ov.label && (
                              <span className="ml-2 text-xs text-sky-500 font-bold">personalizado</span>
                            )}
                          </div>

                          {/* Toggle obligatorio */}
                          {!isHidden && (
                            <button type="button"
                              onClick={() => !baseField.id === 'description' && setOverride(baseField.id, { required: !isRequired })}
                              disabled={baseField.id === 'description'}
                              title={baseField.id === 'description' ? 'Siempre obligatorio' : (isRequired ? 'Hacer opcional' : 'Hacer obligatorio')}
                              className={`shrink-0 text-xs font-black px-2 py-1 rounded-lg border transition-all ${isRequired ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'} ${baseField.id === 'description' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              {isRequired ? '* oblig.' : 'opcional'}
                            </button>
                          )}

                          {/* Editar etiqueta */}
                          {!isHidden && (
                            <button type="button" onClick={() => {
                              if (isEditing) { setEditBaseId(null); return; }
                              setEditBaseId(baseField.id);
                            }}
                              className={`shrink-0 transition-colors ${isEditing ? 'text-sky-600' : 'text-slate-300 hover:text-sky-500'}`}>
                              <span className="material-symbols-outlined text-base">{isEditing ? 'check' : 'edit'}</span>
                            </button>
                          )}
                        </div>

                        {/* Panel edición de etiqueta / placeholder */}
                        {isEditing && !isHidden && (
                          <div className="px-4 pb-4 pt-1 bg-sky-50 space-y-2 border-t border-sky-100">
                            <div>
                              <label className={FL}>Etiqueta personalizada</label>
                              <input value={ov.label ?? baseField.label}
                                onChange={e => setOverride(baseField.id, { label: e.target.value || undefined })}
                                className={FI} placeholder={baseField.label} />
                            </div>
                            {baseField.type !== 'checkbox' && (
                              <div>
                                <label className={FL}>Placeholder personalizado</label>
                                <input value={ov.placeholder ?? baseField.placeholder}
                                  onChange={e => setOverride(baseField.id, { placeholder: e.target.value || undefined })}
                                  className={FI} placeholder={baseField.placeholder} />
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-1">
                              {(ov.label || ov.placeholder) && (
                                <button type="button"
                                  onClick={() => { setOverride(baseField.id, { label: undefined, placeholder: undefined }); setEditBaseId(null); }}
                                  className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                                  Restaurar original
                                </button>
                              )}
                              <button type="button" onClick={() => setEditBaseId(null)}
                                className="ml-auto text-xs font-black text-sky-600 hover:text-sky-800 transition-colors">
                                Listo ✓
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CAMPOS PERSONALIZADOS ── */}
        <div>
          <label className={FL}>Campos adicionales ({custom.length})</label>

          {custom.length > 0 && (
            <div className="space-y-2 mb-3">
              {custom.map((f, idx) => (
                <div key={f.id}>
                  {editCustomIdx === idx && editCustom ? (
                    <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={FL}>Etiqueta *</label>
                          <input value={editCustom.label} onChange={e => setEditCustom(p => ({...p, label: e.target.value}))} className={FI} />
                        </div>
                        <div>
                          <label className={FL}>Tipo</label>
                          <select value={editCustom.type} onChange={e => setEditCustom(p => ({...p, type: e.target.value}))} className={FI}>
                            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                      </div>
                      {editCustom.type !== 'checkbox' && editCustom.type !== 'date' && (
                        <input value={editCustom.placeholder || ''} onChange={e => setEditCustom(p => ({...p, placeholder: e.target.value}))} className={FI} placeholder="Placeholder..." />
                      )}
                      {editCustom.type === 'select' && (
                        <textarea rows={3} value={editCustom.options || ''} onChange={e => setEditCustom(p => ({...p, options: e.target.value}))} className={`${FI} resize-none`} placeholder={'Opción A\nOpción B\nOpción C'} />
                      )}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editCustom.required} onChange={e => setEditCustom(p => ({...p, required: e.target.checked}))} className="size-4 rounded" />
                          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Obligatorio</span>
                        </label>
                        <div className="flex gap-2">
                          <button type="button" onClick={saveEditCustom} className="bg-sky-600 hover:bg-sky-500 text-white py-1.5 px-4 rounded-xl text-xs font-black transition-colors">Listo</button>
                          <button type="button" onClick={() => { setEditCustomIdx(null); setEditCustom(null); }} className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-black transition-colors">×</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100 group hover:border-sky-200 transition-all">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-700">{f.label}</span>
                        <span className="ml-2 text-xs text-slate-400">{FIELD_TYPES.find(t => t.value === f.type)?.label}</span>
                        {f.required && <span className="ml-2 text-xs text-red-500 font-bold">*oblig.</span>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button type="button" onClick={() => moveCustomField(idx, -1)} disabled={idx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><span className="material-symbols-outlined text-base">arrow_upward</span></button>
                        <button type="button" onClick={() => moveCustomField(idx, 1)} disabled={idx === custom.length-1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><span className="material-symbols-outlined text-base">arrow_downward</span></button>
                        <button type="button" onClick={() => { setEditCustomIdx(idx); setEditCustom({ ...f, options: (f.options||[]).join('\n') }); }} className="text-slate-400 hover:text-sky-600"><span className="material-symbols-outlined text-base">edit</span></button>
                        <button type="button" onClick={() => removeCustomField(idx)} className="text-slate-400 hover:text-red-500"><span className="material-symbols-outlined text-base">delete</span></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Agregar nuevo campo */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">+ Nuevo campo</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={FL}>Etiqueta</label>
                <input value={newField.label} onChange={e => setNewField(p => ({...p, label: e.target.value}))} className={FI} placeholder="Ej: Aeronave involucrada" />
              </div>
              <div>
                <label className={FL}>Tipo</label>
                <select value={newField.type} onChange={e => setNewField(p => ({...p, type: e.target.value}))} className={FI}>
                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            {newField.type !== 'checkbox' && newField.type !== 'date' && (
              <input value={newField.placeholder} onChange={e => setNewField(p => ({...p, placeholder: e.target.value}))} className={FI} placeholder="Placeholder (texto dentro del campo)..." />
            )}
            {newField.type === 'select' && (
              <textarea rows={3} value={newField.options} onChange={e => setNewField(p => ({...p, options: e.target.value}))} className={`${FI} resize-none`} placeholder={'Opción A\nOpción B\nOpción C'} />
            )}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newField.required} onChange={e => setNewField(p => ({...p, required: e.target.checked}))} className="size-4 rounded" />
                <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Obligatorio</span>
              </label>
              <button type="button" onClick={addCustomField} disabled={!newField.label.trim()}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                <span className="material-symbols-outlined text-base">add</span>Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Guardar */}
        <button type="submit" disabled={savingConfig}
          className={`w-full ${accentBtn} disabled:opacity-50 font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2`}>
          {savingConfig
            ? <><span className="material-symbols-outlined animate-spin text-base">progress_activity</span> Guardando...</>
            : <><span className="material-symbols-outlined text-base">save</span> Guardar formulario {configForm.type}</>
          }
        </button>
      </form>

      {/* Footer: estado VOR y MOR */}
      <div className="grid grid-cols-2 border-t border-slate-100">
        {[{ t: 'VOR', def: vorDef, color: 'sky' }, { t: 'MOR', def: morDef, color: 'rose' }].map(({ t, def, color }) => {
          const cfg = parseFormConfig(def?.custom_fields);
          const hidCnt = Object.values(cfg.base_overrides || {}).filter(o => o.hidden).length;
          const custCnt = (cfg.custom || []).length;
          return (
            <div key={t} className={`px-4 py-3 ${color === 'sky' ? 'border-r border-slate-100' : ''}`}>
              <p className="text-xs font-black uppercase text-slate-400">{t}</p>
              {def ? (
                <p className="text-xs text-slate-500 mt-0.5">
                  {hidCnt > 0 ? `${hidCnt} ocultos · ` : ''}{custCnt} extra
                </p>
              ) : (
                <p className="text-xs text-slate-300 mt-0.5">No configurado</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
