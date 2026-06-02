'use client';
import { useState } from 'react';

export default function EpaycoCheckout({ planKey, billing = 'monthly', label = 'Activar plan', className = '' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleClick = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/epayco/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ planKey, billing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar pago');

      // Redirigir a la página hosteada de ePayco para suscripciones
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-1.5">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs py-3.5 rounded-2xl transition-all disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
        )}
        {loading ? 'Redirigiendo...' : label}
      </button>
      {error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}
    </div>
  );
}
