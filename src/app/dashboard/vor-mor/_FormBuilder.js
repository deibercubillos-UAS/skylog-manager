'use client';
import { useState } from 'react';
import { BASE_FIELDS, SECTION_LABELS, parseFormConfig } from '@/lib/vorMorFields';

const FIELD_TYPES = [
  { value: 'text',     label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'date',     label: 'Fecha' },
  { value: 'select',   label: 'Lista desplegable' },
  { value: 'checkbox', label: 'Casilla sí/no' },
];

// Editor de campos del formato VOR/MOR — base fields (mostrar/ocultar/renombrar/obligatorio)
// + campos personalizados tipados. El título/descripción y el botón Guardar viven en el
// hero del panel padre (dashboard/vor-mor/page.js); esto es solo la columna de campos.
export default function FormBuilder({ configForm, setConfigForm, accent }) {
  const [newField, setNewField]         = useState({ label: '', type: 'text', required: false, placeholder: '', options: '' });
  const [editCustomIdx, setEditCustomIdx] = useState(null);
  const [editCustom, setEditCustom]       = useState(null);
  const [editBaseId, setEditBaseId]       = useState(null);

  const config    = parseFormConfig(configForm.custom_fields);
  const overrides = config.base_overrides || {};
  const custom    = config.custom || [];

  const updateConfig = (newConfig) => {
    setConfigForm(p => ({ ...p, custom_fields: newConfig }));
  };

  const setOverride = (fieldId, patch) => {
    const current = overrides[fieldId] || {};
    const merged  = { ...current, ...patch };
    if (merged.hidden === false)    delete merged.hidden;
    if (merged.required !== undefined) {
      const base = BASE_FIELDS.find(f => f.id === fieldId);
      if (merged.required === base?.required) delete merged.required;
    }
    const newOvs = { ...overrides, [fieldId]: merged };
    if (Object.keys(merged).length === 0) delete newOvs[fieldId];
    updateConfig({ base_overrides: newOvs, custom });
  };

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

  const FI  = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all';
  const FL  = 'block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5';
  const accentText = accent === 'MOR' ? 'text-rose-600' : 'text-orange-600';

  const hiddenCount = Object.values(overrides).filter(o => o.hidden).length;

  return (
    <div className="flex flex-col min-h-0 bg-white border border-slate-200 rounded-3xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
        <span className={`text-xs font-black uppercase tracking-widest ${accentText}`}>Campos del formato</span>
        <span className="text-xs font-medium text-slate-400">
          {hiddenCount > 0 && `${hiddenCount} ocultos · `}{custom.length} personalizados
        </span>
      </div>

      <div className="p-5 space-y-5 overflow-y-auto">

        {/* ── CAMPOS BASE ── */}
        <div className="space-y-2">
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
                        <button type="button"
                          onClick={() => baseField.hideable && setOverride(baseField.id, { hidden: !isHidden })}
                          disabled={!baseField.hideable}
                          title={baseField.hideable ? (isHidden ? 'Mostrar campo' : 'Ocultar campo') : 'Este campo no se puede ocultar'}
                          className={`shrink-0 transition-colors ${!baseField.hideable ? 'opacity-30 cursor-not-allowed text-slate-400' : isHidden ? 'text-slate-300 hover:text-slate-500' : 'text-emerald-500 hover:text-emerald-600'}`}>
                          <span className="material-symbols-outlined text-lg">
                            {isHidden ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>

                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${isHidden ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                            {currLabel}
                          </span>
                          {ov.label && (
                            <span className="ml-2 text-xs text-orange-500 font-bold">personalizado</span>
                          )}
                        </div>

                        {!isHidden && (
                          <button type="button"
                            onClick={() => baseField.id !== 'description' && setOverride(baseField.id, { required: !isRequired })}
                            disabled={baseField.id === 'description'}
                            title={baseField.id === 'description' ? 'Siempre obligatorio' : (isRequired ? 'Hacer opcional' : 'Hacer obligatorio')}
                            className={`shrink-0 flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border transition-all ${isRequired ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'} ${baseField.id === 'description' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <span className="material-symbols-outlined text-xs">{isRequired ? 'star' : 'star_outline'}</span>
                            {isRequired ? 'Oblig.' : 'Opcional'}
                          </button>
                        )}

                        {!isHidden && (
                          <button type="button" onClick={() => {
                            if (isEditing) { setEditBaseId(null); return; }
                            setEditBaseId(baseField.id);
                          }}
                            className={`shrink-0 transition-colors ${isEditing ? 'text-orange-600' : 'text-slate-300 hover:text-orange-500'}`}>
                            <span className="material-symbols-outlined text-base">{isEditing ? 'check' : 'edit'}</span>
                          </button>
                        )}
                      </div>

                      {isEditing && !isHidden && (
                        <div className="px-4 pb-4 pt-1 bg-orange-50/60 space-y-2 border-t border-orange-100">
                          <div>
                            <label className={FL}>Etiqueta personalizada</label>
                            <input value={ov.label ?? baseField.label}
                              onChange={e => setOverride(baseField.id, { label: e.target.value || undefined })}
                              className={FI} placeholder={baseField.label} />
                          </div>
                          {baseField.type !== 'checkbox' && baseField.type !== 'select' && baseField.type !== 'barrier_select' && (
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
                              className="ml-auto text-xs font-black text-orange-600 hover:text-orange-800 transition-colors">
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

        {/* ── CAMPOS PERSONALIZADOS ── */}
        <div>
          <label className={FL}>Campos adicionales ({custom.length})</label>

          {custom.length > 0 && (
            <div className="space-y-2 mb-3">
              {custom.map((f, idx) => (
                <div key={f.id}>
                  {editCustomIdx === idx && editCustom ? (
                    <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 space-y-3">
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
                          <button type="button" onClick={saveEditCustom} className="bg-orange-600 hover:bg-orange-500 text-white py-1.5 px-4 rounded-xl text-xs font-black transition-colors">Listo</button>
                          <button type="button" onClick={() => { setEditCustomIdx(null); setEditCustom(null); }} className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-black transition-colors">×</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100 group hover:border-orange-200 transition-all">
                      <span className="material-symbols-outlined text-base text-slate-300 shrink-0">drag_indicator</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-700">{f.label}</span>
                        <span className="ml-2 text-xs text-slate-400">{FIELD_TYPES.find(t => t.value === f.type)?.label}</span>
                        {f.required && <span className="ml-2 text-xs text-orange-500 font-bold">*oblig.</span>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button type="button" onClick={() => moveCustomField(idx, -1)} disabled={idx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><span className="material-symbols-outlined text-base">arrow_upward</span></button>
                        <button type="button" onClick={() => moveCustomField(idx, 1)} disabled={idx === custom.length-1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><span className="material-symbols-outlined text-base">arrow_downward</span></button>
                        <button type="button" onClick={() => { setEditCustomIdx(idx); setEditCustom({ ...f, options: (f.options||[]).join('\n') }); }} className="text-slate-400 hover:text-orange-600"><span className="material-symbols-outlined text-base">edit</span></button>
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
                <span className="material-symbols-outlined text-base">add_circle</span>Agregar campo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
