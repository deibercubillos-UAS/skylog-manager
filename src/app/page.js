import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-[#f8f6f6] dark:bg-[#221610] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-['Public_Sans',sans-serif]">
      
      {/* Barra de Navegación Superior */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[#221610]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ec5b13] text-3xl">precision_manufacturing</span>
              <span className="text-xl font-bold tracking-tight text-[#1A202C] dark:text-white">SkyLog</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#ec5b13] transition-colors" href="#">Features</a>
              <Link href="/fleet" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#ec5b13] transition-colors">Mi Flota</Link>
              <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#ec5b13] transition-colors" href="#">SORA Risk</a>
              <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#ec5b13] transition-colors" href="#">Pricing</a>
            </nav>
            <div className="flex items-center gap-4">
              <button className="hidden sm:block text-sm font-semibold text-slate-700 dark:text-slate-200 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">Log In</button>
              <button className="bg-[#ec5b13] hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-[#ec5b13]/20 transition-all">Start Free Trial</button>
            </div>
          </div>
        </div>
      </header>

      {/* Sección Hero */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-8 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ec5b13]/10 border border-[#ec5b13]/20 w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ec5b13] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ec5b13]"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#ec5b13]">Novedad: RAC 2024 Compliance</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1A202C] dark:text-white leading-[1.1] tracking-tight">
                La Bitácora de Vuelo Digital que garantiza tu <span className="text-[#ec5b13]">cumplimiento legal.</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl">
                Gestiona pilotos, drones y análisis SORA bajo estándares RAC con facilidad. La plataforma definitiva para operadores profesionales.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/fleet" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-8 py-4 rounded-lg text-lg font-bold shadow-xl shadow-[#ec5b13]/30 flex items-center justify-center gap-2 group transition-all text-center">
                  Comenzar ahora
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
                <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-8 py-4 rounded-lg text-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                  Ver Demo
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-[#ec5b13]/10 blur-3xl rounded-full transform -rotate-12"></div>
              <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <img alt="Enterprise Drone" className="w-full aspect-video object-cover" src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800" />
                <div className="absolute top-4 right-4 bg-[#1A202C]/90 text-white p-4 rounded-lg backdrop-blur shadow-lg border border-white/10 max-w-[200px]">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[#ec5b13] mb-1">Live Telemetry</p>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-xs">Altitude</span>
                    <span className="text-sm font-mono">120.4m</span>
                  </div>
                  <div className="w-full bg-white/20 h-1 rounded-full">
                    <div className="bg-[#ec5b13] w-2/3 h-1 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-20 bg-white dark:bg-[#221610] border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-black text-[#1A202C] dark:text-white mb-16">Beneficios Clave</h2>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            {[
              { icon: 'verified_user', title: 'Compliance (100% RAC)', desc: 'Generación de bitácoras y reportes oficiales en un clic siguiendo la normativa.' },
              { icon: 'gpp_maybe', title: 'Safety First (SORA)', desc: 'Realiza evaluaciones de riesgo SORA para cada operación y mitiga riesgos.' },
              { icon: 'build_circle', title: 'Fleet Health', desc: 'Alertas automáticas de mantenimiento programado y ciclos de batería.' }
            ].map((benefit, i) => (
              <div key={i} className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#f8f6f6] dark:bg-slate-900/50">
                <span className="material-symbols-outlined text-4xl text-[#ec5b13] mb-6">{benefit.icon}</span>
                <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer simple */}
      <footer className="bg-[#1A202C] dark:bg-black text-white py-12 text-center">
        <p className="text-slate-500 text-sm">© 2024 SkyLog Manager. All rights reserved.</p>
      </footer>
    </div>
  );
}