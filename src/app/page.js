'use client';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function LandingPage() {
  return (
    <div className="bg-[#f8f6f6] dark:bg-[#110a07] text-slate-900 dark:text-slate-100 font-display transition-colors duration-300">
      
      <Navbar />

      <main>
        {/* --- HERO SECTION --- */}
        <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 text-left">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-left duration-700">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ec5b13]/10 border border-[#ec5b13]/20 w-fit">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ec5b13] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ec5b13]"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#ec5b13]">RAC 2024 Compliance</span>
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-[#1A202C] dark:text-white leading-[1.1] tracking-tight">
                  La Bitácora Digital de <span className="text-[#ec5b13]">Alto Nivel.</span>
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl font-medium">
                  Gestión integral de flota, tripulaciones y análisis de riesgos SORA. La plataforma diseñada para operadores que no comprometen la seguridad ni la legalidad.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/registro" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-10 py-4 rounded-2xl text-lg font-black shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 group transition-all">
                    Iniciar Prueba Gratis
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </Link>
                </div>
              </div>

              <div className="relative animate-in fade-in zoom-in duration-1000">
                <div className="absolute inset-0 bg-[#ec5b13]/10 blur-3xl rounded-full transform -rotate-12"></div>
                <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border-8 border-white dark:border-slate-800">
                  <img alt="Drone Industrial" className="w-full aspect-video object-cover" src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- BENEFICIOS CLAVE --- */}
        <section id="caracteristicas" className="py-24 bg-white dark:bg-[#1A202C] border-y border-slate-200 dark:border-slate-800 text-left">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl font-black text-[#1A202C] dark:text-white mb-4 uppercase tracking-tighter">Potencia tu Operación</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">Software certificado para la gestión de cumplimiento UAS bajo estándares internacionales.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <BenefitCard icon="verified_user" title="Cumplimiento RAC 100" desc="Generación automática de bitácoras oficiales y reportes técnicos aceptados por la autoridad aeronáutica." />
              <BenefitCard icon="tune" title="Protocolos Flexibles" desc="Personaliza tus Checklists y análisis SORA según las exigencias específicas de cada cliente o misión." />
              <BenefitCard icon="monitor_heart" title="Salud de Flota" desc="Control predictivo de mantenimiento, ciclos de vida de baterías y alertas de servicio basadas en horas reales." />
            </div>
          </div>
        </section>

        {/* --- PLANES DE PRECIOS --- */}
        <section id="precios" className="py-24 bg-[#f8f6f6] dark:bg-[#110a07] text-left">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl font-black text-[#1A202C] dark:text-white mb-4 uppercase tracking-tighter">Planes de Suscripción</h2>
              <p className="text-slate-500 font-medium">Desde pilotos independientes hasta flotas corporativas masivas.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-20">
              <PricingCard title="Piloto" price="0" perfil="1 Piloto Individual" flota="1 Drone" features={["Bitácora ilimitada", "Gestión de Baterías", "Carga de RCE"]} buttonText="Comenzar Gratis" />
              <PricingCard title="Escuadrilla" price="49" perfil="Hasta 7 Usuarios" flota="Hasta 15 Drones" features={["Alertas de Mantenimiento", "Análisis SORA Pro", "Reportes PDF"]} buttonText="Elegir Escuadrilla" recommended />
              <PricingCard title="Flota" price="129" perfil="Hasta 20 Pilotos" flota="Drones Ilimitados" features={["Gestión avanzada ciclos", "Dashboards Real-time", "Soporte Prioritario"]} buttonText="Elegir Flota" />
              <PricingCard title="Enterprise" price="Custom" perfil="Corporativo Total" flota="Ilimitado" features={["Personalización de Marca", "Acceso total a API", "Servidor Dedicado"]} buttonText="Contactar Ventas" dark />
            </div>

            {/* TABLA COMPARATIVA */}
            <div className="mt-20 overflow-hidden bg-white dark:bg-[#1A202C] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
              <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50">
                <h3 className="text-xl font-black uppercase text-[#1A202C] dark:text-white tracking-tighter text-center">Comparativa Técnica de Capacidades</h3>
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

        {/* --- CONTACTO --- */}
        <section id="contacto" className="py-24 bg-white dark:bg-[#1A202C] text-left border-t border-slate-100 dark:border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <div className="space-y-8">
                <h2 className="text-5xl font-black text-[#1A202C] dark:text-white uppercase tracking-tighter leading-none">Hablemos de tu <span className="text-[#ec5b13]">Flota.</span></h2>
                <p className="text-slate-500 text-lg font-medium">¿Necesitas una implementación masiva o soporte especializado? Nuestro equipo técnico está listo para asistirte.</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                    <span className="material-symbols-outlined text-[#ec5b13]">mail</span>
                    <div><p className="text-[10px] font-black uppercase text-slate-400">Email</p><p className="font-bold text-sm">contacto@bitafly.com</p></div>
                  </div>
                </div>
              </div>
              <div className="bg-[#1A202C] p-10 rounded-[3rem] shadow-2xl">
                <form className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <input className="bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-[#ec5b13]" placeholder="Nombre" />
                    <input className="bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-[#ec5b13]" placeholder="Empresa" />
                  </div>
                  <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-[#ec5b13]" placeholder="Correo corporativo" />
                  <textarea rows="4" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-[#ec5b13]" placeholder="Requerimientos técnicos..."></textarea>
                  <button className="w-full bg-[#ec5b13] py-5 rounded-2xl font-black uppercase text-xs tracking-widest text-white shadow-xl hover:scale-[1.02] transition-all">Enviar Consulta</button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#1A202C] text-white py-12 text-center border-t border-white/5">
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">© 2024 BitaFly UAS Manager - Aviation Systems</p>
      </footer>
    </div>
  );
}

// COMPONENTES AUXILIARES
function BenefitCard({ icon, title, desc }) {
  return (
    <div className="p-10 rounded-[2.5rem] border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:border-[#ec5b13]/50 transition-all hover:shadow-2xl group">
      <span className="material-symbols-outlined text-5xl text-[#ec5b13] mb-8 transition-transform group-hover:scale-110">{icon}</span>
      <h3 className="text-xl font-black mb-4 uppercase tracking-tight text-[#1A202C] dark:text-white">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function PricingCard({ title, price, perfil, flota, features, buttonText, recommended, dark }) {
  return (
    <div className={`p-8 rounded-[2.5rem] border flex flex-col transition-all duration-500 ${recommended ? 'border-[#ec5b13] shadow-2xl scale-105 z-10 bg-white dark:bg-slate-900 ring-8 ring-orange-500/5' : dark ? 'bg-[#1A202C] border-slate-700 text-white' : 'bg-white border-slate-200 shadow-sm'}`}>
      <h3 className={`text-xl font-black uppercase mb-1 ${dark ? 'text-[#ec5b13]' : 'text-[#1A202C]'}`}>{title}</h3>
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-4xl font-black">{price !== 'Custom' ? `$${price}` : price}</span>
        {price !== 'Custom' && <span className="text-slate-400 text-xs font-bold uppercase ml-1">/ mes</span>}
      </div>
      <div className="space-y-3 mb-8 text-[10px] font-bold uppercase tracking-widest border-y border-slate-50 dark:border-white/5 py-4">
        <p className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-[#ec5b13]">group</span> {perfil}</p>
        <p className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-[#ec5b13]">flight</span> {flota}</p>
      </div>
      <ul className="space-y-3 mb-10 flex-1 text-xs font-medium text-slate-500">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2"><span className="material-symbols-outlined text-[#ec5b13] text-base shrink-0">check_circle</span> {f}</li>
        ))}
      </ul>
      <Link href="/registro" className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center transition-all ${recommended ? 'bg-[#ec5b13] text-white shadow-lg' : dark ? 'bg-white text-[#1A202C]' : 'border-2 border-slate-100 hover:bg-slate-50'}`}>{buttonText}</Link>
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