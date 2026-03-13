"use client"
import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-[#f8f6f6] text-slate-900 transition-colors duration-300 font-sans antialiased">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ec5b13] text-3xl">precision_manufacturing</span>
              <span className="text-xl font-bold tracking-tight text-[#1A202C]">SkyLog</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a className="text-sm font-medium text-slate-600 hover:text-[#ec5b13] transition-colors" href="#features">Features</a>
              <Link className="text-sm font-medium text-slate-600 hover:text-[#ec5b13] transition-colors" href="/dashboard/fleet">Fleet Management</Link>
              <Link className="text-sm font-medium text-slate-600 hover:text-[#ec5b13] transition-colors" href="/dashboard/sora">SORA Risk</Link>
              <a className="text-sm font-medium text-slate-600 hover:text-[#ec5b13] transition-colors" href="#pricing">Pricing</a>
            </nav>
            <div className="flex items-center gap-4">
              <Link href="/register" className="hidden sm:block text-sm font-semibold text-slate-700 px-4 py-2 hover:bg-slate-100 rounded-lg transition-all">Log In</Link>
              <Link href="/register" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-orange-500/20 transition-all">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ec5b13] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ec5b13]"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#ec5b13]">Novedad: RAC 2024 Compliance</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1A202C] leading-[1.1] tracking-tight">
                La Bitácora de Vuelo Digital que garantiza tu <span className="text-[#ec5b13]">cumplimiento legal.</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
                Manage pilots, drones and SORA analysis under RAC standards with ease. La plataforma definitiva para operadores profesionales que buscan seguridad y control total.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-8 py-4 rounded-lg text-lg font-bold shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 group transition-all text-center">
                  Comenzar Prueba de 14 días
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
                <button className="bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-lg text-lg font-bold hover:bg-slate-50 transition-all">
                  Ver Demo
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-[#ec5b13]/10 blur-3xl rounded-full transform -rotate-12"></div>
              <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <img 
                  alt="Enterprise Drone" 
                  className="w-full aspect-video object-cover" 
                  src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80&w=1000" 
                />
                <div className="absolute top-4 right-4 bg-[#1A202C]/90 text-white p-4 rounded-lg backdrop-blur shadow-lg border border-white/10 max-w-[200px]">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[#ec5b13] mb-1">Live Telemetry</p>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-xs text-slate-300">Altitude</span>
                    <span className="text-sm font-mono">120.4m</span>
                  </div>
                  <div className="w-full bg-white/20 h-1 rounded-full">
                    <div className="bg-[#ec5b13] w-2/3 h-1 rounded-full"></div>
                  </div>
                </div>
                <div className="p-6 bg-white">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#ec5b13]/10 rounded-lg text-[#ec5b13]">
                      <span className="material-symbols-outlined">analytics</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1A202C]">Dashboard de Operaciones</p>
                      <p className="text-xs text-slate-500">Estado de la flota en tiempo real</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. KEY BENEFITS */}
      <section id="features" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-black text-[#1A202C] mb-4">Key Benefits</h2>
          <p className="text-slate-600 max-w-2xl mx-auto mb-16">Ensuring your operations are safe and compliant with our advanced automation tools.</p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-xl border border-slate-100 bg-[#f8f6f6] hover:border-[#ec5b13]/30 transition-all text-left">
              <span className="material-symbols-outlined text-4xl text-[#ec5b13] mb-6">verified_user</span>
              <h3 className="text-xl font-bold mb-3 text-[#1A202C]">Compliance (100% RAC)</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Stay fully compliant with current RAC aeronautical regulations automatically. Generation of logbooks and official reports in one click.</p>
            </div>
            <div className="p-8 rounded-xl border border-slate-100 bg-[#f8f6f6] hover:border-[#ec5b13]/30 transition-all text-left">
              <span className="material-symbols-outlined text-4xl text-[#ec5b13] mb-6">gpp_maybe</span>
              <h3 className="text-xl font-bold mb-3 text-[#1A202C]">Safety First (SORA)</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Conduct thorough SORA risk assessments for every flight operation. Mitigate risks and obtain specific authorizations faster.</p>
            </div>
            <div className="p-8 rounded-xl border border-slate-100 bg-[#f8f6f6] hover:border-[#ec5b13]/30 transition-all text-left">
              <span className="material-symbols-outlined text-4xl text-[#ec5b13] mb-6">build_circle</span>
              <h3 className="text-xl font-bold mb-3 text-[#1A202C]">Fleet Health</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Receive automated alerts for scheduled drone maintenance and battery cycles. Prevent technical failures during critical missions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRICING SECTION */}
      <section id="pricing" className="py-24 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-black text-[#1A202C] mb-4">Pricing Plans</h2>
          <p className="text-slate-600 mb-16">Scale your drone operations with the right tools.</p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 flex flex-col text-left">
              <h3 className="text-xl font-bold mb-2">Plan Piloto</h3>
              <div className="text-4xl font-black mb-6">$0</div>
              <Link href="/register" className="w-full py-3 text-center border-2 border-[#ec5b13] text-[#ec5b13] font-bold rounded-xl">Empezar Gratis</Link>
            </div>
            <div className="bg-white p-8 rounded-2xl border-2 border-[#ec5b13] flex flex-col text-left shadow-2xl relative scale-105 z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#ec5b13] text-white px-4 py-1 rounded-full text-xs font-black uppercase">Most Popular</div>
              <h3 className="text-xl font-bold mb-2 text-[#ec5b13]">Plan Operador</h3>
              <div className="text-4xl font-black mb-6 text-[#1A202C]">$29</div>
              <Link href="/register" className="w-full py-3 text-center bg-[#ec5b13] text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 transition-all hover:scale-105">Probar 14 días gratis</Link>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-200 flex flex-col text-left">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <div className="text-4xl font-black mb-6 text-[#1A202C]">Custom</div>
              <button className="w-full py-3 text-center bg-[#1A202C] text-white font-bold rounded-xl transition-all">Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="bg-[#1A202C] text-white py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[#ec5b13] text-3xl">precision_manufacturing</span>
            <span className="text-xl font-bold tracking-tight">SkyLog</span>
          </div>
          <p className="text-slate-500 text-xs">© 2024 SkyLog Manager. RAC (Aerocivil) Compliant.</p>
        </div>
      </footer>
    </div>
  );
}