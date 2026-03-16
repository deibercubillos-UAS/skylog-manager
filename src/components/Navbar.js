'use client';
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Lado Izquierdo: Logo y Nombre */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">precision_manufacturing</span>
            </div>
            <span className="text-xl font-bold tracking-tighter text-navy dark:text-white">
              SkyLog <span className="text-primary font-black text-2xl">Manager</span>
            </span>
          </Link>

          {/* Centro: Menú de Navegación */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#caracteristicas" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
              Características
            </Link>
            <Link href="#nosotros" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
              Nosotros
            </Link>
            <Link href="precios" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
              Precios
            </Link>
            <Link href="#contacto" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
              Contáctanos
            </Link>
        
          </nav>

          {/* Lado Derecho: Botones de Acción */}
          <div className="flex items-center gap-3">
  <Link href="/login" className="px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
    Ingreso
  </Link>
  <Link href="/registro" className="bg-primary hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5">
    Prueba Gratis
  </Link>
</div>

        </div>
      </div>
    </header>
  );
}