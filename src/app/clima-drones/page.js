import ClimaClient from './ClimaClient';

export const metadata = {
  title: 'Clima y Meteorología para Drones — Verificación Pre-Vuelo | Bitafly',
  description: 'Verifica las condiciones meteorológicas antes de cada vuelo de dron en Colombia: viento, ráfagas, visibilidad, lluvia e índice Kp para la fiabilidad del GPS. Pronóstico por hora, clima de tus zonas programadas y clima archivado junto a cada vuelo. Prueba gratis con Bitafly.',
  keywords: ['clima para drones', 'meteorología drones Colombia', 'condiciones de vuelo drones', 'viento drones', 'índice Kp GPS drones', 'pronóstico vuelo UAS', 'clima UAV', 'alternativa UAV Forecast'],
  alternates: { canonical: '/clima-drones' },
  openGraph: {
    title: 'Clima y Meteorología para Drones — Verificación Pre-Vuelo | Bitafly',
    description: 'Viento, ráfagas, visibilidad, lluvia y Kp/GPS con pronóstico por hora. Integrado en tu operación, no una app aparte.',
    url: 'https://bitafly.com/clima-drones',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué condiciones meteorológicas verifica Bitafly antes de un vuelo?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly muestra viento a 10 m, ráfagas, visibilidad y precipitación, además del índice Kp de actividad geomagnética que afecta la fiabilidad del GPS, con pronóstico por hora. Cada lectura se compara con un umbral de referencia y se marca como dentro de rango o para verificar. La decisión de volar sigue siendo del piloto." } },
    { "@type": "Question", "name": "¿Qué es el índice Kp y por qué importa para volar un dron?", "acceptedAnswer": { "@type": "Answer", "text": "El índice Kp (de la NOAA) mide la actividad geomagnética del Sol. Cuando es alto, la señal GPS se degrada y el dron puede perder precisión de posicionamiento. Bitafly muestra el Kp actual y avisa cuando hay actividad solar alta para que decidas con criterio." } },
    { "@type": "Question", "name": "¿Con qué umbrales compara Bitafly el clima?", "acceptedAnswer": { "@type": "Answer", "text": "Los umbrales de referencia son viento 25 km/h, ráfagas 35 km/h, visibilidad 5 km y precipitación 0,1 mm/h. Si una lectura los supera, Bitafly la marca para que verifiques tu entorno. La nubosidad no se usa porque la resolución del modelo la hace poco confiable para un punto específico." } },
    { "@type": "Question", "name": "¿De dónde salen los datos del clima?", "acceptedAnswer": { "@type": "Answer", "text": "Las variables meteorológicas provienen de Open-Meteo y el índice Kp de la NOAA (SWPC). Son fuentes abiertas, sin costo ni API key para el operador, actualizadas automáticamente y con zona horaria de Colombia (America/Bogotá)." } },
    { "@type": "Question", "name": "¿Dónde aparece el clima dentro de Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "En la sección de Meteorología ves las condiciones actuales, el pronóstico por hora y el clima de las zonas de operación de las misiones programadas para hoy. Al despachar una misión con zona marcada, el clima de ese punto queda archivado y se ve en la bitácora junto al vuelo. No es una app aparte: está dentro de la misma plataforma que gestiona tu bitácora y tu cumplimiento RAC 100." } },
    { "@type": "Question", "name": "¿Puedo ver el clima con el que se despachó un vuelo?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Al despachar una misión con zona marcada, Bitafly archiva la temperatura, el viento, las ráfagas y las condiciones de ese punto, y lo muestra en la bitácora junto al vuelo, útil como constancia y para revisar eventos de seguridad." } },
  ],
};

export default function ClimaDronesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <ClimaClient faqItems={faqSchema.mainEntity} />
    </>
  );
}
