import Link from 'next/link';

// METADATA específico del landing (sobrescribe el global)
export const metadata = {
  title: 'Bitafly | Gestión Aeronáutica Profesional para Operadores UAS Colombia',
  description: 'Plataforma SaaS líder para operadores de drones en Colombia. Bitácoras digitales, mantenimiento, SMS, autorizaciones AeroCivil y cumplimiento RAC 100. Prueba gratis.',
  alternates: {
    canonical: 'https://bitafly.com',
  },
};

// STRUCTURED DATA (Schema.org) — le dice a Google qué tipo de empresa somos
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Bitafly',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'Plataforma de gestión aeronáutica para operadores UAS (drones) en Colombia. Cumplimiento RAC 100.',
  url: 'https://bitafly.com',
  offers: {
    '@type': 'Offer',
    priceCurrency: 'COP',
    price: '0',
    description: 'Plan gratuito disponible',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Bitafly Operations',
    url: 'https://bitafly.com',
  },
};

export default function LandingPage() {
  return (
    <>
      {/* JSON-LD para SEO avanzado */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-white">
        {/* NAVEGACIÓN — cambio: h1 → div para no duplicar encabezado */}
        <header className="p-6 flex justify-between items-center max-w-7xl mx-auto">
          <div className="text-2xl font-black text-navy uppercase tracking-tighter" aria-label="Logo Bitafly">
            Bitafly
          </div>
          <Link
            href="/login"
            className="bg-primary text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-orange-600 transition-all"
          >
            Ingresar
          </Link>
        </header>

        {/* HERO SECTION — el ÚNICO h1 de la página */}
        <main className="flex flex-col items-center justify-center text-center py-32 px-4">
          <section className="space-y-6 max-w-4xl">
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
                className="bg-navy text-white px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 transition-all inline-block"
              >
                Comenzar ahora
              </Link>
            </div>
          </section>
        </main>

        <footer className="absolute bottom-10 w-full text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          © {new Date().getFullYear()} Bitafly Operations. All rights reserved.
        </footer>
      </div>
    </>
  );
}