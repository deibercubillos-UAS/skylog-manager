'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="bg-[#f8f6f6] text-[#1A202C] antialiased font-display min-h-screen">
      
      {/* Mantenemos el Header global */}
      <Navbar />

      {/* --- HEADER SECTION --- */}
      <header className="py-16 px-4 text-center max-w-4xl mx-auto">
        <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary/10 border border-primary/20">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Planes de Suscripción</span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 tracking-tight leading-tight">
          Lleva tu operación al <span className="text-primary">siguiente nivel.</span>
        </h1>
        <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
          Elige el plan que mejor se adapte a tu flota. Gestión profesional bajo normativa RAC 100.
        </p>

        {/* Toggle Switch - Estilizado exactamente como pediste */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <div className="flex items-center bg-slate-200 p-1.5 rounded-2xl w-fit border border-slate-300">
            <button 
              onClick={() => setIsAnnual(false)}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${!isAnnual ? 'bg-white shadow-md text-[#1A202C]' : 'text-slate-500 hover:text-[#1A202C]'}`}
            >
              Mensual
            </button>
            <button 
              onClick={() => setIsAnnual(true)}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? 'bg-white shadow-md text-[#1A202C]' : 'text-slate-500 hover:text-[#1A202C]'}`}
            >
              Anual
              <span className="bg-orange-100 text-[#ec5b13] text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">Ahorra 20%</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- PRICING CARDS --- */}
      <main id="planes" className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          
          <PricingCard 
            title="Plan Piloto"
            price="0"
            desc="Ideal para estudiantes o pilotos aficionados."
            features={["1 Drone registrado", "1 Piloto", "Logbook Básico (5 vuelos/mes)", "Soporte de la Comunidad"]}
            buttonText="Continuar Gratis"
          />

          <PricingCard 
            title="Operador Profesional"
            price={isAnnual ? "19.99" : "24.99"}
            desc="Para pilotos con operaciones comerciales activas."
            features={["Vuelos Ilimitados", "Cumplimiento RAC 100 / EASA", "Análisis de Riesgo SORA", "Reportes PDF (Aerocivil)", "Alertas de Mantenimiento"]}
            buttonText="Comenzar Prueba Pro"
            recommended={true}
          />

          <PricingCard 
            title="Flota Enterprise"
            price="Custom"
            desc="Grandes empresas de drones y CIACs."
            features={["Pilotos y Drones Ilimitados", "Gestión de Roles (PIC, Obs)", "Acceso total a API", "Soporte Prioritario 24/7", "SMS (Safety Mgmt System)"]}
            buttonText="Contactar Ventas"
          />
        </div>
      </main>

      {/* --- TRUST & PAYMENTS --- */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-10 md:gap-24 opacity-60">
            <TrustItem icon="lock" label="Conexión Segura SSL" />
            <TrustItem icon="encrypted" label="Datos Encriptados" />
            <TrustItem icon="verified_user" label="Estándares Aerocivil" />
          </div>
          <div className="flex justify-center gap-8 mt-12 text-slate-300">
            <span className="material-symbols-outlined text-5xl">payments</span>
            <span className="material-symbols-outlined text-5xl">contactless</span>
            <span className="material-symbols-outlined text-5xl">credit_card</span>
          </div>
        </div>
      </section>

      {/* --- COMPARISON TABLE --- */}
      <section id="comparativa" className="max-w-5xl mx-auto px-4 py-20 overflow-x-auto">
        <h2 className="text-3xl font-black mb-12 text-center uppercase tracking-tight">Comparativa de Funciones</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="py-6 text-left font-bold text-slate-400 uppercase text-xs tracking-widest">Funcionalidad</th>
              <th className="py-6 text-center font-bold">Piloto</th>
              <th className="py-6 text-center font-bold text-primary">Profesional</th>
              <th className="py-6 text-center font-bold">Enterprise</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <TableRow label="Límite de Vuelos" v1="5 / mes" v2="Ilimitado" v3="Ilimitado" bold />
            <TableRow label="Análisis SORA" v1={false} v2={true} v3={true} />
            <TableRow label="Reportes PDF Oficiales" v1={false} v2={true} v3={true} />
            <TableRow label="Gestión de Baterías" v1={false} v2={true} v3={true} />
            <TableRow label="Exportación API / Webhook" v1={false} v2={false} v3={true} />
          </tbody>
        </table>
      </section>

      {/* --- FAQ SECTION --- */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-24">
        <h2 className="text-4xl font-black mb-12 text-center">Preguntas Frecuentes</h2>
        <div className="space-y-4">
          <FAQItem 
            q="¿Cumple con la normativa RAC 100 de Colombia?" 
            a="Sí, SkyLog Manager ha sido diseñado específicamente bajo los estándares de la Aerocivil para la generación de bitácoras y gestión de riesgos." 
          />
          <FAQItem 
            q="¿Puedo cambiar de plan en cualquier momento?" 
            a="Por supuesto. Puedes subir o bajar de categoría de plan en cualquier momento. Si cambias a un plan inferior, el crédito restante se aplicará a tu próximo ciclo." 
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white py-16 text-center">
        <div className="max-w-7xl mx-auto px-4 border-t border-slate-800 pt-8">
          <p className="text-slate-500 text-sm">© 2024 SkyLog Manager. Plataforma certificada para gestión de cumplimiento UAS.</p>
        </div>
      </footer>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function PricingCard({ title, price, desc, features, buttonText, recommended }) {
  return (
    <div className={`bg-white rounded-3xl p-8 border flex flex-col transition-all duration-500 ${recommended ? 'border-2 border-primary ring-8 ring-primary/5 shadow-2xl relative scale-105 z-10' : 'border-slate-200 hover:shadow-xl'}`}>
      {recommended && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full">
          Más Popular
        </div>
      )}
      <div className="mb-8 text-left">
        <h3 className="text-2xl font-black mb-2">{title}</h3>
        <p className="text-slate-500 text-sm h-10 leading-snug">{desc}</p>
        <div className="mt-8 flex items-baseline gap-1">
          <span className={`text-5xl font-black ${recommended ? 'text-primary' : 'text-navy'}`}>
            {price !== 'Custom' ? `$${price}` : price}
          </span>
          {price !== 'Custom' && <span className="text-slate-400 text-sm font-bold">/ mes</span>}
        </div>
      </div>
      <div className="space-y-4 flex-grow mb-10 text-left">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className={`material-symbols-outlined text-xl ${recommended ? 'text-primary' : 'text-green-500'}`}>
              {recommended ? 'verified' : 'check_circle'}
            </span>
            <span className={recommended && i === 0 ? 'font-bold' : 'text-slate-600'}>{f}</span>
          </div>
        ))}
      </div>
      <Link href="/registro" className={`w-full py-4 px-4 rounded-2xl text-center font-black text-sm uppercase tracking-widest transition-all ${recommended ? 'bg-primary text-white hover:bg-orange-600 shadow-lg shadow-primary/30' : 'border-2 border-slate-100 hover:bg-slate-50 text-navy'}`}>
        {buttonText}
      </Link>
    </div>
  )
}

