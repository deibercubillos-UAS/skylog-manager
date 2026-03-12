import React from 'react';

export default function LandingPage() {
  return (
    <div className="bg-[#f8f6f6] text-slate-900 transition-colors duration-300">
      {/* Top Navigation Bar */}
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
              <a className="text-sm font-medium text-slate-600 hover:text-[#ec5b13]" href="#">SORA Risk</a>
              <a className="text-sm font-medium text-slate-600 hover:text-[#ec5b13]" href="#">Pricing</a>
            </nav>
            <div className="flex items-center gap-4">
              <button className="hidden sm:block text-sm font-semibold text-slate-700 px-4 py-2 hover:bg-slate-100 rounded-lg">Log In</button>
              <button className="bg-[#ec5b13] hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg">Start Free Trial</button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 w-fit">
                <span className="text-xs font-bold uppercase tracking-wider text-[#ec5b13]">Novedad: RAC 2024 Compliance</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1A202C] leading-[1.1]">
                La Bitácora de Vuelo Digital que garantiza tu <span className="text-[#ec5b13]">cumplimiento legal.</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-xl">
                Gestiona pilotos, drones y análisis SORA bajo estándares RAC con facilidad. La plataforma definitiva para operadores profesionales.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-[#ec5b13] hover:bg-orange-600 text-white px-8 py-4 rounded-lg text-lg font-bold shadow-xl flex items-center justify-center gap-2 group transition-all">
                  Comenzar Prueba de 14 días
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
                <button className="bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-lg text-lg font-bold hover:bg-slate-50">
                  Ver Demo
                </button>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <img 
                  alt="Enterprise Drone" 
                  className="w-full aspect-video object-cover" 
                  src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80&w=1000" 
                />
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <span className="material-symbols-outlined text-[#ec5b13]">analytics</span>
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
    </div>
  );
}