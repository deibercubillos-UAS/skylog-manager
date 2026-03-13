"use client"
import React, { useState } from 'react';
import Link from 'next/link';

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="bg-[#f8f6f6] text-[#1A202C] antialiased font-sans min-h-screen">
      
      {/* --- TOP NAVIGATION --- */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ec5b13] text-3xl">flight_takeoff</span>
              <span className="text-xl font-bold tracking-tight">SkyLog <span className="text-[#ec5b13] text-sm font-medium uppercase tracking-widest">Manager</span></span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a className="text-sm font-medium hover:text-[#ec5b13] transition-colors" href="#planes">Planes</a>
              <a className="text-sm font-medium hover:text-[#ec5b13] transition-colors" href="#comparativa">Funciones</a>
              <a className="text-sm font-medium hover:text-[#ec5b13] transition-colors" href="#faq">Soporte</a>
              <Link href="/register" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-orange-500/20">
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* --- HEADER SECTION --- */}
      <header className="py-16 px-4 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
          Lleva tu operación al siguiente nivel.
        </h1>
        <p className="text-lg text-slate-600 mb-10">
          Elige el plan que mejor se adapte a tu flota. Cambia o cancela en cualquier momento.
        </p>

        {/* Toggle Switch */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <div className="flex items-center bg-slate-200 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${!isAnnual ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-[#1A202C]'}`}
            >
              Mensual
            </button>
            <button 
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${isAnnual ? 'bg-white shadow-sm text-[#1A202C]' : 'text-slate-500 hover:text-[#1A202C]'}`}
            >
              Anual
              <span className="bg-orange-100 text-[#ec5b13] text-[10px] px-2 py-0.5 rounded-full font-bold">Ahorra 20%</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- PRICING CARDS --- */}
      <main id="planes" className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Plan Piloto */}
          <PricingCard 
            title="Plan Piloto"
            price="0"
            desc="Ideal para estudiantes o aficionados."
            features={["1 Drone", "1 Piloto", "Logbook Básico (5 vuelos/mes)", "Soporte de la Comunidad"]}
            buttonText="Continuar con Básico"
          />

          {/* Plan Operador Profesional (Recommended) */}
          <PricingCard 
            title="Operador Profesional"
            price={isAnnual ? "19.99" : "24.99"}
            desc="Para pilotos con operaciones comerciales activas."
            features={["Vuelos Ilimitados", "Cumplimiento RAC 100", "Análisis de Riesgo SORA", "Reportes PDF (Aerocivil)", "Alertas de Mantenimiento", "Soporte por Email"]}
            buttonText="Comenzar Prueba Pro"
            recommended
          />

          {/* Plan Flota Enterprise */}
          <PricingCard 
            title="Flota Enterprise"
            price="Custom"
            desc="Grandes empresas de drones y CIACs."
            features={["Pilotos y Drones Ilimitados", "Gestión de Roles (PIC, Obs, Inst)", "Acceso a API", "Soporte Prioritario 24/7", "SMS Personalizado (Safety Mgmt)"]}
            buttonText="Contactar Ventas"
            enterprise
          />
        </div>
      </main>

      {/* --- TRUST & PAYMENTS --- */}
      <section className="bg-white border-y border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-10 md:gap-20 opacity-70">
            <TrustItem icon="lock" label="SSL Secure Connection" />
            <TrustItem icon="encrypted" label="Encrypted Data" />
            <TrustItem icon="verified_user" label="Aerocivil Standards" />
          </div>
          <div className="flex justify-center gap-6 mt-10 text-slate-400">
            <span className="material-symbols-outlined text-4xl">payments</span>
            <span className="material-symbols-outlined text-4xl">contactless</span>
            <span className="material-symbols-outlined text-4xl">credit_card</span>
          </div>
        </div>
      </section>

      {/* --- COMPARISON TABLE --- */}
      <section id="comparativa" className="max-w-5xl mx-auto px-4 py-20 overflow-x-auto">
        <h2 className="text-2xl font-bold mb-10 text-center uppercase tracking-tight">Comparativa Detallada</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-4 text-left font-bold text-slate-500">Funcionalidad</th>
              <th className="py-4 text-center font-bold">Piloto</th>
              <th className="py-4 text-center font-bold text-[#ec5b13]">Profesional</th>
              <th className="py-4 text-center font-bold">Enterprise</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <TableRow label="Límite de Vuelos" v1="5 / mes" v2="Ilimitado" v3="Ilimitado" bold />
            <TableRow label="Gestión de Baterías" v1={false} v2={true} v3={true} />
            <TableRow label="Análisis Meteorológico" v1={true} v2={true} v3={true} />
            <TableRow label="Exportación API" v1={false} v2={false} v3={true} />
          </tbody>
        </table>
      </section>

      {/* --- FAQ SECTION --- */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold mb-8 text-center">Preguntas Frecuentes</h2>
        <div className="space-y-4">
          <FAQItem 
            q="¿Puedo exportar mis datos?" 
            a="Sí, puedes exportar todos tus registros de vuelo en formatos PDF y CSV compatibles con las exigencias de la Aerocivil y otras autoridades regionales." 
          />
          <FAQItem 
            q="¿Cumple con la normativa de mi país?" 
            a="SkyLog Manager está diseñado específicamente bajo los estándares de la RAC 100 de Colombia, pero es adaptable a las normativas EASA y FAA." 
          />
          <FAQItem 
            q="¿Ofrecen soporte personalizado?" 
            a="El Plan Enterprise incluye un gestor de cuenta dedicado y soporte 24/7. Para los planes Pro, ofrecemos soporte prioritario por correo electrónico." 
          />
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#1A202C] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-[#ec5b13] text-3xl">flight_takeoff</span>
              <span className="text-xl font-bold tracking-tight uppercase">SkyLog Manager</span>
            </div>
            <p className="text-slate-400 max-w-sm mb-8">
              La plataforma líder en gestión de flotas UAS y cumplimiento normativo en Latinoamérica.
            </p>
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-slate-400 hover:text-[#ec5b13] cursor-pointer transition-colors">share</span>
              <span className="material-symbols-outlined text-slate-400 hover:text-[#ec5b13] cursor-pointer transition-colors">public</span>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-[#ec5b13] uppercase text-xs tracking-widest">Empresa</h4>
            <ul className="space-y-4 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-white">Sobre nosotros</a></li>
              <li><a href="#" className="hover:text-white">Blog</a></li>
              <li><a href="#" className="hover:text-white">Contacto</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-[#ec5b13] uppercase text-xs tracking-widest">Legal</h4>
            <ul className="space-y-4 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-white">Términos de servicio</a></li>
              <li><a href="#" className="hover:text-white">Privacidad</a></li>
              <li><a href="#" className="hover:text-white">Cumplimiento RAC</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-slate-800 text-center text-slate-500 text-xs">
          © 2024 SkyLog Manager. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function PricingCard({ title, price, desc, features, buttonText, recommended, enterprise }) {
  return (
    <div className={`bg-white rounded-2xl p-8 border flex flex-col transition-all duration-300 ${recommended ? 'border-2 border-[#ec5b13] ring-4 ring-orange-500/10 shadow-2xl relative scale-105 z-10' : 'border-slate-200 hover:shadow-xl'}`}>
      {recommended && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#ec5b13] text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
          Recomendado
        </div>
      )}
      <div className="mb-8 text-left">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-slate-500 text-sm h-10 leading-snug">{desc}</p>
        <div className="mt-6 flex items-baseline gap-1">
          <span className={`text-4xl font-black ${recommended ? 'text-[#ec5b13]' : ''}`}>
            {price !== 'Custom' ? `$${price}` : price}
          </span>
          {price !== 'Custom' && <span className="text-slate-500 text-sm">/ mes</span>}
        </div>
      </div>
      <div className="space-y-4 flex-grow mb-10">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className={`material-symbols-outlined text-lg ${recommended ? 'text-[#ec5b13]' : 'text-green-500'}`}>
              {recommended ? 'verified' : 'check_circle'}
            </span>
            <span className={recommended && i === 0 ? 'font-bold' : ''}>{f}</span>
          </div>
        ))}
      </div>
      <Link href="/register" className={`w-full py-3 px-4 rounded-xl text-center font-bold transition-all ${recommended ? 'bg-[#ec5b13] text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30' : 'border-2 border-slate-200 hover:bg-slate-50'}`}>
        {buttonText}
      </Link>
    </div>
  )
}

function TrustItem({ icon, label }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="material-symbols-outlined text-3xl">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </div>
  )
}

function TableRow({ label, v1, v2, v3, bold }) {
  const check = <span className="material-symbols-outlined text-green-500">check</span>;
  const cross = <span className="material-symbols-outlined text-slate-300">close</span>;
  
  return (
    <tr>
      <td className="py-4 text-sm font-medium text-slate-700">{label}</td>
      <td className="py-4 text-center text-sm">{v1 === true ? check : v1 === false ? cross : v1}</td>
      <td className={`py-4 text-center text-sm ${bold ? 'font-bold' : ''}`}>{v2 === true ? check : v2 === false ? cross : v2}</td>
      <td className={`py-4 text-center text-sm ${bold ? 'font-bold' : ''}`}>{v3 === true ? check : v3 === false ? cross : v3}</td>
    </tr>
  )
}

function FAQItem({ q, a }) {
  return (
    <details className="group bg-white rounded-xl border border-slate-200 overflow-hidden transition-all">
      <summary className="flex justify-between items-center p-5 cursor-pointer font-bold list-none hover:bg-slate-50">
        {q}
        <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
      </summary>
      <div className="px-5 pb-5 text-slate-600 text-sm leading-relaxed border-t border-slate-50 pt-4">
        {a}
      </div>
    </details>
  )
}