function TrustItem({ icon, label }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="material-symbols-outlined text-4xl text-slate-400">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  )
}

function TableRow({ label, v1, v2, v3, bold }) {
  const check = <span className="material-symbols-outlined text-primary font-black">check</span>;
  const cross = <span className="material-symbols-outlined text-slate-200">close</span>;
  
  return (
    <tr>
      <td className="py-5 text-sm font-bold text-slate-700">{label}</td>
      <td className="py-5 text-center text-sm">{v1 === true ? check : v1 === false ? cross : v1}</td>
      <td className={`py-5 text-center text-sm ${bold ? 'font-black text-primary' : ''}`}>{v2 === true ? check : v2 === false ? cross : v2}</td>
      <td className="py-5 text-center text-sm text-slate-400 font-medium">{v3 === true ? check : v3 === false ? cross : v3}</td>
    </tr>
  )
}

function FAQItem({ q, a }) {
  return (
    <details className="group bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300">
      <summary className="flex justify-between items-center p-6 cursor-pointer font-bold list-none hover:bg-slate-50 transition-colors">
        {q}
        <span className="material-symbols-outlined group-open:rotate-180 transition-transform text-primary font-black">expand_more</span>
      </summary>
      <div className="px-6 pb-6 text-slate-500 text-sm leading-relaxed border-t border-slate-50 pt-5">
        {a}
      </div>
    </details>
  )
}