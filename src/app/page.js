"use client"
import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-[#f8f6f6] text-slate-900 transition-colors duration-300 font-sans antialiased">
      
      {/* --- TOP NAVIGATION BAR --- */}
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

      {/* --- HERO SECTION --- */}
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
                Manage pilots, drones and SORA analysis under RAC standards with ease. La plataforma definitiva para operadores profesionales que buscan seguridad y control total.
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
              <div className="flex items-center gap-4 text-slate-500">
                <div className="flex -space-x-2">
                  <img alt="User" className="w-10 h-10 rounded-full border-2 border-white" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQHGd4GtaZSKCcNzo8sflCm3c5v8DSfufk3Z72eqJqxU1KwJNABJRWEzX16qfLehhnc1hyxPV_bD3zqozhQhN9afEw9eUficqlv707-LPljXWkzYbuAiMQzzRLzhIns_uxRO1KeB7jKORD_rM5NWTw0e5vH9fHEvXjLLeiHDqyKaOp5VKRyjmB6znSpewpUY2gZBcMdsJ64pKV-bhew_EXXkl2YTIbX9thBhdyFmEscgU1LjHsZI_Fn9jJ8qngfImBlatJtrYAyTk" />
                  <img alt="User" className="w-10 h-10 rounded-full border-2 border-white" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoKoh3zVZOd0ncu4WaJI8uMrxd-82cfdf5T3c6rb9PSpWcjFMDuxPgFkf2Dd87b75yidjjKGxRhwiSXwQWTrqJeAdKPwjWb77Yi1Kh32BapGl-VAgSRncf0jJRr3FfkpsthzBfn8LyPzQGexpaatFvaalXlGDc0uAQTIo6r6EvRoYGJ7qU_hP11_ci8PDclv9uB1xSyhjp2D19C8A-x9CM2wo_7TMMrkL1wi9Lq7FV7aDDUx-eYjNkn289ftrQWnqt7ZbdqT4muZ4" />
                  <img alt="User" className="w-10 h-10 rounded-full border-2 border-white" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0Xbsj7Q4jroCArXCjrUUqhwIzPj52Iwmi7FiA9QLTiGM4P7KyUG0xe6IzjhSsdqwD5Fxeoyljb_LXMp06V1akmywSKI9LZUwO0RRCPZoGgfjwOZGsvLOyEdKismmXYBMRxsCt3TUNWnjE9__v2wDSJIVKMqDtJAaRV4o4kNFf05axic3NbF81Btxv219S2ju61sYpqrlPYT0qPpfpEdrP7XgQEvbW9oBz1XFbcbzMepDdviHgXdXlvOjRibKRc9SmhOl-76306GA" />
                </div>
                <p className="text-sm font-medium">Trusted by 500+ certified drone operators</p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-[#ec5b13]/10 blur-3xl rounded-full transform -rotate-12"></div>
              <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <img alt="Enterprise Drone" className="w-full aspect-video object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_tfWqMkF7zl-O4_mEKek3luvTYJDHO6HsUJwb3T_e1GSiqFLXfYhKDRrQqQRLg5vmiQ1gCsxDl0xIsxzwmZYatXT_K6GSrNAWbf_QrLvju2CLQUEiwMSeHAU5clSwz3dTn0Rt-paPznz63duyr1J1tLfQ7FzIcZWde4KOmgC6RTn9dovwucLGblzo9ppHppztb6TUxm36LySxSgatzkD2HU5fY4Gm5OPhRsqVGOFWFlQNXa8xuQ_XaHOGt7vP2IS3m86vifj1lbI" />
                <div className="absolute top-4 right-4 bg-[#1A202C]/90 text-white p-4 rounded-lg backdrop-blur shadow-lg border border-white/10 max-w-[200px]">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[#ec5b13] mb-1">Live Telemetry</p>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-xs">Altitude</span>
                    <span className="text-sm font-mono">120.4m</span>
                  </div>
                  <div className="w-full bg-white/20 h-1 rounded-full">
                    <div className="bg-[#ec5b13] w-2/3 h-1 rounded-full"></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs">GPS Status</span>
                    <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">LOCK</span>
                  </div>
                </div>
                <div className="p-6">
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

      {/* --- KEY BENEFITS --- */}
      <section className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-[#1A202C] mb-4">Key Benefits</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Ensuring your operations are safe and compliant with our advanced automation tools.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard icon="verified_user" title="Compliance (100% RAC)" desc="Stay fully compliant with current RAC aeronautical regulations automatically. Generation of logbooks and official reports in one click." />
            <BenefitCard icon="gpp_maybe" title="Safety First (SORA)" desc="Conduct thorough SORA risk assessments for every flight operation. Mitigate risks and obtain specific authorizations faster." />
            <BenefitCard icon="build_circle" title="Fleet Health" desc="Receive automated alerts for scheduled drone maintenance and battery cycles. Prevent technical failures during critical missions." />
          </div>
        </div>
      </section>

      {/* --- FEATURE SHOWCASE --- */}
      <section id="features" className="py-20 overflow-hidden space-y-24">
        {/* Feature 1 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-6">
              <div className="inline-block p-2 bg-[#ec5b13]/10 rounded-lg text-[#ec5b13]">
                <span className="material-symbols-outlined">map</span>
              </div>
              <h3 className="text-3xl font-black text-[#1A202C]">Digital Logbook with GPS</h3>
              <p className="text-slate-600 text-lg leading-relaxed">Automated recording of flight paths, duration, and telemetry. Sync directly from your ground control station to our cloud infrastructure.</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-700 font-medium">
                  <span className="material-symbols-outlined text-[#ec5b13]">check_circle</span> Auto-sync from DJI, Autel, and Parrot
                </li>
                <li className="flex items-center gap-3 text-slate-700 font-medium">
                  <span className="material-symbols-outlined text-[#ec5b13]">check_circle</span> Geofencing alerts & Airspace checking
                </li>
              </ul>
            </div>
            <div className="flex-1">
              <div className="bg-slate-200 rounded-xl overflow-hidden shadow-2xl border border-slate-300">
                <img alt="Feature Map" className="w-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcLqBRtdxAAW6bmxZjcVlc4cBSeNBPv2WoRgz9noOYPQ_tFSKM8OrqAVLADGpKmwVlkqXuGADkydrWubeP_Zq0F-6lYyIQQu4EqKa-6wn--7S7AXp0AX-S4c-dbEg4dg-YgIdJeRRny97bRUgbC1UHRSM6wimZDNd6-tZ4CoD1a9IdvMzzJFweWp5GPRsWKf3FF0IJKKzJl_4W7KqCf5uyE5K4SGiKYtptOUsTMkT1WOTSPyUpuglYjkCqERZp6JPNhFj9wZv50TQ" />
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="flex-1 space-y-6">
              <div className="inline-block p-2 bg-[#ec5b13]/10 rounded-lg text-[#ec5b13]">
                <span className="material-symbols-outlined">badge</span>
              </div>
              <h3 className="text-3xl font-black text-[#1A202C]">Pilot Management</h3>
              <p className="text-slate-600 text-lg leading-relaxed">Track certifications, medical records, and flight currency for your entire team. Automated notifications when pilot credentials expire.</p>
              <div className="p-4 bg-[#f8f6f6] rounded-lg border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-300"></div>
                  <div className="flex-1 h-4 bg-slate-200 rounded"></div>
                  <span className="px-2 py-1 bg-[#ec5b13]/10 text-[#ec5b13] text-[10px] font-bold rounded">EXPIRES SOON</span>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-[#1A202C] rounded-xl p-8 shadow-2xl">
              <div className="grid grid-cols-2 gap-4">
                <StatBox value="42" label="Drones" />
                <StatBox value="12" label="Pilots" color="text-[#ec5b13]" />
                <StatBox value="350h" label="Flight Time" />
                <StatBox value="100%" label="Safety Rate" color="text-green-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PRICING SECTION --- */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-[#1A202C] mb-4">Pricing Plans</h2>
            <p className="text-slate-600">Scale your drone operations with the right tools.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <PriceCard title="Plan Piloto" price="0" desc="Para pilotos recreativos o individuales." features={["1 Drone & 1 Piloto", "Digital Logbook básico", "Checklists estándar"]} />
            <PriceCard title="Plan Operador" price="29" desc="La solución completa para profesionales." highlighted features={["Hasta 5 Drones & 3 Pilotos", "SORA Risk Analysis Pro", "Mantenimiento Automatizado", "Reportes RAC oficiales"]} />
            <PriceCard title="Plan Enterprise" price="Custom" desc="Para grandes flotas y corporaciones." features={["Drones & Pilotos ilimitados", "API Access & Integraciones", "Account Manager dedicado"]} />
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#1A202C] text-white pt-20 pb-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-[#ec5b13] text-3xl">precision_manufacturing</span>
                <span className="text-xl font-bold tracking-tight">SkyLog</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">The leading aeronautical compliance platform for professional drone operations. Built for safety, designed for efficiency.</p>
            </div>
            <FooterNav title="Product" links={["Features", "Fleet Management", "Integrations", "API Docs"]} />
            <FooterNav title="Company" links={["About Us", "Privacy Policy", "Terms of Service", "Security"]} />
            <div className="flex flex-col items-start md:items-end">
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                <span className="material-symbols-outlined text-[#ec5b13] text-3xl">verified</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Certified Partner</p>
                  <p className="text-xs font-bold">Aeronautical Compliance Guaranteed</p>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-10 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>© 2024 SkyLog Manager. All rights reserved.</p>
            <div className="flex gap-8">
              <span>RAC (AESA/ANAC/FAA) Compliant</span>
              <span>SORA Methodology Certified</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- SUB-COMPONENTES PARA ORGANIZAR ---

function BenefitCard({ icon, title, desc }) {
  return (
    <div className="p-8 rounded-xl border border-slate-200 hover:border-[#ec5b13]/50 transition-colors bg-[#f8f6f6] text-left">
      <span className="material-symbols-outlined text-4xl text-[#ec5b13] mb-6">{icon}</span>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

function StatBox({ value, label, color = "text-white" }) {
  return (
    <div className="aspect-square bg-white/5 rounded-lg flex items-center justify-center flex-col gap-2 border border-white/5">
      <span className={`text-2xl font-black ${color}`}>{value}</span>
      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{label}</span>
    </div>
  )
}

function PriceCard({ title, price, desc, features, highlighted = false }) {
  return (
    <div className={`bg-white p-8 rounded-xl border flex flex-col h-full hover:shadow-xl transition-all ${highlighted ? 'border-2 border-[#ec5b13] shadow-2xl scale-105 z-10 relative' : 'border-slate-200'}`}>
      {highlighted && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#ec5b13] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Most Popular</div>}
      <div className="mb-8 text-left">
        <h3 className="text-lg font-bold text-[#1A202C] mb-2">{title}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-[#1A202C]">{price !== 'Custom' ? `$${price}` : price}</span>
          {price !== 'Custom' && <span className="text-slate-500 text-sm">/mo</span>}
        </div>
        <p className="text-slate-500 text-sm mt-4">{desc}</p>
      </div>
      <ul className="space-y-4 mb-8 flex-1 text-left">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
            <span className="material-symbols-outlined text-[#ec5b13] text-lg">check</span> {f}
          </li>
        ))}
      </ul>
      <Link href="/register" className={`w-full py-3 rounded-lg font-bold text-center transition-colors ${highlighted ? 'bg-[#ec5b13] text-white hover:bg-orange-600' : 'border border-[#ec5b13] text-[#ec5b13] hover:bg-orange-50'}`}>
        {highlighted ? 'Probar 14 días gratis' : 'Empezar Gratis'}
      </Link>
    </div>
  )
}

function FooterNav({ title, links }) {
  return (
    <div>
      <h4 className="font-bold mb-6 text-white">{title}</h4>
      <ul className="space-y-4 text-sm text-slate-400">
        {links.map((l, i) => (
          <li key={i}><a className="hover:text-[#ec5b13] transition-colors" href="#">{l}</a></li>
        ))}
      </ul>
    </div>
  )
}