import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-300 font-display">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl">precision_manufacturing</span>
              <span className="text-xl font-bold tracking-tight text-navy dark:text-white">SkyLog</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors" href="#">Features</a>
              <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors" href="#">Fleet Management</a>
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
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 text-left">
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
                Manage pilots, drones and SORA analysis under RAC standards with ease. La plataforma definitiva para operadores profesionales que buscan seguridad y control total.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-primary hover:bg-orange-600 text-white px-8 py-4 rounded-lg text-lg font-bold shadow-xl shadow-primary/30 flex items-center justify-center gap-2 group transition-all">
                  Comenzar Prueba de 14 días
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
                <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-8 py-4 rounded-lg text-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                  Ver Demo
                </button>
              </div>
              <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                <div className="flex -space-x-2">
                  <img alt="User" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQHGd4GtaZSKCcNzo8sflCm3c5v8DSfufk3Z72eqJqxU1KwJNABJRWEzX16qfLehhnc1hyxPV_bD3zqozhQhN9afEw9eUficqlv707-LPljXWkzYbuAiMQzzRLzhIns_uxRO1KeB7jKORD_rM5NWTw0e5vH9fHEvXjLLeiHDqyKaOp5VKRyjmB6znSpewpUY2gZBcMdsJ64pKV-bhew_EXXkl2YTIbX9thBhdyFmEscgU1LjHsZI_Fn9jJ8qngfImBlatJtrYAyTk"/>
                  <img alt="User" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoKoh3zVZOd0ncu4WaJI8uMrxd-82cfdf5T3c6rb9PSpWcjFMDuxPgFkf2Dd87b75yidjjKGxRhwiSXwQWTrqJeAdKPwjWb77Yi1Kh32BapGl-VAgSRncf0jJRr3FfkpsthzBfn8LyPzQGexpaatFvaalXlGDc0uAQTIo6r6EvRoYGJ7qU_hP11_ci8PDclv9uB1xSyhjp2D19C8A-x9CM2wo_7TMMrkL1wi9Lq7FV7aDDUx-eYjNkn289ftrQWnqt7ZbdqT4muZ4"/>
                </div>
                <p className="text-sm font-medium">Trusted by 500+ certified drone operators</p>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full transform -rotate-12"></div>
              <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <img alt="Enterprise Drone" className="w-full aspect-video object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_tfWqMkF7zl-O4_mEKek3luvTYJDHO6HsUJwb3T_e1GSiqFLXfYhKDRrQqQRLg5vmiQ1gCsxDl0xIsxzwmZYatXT_K6GSrNAWbf_QrLvju2CLQUEiwMSeHAU5clSwz3dTn0Rt-paPznz63duyr1J1tLfQ7FzIcZWde4KOmgC6RTn9dovwucLGblzo9ppHppztb6TUxm36LySxSgatzkD2HU5fY4Gm5OPhRsqVGOFWFlQNXa8xuQ_XaHOGt7vP2IS3m86vifj1lbI"/>
                <div className="absolute top-4 right-4 bg-navy/90 text-white p-4 rounded-lg backdrop-blur shadow-lg border border-white/10 max-w-[200px]">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-primary mb-1 text-left">Live Telemetry</p>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-xs">Altitude</span>
                    <span className="text-sm font-mono">120.4m</span>
                  </div>
                  <div className="w-full bg-white/20 h-1 rounded-full">
                    <div className="bg-primary w-2/3 h-1 rounded-full"></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs">GPS Status</span>
                    <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">LOCK</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white dark:bg-background-dark border-y border-slate-200 dark:border-slate-800 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-navy dark:text-white mb-4">Key Benefits</h2>
            <p className="text-slate-600 dark:text-slate-400">Ensuring your operations are safe and compliant.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-xl border border-slate-200 bg-background-light dark:bg-slate-900/50">
              <span className="material-symbols-outlined text-4xl text-primary mb-6">verified_user</span>
              <h3 className="text-xl font-bold mb-3">Compliance (100% RAC)</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Stay fully compliant with current RAC aeronautical regulations automatically.</p>
            </div>
            <div className="p-8 rounded-xl border border-slate-200 bg-background-light dark:bg-slate-900/50">
              <span className="material-symbols-outlined text-4xl text-primary mb-6">gpp_maybe</span>
              <h3 className="text-xl font-bold mb-3">Safety First (SORA)</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Conduct thorough SORA risk assessments for every flight operation.</p>
            </div>
            <div className="p-8 rounded-xl border border-slate-200 bg-background-light dark:bg-slate-900/50">
              <span className="material-symbols-outlined text-4xl text-primary mb-6">build_circle</span>
              <h3 className="text-xl font-bold mb-3">Fleet Health</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Receive automated alerts for scheduled drone maintenance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-navy dark:text-white mb-4">Pricing Plans</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 flex flex-col h-full">
              <h3 className="text-lg font-bold mb-2">Plan Piloto</h3>
              <div className="text-4xl font-black mb-8">$0</div>
              <button className="mt-auto w-full py-3 rounded-lg border border-primary text-primary font-bold">Empezar Gratis</button>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border-2 border-primary relative shadow-2xl scale-105 z-10 flex flex-col h-full">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold uppercase">Popular</div>
              <h3 className="text-lg font-bold mb-2">Plan Operador</h3>
              <div className="text-4xl font-black mb-8">$29</div>
              <button className="mt-auto w-full py-3 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/30">Probar 14 días</button>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 flex flex-col h-full">
              <h3 className="text-lg font-bold mb-2">Plan Enterprise</h3>
              <div className="text-4xl font-black mb-8">Custom</div>
              <button className="mt-auto w-full py-3 rounded-lg bg-navy text-white font-bold">Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy dark:bg-background-dark text-white pt-20 pb-10 border-t border-slate-800 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-slate-500 text-sm">© 2024 SkyLog Manager. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}