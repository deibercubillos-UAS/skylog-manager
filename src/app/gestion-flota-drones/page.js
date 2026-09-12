import GestionFlotaClient from './GestionFlotaClient';

export const metadata = {
  title: 'Gestión de Flota de Drones para Empresas en Colombia',
  description: 'Software de gestión de flota de drones para empresas en Colombia. Registra aeronaves, controla horas de vuelo, monitorea estado y cumple la RAC 100 de la AeroCivil. Prueba gratis.',
  keywords: ['gestión flota drones Colombia', 'software flota UAS', 'control drones empresa', 'administración aeronaves Colombia', 'flota drones RAC 100'],
  alternates: { canonical: '/gestion-flota-drones' },
  openGraph: {
    title: 'Gestión de Flota de Drones para Empresas en Colombia | Bitafly',
    description: 'Registra aeronaves, controla horas, monitorea estado. Hasta 10 aeronaves en el plan Flota.',
    url: 'https://bitafly.com/gestion-flota-drones',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Cuántos drones puedo gestionar con Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly escala desde 1 aeronave en el plan Piloto (con 15 días de prueba) hasta flotas ilimitadas en el plan Enterprise. El plan Flota (el más popular) soporta hasta 10 aeronaves." } },
    { "@type": "Question", "name": "¿Qué información puedo registrar por cada aeronave?", "acceptedAnswer": { "@type": "Answer", "text": "Por cada aeronave puedes registrar: modelo, fabricante, número de serie, matrícula UAEAC, fecha de adquisición, horas totales acumuladas, estado (operativo, mantenimiento, inactivo), historial de mantenimientos e intervenciones técnicas." } },
    { "@type": "Question", "name": "¿Cómo sé en tiempo real cuántas horas tiene cada dron?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly suma automáticamente las horas de cada vuelo registrado en la bitácora al totalizador de la aeronave. El panel de flota muestra las horas totales en tiempo real y el porcentaje de aproximación al próximo mantenimiento." } },
    { "@type": "Question", "name": "¿Puedo gestionar drones de diferentes marcas en la misma plataforma?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Bitafly es agnóstico de marca. Puedes registrar DJI, Autel, Parrot, Wingtra o cualquier otro fabricante. El sistema gestiona el registro independientemente del fabricante, siempre que la aeronave tenga matrícula UAEAC." } },
  ],
};

export default function GestionFlotaDronesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <GestionFlotaClient faqItems={faqSchema.mainEntity} />
    </>
  );
}
