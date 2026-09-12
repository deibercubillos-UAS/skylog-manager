import RelatedReading from '@/components/seo/RelatedReading';
import PublicFooter from '@/components/bitafly/PublicFooter';
import GestionPilotosClient from './GestionPilotosClient';

export const metadata = {
  title: 'Gestión de Pilotos de Drones y Certificaciones CPR',
  description: 'Gestiona tu tripulación UAS: certificados CPR, vencimientos, historial de vuelo por piloto y asignación a misiones. Cumplimiento RAC 100 para operadores de drones en Colombia.',
  keywords: ['gestión pilotos drones Colombia', 'CPR piloto remoto', 'certificación piloto UAS', 'tripulación RPAS RAC 100', 'piloto remoto Colombia'],
  alternates: { canonical: '/gestion-pilotos' },
  openGraph: {
    title: 'Gestión de Pilotos UAS y Certificaciones CPR | Bitafly Colombia',
    description: 'Control de certificaciones CPR, horas de vuelo por piloto y asignación a misiones. Todo el cumplimiento RAC 100 para tu tripulación.',
    url: 'https://bitafly.com/gestion-pilotos',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: '¿Qué es el CPR (Certificado de Piloto Remoto)?', acceptedAnswer: { '@type': 'Answer', text: 'El CPR es el Certificado de Piloto Remoto emitido por una Organización de Entrenamiento Aprobada (OEA) en Colombia, según la RAC 100. Acredita que el piloto está capacitado para operar sistemas RPAS en la categoría correspondiente. Tiene fecha de vencimiento y debe renovarse periódicamente.' } },
    { '@type': 'Question', name: '¿Qué información de pilotos gestiona Bitafly?', acceptedAnswer: { '@type': 'Answer', text: 'Bitafly almacena por piloto: datos personales, número de CPR, fecha de emisión y vencimiento, horas de vuelo acumuladas, historial de misiones y documentos de certificación. Envía alertas automáticas antes del vencimiento del CPR.' } },
    { '@type': 'Question', name: '¿Puedo tener múltiples pilotos en una organización?', acceptedAnswer: { '@type': 'Answer', text: 'Sí. Bitafly soporta equipos multi-piloto con roles diferenciados: Jefe de Pilotos, Piloto y Observador. Cada uno tiene su perfil, historial de vuelos y documentación de certificación independiente.' } },
    { '@type': 'Question', name: '¿Cómo funciona la alerta de vencimiento de CPR?', acceptedAnswer: { '@type': 'Answer', text: 'Bitafly envía notificaciones automáticas al administrador y al piloto cuando el CPR está próximo a vencer (30 y 7 días antes). El sistema bloquea la asignación de ese piloto a nuevas misiones si su certificado está vencido.' } },
  ],
};

export default function GestionPilotosPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <GestionPilotosClient faqItems={faqSchema.mainEntity} />
      <RelatedReading items={[
        { href: '/blog/certificado-piloto-remoto-drones-colombia', title: 'Certificado de Piloto Remoto (CPR): cómo obtenerlo' },
        { href: '/blog/cdo-certificado-explotador-uas-colombia', title: 'CDO: qué es el Certificado de Explotador UAS' },
      ]} />
      <PublicFooter brandDesc="Gestión de tripulación UAS con certificaciones CPR y cumplimiento RAC 100 en Colombia." />
    </>
  );
}
