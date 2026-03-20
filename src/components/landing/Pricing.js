'use client';
import Link from 'next/link';

export default function Pricing() {
  return (
    <section id="precios" className="py-24 bg-[#f8f6f6] dark:bg-[#110a07] text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado de Sección */}
        <div className="text-center mb-20">
          <h2 className="text-4xl font-black text-[#1A202C] dark:text-white mb-4 uppercase tracking-tighter">
            Planes de Suscripción
          </h2>
          <p className="text-slate-500 font-medium max-w-2xl mx-auto">
            Soluciones escalables desde pilotos independientes hasta flotas corporativas de nivel nacional.
          </p>
        </div>

        {/* Grid de 4 Planes con el diseño exacto anterior */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-20">
          
          <PricingCard 
            title="Piloto"
            price="0"
            perfil="1 Piloto (Uso individual)"
            flota="1 Drone"
            features={[
              "Acceso completo a la plataforma",
              "Bitácora digital ilimitada",
              "Gestión de perfiles y baterías",
              "Carga de RCE e Idoneidad"
            ]}
            buttonText="Empezar Gratis"
          />

          <PricingCard 
            title="Escuadrilla"
            price="49"
            perfil="7 Roles (Jefe + SMS + 5 Pilotos)"
            flota="Hasta 15 Drones"
            features={[
              "Asignación de misiones específicas",
              "Alertas de mantenimiento auto",
              "Reportes para auditorías",
              "Panel de estadísticas grupales"
            ]}
            buttonText="Probar Escuadrilla"
            recommended={true}
          />

          <PricingCard 
            title="Flota"
            price="129"
            perfil="Hasta 20 Pilotos"
            flota="Drones Ilimitados"
            features={[
              "Ciclos de vida (Motores/Baterías)",
              "Dashboards de rendimiento AV",
              "Exportación masiva de datos",
              "Soporte prioritario"
            ]}
            buttonText="Elegir Flota"
          />

          <PricingCard 
            title="Enterprise"
            price="Custom"
            perfil="Personalización corporativa total"
            flota="Ilimitado"
            features={[
              "White Label (Marca Propia)",
              "Acceso a API para ERP/CRM",
              "Módulos desarrollados a medida",
              "Servidor y cifrado dedicado"
            ]}
            buttonText="Contactar Ventas"
            dark={true}
          />
        </div>

        {/* --- TABLA COMPARATIVA TÉCNICA (RESTURADA) --- */}
        <div className="mt-20 overflow-hidden bg-white dark:bg-[#1A202C] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50">
            <h3 className="text-xl font-black uppercase text-[#1A202C] dark:text-white tracking-tighter text-center">
              Comparativa Técnica de Capacidades
            </h3>
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
                <ComparisonRow label="Registro de Aeronaves" v1="1" v2="15" v3="∞" v4="∞" />
                <ComparisonRow label="Usuarios en Equipo" v1="1" v2="7" v3="20" v4="∞" />
                <ComparisonRow label="Checklist Personalizado" v1={true} v2={true} v3={true} v4={true} />
                <ComparisonRow label="Alertas de Mantenimiento" v1={false} v2={true} v3={true} v4={true} />
                <ComparisonRow label="Análisis SORA Sail I-IV" v1={false} v2={true} v3={true} v4={true} />
                <ComparisonRow label="White Label / Dominio" v1={false} v2={false} v3={false} v4={true} />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

// COMPONENTES AUXILIARES INTERNOS
function PricingCard({ title, price, perfil, flota, features, buttonText, recommended, dark }) {
  return (
    <div className={`p-8 rounded-[2.5rem] border flex flex-col transition-all duration-500 ${
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
      
      <div className="space-y-3 mb-8 text-[10px] font-bold uppercase tracking-widest border-y border-slate-50 dark:border-white/5 py-4">
        <p className="flex items-center gap-2 font-bold"><span className="material-symbols-outlined text-sm text-[#ec5b13]">group</span> {perfil}</p>
        <p className="flex items-center gap-2 font-bold"><span className="material-symbols-outlined text-sm text-[#ec5b13]">flight</span> {flota}</p>
      </div>

      <ul className="space-y-3 mb-10 flex-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 leading-tight">
            <span className="material-symbols-outlined text-[#ec5b13] text-base shrink-0">check_circle</span> {f}
          </li>
        ))}
      </ul>
      
      <Link href="/registro" className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center transition-all ${
        recommended ? 'bg-[#ec5b13] text-white shadow-lg' : dark ? 'bg-white text-navy' : 'border-2 border-slate-100 hover:bg-slate-50'
      }`}>
        {buttonText}
      </Link>
    </div>
  );
}

function ComparisonRow({ label, v1, v2, v3, v4 }) {
  const check = <span className="material-symbols-outlined text-[#ec5b13] font-black">done</span>;
  const cross = <span className="material-symbols-outlined text-slate-200">close</span>;
  const format = (v) => v === true ? check : v === false ? cross : v;

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
      <td className="px-8 py-5 text-slate-700 dark:text-slate-300 uppercase tracking-tighter">{label}</td>
      <td className="px-6 py-5 text-center">{format(v1)}</td>
      <td className="px-6 py-5 text-center font-black text-[#ec5b13]">{format(v2)}</td>
      <td className="px-6 py-5 text-center">{format(v3)}</td>
      <td className="px-6 py-5 text-center">{format(v4)}</td>
    </tr>
  );
}