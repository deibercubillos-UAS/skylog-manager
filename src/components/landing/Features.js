'use client';

export default function Features() {
  return (
    <section id="caracteristicas" className="space-y-32 py-24 bg-white dark:bg-[#1A202C] text-left border-y border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Beneficios Principales */}
        <div className="text-center mb-20">
          <h2 className="text-4xl font-black text-[#1A202C] dark:text-white mb-4 uppercase tracking-tighter">Potencia tu Operación</h2>
          <p className="text-slate-500 font-medium max-w-2xl mx-auto">Tecnología diseñada para adaptarse a los estándares de tus clientes más exigentes.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <BenefitCard icon="verified_user" title="Cumplimiento RAC 100" desc="Generación automática de bitácoras oficiales y reportes técnicos bajo estándares Aerocivil." />
          <BenefitCard icon="tune" title="Protocolos Flexibles" desc="Personaliza tus Checklists y análisis SORA según los requerimientos específicos de cada misión." />
          <BenefitCard icon="monitor_heart" title="Salud de Flota" desc="Control predictivo de mantenimiento y alertas de servicio basadas en horas reales de vuelo." />
        </div>
      </div>
    </section>
  );
}

function BenefitCard({ icon, title, desc }) {
  return (
    <div className="p-10 rounded-[2.5rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-[#ec5b13]/50 transition-all group">
      <span className="material-symbols-outlined text-5xl text-[#ec5b13] mb-8 group-hover:scale-110 transition-transform">{icon}</span>
      <h3 className="text-xl font-black mb-4 uppercase text-[#1A202C] dark:text-white">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}