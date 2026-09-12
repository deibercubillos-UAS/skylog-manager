'use client';

// Skylog V2.0 — home del route group (v2), en /inicio (no en "/": esa ruta
// ya la ocupa la landing de marketing de producción, src/app/page.js — un
// route group NO añade segmento de URL, así que un page.js aquí en la raíz
// habría colisionado con "/" en silencio, sin error de build, dejando esta
// página inalcanzable — bug real encontrado y corregido antes de verificar
// en navegador). Primer consumidor real de resolveDefaultWorkspace() (F1
// §3.2, packages/domain/src/workspaces.js): resuelve el rol de la persona en
// su organización activa y aterriza el espacio de trabajo correcto por
// defecto. Sin redirect automático (decisión deliberada, ver 51-bitacora.md
// decisión 60): muestra el resultado y accesos directos, el usuario decide.

import { useEffect, useState, useCallback } from 'react';
import { WORKSPACES, resolveDefaultWorkspace } from '@skylog/domain';
import { WORKSPACE_ICONS } from '@skylog/ui';

const WORKSPACE_LINKS = {
  operar: [{ href: '/duty', label: 'Tiempos de servicio', tag: 'F5' }],
  planear: [{ href: '/aerocivil', label: 'Expediente Aerocivil', tag: 'F4a' }],
  registrar: [],
  cumplir: [
    { href: '/sms', label: 'Reportes y casos SMS', tag: 'F3' },
    { href: '/sms/asistente', label: 'Asistente de implantación', tag: 'F3' },
    { href: '/capacitacion', label: 'Capacitación y Examen', tag: 'F3' },
  ],
};

function WorkspaceCard({ workspace, isDefault }) {
  const Icon = WORKSPACE_ICONS[workspace.key];
  const links = WORKSPACE_LINKS[workspace.key];
  const isEmpty = links.length === 0;

  if (isDefault) {
    return (
      <div className="relative rounded-3xl bg-navy text-white p-6 md:p-8 overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-300 bg-primary-900/40 px-2.5 py-1 rounded-full">
            Tu espacio por defecto
          </span>
          <div className="flex items-center gap-3 mt-4">
            <span className="w-11 h-11 rounded-2xl bg-primary/90 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-white" />
            </span>
            <div>
              <h2 className="text-xl font-bold">{workspace.label}</h2>
              <p className="text-sm text-navy-200">{workspace.hint}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-2 bg-white text-navy px-4 py-2 rounded-xl text-sm font-semibold hover:bg-navy-50 transition-colors"
              >
                {l.label}
                <span className="text-[10px] text-navy-300 font-mono">{l.tag}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-5 border ${
        isEmpty ? 'border-dashed border-navy-200 bg-navy-50/60' : 'border-navy-100 bg-white hover:border-primary-200 hover:shadow-sm transition-all'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isEmpty ? 'bg-navy-100 text-navy-300' : 'bg-primary-50 text-primary-600'}`}>
          <Icon className="w-5 h-5" />
        </span>
        <div>
          <p className="font-semibold text-navy text-sm">{workspace.label}</p>
          <p className="text-xs text-navy-300">{workspace.hint}</p>
        </div>
      </div>
      <div className="mt-3">
        {isEmpty ? (
          <p className="text-xs text-navy-300 italic">Próximamente — sin páginas construidas todavía en V2</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="flex items-center justify-between text-sm text-navy-500 hover:text-primary-600 group">
                <span className="group-hover:underline">{l.label}</span>
                <span className="text-[10px] text-navy-300 font-mono">{l.tag}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function V2Home() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
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

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-navy-300 text-sm">Cargando tu espacio de trabajo…</div>
    );
  }

  if (error || !context?.personId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <h1 className="text-xl font-bold text-navy">Skylog V2.0</h1>
        <p className="text-sm text-navy-300 mt-1">Reconstrucción interna de BitaFly</p>
        <p className="mt-4 text-sm text-primary-800 bg-primary-50 border border-primary-100 rounded-xl p-3">
          {error || 'Esta cuenta no tiene todavía un registro de Persona vinculado (modelo de identidad V2).'}
        </p>
      </div>
    );
  }

  const currentOrg = context.organizations.find((o) => o.id === organizationId);
  const defaultWorkspaceKey = resolveDefaultWorkspace(currentOrg?.role);
  const orderedWorkspaces = [
    WORKSPACES.find((w) => w.key === defaultWorkspaceKey),
    ...WORKSPACES.filter((w) => w.key !== defaultWorkspaceKey),
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Skylog V2.0</p>
        <h1 className="text-2xl md:text-3xl font-bold text-navy mt-1">Hola, {currentOrg?.name}</h1>
        <p className="text-sm text-navy-300 mt-1">
          Tu rol es <span className="font-semibold text-navy-500">{currentOrg?.role}</span> — organizamos lo que ya está
          construido por momento operacional, no por tipo de dato.
        </p>
      </header>

      {context.organizations.length > 1 && (
        <select
          className="mb-6 block w-full sm:w-auto px-3 py-2 rounded-lg border border-navy-200 text-sm bg-white"
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
        >
          {context.organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.role})
            </option>
          ))}
        </select>
      )}

      <div className="grid gap-4">
        <WorkspaceCard workspace={orderedWorkspaces[0]} isDefault />
        <div className="grid sm:grid-cols-3 gap-3">
          {orderedWorkspaces.slice(1).map((w) => (
            <WorkspaceCard key={w.key} workspace={w} />
          ))}
        </div>
      </div>
    </div>
  );
}
