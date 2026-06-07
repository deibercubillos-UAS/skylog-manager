'use client';
import { useState } from 'react';
import { getAttribution } from '@/lib/attribution';
import { trackEvent } from '@/lib/analytics';

/**
 * Captura de correo para lista de marketing.
 * @param {string} source - 'newsletter' | 'blog' | 'landing' | 'checklist'
 * @param {string} title  - encabezado
 * @param {string} subtitle
 */
export default function NewsletterSignup({
  source = 'newsletter',
  title = 'Novedades de la RAC 100 en tu correo',
  subtitle = 'Guías, cambios normativos y recursos para operadores UAS en Colombia. Sin spam.',
}) {
  const [email, setEmail]   = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [msg, setMsg]       = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading'); setMsg('');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, attribution: getAttribution() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar.');
      trackEvent('generate_lead', { lead_source: source });
      setStatus('done');
      setMsg('¡Listo! Revisa tu correo pronto.');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMsg(err.message);
    }
  };

  return (
    <div className="bg-navy text-white rounded-3xl p-8 md:p-10">
      <p className="text-xs font-black uppercase tracking-widest text-orange-400 mb-2">Newsletter</p>
      <h2 className="text-2xl font-black uppercase tracking-tight mb-2 leading-tight">{title}</h2>
      <p className="text-slate-300 text-sm mb-6 max-w-lg">{subtitle}</p>

      {status === 'done' ? (
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <span className="material-symbols-outlined">check_circle</span>
          {msg}
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-lg">
          <input
            type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            aria-label="Correo electrónico"
            className="flex-1 px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white placeholder-slate-400 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/30 transition-all"
          />
          <button
            type="submit" disabled={status === 'loading'}
            className="bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap"
          >
            {status === 'loading' ? 'Enviando…' : 'Suscribirme'}
          </button>
        </form>
      )}
      {status === 'error' && <p className="text-red-300 text-xs font-bold mt-3">{msg}</p>}
    </div>
  );
}
