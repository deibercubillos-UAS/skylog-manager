export default function LandingPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-300 font-display">
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl">precision_manufacturing</span>
              <span className="text-xl font-bold tracking-tight text-navy dark:text-white">SkyLog</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a className="text-sm font-medium text-slate-600 hover:text-primary" href="#">Features</a>
              <a className="text-sm font-medium text-slate-600 hover:text-primary" href="#">Fleet Management</a>
              <a className="text-sm font-medium text-slate-600 hover:text-primary" href="#">SORA Risk</a>
              <a className="text-sm font-medium text-slate-600 hover:text-primary" href="#">Pricing</a>
            </nav>
            <div className="flex items-center gap-4">
              <button className="text-sm font-semibold px-4 py-2">Log In</button>
              <button className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20">Start Free Trial</button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center text-left">
            <div className="flex flex-col gap-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Novedad: RAC 2024 Compliance</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-navy dark:text-white leading-[1.1]">
                La Bitácora de Vuelo Digital que garantiza tu <span className="text-primary">cumplimiento legal.</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-xl">
                Manage pilots, drones and SORA analysis under RAC standards with ease. La plataforma definitiva para operadores profesionales.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-bold shadow-xl shadow-primary/30 flex items-center justify-center gap-2">
                  Comenzar Prueba Gratis
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <img alt="Drone" className="w-full aspect-video object-cover" src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-navy mb-4">Key Benefits</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="p-8 rounded-xl border border-slate-200 bg-background-light">
              <span className="material-symbols-outlined text-4xl text-primary mb-6">verified_user</span>
              <h3 className="text-xl font-bold mb-3">Compliance (100% RAC)</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Stay fully compliant with current RAC aeronautical regulations automatically.</p>
            </div>
            <div className="p-8 rounded-xl border border-slate-200 bg-background-light">
              <span className="material-symbols-outlined text-4xl text-primary mb-6">gpp_maybe</span>
              <h3 className="text-xl font-bold mb-3">Safety First (SORA)</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Conduct thorough SORA risk assessments for every flight operation.</p>
            </div>
            <div className="p-8 rounded-xl border border-slate-200 bg-background-light">
              <span className="material-symbols-outlined text-4xl text-primary mb-6">build_circle</span>
              <h3 className="text-xl font-bold mb-3">Fleet Health</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Receive automated alerts for scheduled drone maintenance.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-navy text-white py-12 text-center">
        <p className="text-slate-500 text-sm">© 2024 SkyLog Manager. All rights reserved.</p>
      </footer>
    </div>
  );
}