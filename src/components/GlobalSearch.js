'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Búsqueda global del header. Consulta /api/search (acotado a la org) con
 * debounce y muestra un dropdown de resultados. Reemplaza el input estático
 * placeholder que se agregó en la Fase 1.
 */
export default function GlobalSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const router = useRouter();

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounce de la consulta
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        if (active) { setResults(data.results || []); setOpen(true); }
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [q]);

  const go = (href) => {
    setOpen(false);
    setQ('');
    router.push(href);
  };

  return (
    <div ref={boxRef} className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8 relative">
      <div className="w-full flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
        <span className="material-symbols-outlined text-lg shrink-0">{loading ? 'hourglass_empty' : 'search'}</span>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Buscar misión, aeronave, piloto..."
          aria-label="Buscar"
          className="w-full bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none"
        />
        {q && (
          <button onClick={() => { setQ(''); setResults([]); }} aria-label="Limpiar búsqueda" className="shrink-0 text-slate-300 hover:text-slate-500">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1 z-[120] max-h-96 overflow-y-auto custom-scrollbar">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs font-bold text-slate-400">
              {loading ? 'Buscando...' : 'Sin resultados'}
            </p>
          ) : results.map((r, i) => (
            <button
              key={`${r.type}-${i}`}
              onClick={() => go(r.href)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
            >
              <span className="material-symbols-outlined text-lg text-slate-400 shrink-0">{r.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-800 truncate">{r.title}</p>
                {r.subtitle && <p className="text-xs text-slate-400 truncate">{r.subtitle}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
