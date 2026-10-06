'use client';

// Skylog V2.0 — Retención y custodia legal (RAC 100 §100.535(29); ítem 34 de
// MAUT-5.0-12-095). Declara la política de retención —que impone la base de
// datos, no esta pantalla— y gestiona las custodias por suceso. Solo gestores;
// liberar una custodia exige una autoridad (Gerente General / Gerente SMS).
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../_components/SectionHero';
import { Button } from '@skylog/ui';
import { RETENTION_YEARS, RETAINED_RECORD_TYPES, canReleaseHold, holdStatus } from '@skylog/domain';

const EVENT_LABELS = { opened: 'Custodia abierta', flights_added: 'Vuelos agregados', released: 'Custodia liberada', accessed: 'Acceso al material' };

function fmt(ts) {
  return ts ? new Date(ts).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

function flightLabel(f) {
  const ac = f.aircraft ? `${f.aircraft.model?.brand || ''} ${f.aircraft.model?.model || ''} · ${f.aircraft.serial_number}`.trim() : 'Aeronave sin dato';
  return `${f.takeoff_at ? fmt(f.takeoff_at) : 'Sin fecha'} — ${ac}${f.mission_type ? ` — ${f.mission_type}` : ''}`;
}

export default function RetencionPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [holds, setHolds] = useState([]);
  const [flights, setFlights] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedFlights, setSelectedFlights] = useState([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
  const [releasingId, setReleasingId] = useState(null);
  const [releaseReason, setReleaseReason] = useState('');
  const [addingId, setAddingId] = useState(null);
  const [addSelection, setAddSelection] = useState([]);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;
  const canRelease = canReleaseHold(currentOrg?.role);

  const loadHolds = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/retencion/holds?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setHolds(data.holds || []);
    else setError(data.error);
  }, []);

  const loadFlights = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flights?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setFlights(data.flights || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/duty/context');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
        setContext(data);
        setOrganizationId(data.organizations?.[0]?.id || '');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!organizationId || !isManager) return;
    loadHolds(organizationId);
    loadFlights(organizationId);
  }, [organizationId, isManager, loadHolds, loadFlights]);

  const toggle = (list, setList, id) => setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  async function call(method, body) {
    const res = await fetch('/api/retencion/holds', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');
    if (data.warning) setNotice(data.warning);
    return data;
  }

  async function handleOpen(e) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      await call('POST', { organizationId, reason, flightIds: selectedFlights });
      setShowForm(false);
      setReason('');
      setSelectedFlights([]);
      await loadHolds(organizationId);
    } catch (err) {
      setFormError(err.message);
      await loadHolds(organizationId); // la custodia pudo quedar abierta aunque falle el enlace de vuelos
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease(hold) {
    setError(null);
    setNotice(null);
    try {
      await call('PATCH', { id: hold.id, action: 'release', releaseReason });
      setReleasingId(null);
      setReleaseReason('');
      await loadHolds(organizationId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddFlights(hold) {
    setError(null);
    setNotice(null);
    try {
      await call('PATCH', { id: hold.id, action: 'add_flights', flightIds: addSelection });
      setAddingId(null);
      setAddSelection([]);
      await loadHolds(organizationId);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  const hero = <SectionHero eyebrow="Documentación" title="Retención y custodia" description="Cinco años de retención de los registros operacionales y custodia legal de lo que rodea a un suceso." />;
  if (!context?.personId) {
    return (
      <div>
        {hero}
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }
  if (!isManager) {
    return (
      <div>
        {hero}
        <p className="text-sm text-navy-400 mt-4">Solo un gestor (Jefe de Pilotos, Gerente SMS, admin) puede ver Retención y custodia.</p>
      </div>
    );
  }

  const active = holds.filter((h) => holdStatus(h) === 'activa');
  const heldFlightIds = new Set(active.flatMap((h) => (h.legal_hold_flights || []).map((f) => f.flight_id)));
  const everHeldIds = new Set(holds.flatMap((h) => (h.legal_hold_flights || []).map((f) => f.flight_id)));

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Documentación"
        title="Retención y custodia"
        description="Cinco años de retención de los registros operacionales y custodia legal de lo que rodea a un suceso."
        metric={{ value: active.length, label: 'Custodias activas' }}
        cta={
          <Button onClick={() => setShowForm((s) => !s)}>
            <span className="material-symbols-outlined text-base align-middle mr-1">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cerrar' : 'Nueva custodia'}
          </Button>
        }
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {notice && <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{notice}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="lock_clock" color="violet" label="Años de retención" value={RETENTION_YEARS} />
        <StatCard icon="inventory_2" color="blue" label="Tipos de registro protegidos" value={RETAINED_RECORD_TYPES.length} />
        <StatCard icon="gavel" color="red" label="Custodias activas" value={active.length} />
        <StatCard icon="flight" color="amber" label="Vuelos bajo custodia" value={heldFlightIds.size} />
      </div>

      <div className="bg-white rounded-2xl border border-navy-100 p-4">
        <p className="text-sm font-semibold text-navy">Retención de {RETENTION_YEARS} años — todos los planes</p>
        <p className="text-xs text-navy-400 mt-1">
          RAC 100 §100.535(29). Un registro operacional <strong>no se puede eliminar</strong> hasta cumplir {RETENTION_YEARS} años de su fecha. Lo impide la base de datos, no solo esta
          pantalla: tampoco se pierde al borrar una aeronave ni por ninguna otra vía. Se corrige con un nuevo registro, no borrando el anterior.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 mt-3 text-xs text-navy-500">
          {RETAINED_RECORD_TYPES.map((t) => (
            <li key={t.table} className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-emerald-500">check_circle</span>
              {t.label}
            </li>
          ))}
        </ul>
        <p className="text-xs text-navy-300 mt-3">
          El replay y el video son <strong>evidencia complementaria</strong>, no el registro obligatorio: su conservación no es la de estos {RETENTION_YEARS} años, salvo en un vuelo bajo custodia.
        </p>
      </div>

      {showForm && (
        <form onSubmit={handleOpen} className="bg-white rounded-2xl border border-navy-100 p-4 space-y-3">
          <p className="text-sm font-semibold text-navy">Nueva custodia legal</p>
          <p className="text-xs text-navy-400">
            Congela los vuelos elegidos: no se podrán borrar ni perder su replay hasta que una autoridad libere la custodia. Cada consulta del replay queda registrada. Un vuelo que haya
            estado bajo custodia queda protegido de forma permanente, aunque se libere.
          </p>
          <label className="block">
            <span className="text-xs font-semibold text-navy-500">Suceso / motivo</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} required rows={2} placeholder="Ej. Incidente con pérdida de enlace, vuelo del 12/09 — caso SMS #14" className="mt-1 w-full text-sm border border-navy-200 rounded-xl px-3 py-2.5" />
          </label>
          <div>
            <p className="text-xs font-semibold text-navy-500 mb-1">Vuelos bajo custodia ({selectedFlights.length})</p>
            <div className="max-h-56 overflow-y-auto space-y-1 border border-navy-100 rounded-xl p-2">
              {flights.length === 0 && <p className="text-xs text-navy-300">No hay vuelos registrados.</p>}
              {flights.map((f) => (
                <label key={f.id} className="flex items-center gap-2 text-sm text-navy">
                  <input type="checkbox" checked={selectedFlights.includes(f.id)} onChange={() => toggle(selectedFlights, setSelectedFlights, f.id)} />
                  <span className="flex-1">{flightLabel(f)}</span>
                  {heldFlightIds.has(f.id) && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">ya en custodia</span>}
                </label>
              ))}
            </div>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <Button type="submit" disabled={busy || selectedFlights.length === 0 || !reason.trim()}>
            {busy ? 'Abriendo…' : 'Abrir custodia'}
          </Button>
        </form>
      )}

      <div className="space-y-3">
        <p className="text-sm font-semibold text-navy">Custodias</p>
        {holds.length === 0 ? (
          <p className="text-sm text-navy-300">No hay custodias registradas.</p>
        ) : (
          holds.map((h) => {
            const status = holdStatus(h);
            const open = expandedId === h.id;
            const events = [...(h.legal_hold_events || [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
            return (
              <div key={h.id} className={`bg-white rounded-2xl border p-4 ${status === 'activa' ? 'border-red-200' : 'border-navy-100 opacity-80'}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-navy">{h.reason}</p>
                    <p className="text-xs text-navy-400 mt-0.5">
                      Abierta por {h.opener?.full_name || '—'} · {fmt(h.opened_at)} · {(h.legal_hold_flights || []).length} vuelo(s)
                    </p>
                    {status === 'liberada' && (
                      <p className="text-xs text-navy-400 mt-0.5">
                        Liberada por {h.releaser?.full_name || '—'} · {fmt(h.released_at)} — {h.release_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status === 'activa' ? 'bg-red-50 text-red-700' : 'bg-navy-50 text-navy-500'}`}>{status === 'activa' ? 'Activa' : 'Liberada'}</span>
                    <button type="button" onClick={() => setExpandedId(open ? null : h.id)} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-navy-50 text-navy-600 hover:bg-navy-100">
                      {open ? 'Ocultar detalle' : 'Ver vuelos y bitácora'}
                    </button>
                    {status === 'activa' && (
                      <button type="button" onClick={() => { setAddingId(addingId === h.id ? null : h.id); setAddSelection([]); }} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100">
                        Agregar vuelos
                      </button>
                    )}
                    {status === 'activa' && canRelease && (
                      <button type="button" onClick={() => { setReleasingId(releasingId === h.id ? null : h.id); setReleaseReason(''); }} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                        Liberar
                      </button>
                    )}
                  </div>
                </div>

                {status === 'activa' && !canRelease && <p className="text-[11px] text-navy-300 mt-2">Liberar una custodia exige una autoridad (Gerente General o Gerente SMS).</p>}

                {releasingId === h.id && (
                  <div className="mt-3 flex gap-2 flex-wrap items-center">
                    <input value={releaseReason} onChange={(e) => setReleaseReason(e.target.value)} placeholder="Motivo de la liberación" className="flex-1 min-w-[220px] text-sm border border-navy-200 rounded-xl px-3 py-2" />
                    <Button type="button" disabled={!releaseReason.trim()} onClick={() => handleRelease(h)}>
                      Confirmar liberación
                    </Button>
                  </div>
                )}

                {addingId === h.id && (
                  <div className="mt-3">
                    <div className="max-h-48 overflow-y-auto space-y-1 border border-navy-100 rounded-xl p-2">
                      {flights
                        .filter((f) => !(h.legal_hold_flights || []).some((x) => x.flight_id === f.id))
                        .map((f) => (
                          <label key={f.id} className="flex items-center gap-2 text-sm text-navy">
                            <input type="checkbox" checked={addSelection.includes(f.id)} onChange={() => toggle(addSelection, setAddSelection, f.id)} />
                            {flightLabel(f)}
                          </label>
                        ))}
                    </div>
                    <div className="mt-2">
                      <Button type="button" disabled={addSelection.length === 0} onClick={() => handleAddFlights(h)}>
                        Agregar {addSelection.length || ''} vuelo(s)
                      </Button>
                    </div>
                  </div>
                )}

                {open && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-navy-500 mb-1">Vuelos</p>
                      <ul className="text-xs text-navy-500 space-y-0.5">
                        {(h.legal_hold_flights || []).map((lf) => (
                          <li key={lf.flight_id}>• {flightLabel(lf.flight || {})}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-navy-500 mb-1">Bitácora (no se puede modificar)</p>
                      <ul className="text-xs text-navy-500 space-y-0.5">
                        {events.map((ev) => (
                          <li key={ev.id}>
                            <strong>{EVENT_LABELS[ev.event_type] || ev.event_type}</strong> — {ev.actor?.full_name || 'Sistema'} · {fmt(ev.created_at)}
                            {ev.detail ? ` — ${ev.detail}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        {everHeldIds.size > heldFlightIds.size && <p className="text-[11px] text-navy-300">{everHeldIds.size - heldFlightIds.size} vuelo(s) de custodias ya liberadas siguen protegidos de forma permanente.</p>}
      </div>
    </div>
  );
}
