'use client';
import Link from 'next/link';
import { openEpaycoCheckout } from '@/lib/useEpayco';

export default function Pricing() {
  return (
    <section id="precios" className="py-24 bg-[#f8f6f6] dark:bg-[#110a07] text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-20">
          <h2 className="text-4xl font-black text-[#1A202C] dark:text-white mb-4 uppercase tracking-tighter">
            Planes de Suscripción
          </h2>
          <p className="text-slate-500 font-medium max-w-2xl mx-auto">
            Soluciones escalables para cada nivel de operación UAS.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-20">
          
          <PricingCard 
            title="Piloto"
            price="0"
            perfil="1 Piloto (Individual)"
            flota="1 Drone"
            features={["Bitácora digital ilimitada", "Gestión de baterías", "Carga de documentos RCE"]}
            buttonText="Empezar Gratis"
          />

          <PricingCard 
            title="Escuadrilla"
            price="49"
            perfil="7 Roles (Equipo)"
            flota="Hasta 15 Drones"
            features={["Alertas de mantenimiento", "Reportes para auditoría", "Estadísticas grupales"]}
            buttonText="Comprar Escuadrilla"
            recommended={true}
          />

          <PricingCard 
            title="Flota"
            price="129"
            perfil="Hasta 20 Pilotos"
            flota="Drones Ilimitados"
            features={["Gestión de ciclos de vida", "Exportación masiva", "Soporte prioritario"]}
            buttonText="Comprar Flota"
          />

          <PricingCard 
            title="Enterprise"
            price="Custom"
            perfil="Personalización total"
            flota="Ilimitado"
            features={["White Label / Marca", "Acceso total a API", "Módulos a medida"]}
            buttonText="Contactar Ventas"
            dark={true}
          />
        </div>

        {/* Tabla Comparativa Técnica */}
        <div className="mt-20 overflow-hidden bg-white dark:bg-[#1A202C] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50">
            <h3 className="text-xl font-black uppercase text-[#1A202C] dark:text-white tracking-tighter text-center">Comparativa Técnica</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30 dark:bg-black/20 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  <th className="px-8 py-5">Funcionalidad</th>
                  <th className="px-6 py-5 text-center">Piloto</th>
                  <th className="px-6 py-5 text-center text-[#ec5b13]">Escuadrilla</th>
                  <th className="px-6 py-5 text-center">Flota</th>
                  <th className="px-6 py-5 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 dark:divide-white/5 font-bold">
                <ComparisonRow label="Checklist Personalizado" v1={true} v2={true} v3={true} v4={true} />
                <ComparisonRow label="Alertas Mantenimiento" v1={false} v2={true} v3={true} v4={true} />
                <ComparisonRow label="SORA Sail I-IV" v1={false} v2={true} v3={true} v4={true} />
                <ComparisonRow label="White Label / Marca" v1={false} v2={false} v3={false} v4={true} />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingCard({ title, price, perfil, flota, features, buttonText, recommended, dark }) {
  
const handleAction = () => {
    if (price === '0') {
      window.location.href = '/registro';
    } else if (price === 'Custom') {
      window.location.href = '/#contacto';
    } else {
      // Redirigir al registro llevando el plan seleccionado en la URL
      const planSlug = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      window.location.href = `/registro?intent=${planSlug}&price=${price}`;
    }
  };

  return (
    <div className={`p-8 rounded-[2rem] border flex flex-col transition-all duration-500 ${
      recommended 
      ? 'border-[#ec5b13] shadow-2xl scale-105 z-10 bg-white dark:bg-slate-900 ring-8 ring-orange-500/5' 
      : dark ? 'bg-[#1A202C] border-slate-700 text-white' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {recommended && (
        <span className="bg-[#ec5b13] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full self-center mb-4">Recomendado</span>
      )}
      <h3 className={`text-xl font-black uppercase mb-1 ${dark ? 'text-[#ec5b13]' : 'text-navy'}`}>{title}</h3>
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-4xl font-black">{price !== 'Custom' ? `$${price}` : price}</span>
        {price !== 'Custom' && <span className="text-slate-400 text-xs font-bold uppercase ml-1">/ mes</span>}
      </div>
      
      <div className="space-y-3 mb-8 text-[10px] font-bold uppercase tracking-widest border-y border-slate-50 dark:border-white/5 py-4 text-left">
        <p className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-[#ec5b13]">group</span> {perfil}</p>
        <p className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-[#ec5b13]">flight</span> {flota}</p>
      </div>

      <ul className="space-y-3 mb-10 flex-1 text-xs font-medium text-slate-500 dark:text-slate-400 text-left">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 leading-tight">
            <span className="material-symbols-outlined text-[#ec5b13] text-base shrink-0">check_circle</span> {f}
          </li>
        ))}
      </ul>
      
      <button 
        onClick={handleAction}
        className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center transition-all ${
        recommended ? 'bg-[#ec5b13] text-white shadow-lg shadow-orange-500/30' : dark ? 'bg-white text-navy' : 'border-2 border-slate-100 hover:bg-slate-50'
      }`}>
        {buttonText}
      </button>
    </div>
  );
}

function ComparisonRow({ label, v1, v2, v3, v4 }) {
  const check = <span className="material-symbols-outlined text-[#ec5b13] font-black">done</span>;
  const cross = <span className="material-symbols-outlined text-slate-200 font-light">close</span>;
  const format = (v) => v === true ? check : v === false ? cross : v;
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
      <td className="px-8 py-5 text-slate-700 dark:text-slate-300 uppercase tracking-tighter text-left">{label}</td>
      <td className="px-6 py-5 text-center">{format(v1)}</td>
      <td className="px-6 py-5 text-center font-black text-[#ec5b13]">{format(v2)}</td>
      <td className="px-6 py-5 text-center">{format(v3)}</td>
      <td className="px-6 py-5 text-center">{format(v4)}</td>
    </tr>
  );
}