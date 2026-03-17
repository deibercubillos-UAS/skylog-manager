'use client';
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Lado Izquierdo: LOGO NUEVO Y NOMBRE BITAFLY */}
          <Link href="/" className="flex items-center gap-3 group text-left">
            <div className="h-12 w-12 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110">
              <img src="/logo.png" alt="BitaFly Logo" className="h-full w-auto object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter text-[#1A202C] dark:text-white leading-none">
                BitaFly
              </span>
              <span className="text-[#ec5b13] text-[9px] font-black uppercase tracking-[0.3em]">Aviation Log</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-10">
            <Link href="/#caracteristicas" className="text-sm font-bold text-slate-600 hover:text-[#ec5b13] transition-colors">Características</Link>
            <Link href="/#precios" className="text-sm font-bold text-slate-600 hover:text-[#ec5b13] transition-colors">Precios</Link>
            <Link href="/#contacto" className="text-sm font-bold text-slate-600 hover:text-[#ec5b13] transition-colors">Contacto</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="px-5 py-2.5 text-sm font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-xl transition-all">Ingreso</Link>
            <Link href="/registro" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5">Prueba Gratis</Link>
          </div>
        </div>
      </div>
    </header>
  );
}