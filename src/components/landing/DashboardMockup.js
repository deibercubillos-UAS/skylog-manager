import Image from 'next/image';

// Antes: recreación del dashboard dibujada a mano en HTML/CSS/SVG con datos
// inventados (pilotos ficticios, formatos inventados). Ahora es un screenshot
// real capturado contra la organización QA de prueba (ver
// docs/plan-mejora-visual-landing-bitafly.md, Fase 0) — se conserva el mismo
// "frame de navegador" (glow + barra de título) porque ese tratamiento visual
// sí funcionaba, solo cambia lo que hay dentro.
export default function DashboardMockup() {
  return (
    <div className="relative w-full max-w-[560px] mx-auto select-none" aria-hidden="true">
      {/* Glow de fondo */}
      <div className="absolute -inset-4 bg-orange-400/10 rounded-[3rem] blur-3xl" />

      {/* Frame navegador */}
      <div className="relative rounded-[1.5rem] overflow-hidden shadow-2xl border border-slate-200 bg-white">
        {/* Barra del navegador */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-b border-slate-200">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <div className="flex-1 mx-4 h-5 bg-slate-200 rounded-full flex items-center px-3">
            <span className="text-xs text-slate-400 font-mono">app.bitafly.com/dashboard</span>
          </div>
        </div>

        {/* Screenshot real del dashboard */}
        <Image
          src="/screenshots/dashboard-home.jpg"
          alt="Panel de control de Bitafly con horas de vuelo, aeronaves activas y actividad reciente"
          width={1568}
          height={718}
          priority
          className="w-full h-auto block"
        />
      </div>
    </div>
  );
}
