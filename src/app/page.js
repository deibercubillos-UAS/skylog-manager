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
              <Link href="/register" className="hidden sm:block text-sm font-semibold text-slate-700 px-4 py-2 hover:bg-slate-100 rounded-lg">Log In</Link>
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
              <div className="flex items-center gap-4 text-slate-500">
                <div className="flex -space-x-2">
                   <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-300"></div>
                   <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-400"></div>
                   <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-500"></div>
                </div>
                <p className="text-sm font-medium">Trusted by 500+ certified drone operators</p>
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
      <section className="py-20 bg-white border-y border-slate-200">
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

      {/* 4. FEATURE SHOWCASE */}
      <section id="features" className="py-24 space-y-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-6">
              <div className="inline-block p-2 bg-[#ec5b13]/10 rounded-lg text-[#ec5b13]">
                <span className="material-symbols-outlined">map</span>
              </div>
              <h3 className="text-3xl font-black text-[#1A202C]">Digital Logbook with GPS</h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                Automated recording of flight paths, duration, and telemetry. Sync directly from your ground control station to our cloud infrastructure for instant compliance updates.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-700 font-medium">
                  <span className="material-symbols-outlined text-[#ec5b13]">check_circle</span>
                  Auto-sync from DJI, Autel, and Parrot
                </li>
                <li className="flex items-center gap-3 text-slate-700 font-medium">
                  <span className="material-symbols-outlined text-[#ec5b13]">check_circle</span>
                  Geofencing alerts & Airspace checking
                </li>
              </ul>
            </div>
            <div className="flex-1 bg-slate-200 rounded-2xl overflow-hidden shadow-2xl h-[400px]">
               <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80&w=1000" className="w-full h-full object-cover" alt="Map View" />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="flex-1 space-y-6">
              <div className="inline-block p-2 bg-[#ec5b13]/10 rounded-lg text-[#ec5b13]">
                <span className="material-symbols-outlined">badge</span>
              </div>
              <h3 className="text-3xl font-black text-[#1A202C]">Pilot Management</h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                Track certifications, medical records, and flight currency for your entire team. Automated notifications when pilot credentials are about to expire.
              </p>
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                 <div className="w-12 h-12 bg-slate-100 rounded-full"></div>
                 <div className="flex-1 h-4 bg-slate-100 rounded"></div>
                 <span className="px-2 py-1 bg-orange-100 text-[#ec5b13] text-[10px] font-bold rounded">EXPIRES SOON</span>
              </div>
            </div>
            <div className="flex-1 bg-[#1A202C] p-12 rounded-2xl grid grid-cols-2 gap-6">
               <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10 text-white">
                  <p className="text-3xl font-black">42</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Drones</p>
               </div>
               <div className="text-center p-6 bg-[#ec5b13]/20 rounded-xl border border-[#ec5b13]/30 text-white">
                  <p className="text-3xl font-black text-[#ec5b13]">12</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Pilots</p>
               </div>
               <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10 text-white">
                  <p className="text-3xl font-black">350h</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Flight Time</p>
               </div>
               <div className="text-center p-6 bg-green-500/10 rounded-xl border border-green-500/20 text-green-500">
                  <p className="text-3xl font-black">100%</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Safety</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRICING SECTION */}
      <section id="pricing" className="py-24 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-black text-[#1A202C] mb-4">Pricing Plans</h2>
          <p className="text-slate-600 mb-16">Scale your drone operations with the right tools.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Free */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 flex flex-col text-left hover:shadow-xl transition-all">
              <h3 className="text-xl font-bold mb-2">Plan Piloto</h3>
              <div className="text-4xl font-black mb-6">$0<span className="text-sm text-slate-400 font-medium">/mo</span></div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex gap-2 text-sm text-slate-600"><span className="material-symbols-outlined text-[#ec5b13]">check</span> 1 Drone & 1 Piloto</li>
                <li className="flex gap-2 text-sm text-slate-600"><span className="material-symbols-outlined text-[#ec5b13]">check</span> Bitácora Básica</li>
              </ul>
              <Link href="/register" className="w-full py-3 text-center border-2 border-[#ec5b13] text-[#ec5b13] font-bold rounded-xl">Empezar Gratis</Link>
            </div>
            {/* Pro */}
            <div className="bg-white p-8 rounded-2xl border-2 border-[#ec5b13] flex flex-col text-left shadow-2xl relative scale-105 z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#ec5b13] text-white px-4 py-1 rounded-full text-xs font-black uppercase">Most Popular</div>
              <h3 className="text-xl font-bold mb-2 text-[#ec5b13]">Plan Operador</h3>
              <div className="text-4xl font-black mb-6 text-[#1A202C]">$29<span className="text-sm text-slate-400 font-medium">/mo</span></div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex gap-2 text-sm text-slate-600"><span className="material-symbols-outlined text-[#ec5b13]">check</span> Hasta 5 Drones</li>
                <li className="flex gap-2 text-sm text-slate-600"><span className="material-symbols-outlined text-[#ec5b13]">check</span> SORA Analysis Pro</li>
                <li className="flex gap-2 text-sm text-slate-600"><span className="material-symbols-outlined text-[#ec5b13]">check</span> Reportes RAC Oficiales</li>
              </ul>
              <Link href="/register" className="w-full py-3 text-center bg-[#ec5b13] text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 transition-all hover:scale-105">Probar 14 días gratis</Link>
            </div>
            {/* Enterprise */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 flex flex-col text-left hover:shadow-xl transition-all">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <div className="text-4xl font-black mb-6 text-[#1A202C]">Custom</div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex gap-2 text-sm text-slate-600"><span className="material-symbols-outlined text-[#ec5b13]">check</span> Drones Ilimitados</li>
                <li className="flex gap-2 text-sm text-slate-600"><span className="material-symbols-outlined text-[#ec5b13]">check</span> API e Integraciones</li>
                <li className="flex gap-2 text-sm text-slate-600"><span className="material-symbols-outlined text-[#ec5b13]">check</span> Manager Dedicado</li>
              </ul>
              <button className="w-full py-3 text-center bg-[#1A202C] text-white font-bold rounded-xl transition-all">Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="bg-[#1A202C] text-white pt-20 pb-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 text-center md:text-left">
            <div className="col-span-1 md:col-span-1 flex flex-col items-center md:items-start">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-[#ec5b13] text-3xl">precision_manufacturing</span>
                <span className="text-xl font-bold tracking-tight">SkyLog</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">Built for safety, designed for efficiency. Aeronautical compliance made easy.</p>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-[#ec5b13]">Product</h4>
              <nav className="flex flex-col space-y-2 text-sm text-slate-400">
                <a href="#" className="hover:text-white transition-colors">Features</a>
                <a href="#" className="hover:text-white transition-colors">Fleet Management</a>
                <a href="#" className="hover:text-white transition-colors">SORA Wizard</a>
              </nav>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-[#ec5b13]">Legal</h4>
              <nav className="flex flex-col space-y-2 text-sm text-slate-400">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-white transition-colors">RAC Compliance</a>
              </nav>
            </div>
            <div className="flex flex-col items-center md:items-end justify-center">
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-[#ec5b13]">Certified UAS Partner</p>
                 <p className="text-xs font-bold text-white mt-1">Aeronautical Standards Guaranteed</p>
              </div>
            </div>
          </div>
          <div className="pt-10 border-t border-slate-800 text-center text-xs text-slate-500">
            © 2024 SkyLog Manager. RAC (FAA/EASA/Aerocivil) Compliant.
          </div>
        </div>
      </footer>
    </div>
  );
}git add .
git commit -m "FIX: Configurando variables de entorno para Vercel"
git push origin main