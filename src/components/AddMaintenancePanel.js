'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB (límite de subida proxy por Vercel)

export default function AddMaintenancePanel({ onClose, onSuccess }) {
  const [drones, setDrones]       = useState([]);
  const [orgId, setOrgId]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [file, setFile]           = useState(null);
  const [fileError, setFileError] = useState('');
  const [dragOver, setDragOver]   = useState(false);
  const fileInputRef              = useRef(null);

  // Checklist de recibo (definiciones por org + respuestas del técnico)
  const [checklistDefs, setChecklistDefs] = useState([]);   // [{ field_number, label_text }]
  const [checklist, setChecklist]         = useState({});    // { field_number: true/false }

  // Componentes: roster activo de la aeronave + cambios del técnico
  const [roster, setRoster]               = useState([]);   // [{ id, component_type, name, serial, used_hours, installed_at }]
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterChanges, setRosterChanges] = useState({});   // { [id]: { action, part_new } }
  const [newComps, setNewComps]           = useState([]);   // [{ component_type, name, serial }]

  // PDF de recibo / puesta en servicio (Fase C)
  const [returnDoc, setReturnDoc]           = useState(null);
  const [returnDocError, setReturnDocError] = useState('');

  const [form, setForm] = useState({
    aircraft_id:      '',
    technician_name:  '',
    maintenance_type: 'PREVENTIVO',
    description:      '',
    hours_at_service: 0,
  });

  useEffect(() => {
    async function loadDrones() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      if (prof?.organization_id) {
        setOrgId(prof.organization_id);
        const [dronesRes, defsRes] = await Promise.all([
          supabase
            .from('aircraft')
            .select('*')
            .eq('organization_id', prof.organization_id)
            .neq('status', 'Baja'),        // excluir aeronaves dadas de baja (en mantenimiento SÍ aparece)
          supabase
            .from('form_definitions')
            .select('field_number,label_text')
            .eq('organization_id', prof.organization_id)
            .eq('form_type', 'maintenance_return')
            .eq('aircraft_model', 'General')
            .order('field_number', { ascending: true }),
        ]);
        setDrones(dronesRes.data || []);
        setChecklistDefs(defsRes.data || []);
      }
    }
    loadDrones();
  }, []);

  const setCheck = (num, value) => setChecklist(prev => ({ ...prev, [num]: value }));

  // ── Helpers de componentes ────────────────────────────────────────────────
  const COMPONENT_TYPES = [
    'Hélices', 'Motores', 'ESC', 'Gimbal', 'Cámara', 'Batería',
    'Brazo', 'Tren de aterrizaje', 'Antena', 'Tarjeta de memoria', 'Otro',
  ];

  // Cargar el roster activo al elegir/cambiar la aeronave
  useEffect(() => {
    if (!form.aircraft_id) { setRoster([]); setRosterChanges({}); return; }
    let cancelled = false;
    (async () => {
      setRosterLoading(true);
      try {
        const res = await fetch(`/api/maintenance/components?aircraft_id=${form.aircraft_id}`);
        const data = await res.json();
        if (!cancelled) { setRoster(Array.isArray(data?.active) ? data.active : []); setRosterChanges({}); }
      } catch {
        if (!cancelled) setRoster([]);
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [form.aircraft_id]);

  const setRosterAction = (id, action) =>
    setRosterChanges(prev => ({ ...prev, [id]: { ...prev[id], action } }));
  const setRosterPartNew = (id, part_new) =>
    setRosterChanges(prev => ({ ...prev, [id]: { ...prev[id], part_new } }));

  const addNewComp = () =>
    setNewComps(prev => [...prev, { component_type: '', name: '', serial: '' }]);
  const updateNewComp = (idx, field, value) =>
    setNewComps(prev => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  const removeNewComp = (idx) =>
    setNewComps(prev => prev.filter((_, i) => i !== idx));

  // ── Validación de archivo ────────────────────────────────────────────────
  const validateAndSetFile = (f) => {
    if (!f) { setFile(null); return; }
    const typeOk = ALLOWED_TYPES.includes(f.type) ||
      /\.(heic|heif)$/i.test(f.name);
    if (!typeOk) {
      setFileError('Formato no permitido. Usa PDF, JPG, PNG o WebP.');
      setFile(null);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setFileError('El archivo supera el límite de 4 MB.');
      setFile(null);
      return;
    }
    setFileError('');
    setFile(f);
  };

  const handleFileChange = (e) => validateAndSetFile(e.target.files?.[0]);

  // ── Validación del PDF de recibo (solo PDF) ────────────────────────────────
  const handleReturnDocChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) { setReturnDoc(null); return; }
    if (f.type !== 'application/pdf') {
      setReturnDocError('El recibo debe ser un PDF.');
      setReturnDoc(null);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setReturnDocError('El archivo supera el límite de 4 MB.');
      setReturnDoc(null);
      return;
    }
    setReturnDocError('');
    setReturnDoc(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    validateAndSetFile(e.dataTransfer.files?.[0]);
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.aircraft_id) { toast.warn('Selecciona una aeronave.'); return; }
    setLoading(true);

    try {
      // 1. Subir adjunto primero (si existe)
      let attachment_path = null;
      if (file && orgId) {
        const ext  = file.name.split('.').pop().toLowerCase();
        const slug = Math.random().toString(36).slice(2, 10);
        const path = `orgs/${orgId}/${Date.now()}_${slug}.${ext}`;

        const fd = new FormData();
        fd.append('bucket', 'maintenance-docs');
        fd.append('key', path);
        fd.append('file', file);
        const upRes = await fetch('/api/storage/upload', { method: 'POST', body: fd });
        if (!upRes.ok) {
          const er = await upRes.json().catch(() => ({}));
          throw new Error(er.error || 'Error al subir el archivo.');
        }

        attachment_path = path;
      }

      // 1b. Subir el PDF de recibo / puesta en servicio (si existe)
      let return_doc_path = null;
      if (returnDoc && orgId) {
        const slug = Math.random().toString(36).slice(2, 10);
        const path = `orgs/${orgId}/recibo/${Date.now()}_${slug}.pdf`;

        const fd = new FormData();
        fd.append('bucket', 'maintenance-docs');
        fd.append('key', path);
        fd.append('file', returnDoc);
        const upRes = await fetch('/api/storage/upload', { method: 'POST', body: fd });
        if (!upRes.ok) {
          const er = await upRes.json().catch(() => ({}));
          throw new Error(er.error || 'Error al subir el recibo.');
        }

        return_doc_path = path;
      }

      // 2. Registrar el mantenimiento
      const res = await fetch('/api/maintenance', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aircraft_id:      form.aircraft_id,
          technician_name:  form.technician_name,
          maintenance_type: form.maintenance_type,
          description:      form.description,
          hours_at_service: parseFloat(form.hours_at_service || 0),
          attachment_path,
          return_doc_path,
          return_checklist: checklistDefs.length > 0 ? checklist : null,
          components: [
            // Cambios sobre componentes existentes (reemplazado / removido)
            ...Object.entries(rosterChanges)
              .filter(([, ch]) => ch?.action === 'reemplazado' || ch?.action === 'removido')
              .map(([roster_id, ch]) => ({ roster_id, action: ch.action, part_new: ch.part_new || null })),
            // Componentes nuevos instalados
            ...newComps
              .filter(c => c.component_type)
              .map(c => ({ action: 'instalado', component_type: c.component_type, name: c.name || null, serial: c.serial || null })),
          ],
        }),
      });

      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* not JSON */ }

      if (!res.ok) {
        // Si el POST falla pero ya subimos archivos, intentar limpiarlos (huérfanos)
        [attachment_path, return_doc_path].filter(Boolean).forEach(p => {
          fetch('/api/maintenance/attachment', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: p }),
          }).catch(() => {});
        });
        throw new Error(data?.error || 'Error al guardar el registro.');
      }

      toast.success('Mantenimiento registrado y contadores actualizados.');
      onSuccess();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeReturnDoc = () => {
    setReturnDoc(null);
    setReturnDocError('');
  };

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      bottom-0 left-0 right-0 rounded-t-3xl max-h-[92vh]
      md:bottom-auto md:inset-y-0 md:left-auto md:right-0 md:rounded-none md:w-96
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom duration-300">

      {/* Drag handle — mobile */}
      <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 bg-slate-200 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">
          Registrar Mantenimiento
        </h3>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Aeronave */}
          <select required
            className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"
            onChange={e => setForm({ ...form, aircraft_id: e.target.value })}>
            <option value="">Seleccionar Drone...</option>
            {drones.map(d => (
              <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>
            ))}
          </select>

          {/* Tipo */}
          <select required
            className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"
            value={form.maintenance_type}
            onChange={e => setForm({ ...form, maintenance_type: e.target.value })}>
            <option value="PREVENTIVO">Mantenimiento Preventivo</option>
            <option value="CORRECTIVO">Reparación Correctiva</option>
            <option value="ACTUALIZACIÓN">Actualización de Software</option>
          </select>

          {/* Técnico */}
          <input required
            className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"
            placeholder="Nombre del Técnico"
            onChange={e => setForm({ ...form, technician_name: e.target.value })} />

          {/* Horas */}
          <div>
            <label className="text-xs font-black text-orange-600 uppercase ml-1">
              Horas en servicio
            </label>
            <input required type="number" step="0.01"
              className="w-full p-3 bg-white border-2 border-orange-100 rounded-xl font-black text-sm mt-1"
              placeholder="0.00"
              onChange={e => setForm({ ...form, hours_at_service: e.target.value })} />
          </div>

          {/* Descripción */}
          <textarea required rows="4"
            className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm font-medium resize-none"
            placeholder="Descripción de la tarea..."
            onChange={e => setForm({ ...form, description: e.target.value })} />

          {/* ── Checklist de recibo (si la org lo configuró) ──────────── */}
          {checklistDefs.length > 0 && (
            <div className="pt-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1">
                Recibo posterior al mantenimiento
                <span className="normal-case font-medium text-slate-300 ml-1">(opcional)</span>
              </label>
              <div className="mt-2 space-y-2">
                {checklistDefs.map(item => (
                  <div key={item.field_number}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border-2 transition-all ${
                      checklist[item.field_number] === true
                        ? 'bg-emerald-50 border-emerald-400'
                        : checklist[item.field_number] === false
                          ? 'bg-red-50 border-red-300'
                          : 'bg-slate-50 border-transparent'
                    }`}>
                    <span className="text-xs font-bold text-slate-600 flex-1">{item.label_text}</span>
                    <div className="flex gap-1.5 shrink-0">
                      <button type="button" onClick={() => setCheck(item.field_number, true)}
                        className={`size-8 rounded-full flex items-center justify-center transition-all ${
                          checklist[item.field_number] === true ? 'bg-emerald-500 text-white shadow' : 'bg-white text-slate-300'
                        }`}>
                        <span className="material-symbols-outlined text-base">check</span>
                      </button>
                      <button type="button" onClick={() => setCheck(item.field_number, false)}
                        className={`size-8 rounded-full flex items-center justify-center transition-all ${
                          checklist[item.field_number] === false ? 'bg-red-500 text-white shadow' : 'bg-white text-slate-300'
                        }`}>
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Componentes: roster vivo + cambios ─────────────────────── */}
          {form.aircraft_id && (
            <div className="pt-2 space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase ml-1">
                Componentes de la aeronave
              </label>

              {rosterLoading ? (
                <p className="text-xs text-slate-300 font-bold italic ml-1 animate-pulse">Cargando componentes...</p>
              ) : roster.length === 0 ? (
                <p className="text-xs text-slate-300 font-bold italic ml-1">Sin componentes registrados.</p>
              ) : (
                <div className="space-y-2">
                  {roster.map(rc => {
                    const ch = rosterChanges[rc.id] || {};
                    const action = ch.action || 'sin_cambio';
                    return (
                      <div key={rc.id} className={`p-3 rounded-xl border space-y-2 transition-all ${
                        action === 'reemplazado' ? 'bg-amber-50 border-amber-200'
                        : action === 'removido' ? 'bg-red-50 border-red-200'
                        : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-800 uppercase truncate">
                              {rc.name || rc.component_type}
                              {rc.serial && <span className="font-mono font-normal text-slate-400 ml-1">· {rc.serial}</span>}
                            </p>
                            <p className="text-[11px] font-bold text-orange-600">
                              {Number(rc.used_hours).toFixed(1)}h
                              <span className="text-slate-400 font-medium ml-1">
                                · {Math.max(0, Math.floor((Date.now() - new Date(rc.installed_at).getTime()) / 86400000))}d de uso
                              </span>
                            </p>
                          </div>
                          <select
                            className="p-2 bg-white rounded-lg border border-slate-200 font-bold text-xs shrink-0"
                            value={action}
                            onChange={e => setRosterAction(rc.id, e.target.value)}>
                            <option value="sin_cambio">Sin cambio</option>
                            <option value="reemplazado">Reemplazado</option>
                            <option value="removido">Removido</option>
                          </select>
                        </div>
                        {action === 'reemplazado' && (
                          <input
                            className="w-full p-2.5 bg-white rounded-lg border border-slate-200 text-xs font-medium"
                            placeholder="Serial del componente entrante (opcional)"
                            value={ch.part_new || ''}
                            onChange={e => setRosterPartNew(rc.id, e.target.value)} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Componentes nuevos a instalar */}
              <div className="flex items-center justify-between ml-1 pt-1">
                <span className="text-xs font-black text-slate-400 uppercase">
                  Agregar componente
                  <span className="normal-case font-medium text-slate-300 ml-1">(opcional)</span>
                </span>
                <button type="button" onClick={addNewComp}
                  className="flex items-center gap-1 text-xs font-black text-orange-600 hover:text-orange-800 transition-colors">
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  Añadir
                </button>
              </div>
              {newComps.map((c, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex gap-2">
                    <select
                      className="flex-1 p-2.5 bg-white rounded-lg border border-slate-200 font-bold text-xs"
                      value={c.component_type}
                      onChange={e => updateNewComp(idx, 'component_type', e.target.value)}>
                      <option value="">Tipo de componente...</option>
                      {COMPONENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button type="button" onClick={() => removeNewComp(idx)}
                      className="shrink-0 size-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs font-medium"
                      placeholder="Nombre / etiqueta"
                      value={c.name}
                      onChange={e => updateNewComp(idx, 'name', e.target.value)} />
                    <input
                      className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs font-medium"
                      placeholder="Serial (opcional)"
                      value={c.serial}
                      onChange={e => updateNewComp(idx, 'serial', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Adjunto opcional ──────────────────────────────────────── */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase ml-1">
              Documento adjunto
              <span className="normal-case font-medium text-slate-300 ml-1">(opcional)</span>
            </label>

            {/* Zona de drop */}
            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`mt-1 flex flex-col items-center justify-center gap-2 w-full p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all
                ${dragOver
                  ? 'border-orange-400 bg-orange-50 scale-[1.01]'
                  : file
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-slate-200 bg-slate-50 hover:border-orange-300 hover:bg-orange-50'
                }`}>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
                onChange={handleFileChange} />

              {file ? (
                <>
                  <span className="material-symbols-outlined text-3xl text-orange-500">
                    {file.type === 'application/pdf' ? 'picture_as_pdf' : 'image'}
                  </span>
                  <span className="text-xs font-bold text-orange-700 text-center break-all leading-relaxed">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-3xl text-slate-300">upload_file</span>
                  <span className="text-xs font-bold text-slate-400 text-center leading-relaxed">
                    Arrastra o toca para adjuntar
                    <br />
                    <span className="font-medium text-slate-300">PDF · JPG · PNG · WebP · hasta 4 MB</span>
                  </span>
                </>
              )}
            </label>

            {/* Error */}
            {fileError && (
              <p className="text-xs text-red-500 font-bold mt-1 ml-1">{fileError}</p>
            )}

            {/* Quitar archivo */}
            {file && (
              <button type="button" onClick={removeFile}
                className="mt-1.5 ml-1 text-xs text-slate-400 hover:text-red-500 font-bold transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">close</span>
                Quitar archivo
              </button>
            )}
          </div>

          {/* ── PDF de recibo / puesta en servicio (opcional) ──────────── */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase ml-1">
              Recibo / puesta en servicio (PDF)
              <span className="normal-case font-medium text-slate-300 ml-1">(opcional)</span>
            </label>

            <label
              className={`mt-1 flex flex-col items-center justify-center gap-2 w-full p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all
                ${returnDoc
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50'
                }`}>
              <input
                type="file"
                className="hidden"
                accept="application/pdf,.pdf"
                onChange={handleReturnDocChange} />

              {returnDoc ? (
                <>
                  <span className="material-symbols-outlined text-3xl text-emerald-500">picture_as_pdf</span>
                  <span className="text-xs font-bold text-emerald-700 text-center break-all leading-relaxed">
                    {returnDoc.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {(returnDoc.size / 1024).toFixed(0)} KB
                  </span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-3xl text-slate-300">description</span>
                  <span className="text-xs font-bold text-slate-400 text-center leading-relaxed">
                    Adjuntar acta de recibo (PDF)
                    <br />
                    <span className="font-medium text-slate-300">Solo PDF · hasta 4 MB · se guarda en Cloudflare</span>
                  </span>
                </>
              )}
            </label>

            {returnDocError && (
              <p className="text-xs text-red-500 font-bold mt-1 ml-1">{returnDocError}</p>
            )}

            {returnDoc && (
              <button type="button" onClick={removeReturnDoc}
                className="mt-1.5 ml-1 text-xs text-slate-400 hover:text-red-500 font-bold transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">close</span>
                Quitar recibo
              </button>
            )}
          </div>

          {/* Submit */}
          <button disabled={loading} type="submit"
            className="w-full py-4 bg-orange-600 text-white font-black rounded-xl shadow-lg uppercase text-xs tracking-widest active:scale-95 transition-all disabled:opacity-60">
            {loading
              ? (file ? 'Subiendo archivo...' : 'Sincronizando...')
              : 'Guardar en Bitácora'}
          </button>
        </form>
      </div>
    </aside>
  );
}
