'use client';

// Skylog V2.0 — Despacho y Cierre de vuelo (RAC 100 §100.535(23)). Ciclo completo de una misión:
// programada → DESPACHO (verificaciones, listas de chequeo, riesgos) → despachada → CIERRE (vuelo real
// enlazado a la misión) → cerrada. El piloto (PIC) despacha SUS misiones de hoy; los gestores ven el
// historial de toda la organización. Ver docs/skylog-v2/36-sitemap.md §2 ① y decisión 160.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import Wizard from './_Wizard';
import CloseForm from './_CloseForm';

const fmtTime = (ts) => new Date(ts).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });
const aircraftLabel = (a) => (a ? `${a.model?.brand || ''} ${a.model?.model || ''} · ${a.serial_number}`.trim() : 'Sin aeronave');
const ZONE_STYLE = { aceptable: 'bg-emerald-50 text-emerald-700', tolerable: 'bg-amber-50 text-amber-700', inaceptable: 'bg-red-50 text-red-700' };

export default function DespachoPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ missions: [], inProgress: [], dispatches: [] });
  const [view, setView] = useState({ kind: 'list' }); // list | wizard | close
  const [notice, setNotice] = useState(null);

  const load = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/despacho?organizationId=${orgId}`);
    const body = await res.json();
    if (res.ok) setData(body);
    else setError(body.error);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/duty/context');
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Error cargando contexto');
        setContext(body);
        setOrganizationId(body.organizations?.[0]?.id || '');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (organizationId) load(organizationId);
  }, [organizationId, load]);

  const backToList = async () => {
    setView({ kind: 'list' });
    await load(organizationId);
  };

  const hero = <SectionHero eyebrow="Operación" title="Despacho" description="Despacha tus misiones de hoy con sus verificaciones y registra el vuelo al terminar." />;
  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;
  if (!context?.personId) {
    return (
      <div>
        {hero}
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const isManager = !!context.organizations?.find((o) => o.id === organizationId)?.isDutyManager;

  if (view.kind === 'wizard') {
    return (
      <div className="space-y-4">
        {hero}
        <Wizard
          mission={view.mission}
          onCancel={backToList}
          onDone={async (result) => {
            setNotice(`Misión despachada${result.noCount ? ` — ${result.noCount} paso(s) marcado(s) "No" quedaron registrados` : ''}. Ya puedes volar; al aterrizar, registra el vuelo.`);
            await backToList();
          }}
        />
      </div>
    );
  }
  if (view.kind === 'close') {
    return (
      <div className="space-y-4">
        {hero}
        <CloseForm
          mission={view.mission}
          dispatch={view.mission.dispatch}
          onCancel={backToList}
          onDone={() => load(organizationId)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Operación"
        title="Despacho"
        description="Despacha tus misiones de hoy con sus verificaciones y registra el vuelo al terminar."
        metric={{ value: data.missions.length + data.inProgress.length, label: 'Pendientes' }}
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {notice && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{notice}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="event_available" color="blue" label="Para despachar hoy" value={data.missions.length} />
        <StatCard icon="flight_takeoff" color="amber" label="En curso" value={data.inProgress.length} />
        <StatCard icon="task_alt" color="emerald" label="Despachos recientes" value={data.dispatches.length} />
        <StatCard icon="report" color="red" label="Con pasos en “No”" value={data.dispatches.filter((d) => d.items_no > 0).length} />
      </div>

      {data.inProgress.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-navy">En curso — falta registrar el vuelo</p>
          {data.inProgress.map((m) => (
            <MissionCard key={m.id} m={m} action={m.dispatch ? { label: 'Cerrar vuelo', icon: 'flight_land', onClick: () => setView({ kind: 'close', mission: m }) } : null} note={m.dispatch ? `Despachada ${fmtTime(m.dispatch.dispatched_at)}` : null} />
          ))}
        </section>
      )}

      <section className="space-y-2">
        <p className="text-sm font-semibold text-navy">Para despachar hoy</p>
        {data.missions.length === 0 ? (
          <p className="text-sm text-navy-300">No tienes misiones programadas para hoy.</p>
        ) : (
          data.missions.map((m) => <MissionCard key={m.id} m={m} action={{ label: 'Despachar', icon: 'rocket_launch', onClick: () => setView({ kind: 'wizard', mission: m }) }} note={fmtTime(m.scheduled_at)} />)
        )}
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-navy">{isManager ? 'Historial de la organización' : 'Mi historial'}</p>
        {data.dispatches.length === 0 ? (
          <p className="text-sm text-navy-300">Todavía no hay despachos.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-navy-100 divide-y divide-navy-50">
            {data.dispatches.map((d) => (
              <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-navy">{d.mission?.name || 'Misión'}</p>
                  <p className="text-xs text-navy-400">
                    {fmtTime(d.dispatched_at)} · {d.pilot?.full_name || '—'} · {aircraftLabel(d.aircraft)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {d.risk_initial_zone && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ZONE_STYLE[d.risk_initial_zone]}`}>riesgo {d.risk_initial_zone}</span>}
                  {d.items_no > 0 && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">{d.items_no} paso(s) “No”</span>}
                  {d.safety_report && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">reporte {d.safety_report_type}</span>}
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${d.status === 'cerrado' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{d.status === 'cerrado' ? 'Cerrado' : 'En curso'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MissionCard({ m, action, note }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm bg-primary text-white">
          <span className="material-symbols-outlined text-xl">flight</span>
        </span>
        <div>
          <p className="text-sm font-semibold text-navy">{m.name}</p>
          <p className="text-xs text-navy-400 mt-0.5">
            {m.zone} · {aircraftLabel(m.aircraft)}
            {note && ` · ${note}`}
          </p>
        </div>
      </div>
      {action && (
        <button type="button" onClick={action.onClick} className="inline-flex items-center gap-1 text-sm font-semibold px-4 py-2 rounded-xl bg-primary text-white hover:opacity-90">
          <span className="material-symbols-outlined text-base">{action.icon}</span>
          {action.label}
        </button>
      )}
    </div>
  );
}
