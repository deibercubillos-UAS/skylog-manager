import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-300 font-display">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl">precision_manufacturing</span>
              <span className="text-xl font-bold tracking-tight text-navy dark:text-white">SkyLog</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors" href="#">Features</a>
              <Link className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors" href="/fleet">Mi Flota</Link>
              <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors" href="#">SORA Risk</a>
              <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors" href="#">Pricing</a>
            </nav>
            <div className="flex items-center gap-4">
              <button className="hidden sm:block text-sm font-semibold text-slate-700 dark:text-slate-200 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">Log In</button>
              <button className="bg-primary hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all">Start Free Trial</button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Novedad: RAC 2024 Compliance</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-navy dark:text-white leading-[1.1] tracking-tight">
                La Bitácora de Vuelo Digital que garantiza tu <span className="text-primary">cumplimiento legal.</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl">
                Gestiona pilotos, drones y análisis SORA bajo estándares RAC con facilidad. La plataforma definitiva para operadores profesionales.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/fleet" className="bg-primary hover:bg-orange-600 text-white px-8 py-4 rounded-lg text-lg font-bold shadow-xl shadow-primary/30 flex items-center justify-center gap-2 group transition-all">
                  Comenzar ahora
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
                <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-8 py-4 rounded-lg text-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                  Ver Demo
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full transform -rotate-12"></div>
              <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <img alt="Enterprise Drone" className="w-full aspect-video object-cover" src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800" />
                <div className="absolute top-4 right-4 bg-navy/90 text-white p-4 rounded-lg backdrop-blur shadow-lg border border-white/10 max-w-[200px]">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-primary mb-1">Live Telemetry</p>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-xs">Altitude</span>
                    <span className="text-sm font-mono">120.4m</span>
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

      {/* Key Benefits */}
      <section className="py-20 bg-white dark:bg-background-dark border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-black text-navy dark:text-white mb-16">Beneficios Clave</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard 
              icon="verified_user" 
              title="Compliance (100% RAC)" 
              desc="Generación de bitácoras y reportes oficiales en un clic siguiendo la normativa aeronáutica vigente." 
            />
            <BenefitCard 
              icon="gpp_maybe" 
              title="Safety First (SORA)" 
              desc="Realiza evaluaciones de riesgo SORA para cada operación y mitiga riesgos eficientemente." 
            />
            <BenefitCard 
              icon="build_circle" 
              title="Fleet Health" 
              desc="Alertas automáticas de mantenimiento programado y ciclos de batería para evitar fallos." 
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <h2 className="text-4xl font-black text-navy dark:text-white mb-4">Planes de Precios</h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
             <PricingCard title="Plan Piloto" price="0" features={["1 Drone", "Logbook básico", "Checklists"]} />
             <PricingCard title="Plan Operador" price="29" features={["5 Drones", "Análisis SORA", "Mantenimiento", "Reportes RAC"]} highlighted={true} />
             <PricingCard title="Plan Enterprise" price="Custom" features={["Drones ilimitados", "Acceso API", "Soporte dedicado"]} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy dark:bg-background-dark text-white pt-20 pb-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
           <p className="text-slate-500 text-sm">© 2024 SkyLog Manager. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// Sub-componentes para mantener limpio el código
function BenefitCard({ icon, title, desc }) {
  return (
    <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-colors bg-background-light dark:bg-slate-900/50">
      <span className="material-symbols-outlined text-4xl text-primary mb-6">{icon}</span>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function PricingCard({ title, price, features, highlighted = false }) {
  return (
    <div className={`p-8 rounded-xl border flex flex-col h-full transition-shadow hover:shadow-xl bg-white dark:bg-slate-800 ${highlighted ? 'border-primary shadow-2xl scale-105 z-10' : 'border-slate-200 dark:border-slate-700'}`}>
      {highlighted && <div className="bg-primary text-white text-[10px] font-bold py-1 px-4 rounded-full self-center mb-4 uppercase">Popular</div>}
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <div className="flex items-baseline justify-center gap-1 mb-6">
        <span className="text-4xl font-black">${price}</span>
        {price !== 'Custom' && <span className="text-slate-500 text-sm">/mes</span>}
      </div>
      <ul className="space-y-4 mb-8 text-left flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="material-symbols-outlined text-primary text-lg">check</span> {f}
          </li>
        ))}
      </ul>
      <button className={`w-full py-3 rounded-lg font-bold transition-colors ${highlighted ? 'bg-primary text-white hover:bg-orange-600' : 'border border-primary text-primary hover:bg-primary hover:text-white'}`}>
        Seleccionar Plan
      </button>
    </div>
  );
}git add .
git commit -m "Update: Nueva Landing Page profesional"
git push origin main