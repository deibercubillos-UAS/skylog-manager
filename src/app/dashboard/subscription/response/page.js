'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function PaymentResponsePage() {
  
  useEffect(() => {
    // Esperamos 3 segundos para que el Webhook termine y forzamos refresco total
    const timer = setTimeout(() => {
      window.location.href = '/dashboard/subscription';
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f6f6] flex flex-col items-center justify-center p-6 text-center font-display">
      <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100">
        <div className="size-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-8 text-[#ec5b13]">
          <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Validando Transacción</h2>
        <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed">
          Estamos confirmando tu pago con el banco. <br/> 
          <strong>Tu nuevo plan se activará en unos segundos.</strong>
        </p>
        <div className="mt-10">
           <p className="text-xs font-black uppercase text-slate-400 tracking-widest animate-pulse">Iniciando sistemas BitaFly Pro...</p>
        </div>
      </div>
    </div>
  );
}