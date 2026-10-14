import ReplayClient from './ReplayClient';

export const metadata = {
  title: 'Replay GPS de Vuelo para Drones — Reproduce tu Vuelo DJI',
  description: 'Reproduce cada vuelo de tus drones cuadro a cuadro sobre el mapa: ruta GPS, altitud, velocidad y batería. Importa el log de tu control DJI y analiza la operación. Prueba gratis.',
  keywords: ['replay GPS drones', 'reproducción de vuelo drone', 'replay vuelo DJI', 'análisis de vuelo drones Colombia', 'telemetría DJI', 'ruta GPS dron'],
  alternates: { canonical: '/replay-gps-drones' },
  openGraph: {
    title: 'Replay GPS de Vuelo para Drones | Bitafly',
    description: 'Reproduce el vuelo cuadro a cuadro: ruta GPS animada, altitud, velocidad y batería. Desde el log de tu control DJI.',
    url: 'https://bitafly.com/replay-gps-drones',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué es el replay GPS de vuelo en Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "Es la reproducción animada de un vuelo realizado, dibujada sobre el mapa a partir de la telemetría real del dron. Avanza mostrando la ruta GPS, la altitud, la velocidad, el nivel de batería y el tiempo de vuelo en cada instante." } },
    { "@type": "Question", "name": "¿Cómo se genera el replay de un vuelo?", "acceptedAnswer": { "@type": "Answer", "text": "Desde la Bitácora eliges «Importar vuelos» y subes el archivo .txt del registro de vuelo de tu control DJI. Bitafly crea el vuelo en la bitácora y reconstruye su ruta y telemetría. No necesitas digitar nada." } },
    { "@type": "Question", "name": "¿Qué datos muestra el replay?", "acceptedAnswer": { "@type": "Answer", "text": "La ruta GPS sobre el mapa con punto de despegue y posición del dron, la altitud, la velocidad, el nivel de batería y el tiempo de vuelo, con control de velocidad de reproducción. Sirve para analizar la operación, capacitar pilotos e investigar incidentes." } },
    { "@type": "Question", "name": "¿Por cuánto tiempo se guardan los replays?", "acceptedAnswer": { "@type": "Answer", "text": "El replay queda guardado junto al vuelo en la bitácora. Los registros operacionales de Bitafly se conservan según la política de retención de la plataforma, que es de cinco años." } },
  ],
};

export default function ReplayGpsDronesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <ReplayClient faqItems={faqSchema.mainEntity} />
    </>
  );
}
