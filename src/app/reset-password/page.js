'use client';
import { useState } from 'react';
import Link from 'next/link';
import AuthSidePanel from '@/components/AuthSidePanel';

export default function ResetRequestPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/auth/reset-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (res.ok) setSent(true);
    else alert("Error al enviar el correo.");
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Recupera el acceso a tu centro de mando." />
      <section className="flex-1 flex flex-col px-6 py-8 justify-center text-left">
        <div className="max-w-md w-full mx-auto">
          {!sent ? (
            <>
              <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">¿Olvidaste tu contraseña?</h2>
              <p className="text-slate-500 mb-8 font-medium">Ingresa tu correo y te enviaremos un enlace de recuperación.</p>
              <form onSubmit={handleRequest} className="space-y-6">
                <input required type="email" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="tu@correo.com" onChange={e => setEmail(e.target.value)} />
                <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest transition-all hover:bg-orange-600">
                  {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-emerald-500">mark_email_read</span>
              <h2 className="text-2xl font-black text-slate-900 uppercase">¡Correo Enviado!</h2>
              <p className="text-slate-500">Revisa tu bandeja de entrada para continuar con el proceso.</p>
              <Link href="/login" className="block text-[#ec5b13] font-bold underline mt-4">Volver al inicio</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}