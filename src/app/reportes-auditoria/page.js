import ReportesClient from './ReportesClient';

export const metadata = {
  title: 'Reportes y Auditoría AeroCivil para Drones — Formatos PDF',
  description: 'Genera reportes en PDF para auditorías y la RAC 100: Libro de Vuelo, Mantenimiento, Flota, Baterías, Expediente de Tripulación, Capacitación y más, con el logo, el código de formato y la versión de tu organización.',
  keywords: ['reportes auditoría AeroCivil drones', 'libro de vuelo PDF drones', 'reportes RAC 100 Colombia', 'auditoría drones Colombia', 'formatos UAS UAEAC'],
  alternates: { canonical: '/reportes-auditoria' },
  openGraph: {
    title: 'Reportes para Auditoría de Drones en Colombia | Bitafly',
    description: 'Libro de Vuelo, Mantenimiento, Baterías, Tripulación y más en PDF, con tu logo y tu propio código de formato.',
    url: 'https://bitafly.com/reportes-auditoria',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué reportes genera Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly genera reportes en PDF del Libro de Vuelo, Mantenimiento, Flota, Baterías y Componentes, Expediente de Tripulación, Capacitación, Auditoría de Proveedores, Tiempos de Servicio, Programación y Autorizaciones, y Equipo Tecnológico Asociado. Cada uno incluye el logo, el nombre, el código de formato y la versión de tu organización." } },
    { "@type": "Question", "name": "¿Los códigos de formato (F-OPS-002, F-MNT-003…) son oficiales de la AeroCivil?", "acceptedAnswer": { "@type": "Answer", "text": "No. La RAC 100 no define códigos de formato oficiales: cada empresa crea su propia nomenclatura de control documental en su manual de operaciones. Bitafly trae códigos por defecto (por ejemplo F-OPS-002 para el Libro de Vuelo) y los personalizas desde Reportes, junto con la versión del formato." } },
    { "@type": "Question", "name": "¿En cuánto tiempo puedo exportar los reportes?", "acceptedAnswer": { "@type": "Answer", "text": "Los reportes PDF se generan al momento. Eliges el reporte, el período o la aeronave cuando aplica, y lo descargas. No hay procesamiento manual ni espera." } },
    { "@type": "Question", "name": "¿Los reportes incluyen el logo de mi empresa?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Los reportes PDF incluyen el logo y el nombre de tu organización, más el código de formato y la versión que definas. Subes el logo desde la configuración de la organización y editas el código al generar cada reporte." } },
  ],
};

export default function ReportesAuditoriaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <ReportesClient faqItems={faqSchema.mainEntity} />
    </>
  );
}
