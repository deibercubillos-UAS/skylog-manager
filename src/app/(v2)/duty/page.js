'use client';

// Skylog V2.0 — F5 §100.540, captura de tiempos de servicio ("modo campo").
// Botones inicio/fin + registro de vuelo + estado de cumplimiento real (horas
// mensuales/diarias + operación continua). Primer consumidor real de
// @skylog/ui (F1, 35-frontend.md §3.4) — retrofit deliberadamente parcial
// (header + selector de organización): prueba que el sistema de diseño
// funciona sobre una página ya construida y probada, sin arriesgar el resto
// de la lógica de bloqueo real que ya está verificada end-to-end (decisión 43,
// 51-bitacora.md). El resto de la página sigue con estilos inline hasta que
// F1 la retome por completo.

import { useEffect, useState, useCallback } from 'react';
import { PageHero, Field } from '@skylog/ui';

const TYPE_LABELS = {
  servicio: 'Servicio',
  descanso: 'Descanso',
  disponibilidad: 'Disponibilidad',
  entrenamiento: 'Entrenamiento',
};

const CHECK_LABELS = {
  monthlyFlight: '§100.540(c)(1) — vuelo mensual (90h)',
  dailyFlight: '§100.540(d)(1) — vuelo diario (6-8h)',
  continuousOperation: '§100.540(e) — operación continua (2h + 30min)',
  rest: '§100.540(f) — descanso post-servicio',
};

function CheckRow({ name, check }) {
  if (!check) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontWeight: 600, fontSize: 13, color: check.compliant ? '#1A202C' : '#8a2f10' }}>
        {CHECK_LABELS[name] || name}: {check.compliant ? 'Cumple' : 'Excede el límite'}
        {check.hours != null && ` — ${check.hours.toFixed(1)}h / ${check.limit}h`}
      </p>
      {!check.compliant &&
        Array.isArray(check.violations) &&
        check.violations.map((v, i) => (
          <p key={i} style={{ fontSize: 12, color: '#8a2f10', marginLeft: 8 }}>
            {v.durationHours != null && `${v.durationHours.toFixed(1)}h continuas`}
            {v.restMinutes != null ? `, solo ${v.restMinutes.toFixed(0)} min de descanso` : ''}
          </p>
        ))}
    </div>
  );
}

