import Link from 'next/link';

export const metadata = {
  title: '404 — Fuera de zona de vuelo | Bitafly',
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-6 overflow-hidden relative">

      {/* Fondo: cuadrícula radar */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Círculos radar animados */}
      <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="absolute rounded-full border border-orange-500/20 animate-ping"
            style={{
              width:  `${n * 180}px`,
              height: `${n * 180}px`,
              animationDuration: `${n * 1.8}s`,
              animationDelay:    `${n * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* Contenido central */}
      <div className="relative z-10 text-center space-y-8 max-w-lg w-full">

        {/* Drone SVG + código 404 */}
        <div className="relative mx-auto w-48 h-48 flex items-center justify-center">
          {/* Drone icon con animación hover */}
          <span
            className="material-symbols-outlined text-primary select-none"
            style={{ fontSize: '9rem', lineHeight: 1, animation: 'drone-float 3s ease-in-out infinite' }}
          >
            flight
          </span>
          {/* Sombra */}
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 rounded-full bg-orange-500/20 blur-sm"
            style={{ animation: 'drone-shadow 3s ease-in-out infinite' }}
          />
        </div>

        <style>{`
          @keyframes drone-float {
            0%, 100% { transform: translateY(0px) rotate(-5deg); }
            50%       { transform: translateY(-18px) rotate(5deg); }
          }
          @keyframes drone-shadow {
            0%, 100% { transform: translateX(-50%) scaleX(1);   opacity: 0.4; }
            50%       { transform: translateX(-50%) scaleX(0.5); opacity: 0.15; }
          }
        `}</style>

        {/* 404 grande */}
        <div>
          <p className="text-[6rem] md:text-[8rem] font-black leading-none tracking-tighter text-white select-none"
             style={{ textShadow: '0 0 60px rgba(249,115,22,0.4)' }}>
            4<span className="text-primary">0</span>4
          </p>
        </div>

        {/* Mensajes */}
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-orange-500">
            Fuera de zona de vuelo
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">
            Esta ruta no existe
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            El dron que buscabas salió de la zona autorizada.<br />
            Vuelve al centro de operaciones para retomar el control.
          </p>
        </div>

        {/* Coordenadas decorativas */}
        <div className="flex items-center justify-center gap-4 text-xs font-mono text-slate-600 select-none">
          <span>LAT 4.7110° N</span>
          <span className="w-1 h-1 rounded-full bg-orange-500/40" />
          <span>LNG 74.0721° W</span>
          <span className="w-1 h-1 rounded-full bg-orange-500/40" />
          <span className="text-orange-500/60">NO AUTORIZADO</span>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">home</span>
            Inicio
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">speed</span>
            Panel de vuelo
          </Link>
        </div>

        {/* Footer mínimo */}
        <p className="text-xs text-slate-700 font-bold select-none">
          Bitafly · Sistema de Gestión RAC 100
        </p>

      </div>
    </main>
  );
}
