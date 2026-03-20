'use client';
import Link from 'next/link'; // <--- ESTA ES LA LÍNEA QUE FALTABA

export default function Features() {
  const features = [
    {
      id: 1,
      icon: "verified_user",
      title: "Cumplimiento RAC 100",
      desc: "Generación automatizada de la Bitácora Oficial exigida por la Aerocivil. Olvídate de los registros manuales en Excel.",
      tag: "LEGAL"
    },
    {
      id: 2,
      icon: "dynamic_form",
      title: "Checklist Personalizable",
      desc: "Crea tus propios grupos de verificación (Motores, Energía, Entorno) según las exigencias de tus clientes.",
      tag: "FLEXIBLE"
    },
    {
      id: 3,
      icon: "analytics",
      title: "Análisis SORA Sail I-IV",
      desc: "Evaluación de riesgos con puntaje dinámico en tiempo real. Valida la seguridad de tu misión antes del despegue.",
      tag: "SEGURIDAD"
    },
    {
      id: 4,
      icon: "monitor_heart",
      title: "Salud de Células",
      desc: "Monitoreo predictivo basado en horas reales de vuelo. Alertas automáticas de mantenimiento y ciclos de batería.",
      tag: "TÉCNICO"
    },
    {
      id: 5,
      icon: "account_tree",
      title: "Jerarquía de Roles",
      desc: "Estructura corporativa real: Administrador, Gerente de SMS y Jefe de Pilotos con permisos diferenciados.",
      tag: "EQUIPO"
    },
    {
      id: 6,
      icon: "picture_as_pdf",
      title: "Reportes de Auditoría",
      desc: "Exporta historiales de vuelo, mantenimientos y sucesos SMS en PDF, Excel y CSV listos para auditorías.",
      tag: "PRO"
    }
  ];

  return (
    <section id="caracteristicas" className="py-24 bg-white dark:bg-[#110a07] text-left border-y border-slate-200 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado Estilo HUD */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 gap-6">
          <div className="max-w-2xl">
            <p className="text-[#ec5b13] text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <span className="w-8 h-px bg-[#ec5b13]"></span> Capacidades del Sistema
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-[#1A202C] dark:text-white uppercase tracking-tighter leading-tight">
              Ingeniería para el <span className="text-[#ec5b13]">Control Total</span> de tu operación.
            </h2>
          </div>
          <p className="text-slate-500 font-medium max-w-xs text-sm border-l-2 border-slate-100 dark:border-white/10 pl-6">
            BitaFly no es solo una bitácora; es un ecosistema de seguridad operacional diseñado bajo estándares aeronáuticos.
          </p>
        </div>

        {/* Grid de Características */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.id} className="group relative p-10 rounded-[2.5rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-[#ec5b13]/50 transition-all hover:shadow-2xl overflow-hidden text-left">
              <span className="absolute top-6 right-8 text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest group-hover:text-[#ec5b13] transition-colors">
                {f.tag}
              </span>

              <div className="size-14 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center mb-8 group-hover:bg-[#ec5b13] group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-3xl transition-transform group-hover:scale-110">
                  {f.icon}
                </span>
              </div>

              <h3 className="text-xl font-black text-[#1A202C] dark:text-white uppercase tracking-tight mb-3">
                {f.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {f.desc}
              </p>

              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="text-[10px] font-black text-[#ec5b13] uppercase tracking-tighter">Módulo Activo</span>
                 <span className="material-symbols-outlined text-sm text-slate-400">arrow_forward</span>
              </div>
            </div>
          ))}
        </div>

        {/* Sección de Integración Rápida */}
        <div className="mt-20 p-8 rounded-[2rem] bg-[#1A202C] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px'}}></div>
          <div className="relative z-10 text-left">
            <h4 className="text-xl font-black uppercase tracking-tighter">¿Listo para digitalizar tu escuadrilla?</h4>
            <p className="text-slate-400 text-sm mt-1 uppercase font-bold text-[10px] tracking-widest">Configura tu organización en menos de 5 minutos.</p>
          </div>
          <Link href="/registro" className="relative z-10 bg-[#ec5b13] hover:bg-orange-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-orange-500/20">
            Empezar Ahora
          </Link>
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