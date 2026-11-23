'use client';

// Skylog V2.0 — configurador del formulario de reportes (40b). Dos pestañas (MOR/VOR): por cada tipo se
// puede ocultar/obligar/ordenar/renombrar los campos estándar y agregar preguntas propias. Los campos del
// mínimo regulatorio (descripción, severidad) llegan bloqueados del servidor. Lo ven el Gerente SMS y el GG.
import { useCallback, useEffect, useState } from 'react';
import { SectionCard } from '../../_components/SectionHero';
import { Button } from '@skylog/ui';

const TYPE_HINT = {
  vor: 'VOR — reporte voluntario (lo usan terceros y cualquier persona).',
  mor: 'MOR — lo radica el Gerente SMS tras su análisis.',
};
const INPUT_TYPE_LABELS = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  select: 'Lista de opciones',
  date: 'Fecha',
  number: 'Número',
  boolean: 'Sí / No',
};

let tempId = 0;
const withKey = (f) => ({ ...f, _key: f.id || `std-${f.field_key}` });

export default function FormBuilder({ organizationId }) {
  const [type, setType] = useState('vor');
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async (t) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/sms/report-forms?organizationId=${organizationId}&type=${t}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando el formulario');
      setFields((data.fields || []).map(withKey));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load(type);
  }, [load, type]);

  const update = (key, patch) => setFields((fs) => fs.map((f) => (f._key === key ? { ...f, ...patch } : f)));
  const removeCustom = (key) => setFields((fs) => fs.filter((f) => f._key !== key));
  const addCustom = () =>
    setFields((fs) => [...fs, { _key: `new-${++tempId}`, kind: 'custom', label: '', input_type: 'text', options: [], required: false, visible: true, locked: false }]);

  function move(idx, dir) {
    setFields((fs) => {
      const j = idx + dir;
      if (j < 0 || j >= fs.length) return fs;
      const copy = fs.slice();
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = fields.map((f) =>
        f.kind === 'custom'
          ? { kind: 'custom', id: typeof f.id === 'string' ? f.id : undefined, label: f.label, input_type: f.input_type, options: f.options, required: f.required, visible: f.visible }
          : { kind: 'standard', field_key: f.field_key, label: f.label, required: f.required, visible: f.visible }
      );
      const res = await fetch('/api/sms/report-forms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, type, fields: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setFields((data.fields || []).map(withKey));
      setNotice('Formulario guardado.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard icon="tune" tile="bg-teal-500 text-white" wash="from-teal-50 to-white" title="Personalizar el formulario" description="Configura los campos del formulario MOR y del VOR por separado.">
      <div className="flex gap-2 mb-2">
        {['vor', 'mor'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`text-xs font-bold px-4 py-1.5 rounded-full transition-colors ${type === t ? 'bg-primary-600 text-white' : 'bg-navy-100 text-navy-600 hover:bg-navy-200'}`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="text-xs text-navy-400 mb-3">{TYPE_HINT[type]}</p>

      {error && <p className="text-sm text-red-700 font-medium mb-2">{error}</p>}
      {notice && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mb-2">{notice}</p>}

      {loading ? (
        <div className="h-24 rounded-xl bg-navy-50 animate-pulse" />
      ) : (
        <div className="space-y-2">
          {fields.map((f, idx) => (
            <div key={f._key} className="rounded-xl border border-navy-100 bg-white p-3">
              <div className="flex items-start gap-2 flex-wrap">
                <div className="flex flex-col text-navy-400">
                  <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="disabled:opacity-25 leading-none" aria-label="Subir">
                    <span className="material-symbols-outlined text-lg">arrow_drop_up</span>
                  </button>
                  <button type="button" onClick={() => move(idx, 1)} disabled={idx === fields.length - 1} className="disabled:opacity-25 leading-none" aria-label="Bajar">
                    <span className="material-symbols-outlined text-lg">arrow_drop_down</span>
                  </button>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <input
                    value={f.label}
                    placeholder={f.kind === 'custom' ? 'Nombre de la pregunta' : ''}
                    onChange={(e) => update(f._key, { label: e.target.value })}
                    className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
                  />
                  {f.kind === 'standard' ? (
                    <p className="text-[11px] text-navy-400 mt-1">Campo estándar{f.locked ? ' · obligatorio por norma (no se puede ocultar)' : ''}</p>
                  ) : (
                    <div className="flex gap-2 flex-wrap mt-2">
                      <select value={f.input_type} onChange={(e) => update(f._key, { input_type: e.target.value })} className="text-xs border border-navy-200 rounded-lg px-2 py-1.5">
                        {Object.entries(INPUT_TYPE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      {f.input_type === 'select' && (
                        <input
                          value={(f.options || []).join(', ')}
                          placeholder="Opciones separadas por coma"
                          onChange={(e) => update(f._key, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
                          className="flex-1 min-w-[160px] text-xs border border-navy-200 rounded-lg px-2 py-1.5"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 text-xs text-navy-600">
                  <label className={`flex items-center gap-1.5 ${f.locked ? 'opacity-50' : ''}`}>
                    <input type="checkbox" checked={f.visible} disabled={f.locked} onChange={(e) => update(f._key, { visible: e.target.checked })} /> Visible
                  </label>
                  <label className={`flex items-center gap-1.5 ${f.locked ? 'opacity-50' : ''}`}>
                    <input type="checkbox" checked={f.required} disabled={f.locked} onChange={(e) => update(f._key, { required: e.target.checked })} /> Obligatorio
                  </label>
                  {f.kind === 'custom' && (
                    <button type="button" onClick={() => removeCustom(f._key)} className="text-red-600 hover:underline text-left">Quitar</button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-2 flex-wrap pt-2">
            <Button variant="ghost" className="text-xs px-3 py-1.5" onClick={addCustom}>
              <span className="material-symbols-outlined text-base align-middle mr-1">add</span>Agregar pregunta propia
            </Button>
            <Button className="text-xs px-3 py-1.5" disabled={saving} onClick={save}>
              {saving ? 'Guardando…' : 'Guardar formulario'}
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
