'use client';
import Link from 'next/link';

export default function Pricing() {
  const handleAction = (price) => {
    window.location.href = '/registro';
  };

  return (
    <section id="precios" className="py-24 bg-[#f8f6f6] dark:bg-[#110a07] text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-20">
        <h2 className="text-4xl font-black text-[#1A202C] dark:text-white mb-4 uppercase tracking-tighter">Planes de Suscripción</h2>
        <p className="text-slate-500 font-medium max-w-2xl mx-auto">Soluciones escalables para cada nivel de operación UAS.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <PricingCard title="Piloto" price="0" features={["1 Piloto", "1 Drone", "Bitácora ilimitada"]} buttonText="Empezar Gratis" onAction={() => handleAction('0')} />
        <PricingCard title="Escuadrilla" price="49" features={["7 Roles", "15 Drones", "SORA SAIL I-IV"]} buttonText="Comprar Ahora" recommended onAction={() => handleAction('49')} />
        <PricingCard title="Flota" price="129" features={["20 Pilotos", "Drones Ilimitados", "Reportes Masivos"]} buttonText="Comprar Ahora" onAction={() => handleAction('129')} />
        <PricingCard title="Enterprise" price="Custom" features={["White Label", "Acceso API", "Soporte 24/7"]} buttonText="Contactar" dark onAction={() => window.location.href='/#contacto'} />
      </div>
    </section>
  );
}

function PricingCard({ title, price, features, buttonText, recommended, dark, onAction }) {
  return (
    <div className={`p-8 rounded-[2rem] border flex flex-col transition-all ${recommended ? 'border-[#ec5b13] shadow-2xl scale-105 z-10 bg-white' : dark ? 'bg-[#1A202C] text-white border-slate-700' : 'bg-white border-slate-200'}`}>
      <h3 className="text-xl font-black uppercase mb-4">{title}</h3>
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-4xl font-black">{price !== 'Custom' ? `$${price}` : price}</span>
        {price !== 'Custom' && <span className="text-slate-400 text-xs font-bold">/ mes</span>}
      </div>
      <ul className="space-y-3 mb-10 flex-1 text-xs">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ec5b13] text-base">check_circle</span> {f}
          </li>
        ))}
      </ul>
      <button onClick={onAction} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest ${recommended ? 'bg-[#ec5b13] text-white' : 'bg-slate-100 text-slate-900'}`}>{buttonText}</button>
    </div>
  );
}
