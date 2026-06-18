'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { hasPermission } from '@/lib/roles';
import { generateAckActaPdf } from '@/lib/manualActaPdf';
import { fmtDateShort as fmtDate } from '@/lib/formatters';
import ConfirmModal from '@/components/ui/ConfirmModal';

const CATEGORIES = {
  MO:            'Manual de Operaciones',
  SMS:           'Manual SMS',
  MANTENIMIENTO: 'Mantenimiento',
  ORGANIZACION:  'Organización',
  SOP:           'Procedimientos (SOP)',
  OTRO:          'Otro',
};
const CATEGORY_ORDER = Object.keys(CATEGORIES);

export default function ManualesPage() {
  const [manuals, setManuals]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [role,    setRole]      = useState(null);
  const [orgName, setOrgName]   = useState('Mi Organización');

  const [formModal,  setFormModal]  = useState(null); // { mode: 'create'|'version', manual? }
  const [historyOf,  setHistoryOf]  = useState(null); // manual seleccionado para historial
  const [ackRosterOf, setAckRosterOf] = useState(null); // manual para panel de seguimiento (managers)
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [acking,     setAcking]     = useState(null); // id del manual con acuse en curso

  const canManage = hasPermission(role, 'canManageManuals');

  const loadManuals = useCallback(async () => {
    try {
      const res  = await fetch('/api/manuals');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar manuales');
      setManuals(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login'; return; }
        const { data: prof } = await supabase
          .from('profiles').select('role, organization_id').eq('id', user.id).single();
        setRole(prof?.role || null);
        if (prof?.organization_id) {
          const { data: org } = await supabase
            .from('organizations').select('company_name').eq('id', prof.organization_id).maybeSingle();
          setOrgName(org?.company_name || 'Mi Organización');
        }
        await loadManuals();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadManuals]);

  // Descargar (versión vigente o una específica del historial)
  const download = async (manualId, versionId) => {
    try {
      const url = versionId
        ? `/api/manuals/${manualId}/download?versionId=${versionId}`
        : `/api/manuals/${manualId}/download`;
      const res  = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo descargar');
      window.open(data.signedUrl, '_blank', 'noopener');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Acuse de lectura de la versión vigente
  const acknowledge = async (manualId) => {
    setAcking(manualId);
    try {
      const res = await fetch(`/api/manuals/${manualId}/acknowledge`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar');
      setManuals(prev => prev.map(m => m.id === manualId ? { ...m, acknowledged: true } : m));
      toast.success('Lectura confirmada.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAcking(null);
    }
  };

  const handleDelete = (manual) => {
    setConfirmDlg({
      isOpen: true,
      title: `¿Eliminar "${manual.title}"?`,
      message: 'Se eliminarán el manual, todo su historial de versiones y los archivos. Esta acción es irreversible.',
      confirmText: 'Eliminar',
      danger: true,
      onConfirm: async () => {
        setConfirmDlg(null);
        try {
          const res = await fetch(`/api/manuals/${manual.id}`, { method: 'DELETE' });
          if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
          setManuals(prev => prev.filter(m => m.id !== manual.id));
          toast.success('Manual eliminado.');
        } catch (err) {
          toast.error('No se pudo eliminar: ' + err.message);
        }
      },
    });
  };

  // Agrupar por categoría para mostrar secciones
  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, items: manuals.filter(m => (m.category || 'OTRO') === cat) }))
    .filter(g => g.items.length > 0);

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-300 uppercase tracking-widest text-xs">
      Cargando manuales...
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 text-left pb-20">

      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">Manuales de la Empresa</h2>
          <p className="text-slate-400 text-xs font-black uppercase mt-1">
            {manuals.length} manual{manuals.length !== 1 ? 'es' : ''}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setFormModal({ mode: 'create' })}
            className="flex items-center gap-2 bg-orange-600 hover:bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-orange-500/20 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">upload_file</span>
            Cargar Manual
          </button>
        )}
      </header>

      {/* Info acceso */}
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
        <span className="material-symbols-outlined text-blue-500 text-base shrink-0 mt-0.5">info</span>
        <p className="text-xs text-blue-700 font-medium leading-relaxed">
          Todos los miembros pueden consultar y descargar la versión vigente en cualquier momento.
          {canManage
            ? ' Al cargar un manual o publicar una nueva versión se notifica por correo a toda la empresa.'
            : ' Solo Gerencia y Jefatura de Pilotos pueden cargar o actualizar manuales.'}
        </p>
      </div>

      {/* Lista vacía */}
      {manuals.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 py-20 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-200 block mb-3">menu_book</span>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin manuales cargados</p>
          {canManage && (
            <button
              onClick={() => setFormModal({ mode: 'create' })}
              className="mt-4 text-xs font-black text-orange-600 hover:underline uppercase tracking-widest"
            >
              Cargar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ cat, items }) => (
            <section key={cat} className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-orange-500">folder</span>
                {CATEGORIES[cat]}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map(m => (
                  <ManualCard
                    key={m.id}
                    manual={m}
                    canManage={canManage}
                    acking={acking === m.id}
                    onAcknowledge={() => acknowledge(m.id)}
                    onDownload={() => download(m.id)}
                    onHistory={() => setHistoryOf(m)}
                    onAckRoster={() => setAckRosterOf(m)}
                    onNewVersion={() => setFormModal({ mode: 'version', manual: m })}
                    onDelete={() => handleDelete(m)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modal: cargar manual / nueva versión */}
      {formModal && (
        <ManualFormModal
          mode={formModal.mode}
          manual={formModal.manual}
          onClose={() => setFormModal(null)}
          onSaved={async () => { setFormModal(null); await loadManuals(); }}
        />
      )}

      {/* Modal: historial de versiones */}
      {historyOf && (
        <HistoryModal
          manual={historyOf}
          onClose={() => setHistoryOf(null)}
          onDownload={download}
        />
      )}

      {/* Modal: seguimiento de lectura (managers) */}
      {ackRosterOf && (
        <AckRosterModal
          manual={ackRosterOf}
          orgName={orgName}
          onClose={() => setAckRosterOf(null)}
        />
      )}

      {confirmDlg && <ConfirmModal {...confirmDlg} onCancel={() => setConfirmDlg(null)} />}
    </div>
  );
}

// ── Tarjeta de manual ──────────────────────────────────────────────────────
function ManualCard({ manual, canManage, acking, onAcknowledge, onDownload, onHistory, onAckRoster, onNewVersion, onDelete }) {
  const acked = manual.acknowledged;
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col gap-4 hover:border-orange-200 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="size-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-orange-500">description</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900 leading-tight">{manual.title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-600 uppercase tracking-wide">
              v{manual.current_version || '—'}
            </span>
            <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">event</span>
              {fmtDate(manual.current_effective_date)}
            </span>
          </div>
        </div>
        {/* Chip de estado de lectura del usuario actual */}
        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${
          acked ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'
        }`}>
          <span className="material-symbols-outlined text-[13px]">{acked ? 'task_alt' : 'schedule'}</span>
          {acked ? 'Leído' : 'Pendiente'}
        </span>
      </div>

      {/* Acuse de lectura del usuario */}
      {!acked && (
        <button
          onClick={onAcknowledge}
          disabled={acking}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-sm ${acking ? 'animate-spin' : ''}`}>{acking ? 'sync' : 'check_circle'}</span>
          {acking ? 'Registrando...' : 'He leído esta versión'}
        </button>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-orange-600 text-white px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Descargar
        </button>
        <button
          onClick={onHistory}
          className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-400 text-slate-600 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all"
        >
          <span className="material-symbols-outlined text-sm">history</span>
          Historial
        </button>
        {canManage && (
          <>
            <button
              onClick={onAckRoster}
              className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-400 text-slate-600 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all"
            >
              <span className="material-symbols-outlined text-sm">how_to_reg</span>
              Seguimiento
            </button>
            <button
              onClick={onNewVersion}
              className="flex items-center gap-1.5 border border-orange-200 text-orange-600 hover:bg-orange-50 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all"
            >
              <span className="material-symbols-outlined text-sm">upgrade</span>
              Nueva versión
            </button>
            <button
              onClick={onDelete}
              aria-label="Eliminar manual"
              className="ml-auto flex items-center justify-center w-9 h-9 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Modal: formulario de carga / nueva versión ─────────────────────────────
function ManualFormModal({ mode, manual, onClose, onSaved }) {
  const isCreate = mode === 'create';
  const [form, setForm] = useState({
    title:          manual?.title || '',
    category:       manual?.category || 'OTRO',
    version:        '',
    effective_date: '',
    comments:       '',
  });
  const [file, setFile]       = useState(null);
  const [saving, setSaving]   = useState(false);

  const submit = async () => {
    if (isCreate && !form.title.trim()) return toast.error('El título es obligatorio.');
    if (!form.version.trim())           return toast.error('La versión es obligatoria.');
    if (!form.effective_date)           return toast.error('La fecha de vigencia es obligatoria.');
    if (!file)                          return toast.error('Selecciona el archivo del manual.');

    setSaving(true);
    try {
      const fd = new FormData();
      if (isCreate) { fd.append('title', form.title.trim()); fd.append('category', form.category); }
      fd.append('version', form.version.trim());
      fd.append('effective_date', form.effective_date);
      fd.append('comments', form.comments.trim());
      fd.append('file', file);

      const url = isCreate ? '/api/manuals' : `/api/manuals/${manual.id}/versions`;
      const res = await fetch(url, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      toast.success(isCreate ? 'Manual cargado. Se notificó a la empresa.' : 'Nueva versión publicada. Se notificó a la empresa.');
      await onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="bg-orange-50 border-b border-orange-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-orange-500 text-2xl">{isCreate ? 'upload_file' : 'upgrade'}</span>
            <div>
              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                {isCreate ? 'Cargar Manual' : 'Nueva Versión'}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isCreate ? 'Documento, versión y fecha de vigencia' : manual?.title}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {isCreate && (
            <>
              <div>
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Título *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ej: Manual de Operaciones RAC 100" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Categoría</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                  {CATEGORY_ORDER.map(c => <option key={c} value={c}>{CATEGORIES[c]}</option>)}
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Versión *</label>
              <input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
                placeholder="Ej: 1.0" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Fecha vigencia *</label>
              <input type="date" value={form.effective_date} onChange={e => setForm(p => ({ ...p, effective_date: e.target.value }))} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Comentarios</label>
            <textarea rows={2} value={form.comments} onChange={e => setForm(p => ({ ...p, comments: e.target.value }))}
              placeholder="Cambios respecto a la versión anterior, notas de revisión, etc."
              className={inputCls + ' resize-none'} />
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Documento *</label>
            <label className="flex items-center gap-3 border-2 border-dashed border-slate-200 hover:border-orange-300 rounded-xl px-4 py-3 cursor-pointer transition-all">
              <span className="material-symbols-outlined text-slate-400">attach_file</span>
              <span className="text-xs font-bold text-slate-500 truncate flex-1">
                {file ? file.name : 'PDF, Word o Excel (máx 25 MB)'}
              </span>
              <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={saving}
              className="flex-1 py-3 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl hover:border-slate-400 transition-all">
              Cancelar
            </button>
            <button onClick={submit} disabled={saving}
              className="flex-1 py-3 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
              {saving
                ? <><span className="material-symbols-outlined text-sm animate-spin">sync</span>Guardando...</>
                : <><span className="material-symbols-outlined text-sm">{isCreate ? 'cloud_upload' : 'publish'}</span>{isCreate ? 'Cargar' : 'Publicar'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal: historial de versiones ──────────────────────────────────────────
function HistoryModal({ manual, onClose, onDownload }) {
  const [versions, setVersions] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`/api/manuals/${manual.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error');
        setVersions(data.versions || []);
      } catch (err) {
        toast.error(err.message);
        setVersions([]);
      }
    })();
  }, [manual.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="material-symbols-outlined text-slate-500 text-2xl">history</span>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">Historial de versiones</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{manual.title}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-slate-400 flex items-center justify-center transition-all shrink-0">
            <span className="material-symbols-outlined text-slate-400 text-base">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3">
          {versions === null ? (
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest text-center py-10 animate-pulse">Cargando...</p>
          ) : versions.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 text-center py-10">Sin versiones registradas.</p>
          ) : versions.map((v, i) => (
            <div key={v.id} className={`rounded-2xl border p-4 ${i === 0 ? 'border-orange-200 bg-orange-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-slate-900 text-white uppercase tracking-wide">v{v.version}</span>
                  {i === 0 && <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-orange-100 text-orange-600 uppercase tracking-wide">Vigente</span>}
                  <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">event</span>
                    {fmtDate(v.effective_date)}
                  </span>
                </div>
                <button onClick={() => onDownload(manual.id, v.id)}
                  className="flex items-center gap-1 text-xs font-black text-orange-600 hover:underline uppercase tracking-wide shrink-0">
                  <span className="material-symbols-outlined text-sm">download</span>
                  Descargar
                </button>
              </div>
              {v.comments && (
                <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed border-t border-slate-100 pt-2">{v.comments}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Modal: seguimiento de lectura (managers) ───────────────────────────────
function AckRosterModal({ manual, orgName, onClose }) {
  const [data, setData] = useState(null); // { read, total, version, members }
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/manuals/${manual.id}/acknowledgments`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error');
        setData(json);
      } catch (err) {
        toast.error(err.message);
        setData({ read: 0, total: 0, members: [] });
      }
    })();
  }, [manual.id]);

  const exportPdf = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await generateAckActaPdf({ manual, data, orgName });
    } catch (err) {
      toast.error('No se pudo generar el acta: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const pct = data && data.total > 0 ? Math.round((data.read / data.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="material-symbols-outlined text-slate-500 text-2xl">how_to_reg</span>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">Seguimiento de lectura</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                {manual.title} · v{data?.version || manual.current_version || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={exportPdf} disabled={!data || exporting} aria-label="Exportar acta en PDF"
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-orange-600 text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-40">
              <span className={`material-symbols-outlined text-sm ${exporting ? 'animate-spin' : ''}`}>{exporting ? 'sync' : 'picture_as_pdf'}</span>
              <span className="hidden sm:inline">{exporting ? 'Generando...' : 'Acta PDF'}</span>
            </button>
            <button onClick={onClose} aria-label="Cerrar"
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-slate-400 flex items-center justify-center transition-all">
              <span className="material-symbols-outlined text-slate-400 text-base">close</span>
            </button>
          </div>
        </div>

        {/* Barra de progreso */}
        {data && (
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                {data.read}/{data.total} leído{data.read !== 1 ? 's' : ''}
              </span>
              <span className="text-xs font-black text-emerald-600">{pct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-1.5">
          {data === null ? (
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest text-center py-10 animate-pulse">Cargando...</p>
          ) : data.members.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 text-center py-10">Sin miembros en la organización.</p>
          ) : data.members.map(m => (
            <div key={m.profile_id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`material-symbols-outlined text-base shrink-0 ${m.acknowledged_at ? 'text-emerald-500' : 'text-slate-300'}`}>
                  {m.acknowledged_at ? 'task_alt' : 'radio_button_unchecked'}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 truncate">{m.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{m.role}</p>
                </div>
              </div>
              <span className={`text-[11px] font-bold shrink-0 ${m.acknowledged_at ? 'text-emerald-600' : 'text-amber-500'}`}>
                {m.acknowledged_at ? fmtDate(m.acknowledged_at) : 'Pendiente'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
