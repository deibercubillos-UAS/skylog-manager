import Link from 'next/link';

export default function EmpresaPage() {
  return (
    <main className="min-h-[calc(100vh-30px)] flex flex-col items-center justify-center px-5 text-center">
      <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">corporate_fare</span>
      <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--brand-navy)' }}>
        Vista Organización
      </h1>
      <p className="text-slate-500 text-sm max-w-md mb-6">
        El dashboard de la organización (medidor de créditos, pilotos, misiones, vuelos y API)
        se construye en la fase <strong>D3</strong>.
      </p>
      <Link href="/" className="text-sm font-bold inline-flex items-center gap-1"
            style={{ color: 'var(--brand-accent)' }}>
        <span className="material-symbols-outlined text-base">arrow_back</span> Volver
      </Link>
    </main>
  );
}
