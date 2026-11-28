'use client';

// Skylog V2.0 — SMS Matriz de peligros: evidencias y asistencia de UN avance de
// control. Adjuntos tipados (foto / documento-presentación / lista de asistencia)
// en R2 y una lista de asistencia en línea (miembros o invitados, sin firma,
// descargable en PDF). Se monta dentro del avance expandido; carga su data al
// aparecer. Escribe solo el gestor (P2); ver, cualquiera que vea la matriz (P1).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@skylog/ui';
import { downloadAttendancePdf } from '@/lib/v2/attendanceDoc';

const KIND_META = {
  foto: { label: 'Foto', icon: 'photo_camera', accept: 'image/png,image/jpeg,image/webp' },
  documento: { label: 'Documento / presentación', icon: 'description', accept: 'application/pdf,.pdf,.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  lista_asistencia: { label: 'Lista de asistencia (archivo)', icon: 'fact_check', accept: 'application/pdf,.pdf,image/png,image/jpeg,image/webp' },
};

export default function AvanceEvidence({ update, isManager, roster = [], orgName, nit, logoUrl }) {
  const [attachments, setAttachments] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [attForm, setAttForm] = useState({ personId: '', fullName: '', document: '', role: '' });
  const inputs = { foto: useRef(null), documento: useRef(null), lista_asistencia: useRef(null) };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, atRes] = await Promise.all([
        fetch(`/api/sms/control-updates/${update.id}/attachments`),
        fetch(`/api/sms/control-updates/${update.id}/attendance`),
      ]);
      const [aData, atData] = await Promise.all([aRes.json(), atRes.json()]);
      if (aRes.ok) setAttachments(aData.attachments || []);
      if (atRes.ok) setAttendees(atData.attendees || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [update.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadFile(kind, file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      const res = await fetch(`/api/sms/control-updates/${update.id}/attachments`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo subir el adjunto');
      setAttachments((list) => [...list, data.attachment]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAttachment(att) {
    if (!confirm('¿Eliminar este adjunto?')) return;
    const res = await fetch(`/api/sms/control-updates/attachments/${att.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'No se pudo eliminar');
      return;
    }
    setAttachments((list) => list.filter((a) => a.id !== att.id));
  }

  async function addAttendee(e) {
    e.preventDefault();
    if (!attForm.fullName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sms/control-updates/${update.id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: attForm.personId || null, fullName: attForm.fullName, document: attForm.document, role: attForm.role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo agregar el asistente');
      setAttendees((list) => [...list, data.attendee]);
      setAttForm({ personId: '', fullName: '', document: '', role: '' });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAttendee(a) {
    const res = await fetch(`/api/sms/control-updates/attendance/${a.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'No se pudo eliminar');
      return;
    }
    setAttendees((list) => list.filter((x) => x.id !== a.id));
  }

  function onPickMember(personId) {
    const m = roster.find((r) => r.person.id === personId);
    setAttForm((f) => ({ ...f, personId, fullName: m ? m.person.full_name : '', role: m?.role || f.role }));
  }

  if (loading) return <p className="text-[11px] text-navy-300 mt-2">Cargando evidencias…</p>;

  return (
    <div className="mt-3 space-y-4 rounded-xl bg-navy-50/40 border border-navy-50 p-3">
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">{error}</p>}

      {/* Adjuntos */}
      <div>
        <p className="text-xs font-bold text-navy mb-1.5">Evidencias</p>
        {attachments.length === 0 ? (
          <p className="text-[11px] text-navy-300">Sin adjuntos todavía.</p>
        ) : (
          <ul className="space-y-1.5">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-xs bg-white rounded-lg border border-navy-100 px-2.5 py-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary-500 shrink-0">{KIND_META[a.kind]?.icon || 'attach_file'}</span>
                <a href={`/api/sms/control-updates/attachments/${a.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate text-navy-600 hover:underline">
                  {a.file_name || KIND_META[a.kind]?.label || 'Adjunto'}
                </a>
                <span className="text-[10px] text-navy-300 shrink-0">{KIND_META[a.kind]?.label}</span>
                {isManager && (
                  <button type="button" onClick={() => deleteAttachment(a)} className="text-navy-300 hover:text-red-600 shrink-0" aria-label="Eliminar adjunto">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {isManager && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(KIND_META).map(([kind, meta]) => (
              <span key={kind}>
                <input
                  ref={inputs[kind]}
                  type="file"
                  accept={meta.accept}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    uploadFile(kind, f);
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputs[kind].current?.click()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 bg-white border border-navy-200 rounded-lg px-2 py-1 hover:bg-navy-50 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                  {meta.label}
                </button>
              </span>
            ))}
            {busy && <span className="text-[11px] text-navy-400 self-center">Subiendo…</span>}
          </div>
        )}
      </div>

      {/* Lista de asistencia en línea */}
      <div className="border-t border-navy-100 pt-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-xs font-bold text-navy">Lista de asistencia en línea</p>
          {attendees.length > 0 && (
            <button
              type="button"
              onClick={() => downloadAttendancePdf({ orgName, nit, logoUrl, subtitle: update.note, attendees })}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:underline"
            >
              <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
              Descargar PDF
            </button>
          )}
        </div>
        {attendees.length === 0 ? (
          <p className="text-[11px] text-navy-300">Sin asistentes todavía.</p>
        ) : (
          <ul className="space-y-1">
            {attendees.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-xs bg-white rounded-lg border border-navy-100 px-2.5 py-1.5">
                <span className="material-symbols-outlined text-[15px] text-navy-300 shrink-0">person</span>
                <span className="flex-1 min-w-0 truncate text-navy-600">
                  {a.full_name}
                  {a.role ? ` · ${a.role}` : ''}
                  {a.document ? ` · ${a.document}` : ''}
                  {!a.person_id && <span className="text-[10px] text-amber-600"> · invitado</span>}
                </span>
                {isManager && (
                  <button type="button" onClick={() => deleteAttendee(a)} className="text-navy-300 hover:text-red-600 shrink-0" aria-label="Quitar asistente">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {isManager && (
          <form onSubmit={addAttendee} className="mt-2 space-y-2">
            {roster.length > 0 && (
              <select
                value={attForm.personId}
                onChange={(e) => onPickMember(e.target.value)}
                className="w-full text-xs border border-navy-200 rounded-lg px-2 py-1.5 bg-white"
              >
                <option value="">Elegir del personal… (o escribe un invitado abajo)</option>
                {roster.map((m) => (
                  <option key={m.person.id} value={m.person.id}>
                    {m.person.full_name} ({m.role})
                  </option>
                ))}
              </select>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              <input
                value={attForm.fullName}
                onChange={(e) => setAttForm((f) => ({ ...f, fullName: e.target.value, personId: '' }))}
                placeholder="Nombre"
                required
                className="text-xs border border-navy-200 rounded-lg px-2 py-1.5 bg-white"
              />
              <input
                value={attForm.document}
                onChange={(e) => setAttForm((f) => ({ ...f, document: e.target.value }))}
                placeholder="Cédula (opcional)"
                className="text-xs border border-navy-200 rounded-lg px-2 py-1.5 bg-white"
              />
              <input
                value={attForm.role}
                onChange={(e) => setAttForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="Cargo (opcional)"
                className="text-xs border border-navy-200 rounded-lg px-2 py-1.5 bg-white"
              />
            </div>
            <Button type="submit" disabled={busy || !attForm.fullName.trim()} className="text-xs px-3 py-1.5">
              <span className="material-symbols-outlined text-[14px] align-middle mr-1">person_add</span>
              Agregar asistente
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
