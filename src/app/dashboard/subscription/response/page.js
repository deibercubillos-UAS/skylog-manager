'use client';
import Link from 'next/link';

export default function PaymentResponsePage() {
  return (
    <div className="min-h-screen bg-[#f8f6f6] flex flex-col items-center justify-center p-6 text-center font-display">
      <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
        <div className="size-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
          <span className="material-symbols-outlined text-4xl animate-bounce">verified</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">¡Transacción Finalizada!</h2>
        <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed">
          Estamos validando tu pago con el banco. Tu plan se activará automáticamente en los próximos minutos.
        </p>
        <div className="mt-8 space-y-3">
          <Link href="/dashboard" className="block w-full py-4 bg-[#ec5b13] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">
            Ir al Dashboard
          </Link>
          <p className="text-[10px] text-slate-400 font-bold uppercase italic">Ref: Pago ePayco</p>
        </div>
      </div>
    </div>
  );
}