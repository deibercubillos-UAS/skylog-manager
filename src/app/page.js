import Navbar from '@/components/Navbar';

export default function LandingPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen">
      
      {/* Usamos el nuevo componente Navbar */}
      <Navbar />

      <main>
        {/* Sección Hero */}
        <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center text-left">
              <div className="flex flex-col gap-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">RAC 2024 Compliance</span>
                </div>
                <h1 className="text-5xl lg:text-7xl font-black text-navy dark:text-white leading-tight">
                  Bitácora Digital para <span className="text-primary text-orange-600">Operadores UAS.</span>
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl">
                  Garantiza tu cumplimiento legal y seguridad operacional con la plataforma líder en gestión aeronáutica.
                </p>
                <button className="bg-primary text-white w-fit px-10 py-4 rounded-xl text-lg font-bold shadow-xl shadow-primary/30 transition-all hover:scale-105">
                  Comenzar ahora
                </button>
              </div>
              <div className="relative">
                 <img src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800" className="rounded-3xl shadow-2xl border border-white/20" alt="Drone" />
              </div>
            </div>
          </div>
        </section>

        {/* Sección Características (Anclaje para el menú) */}
        <section id="caracteristicas" className="py-24 bg-white dark:bg-slate-900">
           <div className="max-w-7xl mx-auto px-8 text-center">
              <h2 className="text-3xl font-black mb-12">Características Principales</h2>
              <div className="grid md:grid-cols-3 gap-8">
                 <div className="p-8 bg-background-light rounded-2xl border border-slate-100">
                    <span className="material-symbols-outlined text-4xl text-primary mb-4">map</span>
                    <h3 className="font-bold text-xl mb-2">Logbook con GPS</h3>
                    <p className="text-sm text-slate-500">Sincronización automática de telemetría y rutas de vuelo.</p>
                 </div>
                 {/* ... más características ... */}
              </div>
           </div>
        </section>

        {/* Sección Precios (Anclaje para el menú) */}
        <section id="precios" className="py-24">
           <div className="max-w-7xl mx-auto px-8 text-center">
              <h2 className="text-3xl font-black mb-12">Planes de Precios</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {/* Aquí irían las tarjetas de precios que ya tienes */}
              </div>
           </div>
        </section>
      </main>

      <footer id="contacto" className="bg-navy text-white py-20 text-center">
         <p>© 2024 SkyLog Manager. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}