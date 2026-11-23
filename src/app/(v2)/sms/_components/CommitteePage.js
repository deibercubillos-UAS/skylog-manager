'use client';

// Skylog V2.0 — SMS: pantalla compartida de los comités de seguridad operacional (SRB y SAG).
// Modelo del manual WAS §11.12.7 (40a-sms-comites-srb-sag.md). Dos bloques: Integrantes (agregar por
// correo, lista con cargo, quitar) y Actas (listar, crear, editar). GG y GS administran; el Jefe de
// Pilotos y los integrantes ven. Parametrizada por `committee` ('srb' | 'sag').
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, SectionCard } from '../../_components/SectionHero';
import { Panel, Button } from '@skylog/ui';
import { fetchDutyContext, pickOrganizationId } from '@/lib/v2/dutyContextClient';

const META = {
  srb: {
    label: 'SRB',
    name: 'Comité de Revisión de Seguridad Operacional',
    icon: 'gavel',
    desc: 'Órgano estratégico: revisa la eficacia del SMS, el desempeño frente a objetivos y metas, los recursos y los cambios.',
    frequency: 'Reunión ordinaria semestral; extraordinaria ante un riesgo inaceptable, un accidente/incidente grave o un cambio significativo.',
    decisionsLabel: 'Decisiones',
    decisionsHint: 'Decisiones tomadas, con sus responsables y plazos.',
  },
  sag: {
    label: 'SAG',
    name: 'Grupo de Acción de Seguridad Operacional',
    icon: 'diversity_3',
    desc: 'Órgano operativo: gestiona riesgos específicos, coordina las medidas de control y las acciones correctivas, y hace seguimiento a los compromisos.',
    frequency: 'Reunión mensual; extraordinaria cuando lo requiera el Gerente de Seguridad Operacional.',
    decisionsLabel: 'Acciones',
    decisionsHint: 'Acciones acordadas, con sus responsables y plazos.',
  },
};

const ROLE_OPTIONS = [
  { value: 'presidente', label: 'Preside' },
  { value: 'secretario', label: 'Secretaría técnica' },
  { value: 'coordinador', label: 'Coordina' },
  { value: 'miembro', label: 'Miembro' },
  { value: 'invitado', label: 'Invitado' },
];
const ROLE_LABEL = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

