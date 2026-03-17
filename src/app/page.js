'use client';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function LandingPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display transition-colors duration-300">
      
      {/* Reutilizamos el Navbar que ya tenemos configurado */}
      <Navbar />

      <main>
        {/* --- HERO SECTION --- */}
        <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 text-left">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col gap-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-primary">Novedad: RAC 2024 Compliance</span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-navy dark:text-white leading-[1.1] tracking-tight">
                  La Bitácora Digital que garantiza tu <span className="text-primary">cumplimiento legal.</span>
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl">
                  Gestiona pilotos, drones y análisis SORA bajo estándares RAC con facilidad. La plataforma definitiva para operadores profesionales que buscan seguridad y control total.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/registro" className="bg-primary hover:bg-orange-600 text-white px-8 py-4 rounded-xl text-lg font-black shadow-xl shadow-primary/30 flex items-center justify-center gap-2 group transition-all">
                    Comenzar Prueba de 14 días
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </Link>
                  <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-8 py-4 rounded-xl text-lg font-bold hover:bg-slate-50 transition-all">
                    Ver Demo
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full transform -rotate-12"></div>
                <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img alt="Enterprise Drone" className="w-full aspect-video object-cover" src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800" />
                  <div className="absolute top-4 right-4 bg-navy/90 text-white p-4 rounded-xl backdrop-blur shadow-lg border border-white/10 max-w-[200px] text-left">
                    <p className="text-[10px] uppercase font-black tracking-widest text-primary mb-1">Live Telemetry</p>
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className="text-xs font-bold">Altitude</span>
                      <span className="text-sm font-mono font-black">120.4m</span>
                    </div>
                    <div className="w-full bg-white/20 h-1 rounded-full">
                      <div className="bg-primary w-2/3 h-1 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- KEY BENEFITS SECTION --- */}
       <section id="caracteristicas" className="py-24 bg-white dark:bg-background-dark border-y border-slate-200 dark:border-slate-800 text-left">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-[#1A202C] dark:text-white mb-4">Potencia tu Operación</h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Tecnología diseñada para adaptarse a los estándares de tus clientes más exigentes.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Beneficio 1: Cumplimiento */}
              <BenefitCard 
                icon="verified_user" 
                title="Cumplimiento RAC 100" 
                desc="Generación automática de bitácoras oficiales y reportes técnicos bajo los estándares de la Aerocivil y autoridades regionales."
              />

              {/* Beneficio 2: PERSONALIZACIÓN (NUEVO) */}
              <BenefitCard 
                icon="tune" 
                title="Protocolos Flexibles" 
                desc="Personaliza tus Checklists y análisis de riesgos SORA según los requerimientos específicos de cada cliente o tipo de misión."
              />

              {/* Beneficio 3: Salud de Flota */}
              <BenefitCard 
                icon="monitor_heart" 
                title="Mantenimiento Inteligente" 
                desc="Control predictivo de salud de la flota, ciclos de batería y alertas de servicio basadas en horas reales de vuelo."
              />
            </div>
          </div>
        </section>


        {/* --- FEATURE SHOWCASE --- */}
        <section className="py-24 overflow-hidden text-left">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
            
            {/* Feature 1 */}
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 space-y-6">
                <div className="inline-block p-2 bg-primary/10 rounded-lg">
                  <span className="material-symbols-outlined text-primary">map</span>
                </div>
                <h3 className="text-3xl font-black text-navy dark:text-white leading-tight">Bitácora Digital con Telemetría</h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                  Registro automático de rutas de vuelo, duración y telemetría. Sincroniza directamente desde tu estación de control a nuestra nube para actualizaciones instantáneas.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold">
                    <span className="material-symbols-outlined text-primary">check_circle</span> Sincronización con DJI, Autel y Parrot
                  </li>
                  <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold">
                    <span className="material-symbols-outlined text-primary">check_circle</span> Alertas de Geofencing y espacio aéreo
                  </li>
                </ul>
              </div>
              <div className="flex-1">
                <img src="https://images.unsplash.com/photo-1527977966376-1c8418f9f108?q=80&w=800" className="rounded-3xl shadow-2xl border border-slate-200" alt="Map View" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
              <div className="flex-1 space-y-6">
                <div className="inline-block p-2 bg-primary/10 rounded-lg">
                  <span className="material-symbols-outlined text-primary">badge</span>
                </div>
                <h3 className="text-3xl font-black text-navy dark:text-white leading-tight">Gestión de Pilotos y Credenciales</h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                  Rastrea certificaciones, exámenes médicos y vigencia de licencias de todo tu equipo. Notificaciones automáticas antes de cualquier vencimiento legal.
                </p>
                <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-4">
                  <div className="size-12 rounded-full bg-slate-200"></div>
                  <div className="flex-1">
                    <div className="h-3 w-24 bg-slate-200 rounded mb-2"></div>
                    <div className="h-2 w-32 bg-slate-100 rounded"></div>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded-full uppercase">Expira Pronto</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <StatBox label="Drones" value="42" />
                <StatBox label="Pilotos" value="12" color="text-primary" />
                <StatBox label="Horas Vuelo" value="350h" />
                <StatBox label="Safety Rate" value="100%" color="text-green-500" />
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-navy text-white pt-20 pb-10 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary text-3xl">precision_manufacturing</span>
                <span className="text-xl font-black tracking-tight uppercase">SkyLog Manager</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                La plataforma líder en cumplimiento aeronáutico para operaciones profesionales con drones. Construida para la seguridad, diseñada para la eficiencia.
              </p>
            </div>
            <div>
              <h4 className="font-black mb-6 uppercase text-xs tracking-widest text-[#ec5b13]">Certificaciones</h4>
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-3xl">verified</span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Partner Certificado</p>
                  <p className="text-xs font-bold">Cumplimiento RAC Garantizado</p>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-10 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <p>© 2024 SkyLog Manager. All rights reserved.</p>
            <div className="flex gap-8">
              <span>RAC (Aerocivil / FAA) Compliant</span>
              <span>SORA Methodology Certified</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Componentes Auxiliares
function BenefitCard({ icon, title, desc }) {
  return (
    <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all bg-slate-50 dark:bg-slate-900/50 hover:shadow-xl">
      <span className="material-symbols-outlined text-4xl text-primary mb-6">{icon}</span>
      <h3 className="text-xl font-black mb-3 text-navy dark:text-white">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function StatBox({ label, value, color = "text-white" }) {
  return (
    <div className="aspect-square bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-2">
      <span className={`text-3xl font-black ${color}`}>{value}</span>
      <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{label}</span>
    </div>
  );
}