'use client';

// Compuerta de contraseña liviana para el demo (no es seguridad real — todos
// los datos son simulados). Solo evita que visitantes casuales entren.

import { useState, useEffect } from 'react';
import { DEMO } from '@/demo.config';
import Icon from '@/components/Icon';

const PW = '12345678';
const KEY = 'bitafly_demo_unlocked';

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    try { setUnlocked(sessionStorage.getItem(KEY) === '1'); } catch {}
    setReady(true);
  }, []);

  if (!ready) return null;
  if (unlocked) return children;

  const submit = (e) => {
    e.preventDefault();
    if (value === PW) {
      try { sessionStorage.setItem(KEY, '1'); } catch {}
      setUnlocked(true);
    } else {
      setError(true);
      setValue('');
    }
  };

  return (
    <div className="min-h-[calc(100vh-30px)] flex items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-7 text-center">
        <div className="size-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
             style={{ backgroundColor: 'color-mix(in srgb, var(--brand-accent) 14%, white)' }}>
          <Icon name="lock" className="text-3xl" style={{ color: 'var(--brand-accent)' }} />
        </div>
        <h1 className="text-lg font-black mb-1" style={{ color: 'var(--brand-navy)' }}>
          {DEMO.poweredBy} · Demo Enterprise
        </h1>
        <p className="text-sm text-slate-500 mb-5">Ingresa la contraseña para acceder.</p>

        <input
          type="password"
          value={value}
          autoFocus
          onChange={(e) => { setValue(e.target.value); setError(false); }}
          placeholder="Contraseña"
          className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm text-center outline-none mb-3 ${error ? 'border-red-400' : 'border-slate-200 focus:border-[var(--brand-accent)]'}`}
        />
        {error && <p className="text-xs font-bold text-red-500 mb-3">Contraseña incorrecta</p>}

        <button type="submit" className="w-full py-3 rounded-xl text-sm font-black text-white" style={{ backgroundColor: 'var(--brand-accent)' }}>
          Entrar
        </button>
      </form>
    </div>
  );
}
