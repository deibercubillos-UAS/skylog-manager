import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* NAVEGACIÓN */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
        <h1 className="text-2xl font-black text-navy uppercase tracking-tighter">Bitafly</h1>
        <Link 
          href="/login" 
          className="bg-primary text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-orange-600 transition-all"
        >
          Ingresar
        </Link>
      </nav>

      {/* HERO SECTION */}
      <main className="flex flex-col items-center justify-center text-center py-32 px-4">
        <div className="space-y-6 max-w-4xl">
          <h1 className="text-6xl md:text-8xl font-black text-navy leading-none tracking-tighter uppercase">
            Gestión <span className="text-primary text-outline">Aeronáutica</span> Profesional
          </h1>
          <p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl mx-auto">
            La plataforma inteligente para operadores UAS y tripulaciones. 
            Bitácoras, mantenimiento y SMS en un solo lugar.
          </p>
          <div className="pt-10">
            <Link 
              href="/login" 
              className="bg-navy text-white px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 transition-all"
            >
              Comenzar ahora
            </Link>
          </div>
        </div>
      </main>

      {/* FOOTER SIMPLE */}
      <footer className="absolute bottom-10 w-full text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        © {new Date().getFullYear()} Bitafly Operations. All rights reserved.
      </footer>
    </div>
  );
}