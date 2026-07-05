'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

export default function SupplierPanel({ supplier, onClose, onSuccess }) {
  const isEdit = !!supplier;
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    name:          supplier?.name || '',
    category:      supplier?.category || '',
    tax_id:        supplier?.tax_id || '',
    contact_name:  supplier?.contact_name || '',
    contact_email: supplier?.contact_email || '',
    contact_phone: supplier?.contact_phone || '',
    address:       supplier?.address || '',
    status:        supplier?.status || 'activo',
    notes:         supplier?.notes || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.warn('El nombre del proveedor es obligatorio.'); return; }
    setLoading(true);
    try {
      const res = await fetch(isEdit ? `/api/suppliers/${supplier.id}` : '/api/suppliers', {
        method:  isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar el proveedor.');
      toast.success(isEdit ? 'Proveedor actualizado.' : 'Proveedor creado.');
      onSuccess();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar el proveedor.');
      toast.success('Proveedor eliminado.');
      onSuccess();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-900";
  const labelCls = "text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5";

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[92vw] md:max-w-[640px] lg:max-w-[820px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Proveedores</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 shrink-0">{isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
        <div className="bg-[#1A202C] rounded-2xl px-5 py-4 md:px-6 md:py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Cumplimiento</p>
          <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-1">{isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">Datos de contacto para el registro y las auditorías periódicas</p>
        </div>

        <form id="supplier-form" onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-1">
              <label className={labelCls}>Nombre del proveedor <span className="text-orange-600">*</span></label>
              <input required className={inputCls} placeholder="Ej. Repuestos Andinos SAS"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Categoría</label>
              <input className={inputCls} placeholder="Ej. Mantenimiento, Combustible, Repuestos..."
                value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>NIT / identificación fiscal</label>
              <input className={inputCls} value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Estado</label>
              <div className={inputCls + " flex items-center gap-2"}>
                <select className="flex-1 min-w-0 bg-transparent outline-none appearance-none cursor-pointer"
                  value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
                <span className="material-symbols-outlined text-base text-slate-400 shrink-0">expand_more</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Contacto</label>
              <input className={inputCls} value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Teléfono</label>
              <input className={inputCls} value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Correo</label>
              <input type="email" className={inputCls} value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Dirección</label>
              <input className={inputCls} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Notas</label>
            <textarea rows={3} className={inputCls + ' resize-none'} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </form>
      </div>

      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
        {isEdit ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">¿Eliminar este proveedor y sus auditorías?</span>
              <button type="button" onClick={handleDelete} disabled={loading}
                className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase transition-all disabled:opacity-50">
                Sí, eliminar
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-500 font-black text-xs uppercase transition-all">
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 font-black text-xs uppercase tracking-wide transition-all">
              <span className="material-symbols-outlined text-base">delete</span>
              Eliminar
            </button>
          )
        ) : <span />}
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
            Cancelar
          </button>
          <button form="supplier-form" type="submit" disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
            <span className="material-symbols-outlined text-base">add_circle</span>
            {loading ? 'Sincronizando...' : isEdit ? 'Guardar cambios' : 'Crear proveedor'}
          </button>
        </div>
      </div>
    </aside>
  );
}
