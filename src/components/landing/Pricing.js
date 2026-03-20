'use client';
import Link from 'next/link';

export default function Pricing() {
  return (
    <section id="precios" className="py-24 bg-[#f8f6f6] dark:bg-[#110a07] text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-black text-[#1A202C] dark:text-white mb-4 uppercase tracking-tighter">Planes de Suscripción</h2>
          <p className="text-slate-500 font-medium">Soluciones escalables para cada nivel de operación.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-20">
          <PriceCard title="Piloto" price="0" perfil="1 Piloto Individual" flota="1 Drone" features={["Bitácora ilimitada", "Gestión de Baterías", "Carga de RCE"]} btn="Comenzar Gratis" />
          <PriceCard title="Escuadrilla" price="49" perfil="Hasta 7 Usuarios" flota="Hasta 15 Drones" features={["Alertas Mantenimiento", "SORA Pro", "Reportes PDF"]} btn="Elegir Escuadrilla" recommended />
          <PriceCard title="Flota" price="129" perfil="Hasta 20 Pilotos" flota="Drones Ilimitados" features={["Ciclos de Vida AV", "Dashboards Real-time", "Soporte Prioritario"]} btn="Elegir Flota" />
          <PriceCard title="Enterprise" price="Custom" perfil="Corporativo Total" flota="Ilimitado" features={["White Label", "Acceso total a API", "Servidor Dedicado"]} btn="Contactar Ventas" dark />
        </div>

        {/* Tabla Comparativa Simple */}
        <div className="mt-20 bg-white dark:bg-[#1A202C] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="p-6 bg-slate-50 dark:bg-black/20 text-center font-black uppercase text-xs tracking-widest">Comparativa de Capacidades</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-bold">
               <thead><tr className="text-slate-400 border-b border-slate-100 dark:border-white/5"><th className="p-4 text-left">Función</th><th className="text-center">Piloto</th><th className="text-center text-[#ec5b13]">Escuadrilla</th><th className="text-center">Flota</th><th className="text-center">Enterprise</th></tr></thead>
               <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                 <tr className="hover:bg-slate-50 dark:hover:bg-white/5"><td className="p-4 uppercase">SORA Sail I-IV</td><td className="text-center">-</td><td className="text-center text-[#ec5b13]">✓</td><td className="text-center">✓</td><td className="text-center">✓</td></tr>
                 <tr className="hover:bg-slate-50 dark:hover:bg-white/5"><td className="p-4 uppercase">Exportación XLS/CSV</td><td className="text-center">-</td><td className="text-center text-[#ec5b13]">✓</td><td className="text-center">✓</td><td className="text-center">✓</td></tr>
               </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function PriceCard({ title, price, perfil, flota, features, btn, recommended, dark }) {
  return (
    <div className={`p-8 rounded-[2rem] border flex flex-col transition-all ${recommended ? 'border-[#ec5b13] shadow-2xl scale-105 z-10 bg-white dark:bg-slate-900 ring-8 ring-orange-500/5' : dark ? 'bg-[#1A202C] text-white border-slate-700' : 'bg-white border-slate-200'}`}>
      <h3 className="text-xl font-black uppercase mb-2">{title}</h3>
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-4xl font-black">{price !== 'Custom' ? `$${price}` : price}</span>
        {price !== 'Custom' && <span className="text-[10px] uppercase font-bold text-slate-400">/ mes</span>}
      </div>
      <ul className="space-y-3 mb-10 flex-1 text-[11px] font-medium text-slate-500">
        {features.map((f, i) => <li key={i} className="flex items-start gap-2"><span className="material-symbols-outlined text-[#ec5b13] text-sm">check_circle</span> {f}</li>)}
      </ul>
      <Link href="/registro" className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center ${recommended ? 'bg-[#ec5b13] text-white' : dark ? 'bg-white text-navy' : 'border-2 border-slate-100 hover:bg-slate-50'}`}>{btn}</Link>
    </div>
  );
}