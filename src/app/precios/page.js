'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function PreciosPage() {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' o 'annual'

  const prices = {
    piloto: billingCycle === 'monthly' ? '0' : '0',
    profesional: billingCycle === 'monthly' ? '24.99' : '19.99', // Ejemplo de descuento anual
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-navy-custom dark:text-slate-100 antialiased min-h-screen">
      
      {/* Navegación Superior */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl">flight_takeoff</span>
              <span className="text-xl font-bold tracking-tight">SkyLog <span className="text-primary text-sm font-medium uppercase tracking-widest">Manager</span></span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link className="text-sm font-medium hover:text-primary transition-colors" href="/precios">Planes</Link>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#">Funciones</a>
              <Link href="/login" className="bg-primary hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20">
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header Section */}
      <header className="py-16 px-4 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Lleva tu operación al siguiente nivel.</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">Elige el plan que mejor se adapte a tu flota. Cambia o cancela en cualquier momento.</p>
        
        {/* Toggle Switch */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white dark:bg-background-dark shadow-sm' : 'text-slate-500'}`}
            >
              Mensual
            </button>
            <button 
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'annual' ? 'bg-white dark:bg-background-dark shadow-sm' : 'text-slate-500'}`}
            >
              Anual
              <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">Ahorra 20%</span>
            </button>
          </div>
        </div>
      </header>

      {/* Pricing Cards Grid */}
      <main className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Plan Piloto */}
          <PricingCard 
            title="Plan Piloto"
            desc="Ideal para estudiantes o aficionados."
            price={prices.piloto}
            features={["1 Drone", "1 Piloto", "Logbook Básico", "Soporte Comunidad"]}
            buttonText="Continuar con Básico"
          />

          {/* Plan Operador Profesional (Recommended) */}
          <PricingCard 
            title="Operador Profesional"
            desc="Para pilotos con operaciones comerciales activas."
            price={prices.profesional}
            features={["Vuelos Ilimitados", "Cumplimiento RAC 100", "Análisis de Riesgo SORA", "Reportes PDF (Aerocivil)", "Alertas de Mantenimiento"]}
            recommended={true}
            buttonText="Comenzar Prueba Pro"
          />

          {/* Plan Flota Enterprise */}
          <PricingCard 
            title="Flota Enterprise"
            desc="Grandes empresas de drones y CIACs."
            price="Custom"
            features={["Pilotos y Drones Ilimitados", "Gestión de Roles", "Acceso a API", "Soporte Prioritario 24/7", "SMS Personalizado"]}
            buttonText="Contactar Ventas"
            darkBtn={true}
          />
        </div>
      </main>

      {/* Trust & Payments */}
      <section className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-10 opacity-70">
          <TrustItem icon="lock" text="SSL Secure Connection" />
          <TrustItem icon="encrypted" text="Encrypted Data" />
          <TrustItem icon="verified_user" text="Aerocivil Standards" />
        </div>
      </section>

      {/* Footer Simple */}
      <footer className="bg-navy-custom text-white py-12 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">flight_takeoff</span>
            <span className="text-xl font-bold">SkyLog Manager</span>
          </div>
          <p className="text-slate-500 text-xs">© 2024 SkyLog Manager. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

// Componentes Reutilizables
function PricingCard({ title, desc, price, features, recommended = false, buttonText, darkBtn = false }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl p-8 border flex flex-col transition-all text-left ${recommended ? 'border-2 border-primary ring-4 ring-primary/10 shadow-2xl scale-105 z-10' : 'border-slate-200 dark:border-slate-800 hover:shadow-xl'}`}>
      {recommended && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
          Recomendado
        </div>
      )}
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm h-10">{desc}</p>
        <div className={`mt-6 flex items-baseline gap-1 ${recommended ? 'text-primary' : ''}`}>
          <span className="text-4xl font-black">{price !== 'Custom' ? `$${price}` : price}</span>
          {price !== 'Custom' && <span className="text-slate-500">/ mes</span>}
        </div>
      </div>
      <div className="space-y-4 flex-grow mb-10">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className={`material-symbols-outlined text-lg ${recommended ? 'text-primary' : 'text-green-500'}`}>
              {recommended ? 'verified' : 'check_circle'}
            </span>
            <span>{f}</span>
          </div>
        ))}
      </div>
      <button className={`w-full py-3 px-4 rounded-xl font-bold transition-all ${
        recommended ? 'bg-primary text-white shadow-lg shadow-primary/30 hover:bg-orange-600' : 
        darkBtn ? 'bg-navy-custom text-white hover:bg-slate-800' :
        'border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}>
        {buttonText}
      </button>
    </div>
  );
}

function TrustItem({ icon, text }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="material-symbols-outlined text-3xl">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider">{text}</span>
    </div>
  );
}