"use client"
import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-[#f8f6f6] text-slate-900 transition-colors duration-300 font-sans">
      {/* Top Navigation Bar */}
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

      {/* Hero Section */}
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
              <p className="text-lg text-slate-600 max-w-xl">
                Gestiona pilotos, drones y análisis SORA bajo estándares RAC con facilidad. La plataforma definitiva para operadores profesionales que buscan seguridad y control total.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-8 py-4 rounded-lg text-lg font-bold shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 group transition-all">
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
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#ec5b13]/10 rounded-lg">
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

      {/* Key Benefits */}
      <section id="features" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-[#1A202C] mb-4">Key Benefits</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Garantizamos que tus operaciones sean seguras y legales con herramientas de automatización avanzada.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard icon="verified_user" title="Compliance (100% RAC)" desc="Cumple con la normativa RAC de Aerocivil automáticamente. Genera reportes en un clic." />
            <BenefitCard icon="gpp_maybe" title="Safety First (SORA)" desc="Realiza análisis de riesgo SORA para cada misión. Mitiga riesgos y vuela tranquilo." />
            <BenefitCard icon="build_circle" title="Fleet Health" desc="Alertas de mantenimiento programado y ciclos de batería para evitar fallas técnicas." />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-[#1A202C] mb-4">Planes de Suscripción</h2>
            <p className="text-slate-600">Escala tus operaciones con las herramientas adecuadas.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <PriceCard title="Plan Piloto" price="0" desc="Para pilotos recreativos e individuales." features={["1 Drone & 1 Piloto", "Logbook Básico", "Checklists estándar"]} />
            <PriceCard title="Plan Operador" price="29" desc="La solución profesional completa." popular features={["Hasta 5 Drones", "SORA Risk Pro", "Mantenimiento Auto", "Reportes RAC"]} />
            <PriceCard title="Enterprise" price="Custom" desc="Para flotas corporativas y CIACs." features={["Drones Ilimitados", "API Access", "Manager Dedicado"]} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A202C] text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[#ec5b13] text-3xl">precision_manufacturing</span>
            <span className="text-xl font-bold tracking-tight">SkyLog</span>
          </div>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-10">La plataforma líder en cumplimiento aeronáutico para drones profesionales.</p>
          <div className="pt-10 border-t border-slate-800 text-xs text-slate-500">
            © 2024 SkyLog Manager. RAC (Aerocivil) Compliant. SORA Certified.
          </div>
        </div>
      </footer>
    </div>
  );
}

function BenefitCard({ icon, title, desc }) {
  return (
    <div className="p-8 rounded-xl border border-slate-200 hover:border-[#ec5b13]/50 transition-colors bg-[#f8f6f6]">
      <span className="material-symbols-outlined text-4xl text-[#ec5b13] mb-6">{icon}</span>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

function PriceCard({ title, price, desc, features, popular = false }) {
  return (
    <div className={`bg-white p-8 rounded-xl border ${popular ? 'border-2 border-[#ec5b13] shadow-2xl scale-105 relative' : 'border-slate-200 shadow-sm'} flex flex-col h-full`}>
      {popular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#ec5b13] text-white px-4 py-1 rounded-full text-xs font-bold uppercase">Popular</div>}
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-4xl font-black">${price}</span>
        {price !== 'Custom' && <span className="text-slate-500 text-sm">/mo</span>}
      </div>
      <p className="text-slate-500 text-sm mb-8">{desc}</p>
      <ul className="space-y-4 mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
            <span className="material-symbols-outlined text-[#ec5b13] text-lg">check</span> {f}
          </li>
        ))}
      </ul>
      <Link href="/register" className={`w-full py-3 rounded-lg font-bold text-center transition-all ${popular ? 'bg-[#ec5b13] text-white hover:bg-orange-600' : 'border border-[#ec5b13] text-[#ec5b13] hover:bg-orange-50'}`}>
        {popular ? 'Probar 14 días gratis' : 'Empezar ahora'}
      </Link>
    </div>
  )
}