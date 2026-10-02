'use client';

// Skylog V2.0 — Asistente de implantación (SMS-C): panel para agregar o
// editar una fila del plan tipo Gantt — responsable + recursos + fechas,
// por elemento oficial o tarea personalizada (§7.3.5: "se recomienda
// asignar los responsables y la proyección de los recursos requeridos").
import { useEffect, useState } from 'react';
import { Panel, Button } from '@skylog/ui';

export default function TaskPanel({ open, onClose, organizationId, phase, element, existingTask, roster, onSaved }) {
  const isAuto = !!element?.autoKey;
  const [form, setForm] = useState({ label: '', responsiblePersonId: '', responsibleName: '', resources: '', startDate: '', endDate: '', manualDone: false, notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      label: existingTask?.label || element?.label || '',
      responsiblePersonId: existingTask?.responsible_person_id || '',
      responsibleName: existingTask?.responsible_name || '',
      resources: existingTask?.resources || '',
      startDate: existingTask?.start_date || '',
      endDate: existingTask?.end_date || '',
      manualDone: existingTask?.manual_done || false,
      notes: existingTask?.notes || '',
    });
    setError(null);
  }, [open, existingTask, element]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        organizationId,
        phase,
        elementKey: element?.key || null,
        label: form.label,
        responsiblePersonId: form.responsiblePersonId || null,
        responsibleName: form.responsibleName,
        resources: form.resources,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        manualDone: isAuto ? false : form.manualDone,
        notes: form.notes,
      };
      let res;
      if (existingTask) {
        res = await fetch('/api/sms/implementation-plan/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingTask.id, ...payload }),
        });
      } else {
        res = await fetch('/api/sms/implementation-plan/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando la tarea');
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!existingTask || !confirm('¿Quitar esta tarea del plan?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sms/implementation-plan/tasks?id=${existingTask.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error eliminando');
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel open={open} onClose={onClose} title={element ? element.label : 'Tarea personalizada'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!element && (
          <div>
            <label className="text-xs font-medium text-navy-400 block mb-1">Nombre de la tarea</label>
            <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} required className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2" />
          </div>
        )}

        {isAuto && (
          <p className="text-xs text-navy-400 bg-navy-50 rounded-lg px-3 py-2">
            Este elemento se marca completo automáticamente con datos reales de la plataforma — aquí solo se planean responsable/recursos/fechas de referencia.
          </p>
        )}

        <div>
          <label className="text-xs font-medium text-navy-400 block mb-1">Responsable (miembro de la org)</label>
          <select value={form.responsiblePersonId} onChange={(e) => setForm((f) => ({ ...f, responsiblePersonId: e.target.value }))} className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2">
            <option value="">— Sin asignar —</option>
            {roster.map((m) => (
              <option key={m.person.id} value={m.person.id}>
                {m.person.full_name} ({m.role})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-navy-400 block mb-1">O responsable externo (texto libre)</label>
          <input
            value={form.responsibleName}
            onChange={(e) => setForm((f) => ({ ...f, responsibleName: e.target.value }))}
            placeholder="Ej. consultor externo, asesor SMS"
            className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-navy-400 block mb-1">Recursos proyectados</label>
          <input
            value={form.resources}
            onChange={(e) => setForm((f) => ({ ...f, resources: e.target.value }))}
            placeholder="Ej. 8 horas/mes, presupuesto de capacitación"
            className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-navy-400 block mb-1">Inicio</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-medium text-navy-400 block mb-1">Fin</label>
            <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2" />
          </div>
        </div>
        {!isAuto && (
          <label className="flex items-center gap-2 text-xs text-navy-500">
            <input type="checkbox" checked={form.manualDone} onChange={(e) => setForm((f) => ({ ...f, manualDone: e.target.checked }))} />
            Marcar como completada
          </label>
        )}
        <div>
          <label className="text-xs font-medium text-navy-400 block mb-1">Notas (opcional)</label>
          <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2" />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={busy} className="flex-1 justify-center">
            {busy ? 'Guardando…' : 'Guardar'}
          </Button>
          {existingTask && (
            <Button type="button" variant="ghost" onClick={handleDelete} disabled={busy}>
              Quitar
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
