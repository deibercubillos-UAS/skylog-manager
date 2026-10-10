'use client';

// Skylog V2.0 — Onboarding Express: cargar la operación desde un Excel (aeronaves, baterías, tripulación, contactos de
// emergencia y pólizas). Dos pasos a propósito: «Revisar» muestra el informe sin guardar nada; «Importar» lo aplica.
import { useEffect, useRef, useState } from 'react';
import { Field, Button } from '@skylog/ui';
import { SectionHero } from '../../_components/SectionHero';

const LABELS = { aeronaves: 'Aeronaves', baterias: 'Baterías', tripulacion: 'Tripulación', contactos: 'Contactos de emergencia', polizas: 'Pólizas' };

export default function ImportarPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { dryRun, report }
  const input = useRef(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/duty/context');
        const ctx = await res.json();
        if (!res.ok) throw new Error(ctx.error || 'Error cargando contexto');
        setContext(ctx);
        setOrganizationId(ctx.organizations?.[0]?.id || '');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function send(dryRun) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('organizationId', organizationId);
      fd.append('dryRun', String(dryRun));
      const res = await fetch('/api/organizacion/importar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo procesar el archivo');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    if (input.current) input.current.value = '';
  }

  if (loading) return <div className="py-24 flex justify-center"><div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!isManager) {
    return (
      <div className="space-y-4">
        <SectionHero eyebrow="Organización" title="Importar desde Excel" description="Carga inicial de tu operación." />
        <p className="text-sm text-navy-400">Solo un gestor puede importar datos.</p>
      </div>
    );
  }

  const rows = result ? Object.entries(result.report) : [];
  const totalErrors = rows.reduce((n, [, r]) => n + r.errors.length, 0);
  const totalNew = rows.reduce((n, [, r]) => n + r.created, 0);

  return (
    <div className="space-y-6">
      <SectionHero eyebrow="Organización" title="Importar desde Excel" description="Carga tus aeronaves, baterías, tripulación, contactos de emergencia y pólizas de una sola vez. Primero revisas el informe; recién entonces se guarda." />

      {context.organizations.length > 1 && (
        <Field as="select" label="Organización" value={organizationId} onChange={(e) => { setOrganizationId(e.target.value); reset(); }}>
          {context.organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </Field>
      )}

      <div className="rounded-2xl border border-navy-100 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-navy">1. Descarga la plantilla</p>
            <p className="text-xs text-navy-400">Llena solo las hojas que necesites. Subirla de nuevo es seguro: lo que ya existe se omite.</p>
          </div>
          <a href="/api/organizacion/importar/plantilla" download className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-navy-200 text-navy hover:bg-navy-50">Descargar plantilla (.xlsx)</a>
        </div>
        <div>
          <p className="text-sm font-bold text-navy mb-2">2. Súbela y revisa</p>
          <input ref={input} type="file" accept=".xlsx" onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); setError(null); }} className="block text-sm text-navy-500" />
          <div className="flex gap-2 mt-3">
            <Button type="button" onClick={() => send(true)} disabled={!file || busy}>{busy && !result ? 'Revisando…' : 'Revisar archivo'}</Button>
            {result && <Button type="button" variant="ghost" onClick={reset}>Empezar de nuevo</Button>}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      {result && (
        <div className="rounded-2xl border border-navy-100 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-navy-50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-navy">{result.dryRun ? 'Informe de revisión (nada se ha guardado)' : 'Importación terminada'}</p>
              <p className="text-xs text-navy-400">{result.dryRun ? `Se crearían ${totalNew} registro(s).` : `Se crearon ${totalNew} registro(s).`}{totalErrors > 0 ? ` ${totalErrors} fila(s) con problemas no se importan.` : ''}</p>
            </div>
            {result.dryRun && totalNew > 0 && (
              <Button type="button" onClick={() => send(false)} disabled={busy}>{busy ? 'Importando…' : `Importar ${totalNew} registro(s)`}</Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-navy-400 border-b border-navy-100">
                  <th className="px-5 py-2 font-medium">Hoja</th>
                  <th className="px-5 py-2 font-medium text-right">{result.dryRun ? 'Se crearían' : 'Creados'}</th>
                  <th className="px-5 py-2 font-medium text-right">Ya existían</th>
                  <th className="px-5 py-2 font-medium text-right">Con problemas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([key, r]) => (
                  <tr key={key} className="border-b border-navy-50 last:border-0">
                    <td className="px-5 py-2 font-semibold text-navy">{LABELS[key]}{!result.dryRun && key === 'tripulacion' && r.emailsSent != null ? <span className="text-xs font-normal text-navy-400"> · {r.emailsSent} correo(s) enviado(s)</span> : null}</td>
                    <td className="px-5 py-2 text-right text-emerald-700 font-bold">{r.created}</td>
                    <td className="px-5 py-2 text-right text-navy-500">{r.existing}</td>
                    <td className={`px-5 py-2 text-right font-bold ${r.errors.length ? 'text-red-600' : 'text-navy-300'}`}>{r.errors.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalErrors > 0 && (
            <div className="px-5 py-4 bg-red-50/50 border-t border-red-100">
              <p className="text-xs font-bold text-red-700 mb-2">Filas con problemas</p>
              <ul className="space-y-1 text-xs text-red-700 max-h-64 overflow-y-auto">
                {rows.flatMap(([key, r]) => r.errors.map((e, i) => <li key={`${key}-${i}`}><b>{LABELS[key]}</b>{e.row ? `, fila ${e.row}` : ''}: {e.message}</li>))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