export default function DutyCapturePage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [blocked, setBlocked] = useState(null); // { message, checks } — 409 real, distinto de un error genérico
  const [flightForm, setFlightForm] = useState({ takeoffAt: '', landingAt: '', totalTime: '', visualCondition: 'VLOS' });
  const [certForm, setCertForm] = useState({ targetPersonId: '', year: new Date().getFullYear() });
  const [certifications, setCertifications] = useState([]);
  const [certMessage, setCertMessage] = useState(null);
  const [roster, setRoster] = useState(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/duty/context');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
      setContext(data);
      if (data.organizations?.length && !organizationId) {
        setOrganizationId(data.organizations[0].id);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/duty/current');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando estado');
      setStatus(data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (context?.personId) loadStatus();
  }, [context, loadStatus]);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadCertifications = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch('/api/duty/certifications?organizationId=' + organizationId);
      const data = await res.json();
      if (res.ok) setCertifications(data.certifications || []);
    } catch {
      // silencioso — panel secundario, no bloquea el resto de la vista
    }
  }, [organizationId]);

  useEffect(() => {
    if (isManager) loadCertifications();
  }, [isManager, loadCertifications]);

  const loadRoster = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch('/api/duty/roster?organizationId=' + organizationId);
      const data = await res.json();
      if (res.ok) setRoster(data.roster || []);
    } catch {
      // silencioso — panel secundario, no bloquea el resto de la vista
    }
  }, [organizationId]);

  useEffect(() => {
    if (isManager) loadRoster();
  }, [isManager, loadRoster]);

  async function startPeriod(type) {
    if (!organizationId) return;
    setBusy(true);
    setError(null);
    setBlocked(null);
    try {
      const res = await fetch('/api/duty/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, type }),
      });
      const data = await res.json();
      if (res.status === 409 && data.checks) {
        setBlocked({ message: data.error, checks: data.checks });
        return;
      }
      if (res.status === 409 && data.check) {
        setBlocked({ message: data.error, checks: { rest: data.check } });
        return;
      }
      if (res.status === 409 && data.examCompliance) {
        setBlocked({ message: data.error, examCompliance: data.examCompliance });
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Error al iniciar');
      await loadStatus();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function endPeriod() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/duty/end', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cerrar');
      await loadStatus();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function logFlight(e) {
    e.preventDefault();
    if (!organizationId) return;
    setBusy(true);
    setError(null);
    setBlocked(null);
    try {
      const res = await fetch('/api/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          takeoffAt: flightForm.takeoffAt,
          landingAt: flightForm.landingAt,
          totalTime: Number(flightForm.totalTime),
          visualCondition: flightForm.visualCondition,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.checks) {
        setBlocked({ message: data.error, checks: data.checks });
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Error al registrar el vuelo');
      setFlightForm({ takeoffAt: '', landingAt: '', totalTime: '', visualCondition: 'VLOS' });
      await loadStatus();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function certifyPilot(e) {
    e.preventDefault();
    if (!organizationId || !certForm.targetPersonId) return;
    setBusy(true);
    setCertMessage(null);
    try {
      const res = await fetch('/api/duty/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          targetPersonId: certForm.targetPersonId,
          year: Number(certForm.year),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al certificar');
      setCertMessage(`Certificado: ${Number(data.certification.total_hours).toFixed(1)}h en ${data.certification.year}`);
      setCertForm((f) => ({ ...f, targetPersonId: '' }));
      await loadCertifications();
    } catch (e) {
      setCertMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Cargando…</div>;
  }

  if (!context?.personId) {
    return (
      <div style={{ padding: 24, maxWidth: 480 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A202C' }}>Tiempos de servicio</h1>
        <p style={{ marginTop: 12, color: '#702810' }}>
          Esta cuenta no tiene todavía un registro de Persona vinculado (modelo de identidad de
          Skylog V2.0) — no se puede capturar tiempos de servicio hasta que exista.
        </p>
      </div>
    );
  }

  const open = status?.openPeriod;
  const checks = status?.compliance?.checks;
  const blocksDispatch = status?.compliance?.blocksDispatch;
  const inputStyle = { display: 'block', marginTop: 4, marginBottom: 10, padding: 8, width: '100%', boxSizing: 'border-box' };

  return (
    <div className="p-6 max-w-lg mx-auto font-sans">
      <PageHero eyebrow="RAC 100 §100.540" title="Tiempos de servicio" description="Skylog V2.0" />

      {context.organizations.length > 1 && (
        <div className="mt-4">
          <Field as="select" label="Organización" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
            {context.organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Field>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, padding: 10, background: '#fde3d0', color: '#8a2f10', borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {blocked && (
        <div style={{ marginTop: 12, padding: 12, background: '#8a2f10', color: 'white', borderRadius: 8, fontSize: 13 }}>
          <p style={{ fontWeight: 700, marginBottom: 6 }}>⛔ Bloqueado — {blocked.message}</p>
          {blocked.examCompliance && (
            <p style={{ fontSize: 12, opacity: 0.9 }}>
              Estado del examen: {blocked.examCompliance.status} —{' '}
              <a href="/capacitacion" style={{ color: 'white', textDecoration: 'underline' }}>
                ir a Capacitación y Examen
              </a>
            </p>
          )}
          {blocked.checks &&
            Object.entries(blocked.checks).map(([name, c]) => (
            <div key={name} style={{ marginBottom: 4 }}>
              <p style={{ fontSize: 12, opacity: 0.9 }}>
                {CHECK_LABELS[name] || name}
                {c.hours != null && `: ${c.hours.toFixed(1)}h / ${c.limit}h`}
                {c.requiredHours != null && `: requiere ${c.requiredHours.toFixed(1)}h de descanso`}
              </p>
              {Array.isArray(c.violations) &&
                c.violations.map((v, i) => (
                  <p key={i} style={{ fontSize: 12, opacity: 0.8, marginLeft: 8 }}>
                    {v.actualHours != null ? `Solo ${v.actualHours.toFixed(1)}h — ${v.rule}` : v.message}
                  </p>
                ))}
            </div>
          ))}
        </div>
      )}

      {blocksDispatch && !blocked && (
        <div style={{ marginTop: 12, padding: 10, background: '#8a2f10', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
          Despacho bloqueado — al menos un límite de §100.540 está excedido
        </div>
      )}

      <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: open ? '#fef3ec' : '#f4f5f7' }}>
        {open ? (
          <>
            <p style={{ fontWeight: 600, color: '#1A202C' }}>
              Período abierto: {TYPE_LABELS[open.type] || open.type}
            </p>
            <p style={{ fontSize: 13, color: '#a3aab8' }}>Desde {new Date(open.started_at).toLocaleString()}</p>
            <button
              onClick={endPeriod}
              disabled={busy}
              style={{
                marginTop: 12,
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: '#ec5b13',
                color: 'white',
                fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              Cerrar {TYPE_LABELS[open.type] || open.type}
            </button>
          </>
        ) : (
          <>
            <p style={{ color: '#a3aab8', fontSize: 13, marginBottom: 8 }}>Sin período abierto</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(TYPE_LABELS).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => startPeriod(type)}
                  disabled={busy || !organizationId}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #c9cdd6',
                    background: 'white',
                    cursor: busy ? 'not-allowed' : 'pointer',
                  }}
                >
                  Iniciar {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {checks && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#a3aab8', marginBottom: 8 }}>
            Cumplimiento §100.540
          </p>
          <CheckRow name="monthlyFlight" check={checks.monthlyFlight} />
          <CheckRow name="dailyFlight" check={checks.dailyFlight} />
          <CheckRow name="continuousOperation" check={checks.continuousOperation} />
          <CheckRow name="rest" check={checks.rest} />
        </div>
      )}

      <form onSubmit={logFlight} style={{ marginTop: 24, padding: 16, borderRadius: 12, border: '1px solid #e6e8ec' }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: '#1A202C', marginBottom: 8 }}>Registrar vuelo</p>
        <label style={{ fontSize: 13 }}>
          Despegue
          <input
            type="datetime-local"
            required
            value={flightForm.takeoffAt}
            onChange={(e) => setFlightForm((f) => ({ ...f, takeoffAt: e.target.value }))}
            style={inputStyle}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Aterrizaje
          <input
            type="datetime-local"
            required
            value={flightForm.landingAt}
            onChange={(e) => setFlightForm((f) => ({ ...f, landingAt: e.target.value }))}
            style={inputStyle}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Tiempo total (horas)
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={flightForm.totalTime}
            onChange={(e) => setFlightForm((f) => ({ ...f, totalTime: e.target.value }))}
            style={inputStyle}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Línea de vista
          <select
            value={flightForm.visualCondition}
            onChange={(e) => setFlightForm((f) => ({ ...f, visualCondition: e.target.value }))}
            style={inputStyle}
          >
            <option value="VLOS">VLOS</option>
            <option value="EVLOS">EVLOS</option>
            <option value="BVLOS">BVLOS</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busy || !organizationId}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#1A202C',
            color: 'white',
            fontWeight: 600,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          Guardar vuelo
        </button>
      </form>

      {isManager && roster && (
        <div style={{ marginTop: 24, padding: 16, borderRadius: 12, border: '1px solid #e6e8ec' }}>
          <p style={{ fontWeight: 600, fontSize: 14, color: '#1A202C', marginBottom: 4 }}>Planificación de tripulación</p>
          <p style={{ fontSize: 12, color: '#a3aab8', marginBottom: 8 }}>
            Quién está disponible ahora, y hasta cuándo dura el descanso obligatorio de quien no lo está.
          </p>
          {roster.length === 0 ? (
            <p style={{ fontSize: 13, color: '#a3aab8' }}>Sin tripulación en esta organización</p>
          ) : (
            roster.map((r) => (
              <div key={r.personId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f4f5f7' }}>
                <span style={{ fontSize: 13 }}>
                  {r.fullName} <span style={{ color: '#a3aab8' }}>({r.role})</span>
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: r.status === 'disponible' ? '#1A202C' : r.status === 'servicio' ? '#8a2f10' : '#ec5b13',
                  }}
                >
                  {r.status === 'disponible' ? 'Disponible' : TYPE_LABELS[r.status] || r.status}
                  {r.availableAt && ` hasta ${new Date(r.availableAt).toLocaleString()}`}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {isManager && (
        <div style={{ marginTop: 24, padding: 16, borderRadius: 12, border: '1px solid #e6e8ec' }}>
          <p style={{ fontWeight: 600, fontSize: 14, color: '#1A202C', marginBottom: 4 }}>Certificación anual</p>
          <p style={{ fontSize: 12, color: '#a3aab8', marginBottom: 8 }}>
            §100.535(12) — las horas se calculan del sistema, no se capturan a mano.
          </p>
          <form onSubmit={certifyPilot}>
            <label style={{ fontSize: 13 }}>
              ID de la Persona a certificar
              <input
                type="text"
                required
                placeholder="uuid de people.id"
                value={certForm.targetPersonId}
                onChange={(e) => setCertForm((f) => ({ ...f, targetPersonId: e.target.value }))}
                style={inputStyle}
              />
            </label>
            <label style={{ fontSize: 13 }}>
              Año
              <input
                type="number"
                required
                value={certForm.year}
                onChange={(e) => setCertForm((f) => ({ ...f, year: e.target.value }))}
                style={inputStyle}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: '#1A202C',
                color: 'white',
                fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              Certificar
            </button>
          </form>
          {certMessage && <p style={{ marginTop: 8, fontSize: 13, color: '#1A202C' }}>{certMessage}</p>}

          {certifications.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, textTransform: 'uppercase', color: '#a3aab8', marginBottom: 6 }}>Certificaciones existentes</p>
              {certifications.map((c) => (
                <p key={c.id} style={{ fontSize: 13 }}>
                  {c.year}: {Number(c.total_hours).toFixed(1)}h — persona {c.person_id.slice(0, 8)}…
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
