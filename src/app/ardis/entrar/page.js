'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GridBackground from '../GridBackground';

export default function ArdisEntrarPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/ardis/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/ardis');
        router.refresh();
      } else {
        setError('Contraseña incorrecta');
      }
    } catch {
      setError('Error de red, intenta de nuevo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 text-white">
      <GridBackground />

      <form onSubmit={handleSubmit} className="flex w-80 flex-col items-center gap-5">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute h-20 w-20 rounded-2xl bg-primary/20 blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-white/5 shadow-[0_0_30px_rgba(236,91,19,0.25)]">
            <span className="material-symbols-outlined text-3xl text-primary">graphic_eq</span>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">ARDIS</h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            Acceso restringido
          </p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoFocus
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-white
                     backdrop-blur-sm placeholder:text-white/25 focus:border-primary/60
                     focus:shadow-[0_0_0_3px_rgba(236,91,19,0.15)] focus:outline-none"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-xl bg-primary py-3 font-semibold text-white shadow-lg shadow-primary/25
                     transition active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
