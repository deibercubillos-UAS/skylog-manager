'use client';

// Skylog V2.0 — Manuales de la Empresa: réplica funcional del módulo real
// de v1 (repositorio con versionado + acuse de lectura), sobre
// organizations/people/memberships. Lectura para cualquier miembro activo
// de la org — crear/versionar/editar es solo de gestores (admin/
// jefe_pilotos/gerente_sms/superadmin). Ver 35-frontend.md.
//
// Rediseño (pedido del usuario: "mejora la pestaña donde se agregan los
// manuales, se ve plana y poco UX/UI") — tarjetas con ícono/color real por
// categoría (en vez de texto plano), acciones como botones con ícono en
// vez de enlaces subrayados sueltos, estado vacío con CTA, e historial de
// versiones como línea de tiempo en vez de filas de texto.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../_components/SectionHero';
import { Button } from '@skylog/ui';
import ManualFormPanel from './_ManualFormPanel';
import AckRosterPanel from './_AckRosterPanel';
import { CATEGORIES } from './_categoryMeta';

function ActionButton({ icon, label, onClick, tone = 'default', disabled, className = '' }) {
  const toneCls =
    {
      default: 'text-navy-500 hover:text-navy hover:bg-navy-50',
      primary: 'text-primary-700 hover:bg-primary-50',
      danger: 'text-red-500 hover:bg-red-50',
      success: 'text-emerald-700 hover:bg-emerald-50',
    }[tone] || '';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 transition-colors disabled:opacity-50 ${toneCls} ${className}`}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
    </button>
  );
}

export default function ManualesPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [manuales, setManuales] = useState([]);

  const [showNewPanel, setShowNewPanel] = useState(false);
  const [versionTarget, setVersionTarget] = useState(null);
  const [rosterTarget, setRosterTarget] = useState(null);
  const [historyOpenId, setHistoryOpenId] = useState(null);
  const [history, setHistory] = useState({});
  const [ackBusyId, setAckBusyId] = useState(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadManuales = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/manuales?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setManuales(data.manuales || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
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
    if (!organizationId) return;
    loadManuales(organizationId);
  }, [organizationId, loadManuales]);

  async function toggleHistory(manual) {
    if (historyOpenId === manual.id) {
      setHistoryOpenId(null);
      return;
    }
    setHistoryOpenId(manual.id);
    if (!history[manual.id]) {
      const res = await fetch(`/api/manuales/${manual.id}`);
      const data = await res.json();
      if (res.ok) setHistory((h) => ({ ...h, [manual.id]: data.versions || [] }));
    }
  }

  async function handleAcknowledge(manual) {
    setAckBusyId(manual.id);
    try {
      const res = await fetch(`/api/manuales/${manual.id}/acknowledge`, { method: manual.acknowledged ? 'DELETE' : 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error');
      await loadManuales(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setAckBusyId(null);
    }
  }

  async function handleDelete(manual) {
    if (!confirm(`¿Eliminar "${manual.title}"? Se borrará también su historial de versiones.`)) return;
    const res = await fetch(`/api/manuales/${manual.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    await loadManuales(organizationId);
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="Documentación" title="Manuales" description="Repositorio de manuales corporativos con versionado y acuse de lectura." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const grouped = CATEGORIES.map((c) => ({ ...c, items: manuales.filter((m) => m.category === c.value) })).filter((g) => g.items.length);
  const pendingCount = manuales.filter((m) => m.current_version_id && !m.acknowledged).length;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Documentación"
        title="Manuales"
        description="Repositorio de manuales corporativos con versionado y acuse de lectura."
        metric={{ value: manuales.length, label: 'Manuales' }}
        cta={
          isManager && (
            <Button onClick={() => setShowNewPanel(true)}>
              <span className="material-symbols-outlined text-base align-middle mr-1">add</span>
              Cargar manual
            </Button>
          )
        }
      />

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="library_books" color="primary" label="Manuales" value={manuales.length} />
        <StatCard icon="pending_actions" color="amber" label="Lectura pendiente" value={pendingCount} />
        <StatCard icon="category" color="blue" label="Categorías con manuales" value={grouped.length} />
        <StatCard icon="history" color="violet" label="Versiones publicadas" value={manuales.reduce((n, m) => n + (m.current_version ? 1 : 0), 0)} />
      </div>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 text-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 py-14 px-6">
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-sm text-navy-300">
            <span className="material-symbols-outlined text-3xl">library_books</span>
          </span>
          <p className="text-sm font-semibold text-navy">Sin manuales cargados todavía</p>
          <p className="text-xs text-navy-400 max-w-sm">
            {isManager ? 'Carga el primer manual de la organización — Manual de Operaciones, SMS, SOP o el que necesites.' : 'Todavía no hay manuales publicados en esta organización.'}
          </p>
          {isManager && (
            <Button onClick={() => setShowNewPanel(true)} className="mt-1">
              <span className="material-symbols-outlined text-base align-middle mr-1">add</span>
              Cargar manual
            </Button>
          )}
        </div>
      ) : (
        grouped.map((g) => (
          <div key={g.value} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`flex items-center justify-center w-6 h-6 rounded-lg shrink-0 ${g.tile}`}>
                <span className="material-symbols-outlined text-[14px]">{g.icon}</span>
              </span>
              <p className="text-xs font-bold text-navy-500 uppercase tracking-wide">{g.label}</p>
              <span className="text-[11px] font-semibold text-navy-300">· {g.items.length}</span>
            </div>

            {g.items.map((m) => (
              <div key={m.id} className={`rounded-2xl border border-navy-100 bg-gradient-to-br ${g.wash} overflow-hidden`}>
                <div className="flex items-start justify-between gap-3 flex-wrap px-4 pt-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 shadow-sm ${g.tile}`}>
                      <span className="material-symbols-outlined text-xl">{g.icon}</span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-navy truncate">{m.title}</p>
                      <p className="text-xs text-navy-400 mt-0.5">
                        {m.current_version ? (
                          <>
                            Versión <span className="font-semibold text-navy-500">{m.current_version}</span> · vigente desde {new Date(`${m.current_effective_date}T00:00:00`).toLocaleDateString('es-CO')}
                          </>
                        ) : (
                          'Sin versión publicada'
                        )}
                      </p>
                    </div>
                  </div>
                  {m.current_version_id && (
                    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${m.acknowledged ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      <span className="material-symbols-outlined text-[14px]">{m.acknowledged ? 'check_circle' : 'schedule'}</span>
                      {m.acknowledged ? 'Leído' : 'Pendiente'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-wrap px-3 py-2.5 mt-3 bg-white/70 border-t border-navy-50">
                  {m.current_file_path && (
                    <a href={`/api/manuales/${m.id}/download`} target="_blank" rel="noreferrer">
                      <ActionButton icon="download" label="Descargar" tone="primary" />
                    </a>
                  )}
                  {m.current_version_id && (
                    <ActionButton
                      icon={m.acknowledged ? 'undo' : 'task_alt'}
                      label={ackBusyId === m.id ? 'Guardando…' : m.acknowledged ? 'Retirar lectura' : 'He leído esta versión'}
                      tone={m.acknowledged ? 'default' : 'success'}
                      onClick={() => handleAcknowledge(m)}
                      disabled={ackBusyId === m.id}
                    />
                  )}
                  <ActionButton icon="history" label={historyOpenId === m.id ? 'Ocultar historial' : 'Historial'} onClick={() => toggleHistory(m)} />
                  {isManager && (
                    <>
                      <ActionButton icon="upload" label="Nueva versión" tone="primary" onClick={() => setVersionTarget(m)} />
                      <ActionButton icon="groups" label="Seguimiento" tone="primary" onClick={() => setRosterTarget(m.id)} />
                      <ActionButton icon="delete" label="Eliminar" tone="danger" onClick={() => handleDelete(m)} className="ml-auto" />
                    </>
                  )}
                </div>

                {historyOpenId === m.id && (
                  <div className="px-4 pb-4 pt-1 bg-white/70">
                    {(history[m.id] || []).length === 0 ? (
                      <p className="text-xs text-navy-300 py-2">Cargando historial…</p>
                    ) : (
                      <div className="relative pl-4 space-y-3 before:content-[''] before:absolute before:left-[3px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-navy-100">
                        {history[m.id].map((v, i) => (
                          <div key={v.id} className="relative">
                            <span className={`absolute -left-4 top-1 w-2 h-2 rounded-full ${i === 0 ? g.dot : 'bg-navy-200'}`} />
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-xs text-navy-500">
                                <span className="font-semibold text-navy">v{v.version}</span> · {new Date(`${v.effective_date}T00:00:00`).toLocaleDateString('es-CO')}
                                {v.comments ? <span className="text-navy-400"> — {v.comments}</span> : null}
                              </p>
                              <a href={`/api/manuales/${m.id}/download?versionId=${v.id}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary-700 hover:underline shrink-0">
                                Descargar
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}

      {isManager && (
        <ManualFormPanel
          open={showNewPanel}
          onClose={() => setShowNewPanel(false)}
          organizationId={organizationId}
          manual={null}
          onSaved={() => loadManuales(organizationId)}
        />
      )}
      {isManager && (
        <ManualFormPanel
          open={!!versionTarget}
          onClose={() => setVersionTarget(null)}
          organizationId={organizationId}
          manual={versionTarget}
          onSaved={() => {
            loadManuales(organizationId);
            setHistory((h) => ({ ...h, [versionTarget.id]: undefined }));
          }}
        />
      )}
      {isManager && <AckRosterPanel open={!!rosterTarget} onClose={() => setRosterTarget(null)} manualId={rosterTarget} />}
    </div>
  );
}
