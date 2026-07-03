'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import FormBuilder from './_FormBuilder';

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
