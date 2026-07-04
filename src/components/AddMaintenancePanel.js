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

export default function AddMaintenancePanel({ onClose, onSuccess, maintenance }) {
  const isEdit = !!maintenance;

  const [drones, setDrones]       = useState([]);
  const [orgId, setOrgId]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [file, setFile]           = useState(null);
  const [fileError, setFileError] = useState('');
  const [dragOver, setDragOver]   = useState(false);
  const fileInputRef              = useRef(null);

  // Checklist de recibo (definiciones por org + respuestas del técnico)
  const [checklistDefs, setChecklistDefs] = useState([]);   // [{ field_number, label_text }]
  const [checklist, setChecklist]         = useState(maintenance?.return_checklist || {});   // { field_number: true/false }

  // Componentes: roster activo de la aeronave + cambios del técnico
  // (solo aplica al REGISTRAR — ver nota junto a la sección "Componentes")
  const [roster, setRoster]               = useState([]);   // [{ id, component_type, name, serial, used_hours, installed_at }]
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterChanges, setRosterChanges] = useState({});   // { [id]: { action, part_new } }
  const [newComps, setNewComps]           = useState([]);   // [{ component_type, name, serial }]

  // PDF de recibo / puesta en servicio (Fase C)
  const [returnDoc, setReturnDoc]           = useState(null);
  const [returnDocError, setReturnDocError] = useState('');

  // Archivos ya cargados (solo edición) — se reemplazan si el usuario sube uno
  // nuevo (file/returnDoc), o se quitan explícitamente poniendo el path en null.
  const [existingAttachmentPath, setExistingAttachmentPath] = useState(maintenance?.attachment_path || null);
  const [existingReturnDocPath, setExistingReturnDocPath]   = useState(maintenance?.return_doc_path || null);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    aircraft_id:          maintenance?.aircraft_id || '',
    technician_name:      maintenance?.technician_name || '',
    maintenance_type:     maintenance?.maintenance_type || 'PREVENTIVO',
    description:          maintenance?.description || '',
    hours_at_service:     maintenance?.hours_at_service ?? 0,
    maintenance_date:     maintenance?.maintenance_date || today,
    next_maintenance_date: '',
    operational_status:   'disponible',
  });

  const openDoc = (path) => {
    if (!path) return;
    window.open(`/api/maintenance/attachment?path=${encodeURIComponent(path)}`, '_blank', 'noopener,noreferrer');
  };

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

  // Cargar el roster activo al elegir/cambiar la aeronave (solo al registrar —
  // en edición no se muestra ni se toca la trazabilidad de componentes)
  useEffect(() => {
    if (!form.aircraft_id || isEdit) { setRoster([]); setRosterChanges({}); return; }
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
  }, [form.aircraft_id, isEdit]);

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
      // 1. Subir adjunto nuevo (si el usuario seleccionó uno) — si no, en edición
      //    se conserva el existente salvo que se haya quitado explícitamente.
      let attachment_path = isEdit ? existingAttachmentPath : null;
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

      // 1b. Subir el PDF de recibo / puesta en servicio (si existe) — misma lógica
      let return_doc_path = isEdit ? existingReturnDocPath : null;
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

      // 2. Guardar el registro — POST (nuevo) o PATCH (edición de uno existente).
      //    En edición NO se reenvían next_maintenance_date/operational_status/
      //    components: esos efectos (reiniciar contadores de la aeronave,
      //    registrar cambios de componentes) solo aplican al crear un registro
      //    nuevo — reaplicarlos al corregir uno histórico resetearía el estado
      //    actual de la aeronave o duplicaría eventos de trazabilidad.
      const res = isEdit
        ? await fetch(`/api/maintenance/${maintenance.id}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              aircraft_id:      form.aircraft_id,
              technician_name:  form.technician_name,
              maintenance_type: form.maintenance_type,
              description:      form.description,
              hours_at_service: parseFloat(form.hours_at_service || 0),
              maintenance_date: form.maintenance_date || today,
              attachment_path,
              return_doc_path,
              return_checklist: checklistDefs.length > 0 ? checklist : null,
            }),
          })
        : await fetch('/api/maintenance', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              aircraft_id:           form.aircraft_id,
              technician_name:       form.technician_name,
              maintenance_type:      form.maintenance_type,
              description:           form.description,
              hours_at_service:      parseFloat(form.hours_at_service || 0),
              maintenance_date:      form.maintenance_date || today,
              next_maintenance_date: form.next_maintenance_date || null,
              operational_status:    form.operational_status,
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
        // Si el guardado falla pero ya subimos archivos nuevos, limpiarlos (huérfanos)
        [file && attachment_path, returnDoc && return_doc_path].filter(Boolean).forEach(p => {
          fetch('/api/maintenance/attachment', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: p }),
          }).catch(() => {});
        });
        throw new Error(data?.error || 'Error al guardar el registro.');
      }

      // Si se reemplazó o se quitó un archivo previo, borrar el path viejo (huérfano)
      if (isEdit) {
        const toCleanup = [];
        if (maintenance.attachment_path && maintenance.attachment_path !== attachment_path) toCleanup.push(maintenance.attachment_path);
        if (maintenance.return_doc_path && maintenance.return_doc_path !== return_doc_path) toCleanup.push(maintenance.return_doc_path);
        toCleanup.forEach(p => {
          fetch('/api/maintenance/attachment', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: p }),
          }).catch(() => {});
        });
      }

      toast.success(isEdit ? 'Mantenimiento actualizado.' : 'Mantenimiento registrado y contadores actualizados.');
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

  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-900";
  const labelCls = "text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5";

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[92vw] md:max-w-[640px] lg:max-w-[820px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Mantenimiento</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 shrink-0">{isEdit ? 'Editar mantenimiento' : 'Registrar mantenimiento'}</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
        {/* Hero */}
        <div className="bg-[#1A202C] rounded-2xl px-5 py-4 md:px-6 md:py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Flota &amp; Equipo</p>
          <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-1">{isEdit ? 'Editar mantenimiento' : 'Registrar mantenimiento'}</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            {isEdit
              ? 'Corrige los datos de este registro ya guardado.'
              : 'Actualiza el historial y la próxima fecha prevista de la aeronave'}
          </p>
        </div>

        <form id="add-maintenance-form" onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">

            {/* Columna izquierda: aeronave y tipo */}
            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 pb-2 border-b border-slate-100">Aeronave y tipo</p>

              <div className="space-y-1">
                <label className={labelCls}>Aeronave <span className="text-orange-600">*</span></label>
                <select required className={inputCls}
                  value={form.aircraft_id}
                  onChange={e => setForm({ ...form, aircraft_id: e.target.value })}>
                  <option value="">Seleccionar aeronave...</option>
                  {drones.map(d => (
                    <option key={d.id} value={d.id}>{d.model} · {d.serial_number}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Tipo <span className="text-orange-600">*</span></label>
                  <select required className={inputCls}
                    value={form.maintenance_type}
                    onChange={e => setForm({ ...form, maintenance_type: e.target.value })}>
                    <option value="PREVENTIVO">Preventivo</option>
                    <option value="CORRECTIVO">Correctivo</option>
                    <option value="ACTUALIZACIÓN">Actualización</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Fecha realizada <span className="text-orange-600">*</span></label>
                  <input required type="date" className={inputCls}
                    value={form.maintenance_date}
                    onChange={e => setForm({ ...form, maintenance_date: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelCls}>Técnico responsable <span className="text-orange-600">*</span></label>
                <input required className={inputCls}
                  placeholder='Ej. Camilo Duarte — o "Externo: nombre del taller"'
                  value={form.technician_name}
                  onChange={e => setForm({ ...form, technician_name: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className={labelCls}>Horas en servicio</label>
                <input type="number" step="0.01" className={inputCls}
                  placeholder="0.00"
                  value={form.hours_at_service}
                  onChange={e => setForm({ ...form, hours_at_service: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className={labelCls}>Descripción del trabajo realizado</label>
                <textarea rows={4} className={inputCls + ' font-medium resize-none'}
                  placeholder="Ej. Cambio de hélices, calibración de IMU, revisión de motores…"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            {/* Columna derecha: programación y evidencia */}
            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 pb-2 border-b border-slate-100">Programación y evidencia</p>

              {isEdit ? (
                <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  <span className="material-symbols-outlined text-sm text-slate-400 shrink-0">info</span>
                  <span className="text-[11px] font-semibold text-slate-500 leading-snug">
                    La próxima fecha prevista y el estado de la aeronave solo se actualizan al
                    <strong className="text-slate-600"> registrar</strong> un mantenimiento nuevo — para no alterar
                    el estado actual con la corrección de un registro histórico.
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className={labelCls}>
                    Próxima fecha prevista
                    <span className="normal-case font-medium text-slate-300 ml-1">(opcional)</span>
                  </label>
                  <input type="date" className={inputCls}
                    value={form.next_maintenance_date}
                    onChange={e => setForm({ ...form, next_maintenance_date: e.target.value })} />
                </div>
              )}

              {/* ── Checklist de recibo (si la org lo configuró) ──────────── */}
              {checklistDefs.length > 0 && (
                <div className="space-y-1">
                  <label className={labelCls}>
                    Recibo posterior al mantenimiento
                    <span className="normal-case font-medium text-slate-300 ml-1">(opcional)</span>
                  </label>
                  <div className="space-y-2">
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

              {/* ── Componentes: roster vivo + cambios (solo al registrar) ──── */}
              {!isEdit && form.aircraft_id && (
                <div className="space-y-3">
                  <label className={labelCls}>Componentes de la aeronave</label>

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
              <div className="space-y-1">
                <label className={labelCls}>
                  Adjuntar evidencia / factura
                  <span className="normal-case font-medium text-slate-300 ml-1">(opcional)</span>
                </label>

                <label
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center gap-2 w-full p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all
                    ${dragOver
                      ? 'border-orange-400 bg-orange-50 scale-[1.01]'
                      : file || existingAttachmentPath
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
                  ) : existingAttachmentPath ? (
                    <>
                      <span className="material-symbols-outlined text-3xl text-orange-500">attach_file</span>
                      <span className="text-xs font-bold text-orange-700 text-center break-all leading-relaxed">
                        {existingAttachmentPath.split('/').pop()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Archivo ya cargado — haz clic para reemplazar</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-3xl text-slate-300">cloud_upload</span>
                      <span className="text-xs font-bold text-slate-400 text-center leading-relaxed">
                        Arrastra el archivo o haz clic para subir
                        <br />
                        <span className="font-medium text-slate-300">PDF · JPG · PNG · WebP · hasta 4 MB</span>
                      </span>
                    </>
                  )}
                </label>

                {fileError && (
                  <p className="text-xs text-red-500 font-bold mt-1 ml-1">{fileError}</p>
                )}

                {file ? (
                  <button type="button" onClick={removeFile}
                    className="mt-1.5 ml-1 text-xs text-slate-400 hover:text-red-500 font-bold transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">close</span>
                    Quitar archivo
                  </button>
                ) : existingAttachmentPath && (
                  <div className="flex items-center gap-3 mt-1.5 ml-1">
                    <button type="button" onClick={() => openDoc(existingAttachmentPath)}
                      className="text-xs text-orange-600 hover:text-orange-800 font-bold transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">visibility</span>
                      Ver
                    </button>
                    <button type="button" onClick={() => setExistingAttachmentPath(null)}
                      className="text-xs text-slate-400 hover:text-red-500 font-bold transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">close</span>
                      Quitar
                    </button>
                  </div>
                )}
              </div>

              {/* ── PDF de recibo / puesta en servicio (opcional) ──────────── */}
              <div className="space-y-1">
                <label className={labelCls}>
                  Recibo / puesta en servicio (PDF)
                  <span className="normal-case font-medium text-slate-300 ml-1">(opcional)</span>
                </label>

                <label
                  className={`flex flex-col items-center justify-center gap-2 w-full p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all
                    ${returnDoc || existingReturnDocPath
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
                  ) : existingReturnDocPath ? (
                    <>
                      <span className="material-symbols-outlined text-3xl text-emerald-500">picture_as_pdf</span>
                      <span className="text-xs font-bold text-emerald-700 text-center break-all leading-relaxed">
                        {existingReturnDocPath.split('/').pop()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Recibo ya cargado — haz clic para reemplazar</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-3xl text-slate-300">description</span>
                      <span className="text-xs font-bold text-slate-400 text-center leading-relaxed">
                        Adjuntar acta de recibo (PDF)
                        <br />
                        <span className="font-medium text-slate-300">Solo PDF · hasta 4 MB</span>
                      </span>
                    </>
                  )}
                </label>

                {returnDocError && (
                  <p className="text-xs text-red-500 font-bold mt-1 ml-1">{returnDocError}</p>
                )}

                {returnDoc ? (
                  <button type="button" onClick={removeReturnDoc}
                    className="mt-1.5 ml-1 text-xs text-slate-400 hover:text-red-500 font-bold transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">close</span>
                    Quitar recibo
                  </button>
                ) : existingReturnDocPath && (
                  <div className="flex items-center gap-3 mt-1.5 ml-1">
                    <button type="button" onClick={() => openDoc(existingReturnDocPath)}
                      className="text-xs text-emerald-600 hover:text-emerald-800 font-bold transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">visibility</span>
                      Ver
                    </button>
                    <button type="button" onClick={() => setExistingReturnDocPath(null)}
                      className="text-xs text-slate-400 hover:text-red-500 font-bold transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">close</span>
                      Quitar
                    </button>
                  </div>
                )}
              </div>

              {/* Estado tras servicio (solo al registrar — ver nota arriba) */}
              {!isEdit && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-5">
                  <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Estado tras servicio</span>
                  <button type="button" onClick={() => setForm({ ...form, operational_status: 'disponible' })} className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-lg ${form.operational_status === 'disponible' ? 'text-orange-600' : 'text-slate-300'}`}>
                      {form.operational_status === 'disponible' ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                    <span className="text-xs font-bold text-slate-800">Operativo</span>
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, operational_status: 'en_mantenimiento' })} className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-lg ${form.operational_status === 'en_mantenimiento' ? 'text-orange-600' : 'text-slate-300'}`}>
                      {form.operational_status === 'en_mantenimiento' ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                    <span className="text-xs font-bold text-slate-800">Sigue en mantenimiento</span>
                  </button>
                </div>
              </div>
              )}
            </div>
          </div>

          <p className="text-[10px] font-semibold text-slate-400">
            <span className="text-orange-600">*</span> Aeronave, tipo, fecha realizada y técnico son obligatorios — el resto puedes completarlo después
          </p>
        </form>
      </div>

      {/* Footer fijo — botón siempre visible */}
      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
        <button type="button" onClick={onClose}
          className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
          Cancelar
        </button>
        <button form="add-maintenance-form" type="submit" disabled={loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
          <span className="material-symbols-outlined text-base">{isEdit ? 'save' : 'add_circle'}</span>
          {loading
            ? (file ? 'Subiendo archivo...' : 'Sincronizando...')
            : (isEdit ? 'Guardar cambios' : 'Registrar mantenimiento')}
        </button>
      </div>
    </aside>
  );
}
