'use client';
import { useState } from 'react';

export default function WompiButton({ planKey, billing = 'annual', label = 'Mejorar plan', className = '' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/wompi/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, billing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar el pago');

      // Redirigir al checkout de Wompi con los parámetros firmados
      const params = new URLSearchParams({
        'public-key': data.publicKey,
        currency: data.currency,
        'amount-in-cents': data.amountCents,
        reference: data.reference,
        'redirect-url': data.redirectUrl,
        'signature:integrity': data.integrity,
      });

      window.location.href = `https://checkout.wompi.co/l/?${params.toString()}`;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs py-3.5 rounded-2xl transition-all disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            Conectando...
          </>
        ) : label}
      </button>
      {error && (
        <p className="text-red-500 text-xs font-bold text-center mt-2">{error}</p>
      )}
    </div>
  );
}
