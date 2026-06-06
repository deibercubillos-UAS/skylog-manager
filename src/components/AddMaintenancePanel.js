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
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function AddMaintenancePanel({ onClose, onSuccess }) {
  const [drones, setDrones]       = useState([]);
  const [orgId, setOrgId]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [file, setFile]           = useState(null);
  const [fileError, setFileError] = useState('');
  const [dragOver, setDragOver]   = useState(false);
  const fileInputRef              = useRef(null);

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
        const { data } = await supabase
          .from('aircraft')
          .select('*')
          .eq('organization_id', prof.organization_id)
          .neq('status', 'Baja');        // excluir aeronaves dadas de baja
        setDrones(data || []);
      }
    }
    loadDrones();
  }, []);

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
      setFileError('El archivo supera el límite de 10 MB.');
      setFile(null);
      return;
    }
    setFileError('');
    setFile(f);
  };

  const handleFileChange = (e) => validateAndSetFile(e.target.files?.[0]);

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

        const { error: uploadErr } = await supabase.storage
          .from('maintenance-docs')
          .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

        if (uploadErr) throw new Error('Error al subir el archivo: ' + uploadErr.message);
        attachment_path = path;
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
        }),
      });

      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* not JSON */ }

      if (!res.ok) {
        // Si el POST falla pero ya subimos el archivo, intentar limpiarlo
        if (attachment_path) {
          await supabase.storage.from('maintenance-docs').remove([attachment_path]);
        }
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

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <aside className="fixed z-[250] bg-white flex flex-col text-left
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
                    <span className="font-medium text-slate-300">PDF · JPG · PNG · WebP · hasta 10 MB</span>
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
