'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <main
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111318',
        color: '#f5f5f5',
        fontFamily: 'system-ui, sans-serif',
        padding: '1rem',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '20rem' }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>ARDIS</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoFocus
          style={{
            padding: '0.6rem 0.75rem',
            borderRadius: '0.4rem',
            border: '1px solid #333',
            background: '#1a1c22',
            color: '#f5f5f5',
          }}
        />
        {error && <p style={{ color: '#f87171', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            padding: '0.6rem 0.75rem',
            borderRadius: '0.4rem',
            border: 'none',
            background: '#ec5b13',
            color: '#fff',
            fontWeight: 600,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
