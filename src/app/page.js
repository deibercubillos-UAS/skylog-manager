export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navegación */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ec5b13] text-3xl">precision_manufacturing</span>
              <span className="text-xl font-bold tracking-tight text-[#1A202C]">SkyLog</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a className="text-sm font-medium text-slate-600 hover:text-[#ec5b13]" href="#">Features</a>
              <a className="text-sm font-medium text-slate-600 hover:text-[#ec5b13]" href="#">Fleet</a>
              <a className="text-sm font-medium text-slate-600 hover:text-[#ec5b13]" href="#">SORA</a>
              <a className="text-sm font-medium text-slate-600 hover:text-[#ec5b13]" href="#">Pricing</a>
            </nav>
            <div className="flex items-center gap-4">
              <button className="bg-[#ec5b13] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-[#ec5b13]/20">Prueba Gratis</button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="pt-16 pb-20 lg:pt-24 lg:pb-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-left">
                <div className="inline-block px-3 py-1 rounded-full bg-[#ec5b13]/10 border border-[#ec5b13]/20 mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#ec5b13]">RAC 2024 Compliance</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-[#1A202C] leading-tight mb-6">
                  Bitácora de Vuelo Digital <span className="text-[#ec5b13]">Profesional.</span>
                </h1>
                <p className="text-lg text-slate-600 mb-8 max-w-lg">
                  La solución definitiva para la gestión de flota y cumplimiento aeronáutico de operadores UAS.
                </p>
                <button className="bg-[#ec5b13] text-white px-8 py-4 rounded-lg text-lg font-bold shadow-xl flex items-center gap-2">
                  Empezar ahora <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800" 
                  className="rounded-2xl shadow-2xl border border-slate-200"
                  alt="Drone"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-slate-200 text-center">
        <p className="text-slate-400 text-sm">© 2024 SkyLog Manager. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}