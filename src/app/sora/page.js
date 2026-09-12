import RelatedReading from '@/components/seo/RelatedReading';
import PublicFooter from '@/components/bitafly/PublicFooter';
import SoraClient from './SoraClient';

export const metadata = {
  title: 'Análisis SORA para Operadores de Drones en Colombia',
  description: 'Evalúa el riesgo de tus operaciones RPAS con el método SORA (JARUS v2). Calcula GRC, ARC y SAIL automáticamente. Genera el documento para la AeroCivil en minutos.',
  keywords: ['SORA drones Colombia', 'análisis riesgo RPAS', 'JARUS SORA Colombia', 'SAIL operaciones UAS', 'autorización BVLOS Colombia'],
  alternates: { canonical: '/sora' },
  openGraph: {
    title: 'Análisis SORA para Drones en Colombia | Bitafly',
    description: 'Evaluación de riesgo SORA para operaciones RPAS. GRC, ARC y SAIL automáticos. Documento para AeroCivil en minutos.',
    url: 'https://bitafly.com/sora',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: '¿Qué es el análisis SORA para drones?', acceptedAnswer: { '@type': 'Answer', text: 'SORA (Specific Operations Risk Assessment) es la metodología estándar desarrollada por JARUS para evaluar el riesgo de operaciones RPAS. Analiza el riesgo en tierra (GRC) y el riesgo aéreo (ARC) para determinar el nivel de integridad requerido (SAIL). La AeroCivil lo solicita en autorizaciones especiales como BVLOS y vuelos sobre aglomeraciones.' } },
    { '@type': 'Question', name: '¿Cuándo exige la AeroCivil un análisis SORA?', acceptedAnswer: { '@type': 'Answer', text: 'La AeroCivil solicita evidencia de evaluación de riesgo tipo SORA para operaciones fuera de la línea de visión visual (BVLOS), vuelos en zonas controladas, sobre aglomeraciones de personas y operaciones nocturnas. Bitafly guía al operador en cada paso del análisis.' } },
    { '@type': 'Question', name: '¿Qué es el SAIL en el análisis SORA?', acceptedAnswer: { '@type': 'Answer', text: 'El SAIL (Specific Assurance and Integrity Level) es el resultado del análisis SORA. Va del 1 al 6 y determina los OSO (Operational Safety Objectives) que el operador debe cumplir para esa operación. Bitafly lo calcula automáticamente a partir del GRC y ARC mitigados.' } },
    { '@type': 'Question', name: '¿Necesito experiencia en aviación para usar el módulo SORA de Bitafly?', acceptedAnswer: { '@type': 'Answer', text: 'No. Bitafly guía el análisis con preguntas en lenguaje claro, explica cada concepto y sugiere mitigaciones comunes. El documento final se genera automáticamente listo para adjuntar a tu solicitud de autorización en la AeroCivil.' } },
  ],
};

export default function SoraPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SoraClient faqItems={faqSchema.mainEntity} />
      <RelatedReading items={[
        { href: '/blog/analisis-sora-operaciones-drones-colombia', title: 'Análisis SORA para operaciones de drones: qué es y cómo se calcula' },
        { href: '/blog/operaciones-bvlos-drones-colombia', title: 'Operaciones BVLOS con drones en Colombia: requisitos' },
      ]} />
      <PublicFooter brandDesc="Análisis de riesgo SORA para operaciones RPAS de operadores UAS en Colombia." />
    </>
  );
}
