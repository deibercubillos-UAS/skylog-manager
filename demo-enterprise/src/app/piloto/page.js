import Link from 'next/link';

export default function PilotoPage() {
  return (
    <main className="min-h-[calc(100vh-30px)] flex flex-col items-center justify-center px-5 text-center">
      <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">person_pin_circle</span>
      <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--brand-navy)' }}>
        Vista Piloto Patrocinado
      </h1>
      <p className="text-slate-500 text-sm max-w-md mb-6">
        El flujo del piloto (invitación → aceptación → misión asignada → carga de vuelos)
        se construye en la fase <strong>D4</strong>.
      </p>
      <Link href="/" className="text-sm font-bold inline-flex items-center gap-1"
            style={{ color: 'var(--brand-accent)' }}>
        <span className="material-symbols-outlined text-base">arrow_back</span> Volver
      </Link>
    </main>
  );
}
