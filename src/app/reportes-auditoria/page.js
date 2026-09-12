import ReportesClient from './ReportesClient';

export const metadata = {
  title: 'Reportes y Auditoría AeroCivil para Drones — Formatos PDF',
  description: 'Genera en segundos los reportes que exige la RAC 100: Maestro de Vuelo, Baterías y Bitácora de Piloto. PDF con logo corporativo y tu propio código de formato (F-OPS-002, F-MNT-003, F-HUM-005 por defecto, personalizables).',
  keywords: ['reportes auditoría AeroCivil drones', 'F-OPS-002 PDF', 'reportes RAC 100 Colombia', 'auditoría drones Colombia', 'formatos UAS UAEAC'],
  alternates: { canonical: '/reportes-auditoria' },
  openGraph: {
    title: 'Reportes AeroCivil para Drones — F-OPS-002, F-MNT-003, F-HUM-005 | Bitafly',
    description: 'Genera todos los reportes que exige la RAC 100 en PDF en menos de 5 segundos, con tu propio código de formato, logo corporativo y versión.',
    url: 'https://bitafly.com/reportes-auditoria',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué reportes genera Bitafly para la AeroCivil?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly genera 4 reportes: Maestro de Vuelo, Registro de Baterías, Bitácora de Piloto y Solicitud de Autorización de Vuelo. Todos en PDF con logo corporativo, tu código de formato (F-OPS-002, F-MNT-003, F-HUM-005, F-OPS-001 por defecto) y versión." } },
    { "@type": "Question", "name": "¿Los códigos F-OPS-002, F-MNT-003 son formatos oficiales de la AeroCivil?", "acceptedAnswer": { "@type": "Answer", "text": "No. La RAC 100 no define códigos de formato oficiales. Cada empresa crea su propia nomenclatura de control documental en su manual de operaciones. Bitafly trae estos códigos por defecto y permite personalizarlos para alinearlos con tu manual." } },
    { "@type": "Question", "name": "¿Los reportes de Bitafly son aceptados por los inspectores de la AeroCivil?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Los reportes generados por Bitafly incluyen todos los campos exigidos por la RAC 100, con tu código de formato, versión, logo corporativo y firma. Están diseñados para ser presentados directamente en inspecciones de la AeroCivil." } },
    { "@type": "Question", "name": "¿En cuánto tiempo puedo exportar los reportes?", "acceptedAnswer": { "@type": "Answer", "text": "Los reportes PDF se generan en segundos. Seleccionas el período, el tipo de reporte y el formato. No hay procesamiento manual ni espera. El archivo está listo para descargar o enviar por correo inmediatamente." } },
    { "@type": "Question", "name": "¿Los reportes incluyen el logo de mi empresa?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Todos los reportes PDF incluyen el logo de tu organización, el nombre legal de la empresa, tu código de formato y la versión del documento. Puedes subir tu logo y definir tus códigos en la configuración de la organización." } },
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
