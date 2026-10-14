import MantenimientoClient from './MantenimientoClient';

export const metadata = {
  title: 'Software de Mantenimiento de Drones y Baterías LiPo',
  description: 'Controla el mantenimiento de tus drones y baterías LiPo con un programa de mantenimiento por modelo de aeronave (horas, ciclos o calendario). Genera el Registro de Baterías que exige la RAC 100, con tu propio código de formato 100% personalizable. Prueba gratis.',
  keywords: ['mantenimiento drones Colombia', 'baterías LiPo drones', 'F-MNT-003', 'mantenimiento UAS AeroCivil', 'software mantenimiento aeronaves drones'],
  alternates: { canonical: '/mantenimiento-drones' },
  openGraph: {
    title: 'Software de Mantenimiento de Drones y Baterías LiPo | Bitafly',
    description: 'Programa de mantenimiento por modelo. Control de ciclos LiPo. Registro en PDF con tu propio código.',
    url: 'https://bitafly.com/mantenimiento-drones',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Cada cuánto se debe hacer mantenimiento a un dron según la RAC 100?", "acceptedAnswer": { "@type": "Answer", "text": "La RAC 100 exige documentar los trabajos de mantenimiento con su histórico y responsable. Los intervalos los define el fabricante y el programa de mantenimiento de cada operador. En Bitafly configuras ese programa por modelo de aeronave, con tareas que vencen por horas de vuelo, ciclos o días calendario, y el sistema te muestra qué está al día y qué está por vencer." } },
    { "@type": "Question", "name": "¿Qué es el Registro de Baterías y su código de formato?", "acceptedAnswer": { "@type": "Answer", "text": "Es el documento con el que se controla cada batería LiPo de la flota. Bitafly trae un código por defecto, pero es 100% personalizable — la RAC 100 exige llevar el registro, pero cada operador define su propia nomenclatura en su manual de operaciones. Documenta el número de serie de cada batería, los ciclos acumulados, el estado de cada batería y cada intervención." } },
    { "@type": "Question", "name": "¿Cuántos ciclos aguanta una batería LiPo de dron?", "acceptedAnswer": { "@type": "Answer", "text": "La mayoría de fabricantes recomienda retirar las baterías LiPo entre 150 y 300 ciclos de carga/descarga. Bitafly lleva el conteo de ciclos de cada batería para que decidas a tiempo cuándo retirarla." } },
    { "@type": "Question", "name": "¿Puedo configurar el umbral de ciclos por batería?", "acceptedAnswer": { "@type": "Answer", "text": "Los ciclos se registran por batería, y tú decides cuándo retirarla según las recomendaciones del fabricante o los criterios de seguridad de tu organización." } },
  ],
};

export default function MantenimientoDronesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <MantenimientoClient faqItems={faqSchema.mainEntity} />
    </>
  );
}
