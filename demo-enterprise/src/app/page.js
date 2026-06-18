import Link from 'next/link';
import { DEMO } from '@/demo.config';
import DemoStatus from '@/components/DemoStatus';

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-30px)] flex flex-col items-center justify-center px-5 py-12">
      <div className="max-w-3xl w-full">

        {/* Encabezado */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--brand-accent)' }}>
              flight_takeoff
            </span>
            <span className="text-2xl font-black uppercase tracking-tighter" style={{ color: 'var(--brand-navy)' }}>
              {DEMO.poweredBy}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              Demo
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-3" style={{ color: 'var(--brand-navy)' }}>
            Plan Enterprise — Pago por Vuelo
          </h1>
          <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Demostración interactiva del modelo: la organización compra créditos prepago
            ({DEMO.pricePerFlight.toLocaleString('es-CO')} COP por vuelo) y sus pilotos
            patrocinados cargan los vuelos de las misiones asignadas.
          </p>
        </div>

        {/* Selector de vista */}
        <div className="grid md:grid-cols-2 gap-5">
          <Link
            href="/empresa"
            className="group bg-white rounded-2xl border border-slate-200 p-7 hover:border-[var(--brand-accent)] hover:shadow-lg transition-all"
          >
            <div className="size-12 rounded-xl flex items-center justify-center mb-4"
                 style={{ backgroundColor: 'color-mix(in srgb, var(--brand-accent) 12%, white)' }}>
              <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--brand-accent)' }}>
                corporate_fare
              </span>
            </div>
            <h2 className="text-lg font-black mb-1.5" style={{ color: 'var(--brand-navy)' }}>
              Vista Organización
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Dashboard con medidor de créditos, pilotos vinculados, misiones, vuelos recibidos y API.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-bold group-hover:gap-2 transition-all"
                  style={{ color: 'var(--brand-accent)' }}>
              Entrar <span className="material-symbols-outlined text-base">arrow_forward</span>
            </span>
          </Link>

          <Link
            href="/piloto"
            className="group bg-white rounded-2xl border border-slate-200 p-7 hover:border-[var(--brand-accent)] hover:shadow-lg transition-all"
          >
            <div className="size-12 rounded-xl flex items-center justify-center mb-4"
                 style={{ backgroundColor: 'color-mix(in srgb, var(--brand-accent) 12%, white)' }}>
              <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--brand-accent)' }}>
                person_pin_circle
              </span>
            </div>
            <h2 className="text-lg font-black mb-1.5" style={{ color: 'var(--brand-navy)' }}>
              Vista Piloto Patrocinado
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Recibe la invitación, acepta, ve su misión asignada y carga los vuelos.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-bold group-hover:gap-2 transition-all"
                  style={{ color: 'var(--brand-accent)' }}>
              Entrar <span className="material-symbols-outlined text-base">arrow_forward</span>
            </span>
          </Link>
        </div>

        <DemoStatus />

        <p className="text-center text-xs text-slate-400 mt-8">
          {DEMO.clientName} · Demo white-label · {DEMO.disclaimer}
        </p>
      </div>
    </main>
  );
}
