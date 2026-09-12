import ClimaClient from './ClimaClient';

export const metadata = {
  title: 'Clima y Meteorología para Drones — Verificación Pre-Vuelo | Bitafly',
  description: 'Verifica las condiciones meteorológicas antes de cada vuelo de dron en Colombia: viento, ráfagas, visibilidad, lluvia e índice Kp para la fiabilidad del GPS. Score de aptitud 0-100 integrado en la programación, el despacho y el replay. Gratis con Bitafly.',
  keywords: ['clima para drones', 'meteorología drones Colombia', 'condiciones de vuelo drones', 'viento drones', 'índice Kp GPS drones', 'pronóstico vuelo UAS', 'clima UAV', 'alternativa UAV Forecast'],
  alternates: { canonical: '/clima-drones' },
  openGraph: {
    title: 'Clima y Meteorología para Drones — Verificación Pre-Vuelo | Bitafly',
    description: 'Score de aptitud de vuelo 0-100 con viento, ráfagas, visibilidad, lluvia y Kp/GPS. Integrado en tu operación, no una app aparte.',
    url: 'https://bitafly.com/clima-drones',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué condiciones meteorológicas verifica Bitafly antes de un vuelo?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly evalúa viento a 10 m, ráfagas, visibilidad, precipitación y probabilidad de lluvia, además del índice Kp de actividad geomagnética que afecta la fiabilidad del GPS. Con esas variables calcula un score de aptitud de vuelo de 0 a 100 y un semáforo APTO / NO APTO." } },
    { "@type": "Question", "name": "¿Qué es el índice Kp y por qué importa para volar un dron?", "acceptedAnswer": { "@type": "Answer", "text": "El índice Kp (de la NOAA) mide la actividad geomagnética del Sol. Cuando es alto, la señal GPS se degrada y el dron puede perder precisión de posicionamiento. Bitafly muestra el Kp actual y clasifica el GPS como óptimo, degradado o no confiable para que decidas con criterio." } },
    { "@type": "Question", "name": "¿Cómo se calcula el score de aptitud de vuelo?", "acceptedAnswer": { "@type": "Answer", "text": "El score combina viento (30%), ráfagas (22%), visibilidad (22%), precipitación (16%), probabilidad de lluvia (5%) e índice Kp (5%). Los umbrales por defecto siguen criterios de operación UAS (viento 25 km/h, ráfagas 35 km/h, visibilidad 5 km). La nubosidad se excluye a propósito porque la resolución del modelo la hace poco confiable para un punto específico." } },
    { "@type": "Question", "name": "¿De dónde salen los datos del clima?", "acceptedAnswer": { "@type": "Answer", "text": "Las variables meteorológicas provienen de Open-Meteo y el índice Kp de la NOAA (SWPC). Son fuentes abiertas, sin costo ni API key para el operador, actualizadas automáticamente y con zona horaria de Colombia (America/Bogotá)." } },
    { "@type": "Question", "name": "¿Dónde aparece el clima dentro de Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "El clima está integrado en el flujo operacional: al programar la misión (al elegir el municipio se geocodifica el punto), al despachar el vuelo (badge APTO / NO APTO) y en el replay del vuelo (condiciones al momento de la operación). No es una app aparte: queda dentro de la misma plataforma que gestiona tu bitácora y tu cumplimiento RAC 100." } },
    { "@type": "Question", "name": "¿Puedo ver el clima histórico de un vuelo ya realizado?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Bitafly consulta el archivo histórico de Open-Meteo y muestra las condiciones exactas (viento, visibilidad, lluvia, Kp) al momento del vuelo en el replay, útil para análisis post-operación e investigación de eventos de seguridad." } },
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
