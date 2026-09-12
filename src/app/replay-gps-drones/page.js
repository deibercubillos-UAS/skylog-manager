import ReplayClient from './ReplayClient';

export const metadata = {
  title: 'Replay GPS de Vuelo para Drones — Reproduce tu Vuelo DJI',
  description: 'Reproduce cada vuelo de tus drones cuadro a cuadro sobre el mapa: ruta GPS, altitud, velocidad, batería y joysticks RC. Importa el log del DJI RC/RC 2 y analiza la operación. Prueba gratis.',
  keywords: ['replay GPS drones', 'reproducción de vuelo drone', 'replay vuelo DJI', 'análisis de vuelo drones Colombia', 'telemetría DJI', 'ruta GPS dron'],
  alternates: { canonical: '/replay-gps-drones' },
  openGraph: {
    title: 'Replay GPS de Vuelo para Drones | Bitafly',
    description: 'Reproduce el vuelo cuadro a cuadro: ruta GPS animada, altitud, velocidad, batería y joysticks RC. Desde el log del DJI RC/RC 2.',
    url: 'https://bitafly.com/replay-gps-drones',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué es el replay GPS de vuelo en Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "Es la reproducción animada de un vuelo realizado, dibujada sobre el mapa a partir de la telemetría real del dron. Avanza cuadro a cuadro mostrando la ruta GPS, la altitud, la velocidad, la distancia, el nivel de batería y la posición de los joysticks del control en cada instante." } },
    { "@type": "Question", "name": "¿Cómo se genera el replay de un vuelo?", "acceptedAnswer": { "@type": "Answer", "text": "Subes el archivo .txt del registro de vuelo de tu control DJI RC o RC 2. Bitafly lo procesa en el navegador (parser WASM) y reconstruye la ruta y la telemetría completa. No necesitas digitar nada: el vuelo queda vinculado a su registro en la bitácora." } },
    { "@type": "Question", "name": "¿Qué datos muestra el replay?", "acceptedAnswer": { "@type": "Answer", "text": "La ruta GPS sobre el mapa con punto de despegue y posición del dron, la altitud, la velocidad horizontal, la distancia recorrida, el tiempo de vuelo, el nivel de batería y los movimientos de los joysticks del control en tiempo real. Sirve para analizar la operación, capacitar pilotos e investigar incidentes." } },
    { "@type": "Question", "name": "¿Por cuánto tiempo se guardan los replays?", "acceptedAnswer": { "@type": "Answer", "text": "Depende del plan: Piloto guarda hasta 10 replays por 30 días, Escuadrilla 50 replays por 90 días, Flota 200 replays por 180 días y Enterprise replays ilimitados de forma permanente. Los archivos se almacenan cifrados en la nube y se sirven mediante enlaces firmados temporales." } },
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
