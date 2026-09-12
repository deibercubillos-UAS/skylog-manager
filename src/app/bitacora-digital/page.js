import BitacoraDigitalClient from './BitacoraDigitalClient';

export const metadata = {
  title: 'Bitácora de Vuelo UAS — Bitácora Digital de Drones en Colombia',
  description: 'Registra cada vuelo de tus drones en una bitácora digital: despegue, aterrizaje, batería, condiciones y piloto, con suma automática de horas. Genera el reporte PDF en segundos (F-OPS-002 por defecto, personalizable). También cumple con la RAC 100. Prueba gratis.',
  keywords: ['bitácora de vuelo UAS', 'bitácora digital drones', 'bitácora drones Colombia', 'registro vuelos drones', 'bitácora vuelo RAC 100', 'F-OPS-002'],
  alternates: { canonical: '/bitacora-digital' },
  openGraph: {
    title: 'Bitácora de Vuelo UAS — Bitácora Digital de Drones | Bitafly',
    description: 'Registra cada vuelo de tus drones y genera el reporte PDF en segundos. Suma automática de horas. Sin Excel, sin papel.',
    url: 'https://bitafly.com/bitacora-digital',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué es la bitácora digital de vuelo para drones?", "acceptedAnswer": { "@type": "Answer", "text": "La bitácora digital de vuelo es el registro electrónico obligatorio según la RAC 100 de la AeroCivil colombiana. Documenta misión, aeronave, tripulación, batería, condiciones meteorológicas y tiempos de vuelo. Bitafly la genera en PDF con tu propio código de formato (F-OPS-002 por defecto)." } },
    { "@type": "Question", "name": "¿El código F-OPS-002 es un formato oficial de la AeroCivil?", "acceptedAnswer": { "@type": "Answer", "text": "No. La RAC 100 exige llevar la bitácora pero no impone un código de formato: cada empresa define su nomenclatura de control documental en su manual de operaciones. Bitafly trae F-OPS-002 por defecto y lo puedes personalizar para alinearlo con tu manual." } },
    { "@type": "Question", "name": "¿La bitácora de Bitafly es válida para la AeroCivil?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. La bitácora generada por Bitafly incluye todos los campos exigidos por la RAC 100: tu código de formato, versión, logo corporativo, misión, aeronave matriculada, tripulación certificada y firma del jefe de pilotos." } },
    { "@type": "Question", "name": "¿Cuántos vuelos puedo registrar en Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "La bitácora digital es ilimitada en todos los planes de Bitafly, incluyendo el plan Piloto." } },
    { "@type": "Question", "name": "¿Puedo registrar vuelos desde el celular en campo?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Bitafly es una app web responsive que funciona desde cualquier celular o tablet con conexión a internet. Tu tripulación abre el navegador, inicia sesión y registra el vuelo desde el sitio de operación sin necesidad de instalar nada." } },
  ],
};

export default function BitacoraDigitalPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BitacoraDigitalClient faqItems={faqSchema.mainEntity} />
    </>
  );
}