function fmtDate(d) {
  if (!d) return '—';
  return new Date(`${d}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

const inputCls = 'w-full text-sm rounded-lg border border-navy-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300';
const labelCls = 'block text-xs font-medium text-navy-400 mb-1';

export default function CommitteePage({ committee }) {
  const meta = META[committee];
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [canManage, setCanManage] = useState(false);

  // Alta de integrante
  const [memberForm, setMemberForm] = useState({ email: '', name: '', roleInCommittee: 'miembro' });
  const [memberBusy, setMemberBusy] = useState(false);
  const [memberMsg, setMemberMsg] = useState(null);

  // Acta (crear/editar)
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchDutyContext()
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) { setLoading(false); return; }
        setContext(data);
        setOrganizationId((prev) => prev || pickOrganizationId(data));
      })
      .catch(() => setLoading(false));
  }, []);

  const loadAll = useCallback(async (orgId) => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [mRes, aRes] = await Promise.all([
        fetch(`/api/sms/committees/${committee}/members?organizationId=${orgId}`),
        fetch(`/api/sms/committees/${committee}/meetings?organizationId=${orgId}`),
      ]);
      const [mData, aData] = await Promise.all([mRes.json().catch(() => ({})), aRes.json().catch(() => ({}))]);
      if (!mRes.ok) throw new Error(mData.error || 'No se pudo cargar el comité');
      setMembers(mData.members || []);
      setCanManage(!!mData.canManage);
      if (aRes.ok) setMeetings(aData.meetings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [committee]);

  useEffect(() => { if (organizationId) loadAll(organizationId); }, [organizationId, loadAll]);

  async function addMember(e) {
    e.preventDefault();
    setMemberBusy(true);
    setMemberMsg(null);
    try {
      const res = await fetch(`/api/sms/committees/${committee}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...memberForm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo agregar');
      setMemberForm({ email: '', name: '', roleInCommittee: 'miembro' });
      setMemberMsg(data.invited ? 'Invitación enviada por correo.' : 'Integrante agregado.');
      await loadAll(organizationId);
    } catch (err) {
      setMemberMsg(err.message);
    } finally {
      setMemberBusy(false);
    }
  }

  async function removeMember(id) {
    if (!window.confirm('¿Quitar a esta persona del comité?')) return;
    const res = await fetch(`/api/sms/committees/${committee}/members?organizationId=${organizationId}&memberId=${id}`, { method: 'DELETE' });
    if (res.ok) setMembers((ms) => ms.filter((m) => m.id !== id));
  }

  async function removeMeeting(id) {
    if (!window.confirm('¿Eliminar esta acta? No se puede deshacer.')) return;
    const res = await fetch(`/api/sms/committees/${committee}/meetings?organizationId=${organizationId}&meetingId=${id}`, { method: 'DELETE' });
    if (res.ok) setMeetings((ms) => ms.filter((m) => m.id !== id));
  }

  if (loading && !context) return <p className="text-sm text-navy-400">Cargando…</p>;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow={`SMS · Comité ${meta.label}`}
        title={meta.name}
        description={meta.desc}
        metric={{ label: 'Integrantes', value: members.length }}
      />

      <div className="flex items-start gap-2 text-xs text-navy-500 bg-navy-50 border border-navy-100 rounded-xl px-4 py-3">
        <span className="material-symbols-outlined text-[18px] text-navy-400">event_repeat</span>
        <p>{meta.frequency}</p>
      </div>

      {error && <p className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2"><span className="material-symbols-outlined text-[16px]">error</span>{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Integrantes */}
        <SectionCard icon="groups" tile="bg-red-500 text-white" wash="from-red-50 to-white" title="Integrantes" description="Quién conforma el comité.">
          {members.length === 0 && <p className="text-sm text-navy-400">Aún no hay integrantes.</p>}
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-navy-100 bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{m.person?.full_name || m.person?.email || '—'}</p>
                  <p className="text-xs text-navy-400 truncate">{m.person?.email} · {ROLE_LABEL[m.role_in_committee] || m.role_in_committee}</p>
                </div>
                {canManage && (
                  <button type="button" onClick={() => removeMember(m.id)} className="text-navy-300 hover:text-red-600 shrink-0" aria-label="Quitar">
                    <span className="material-symbols-outlined text-[18px]">person_remove</span>
                  </button>
                )}
              </li>
            ))}
          </ul>

          {canManage && (
            <form onSubmit={addMember} className="space-y-3 border-t border-navy-50 pt-4 mt-4">
              <p className="text-xs font-semibold text-navy-500">Agregar integrante por correo</p>
              <div>
                <span className={labelCls}>Correo</span>
                <input type="email" required value={memberForm.email} onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))} placeholder="persona@empresa.com" className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className={labelCls}>Nombre (opcional)</span>
                  <input type="text" value={memberForm.name} onChange={(e) => setMemberForm((f) => ({ ...f, name: e.target.value }))} placeholder="Para la invitación" className={inputCls} />
                </div>
                <div>
                  <span className={labelCls}>Cargo en el comité</span>
                  <select value={memberForm.roleInCommittee} onChange={(e) => setMemberForm((f) => ({ ...f, roleInCommittee: e.target.value }))} className={inputCls}>
                    {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-navy-400">Si el correo no tiene cuenta, se le invita como integrante de comité: solo verá esta sección y no cuenta como piloto del plan.</p>
              {memberMsg && <p className="text-xs text-navy-600 bg-navy-50 rounded-lg px-3 py-2">{memberMsg}</p>}
              <Button type="submit" disabled={memberBusy} className="w-full justify-center">{memberBusy ? 'Agregando…' : 'Agregar'}</Button>
            </form>
          )}
        </SectionCard>

        {/* Actas */}
        <SectionCard
          icon="description"
          tile="bg-navy text-white"
          wash="from-navy-50 to-white"
          title="Actas de reunión"
          description="Registro firmado de cada reunión."
          badge={canManage ? <Button type="button" onClick={() => { setEditing(null); setMeetingOpen(true); }} className="text-xs py-1.5 px-3">Nueva acta</Button> : null}
        >
          {meetings.length === 0 && <p className="text-sm text-navy-400">Aún no hay actas registradas.</p>}
          <ul className="space-y-2">
            {meetings.map((a) => (
              <li key={a.id} className="rounded-xl border border-navy-100 bg-white overflow-hidden">
                <button type="button" onClick={() => setExpanded((id) => (id === a.id ? null : a.id))} className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">{a.title}</p>
                    <p className="text-xs text-navy-400">{fmtDate(a.meeting_date)} · {a.meeting_type === 'extraordinaria' ? 'Extraordinaria' : 'Ordinaria'}</p>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-navy-300 shrink-0">{expanded === a.id ? 'expand_less' : 'expand_more'}</span>
                </button>
                {expanded === a.id && (
                  <div className="px-3 pb-3 space-y-2 border-t border-navy-50 pt-2 text-sm">
                    {a.agenda && (<div><p className="text-xs font-semibold text-navy-400 uppercase tracking-wide">Agenda</p><p className="text-navy-600 whitespace-pre-wrap">{a.agenda}</p></div>)}
                    {a.decisions && (<div><p className="text-xs font-semibold text-navy-400 uppercase tracking-wide">{meta.decisionsLabel}</p><p className="text-navy-600 whitespace-pre-wrap">{a.decisions}</p></div>)}
                    {Array.isArray(a.commitments) && a.commitments.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-navy-400 uppercase tracking-wide">Compromisos</p>
                        <ul className="list-disc pl-4 text-navy-600">
                          {a.commitments.map((c, i) => <li key={i}>{c.texto || c.text}{c.responsable ? ` — ${c.responsable}` : ''}{c.plazo ? ` (${c.plazo})` : ''}</li>)}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(a.attendees) && a.attendees.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-navy-400 uppercase tracking-wide">Asistentes</p>
                        <p className="text-navy-600">{a.attendees.map((p) => (p.nombre || p.name) + (p.firma ? ' ✓' : '')).join(', ')}</p>
                      </div>
                    )}
                    {canManage && (
                      <div className="flex gap-3 pt-1">
                        <button type="button" onClick={() => { setEditing(a); setMeetingOpen(true); }} className="text-xs font-semibold text-primary-700 hover:underline">Editar</button>
                        <button type="button" onClick={() => removeMeeting(a.id)} className="text-xs font-semibold text-red-600 hover:underline">Eliminar</button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {meetingOpen && (
        <MeetingPanel
          committee={committee}
          meta={meta}
          organizationId={organizationId}
          meeting={editing}
          onClose={() => setMeetingOpen(false)}
          onSaved={() => { setMeetingOpen(false); loadAll(organizationId); }}
        />
      )}
    </div>
  );
}

function emptyRow() { return { texto: '', responsable: '', plazo: '' }; }

function MeetingPanel({ committee, meta, organizationId, meeting, onClose, onSaved }) {
  const isEdit = !!meeting;
  const [form, setForm] = useState({
    meetingDate: meeting?.meeting_date || new Date().toISOString().slice(0, 10),
    meetingType: meeting?.meeting_type || 'ordinaria',
    title: meeting?.title || '',
    agenda: meeting?.agenda || '',
    decisions: meeting?.decisions || '',
    commitments: Array.isArray(meeting?.commitments) && meeting.commitments.length ? meeting.commitments.map((c) => ({ texto: c.texto || c.text || '', responsable: c.responsable || '', plazo: c.plazo || '' })) : [emptyRow()],
    attendeesText: Array.isArray(meeting?.attendees) ? meeting.attendees.map((p) => p.nombre || p.name).filter(Boolean).join(', ') : '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function setRow(i, k, v) { setForm((f) => ({ ...f, commitments: f.commitments.map((r, j) => (j === i ? { ...r, [k]: v } : r)) })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const commitments = form.commitments.filter((c) => c.texto.trim()).map((c) => ({ texto: c.texto.trim(), responsable: c.responsable.trim() || null, plazo: c.plazo.trim() || null }));
      const attendees = form.attendeesText.split(',').map((s) => s.trim()).filter(Boolean).map((nombre) => ({ nombre, firma: false }));
      const payload = { organizationId, meetingDate: form.meetingDate, meetingType: form.meetingType, title: form.title, agenda: form.agenda, decisions: form.decisions, commitments, attendees };
      const res = await fetch(`/api/sms/committees/${committee}/meetings`, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { ...payload, meetingId: meeting.id } : payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el acta');
      onSaved();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel open onClose={onClose} eyebrow={`Comité ${meta.label}`} icon="description" title={isEdit ? 'Editar acta' : 'Nueva acta'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><span className={labelCls}>Fecha</span><input type="date" required value={form.meetingDate} onChange={(e) => setField('meetingDate', e.target.value)} className={inputCls} /></div>
          <div><span className={labelCls}>Tipo</span>
            <select value={form.meetingType} onChange={(e) => setField('meetingType', e.target.value)} className={inputCls}>
              <option value="ordinaria">Ordinaria</option>
              <option value="extraordinaria">Extraordinaria</option>
            </select>
          </div>
        </div>
        <div><span className={labelCls}>Título</span><input type="text" required value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Ej. Revisión semestral del SMS" className={inputCls} /></div>
        <div><span className={labelCls}>Agenda</span><textarea rows={2} value={form.agenda} onChange={(e) => setField('agenda', e.target.value)} className={inputCls} /></div>
        <div><span className={labelCls}>{meta.decisionsLabel}</span><textarea rows={3} value={form.decisions} onChange={(e) => setField('decisions', e.target.value)} placeholder={meta.decisionsHint} className={inputCls} /></div>

        <div>
          <span className={labelCls}>Compromisos (responsable y plazo)</span>
          <div className="space-y-2">
            {form.commitments.map((c, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input value={c.texto} onChange={(e) => setRow(i, 'texto', e.target.value)} placeholder="Compromiso" className={`${inputCls} col-span-6`} />
                <input value={c.responsable} onChange={(e) => setRow(i, 'responsable', e.target.value)} placeholder="Responsable" className={`${inputCls} col-span-3`} />
                <input value={c.plazo} onChange={(e) => setRow(i, 'plazo', e.target.value)} placeholder="Plazo" className={`${inputCls} col-span-3`} />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setForm((f) => ({ ...f, commitments: [...f.commitments, emptyRow()] }))} className="text-xs font-semibold text-primary-700 hover:underline mt-2">+ Agregar compromiso</button>
        </div>

        <div><span className={labelCls}>Asistentes (separados por coma)</span><input type="text" value={form.attendeesText} onChange={(e) => setField('attendeesText', e.target.value)} placeholder="Nombre 1, Nombre 2" className={inputCls} /></div>

        {err && <p className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2"><span className="material-symbols-outlined text-[16px]">error</span>{err}</p>}
        <Button type="submit" disabled={busy} className="w-full justify-center">{busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear acta'}</Button>
      </form>
    </Panel>
  );
}
