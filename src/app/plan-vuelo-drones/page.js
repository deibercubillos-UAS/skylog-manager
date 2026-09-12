import PlanVueloClient from './PlanVueloClient';

export const metadata = {
  title: 'Zona de Operación y KML para AeroCivil — Programación de Vuelos',
  description: 'Define el área de tu operación RPAS en un mapa interactivo al programar la misión, genera el archivo KML para la AeroCivil y adjúntalo a tu autorización de vuelo. Cumplimiento RAC 100.',
  keywords: ['KML AeroCivil drones', 'zona de operación drones Colombia', 'programación de vuelo RPAS Colombia', 'mapa operación drones', 'área operación KML'],
  alternates: { canonical: '/plan-vuelo-drones' },
  openGraph: {
    title: 'Zona de Operación y KML para AeroCivil | Bitafly Colombia',
    description: 'Dibuja el área de operación en un mapa al programar tu misión, genera el KML para la AeroCivil y adjúntalo a tu autorización.',
    url: 'https://bitafly.com/plan-vuelo-drones',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: '¿Para qué sirve el archivo KML en la AeroCivil?', acceptedAnswer: { '@type': 'Answer', text: 'El archivo KML (Keyhole Markup Language) define el área geográfica de la operación en formato estándar de Google Earth. La AeroCivil lo exige en las solicitudes de autorización de vuelo para zonas controladas, áreas restringidas y operaciones especiales. Al programar tu misión en Bitafly, dibujas el área directamente en un mapa y la exportas en un clic.' } },
    { '@type': 'Question', name: '¿Qué tipos de área puedo definir en Bitafly?', acceptedAnswer: { '@type': 'Answer', text: 'Bitafly soporta tres geometrías para el área de operación: polígono libre (para áreas irregulares), corredor lineal (para operaciones de infraestructura) y círculo con radio configurable (para operaciones puntuales). Cada tipo genera el KML correcto para la AeroCivil.' } },
    { '@type': 'Question', name: '¿Puedo definir la zona de operación desde el celular en campo?', acceptedAnswer: { '@type': 'Answer', text: 'Sí. El mapa interactivo de Bitafly funciona desde cualquier celular con navegador moderno, dentro del flujo de Programación de misiones. Puedes usar tu ubicación actual como punto de referencia para dibujar el área sobre el terreno real.' } },
    { '@type': 'Question', name: '¿El archivo KML de Bitafly es compatible con el portal de la AeroCivil?', acceptedAnswer: { '@type': 'Answer', text: 'Sí. Bitafly genera archivos KML estándar en WGS-84, compatibles con el portal de autorizaciones de la AeroCivil y con Google Earth. También puedes exportar el área como KMZ (archivo comprimido) para una presentación más limpia.' } },
  ],
};

export default function PlanVueloDronesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <PlanVueloClient faqItems={faqSchema.mainEntity} />
    </>
  );
}
