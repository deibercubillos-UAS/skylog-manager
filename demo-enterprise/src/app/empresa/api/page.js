'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDemo } from '@/lib/demoStore';
import Icon from '@/components/Icon';
import {
  sampleFlights, sampleFlightDetail, sampleUsage, sampleMissions, ENDPOINTS, SAMPLE_KEY, API_BASE,
} from '@/lib/apiSamples';
import { downloadApiDocsPdf } from '@/lib/apiDocsPdf';

const TABS = [
  { id: 'flights',  label: 'GET /flights',     fn: sampleFlights },
  { id: 'detail',   label: 'GET /flights/{id}', fn: (s) => sampleFlightDetail(s) },
  { id: 'missions', label: 'GET /missions',    fn: sampleMissions },
  { id: 'usage',    label: 'GET /usage',       fn: sampleUsage },
];

export default function ApiPage() {
  const demo = useDemo();
  const [tab, setTab] = useState('flights');
  const [copied, setCopied] = useState('');

  if (!demo.hydrated) return <div className="p-10 text-center text-slate-400">Cargando…</div>;

  // Estado plano para los generadores de muestra.
  const state = { credits: demo.credits, pilots: demo.pilots, missions: demo.missions, flights: demo.flights };
  const active = TABS.find((t) => t.id === tab);
  const json = JSON.stringify(active.fn(state), null, 2);

  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1500); } catch {}
  };

  return (
    <div className="min-h-[calc(100vh-30px)]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 flex items-center gap-3">
          <Link href="/empresa" className="size-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 shrink-0">
            <Icon name="arrow_back" className="text-lg" />
          </Link>
          <div className="size-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ backgroundColor: 'color-mix(in srgb, var(--brand-accent) 14%, white)' }}>
            <Icon name="api" className="text-xl" style={{ color: 'var(--brand-accent)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Integración</p>
            <h1 className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--brand-navy)' }}>API Enterprise</h1>
          </div>
          <button
            onClick={downloadApiDocsPdf}
            className="ml-auto flex items-center gap-1.5 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider shrink-0"
            style={{ backgroundColor: 'var(--brand-accent)' }}
          >
            <Icon name="picture_as_pdf" className="text-base" /> Descargar PDF
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-5">

        {/* API key + auth */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-black uppercase tracking-widest mb-3" style={{ color: 'var(--brand-navy)' }}>
            Autenticación
          </h2>
          <p className="text-xs text-slate-500 mb-3">Incluye tu API key como Bearer token en cada solicitud.</p>
          <div className="space-y-2">
            <CodeRow label="API Key" value={SAMPLE_KEY} onCopy={() => copy(SAMPLE_KEY, 'key')} copied={copied === 'key'} mono />
            <CodeRow label="Base URL" value={API_BASE} onCopy={() => copy(API_BASE, 'base')} copied={copied === 'base'} mono />
            <CodeRow label="Header" value={`Authorization: Bearer ${SAMPLE_KEY}`} onCopy={() => copy(`Authorization: Bearer ${SAMPLE_KEY}`, 'hdr')} copied={copied === 'hdr'} mono />
          </div>
        </div>

        {/* Endpoints */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: 'var(--brand-navy)' }}>
            Endpoints
          </h2>
          <div className="space-y-2">
            {ENDPOINTS.map((e) => (
              <div key={e.path} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <span className="text-[10px] font-black px-2 py-1 rounded bg-emerald-100 text-emerald-700 shrink-0">{e.method}</span>
                <div className="min-w-0">
                  <code className="text-xs font-bold text-slate-800">{e.path}</code>
                  <p className="text-xs text-slate-500 mt-0.5">{e.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ejemplo de respuesta en vivo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--brand-navy)' }}>
              Respuesta de ejemplo
            </h2>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">en vivo desde el demo</span>
            <div className="ml-auto flex gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${tab === t.id ? 'text-white' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
                  style={tab === t.id ? { backgroundColor: 'var(--brand-accent)' } : {}}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => copy(json, 'json')}
              className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white bg-white/10 rounded-lg px-2 py-1"
            >
              <Icon name={copied === 'json' ? 'check' : 'content_copy'} className="text-sm" />
              {copied === 'json' ? 'Copiado' : 'Copiar'}
            </button>
            <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto text-xs leading-relaxed max-h-[420px] overflow-y-auto">
              <code>{json}</code>
            </pre>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            El JSON refleja el estado actual del demo: carga vuelos en la vista piloto y vuelve aquí para verlos aparecer.
          </p>
        </div>
      </main>
    </div>
  );
}

function CodeRow({ label, value, onCopy, copied, mono }) {
  return (
    <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-16 shrink-0">{label}</span>
      <code className={`flex-1 min-w-0 truncate text-xs text-slate-700 ${mono ? 'font-mono' : ''}`}>{value}</code>
      <button onClick={onCopy} className="text-slate-400 hover:text-slate-700 shrink-0">
        <Icon name={copied ? 'check' : 'content_copy'} className="text-base" />
      </button>
    </div>
  );
}
