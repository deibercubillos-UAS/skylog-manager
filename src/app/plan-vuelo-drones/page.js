import PlanVueloClient from './PlanVueloClient';

export const metadata = {
  title: 'Zona de Operación y KML para AeroCivil — Programación de Vuelos',
  description: 'Define el área de tu operación RPAS en un mapa interactivo al programar la misión, genera el KMZ de la misión y descarga el KMZ y el PDF de la misión. Cumplimiento RAC 100.',
  keywords: ['KML AeroCivil drones', 'zona de operación drones Colombia', 'programación de vuelo RPAS Colombia', 'mapa operación drones', 'área operación KML'],
  alternates: { canonical: '/plan-vuelo-drones' },
  openGraph: {
    title: 'Zona de Operación y KML para AeroCivil | Bitafly Colombia',
    description: 'Dibuja el área de operación en un mapa al programar tu misión, descarga el KMZ de la misión.',
    url: 'https://bitafly.com/plan-vuelo-drones',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: '¿Para qué sirve el archivo KML en la AeroCivil?', acceptedAnswer: { '@type': 'Answer', text: 'El archivo KML (Keyhole Markup Language) define el área geográfica de la operación en un formato estándar que abren Google Earth y otros visores de mapas. Al programar tu misión en Bitafly, dibujas el área directamente en un mapa, o cargas un KML/KMZ que ya tengas, y descargas el KMZ de la misión en un clic.' } },
    { '@type': 'Question', name: '¿Qué tipos de área puedo definir en Bitafly?', acceptedAnswer: { '@type': 'Answer', text: 'Bitafly soporta tres geometrías para el área de operación: polígono libre (para áreas irregulares), corredor lineal (para operaciones de infraestructura) y círculo con radio configurable (para operaciones puntuales). Cada tipo se guarda con la misión y se exporta en el KMZ.' } },
    { '@type': 'Question', name: '¿Puedo definir la zona de operación desde el celular en campo?', acceptedAnswer: { '@type': 'Answer', text: 'Sí. Programación de misiones funciona desde el navegador de un celular, y puedes tocar el mapa para marcar los puntos del área. En pantallas pequeñas puede ser más cómodo dibujar la zona desde un computador o una tableta.' } },
    { '@type': 'Question', name: '¿Qué formato tiene el archivo de la zona?', acceptedAnswer: { '@type': 'Answer', text: 'Bitafly genera un archivo KMZ estándar en WGS-84, compatible con Google Earth. También puedes cargar un KML o KMZ para definir la zona de una misión.' } },
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
