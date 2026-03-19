import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-left duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ec5b13]/10 border border-[#ec5b13]/20 w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ec5b13] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ec5b13]"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#ec5b13]">RAC 2024 Compliance</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-[#1A202C] leading-[1.1] tracking-tight">
              La Bitácora Digital de <span className="text-[#ec5b13]">Alto Nivel.</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-xl font-medium">
              Gestión integral de flota, tripulaciones y análisis de riesgos SORA. Diseñado para operadores que no comprometen la seguridad.
            </p>
            <Link href="/registro" className="bg-[#ec5b13] text-white w-fit px-10 py-4 rounded-2xl text-lg font-black shadow-xl shadow-orange-500/30 hover:scale-105 transition-all">
              Iniciar Prueba Gratis
            </Link>
          </div>
          <div className="relative">
            <img src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800" className="rounded-[3rem] shadow-2xl border-8 border-white" alt="BitaFly" />
          </div>
        </div>
      </div>
    </section>
  );
}