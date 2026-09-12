'use client';

// Skylog V2.0 — F3. Asistente de implantación por fases (40-sms.md §5.2).
// Vista utilitaria mínima (PRODUCT.md: sin superficie visual propia todavía)
// — panorama del progreso real, con enlaces a cada área ya construida.
// No reimplementa nada: /sms (política/GSO vía governance, reportes/casos,
// matriz de riesgo), /capacitacion (examen), y el cronograma SMS ya cubren
// las fases 1-4; esta página solo agrega el estado.

import { useEffect, useState, useCallback } from 'react';

const PHASE_META = {
  policy: { label: 'Política y objetivos', href: '/sms', hint: 'Designar Gerente de Seguridad Operacional + firmar la política' },
  risk: { label: 'Gestión del riesgo', href: '/sms', hint: 'Configurar la matriz de riesgo interna + registrar al menos un peligro' },
  assurance: { label: 'Aseguramiento', href: '/sms', hint: '≥3 SPI activos con ≥3 meses de datos + autoevaluación GAP (aún sin construir en V2)' },
  promotion: { label: 'Promoción', href: '/capacitacion', hint: 'Cronograma de capacitación con asistencia registrada + MSMS publicado (aún sin construir en V2)' },
  acceptance: { label: 'Listo para aceptación', href: null, hint: 'Expediente descargable — depende de que las 4 fases previas estén completas' },
};

export default function SmsAsistentePage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/duty/context');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
      setContext(data);
      if (data.organizations?.length && !organizationId) setOrganizationId(data.organizations[0].id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const loadProgress = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch('/api/sms/implementation-progress?organizationId=' + organizationId);
      const data = await res.json();
      if (res.ok) setProgress(data.progress);
    } catch {
      // silencioso
    }
  }, [organizationId]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;

  if (!context?.personId) {
    return (
      <div style={{ padding: 24, maxWidth: 480 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A202C' }}>Asistente de implantación SMS</h1>
        <p style={{ marginTop: 12, color: '#702810' }}>
          Esta cuenta no tiene todavía un registro de Persona vinculado — no se puede acceder
          hasta que exista.
        </p>
      </div>
    );
  }

  const inputStyle = { display: 'block', marginTop: 4, marginBottom: 10, padding: 8, width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ padding: 24, maxWidth: 640, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A202C' }}>Asistente de implantación SMS</h1>
      <p style={{ fontSize: 13, color: '#a3aab8', marginTop: 4 }}>RAC 219 / MAUT-1.0-22-006 — Skylog V2.0</p>

      {context.organizations?.length > 1 && (
        <select style={inputStyle} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
          {context.organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.role})
            </option>
          ))}
        </select>
      )}

      {error && <p style={{ color: '#8a2f10', fontSize: 13 }}>{error}</p>}

      {progress && (
        <>
          <div style={{ margin: '16px 0' }}>
            <div style={{ height: 10, background: '#e2e4e9', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress.progressPct}%`, background: '#ec5b13' }} />
            </div>
            <p style={{ fontSize: 12, color: '#a3aab8', marginTop: 4 }}>
              {progress.completedCount} de {progress.totalPhases} fases completas ({progress.progressPct.toFixed(0)}%)
            </p>
          </div>

          {Object.entries(PHASE_META).map(([key, meta]) => {
            const done = progress.phases[key];
            const isCurrent = progress.currentPhase === key;
            return (
              <div
                key={key}
                style={{
                  padding: 10,
                  marginBottom: 6,
                  border: `1px solid ${isCurrent ? '#ec5b13' : '#e2e4e9'}`,
                  borderRadius: 6,
                  opacity: done || isCurrent ? 1 : 0.5,
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 600 }}>
                  {done ? '✔' : isCurrent ? '▶' : '○'} {meta.label}
                </p>
                <p style={{ fontSize: 12, color: '#a3aab8' }}>{meta.hint}</p>
                {meta.href && (
                  <a href={meta.href} style={{ fontSize: 12, color: '#ec5b13' }}>
                    Ir a {meta.label.toLowerCase()} →
                  </a>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
