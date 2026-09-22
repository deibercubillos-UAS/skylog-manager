import Link from 'next/link';

export default function ArdisHomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#111318',
        color: '#f5f5f5',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>ARDIS</h1>
      <p style={{ color: '#9a9a9a', marginTop: '0.5rem' }}>
        Motor de tareas y proyectos listo (Fase 2). IA y voz listas (Fase 3).
        Frontend definitivo llega en la Fase 5.
      </p>
      <Link
        href="/ardis/hablar"
        style={{
          display: 'inline-block',
          marginTop: '1.5rem',
          padding: '0.6rem 1.2rem',
          borderRadius: '0.4rem',
          background: '#ec5b13',
          color: '#fff',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Hablar con ARDIS
      </Link>
    </main>
  );
}
