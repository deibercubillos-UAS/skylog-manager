import RelatedReading from '@/components/seo/RelatedReading';
import PublicFooter from '@/components/bitafly/PublicFooter';
import SmsClient from './SmsClient';

export const metadata = {
  title: 'Sistema de Gestión de Seguridad Operacional (SMS) para Drones',
  description: 'SMS completo para operadores de drones en Colombia: evaluación de riesgos, indicadores SPI, autoevaluación GAP, acciones correctivas, barreras de seguridad, capacitación y reportes VOR/MOR. Cumplimiento RAC 100 y auditorías AeroCivil.',
  keywords: ['sistema de gestión de seguridad operacional', 'SMS drones', 'SMS aeronáutico drones', 'sistema gestión seguridad UAS', 'incidentes drones Colombia', 'seguridad operacional UAS', 'indicadores SPI drones', 'autoevaluación GAP SMS'],
  alternates: { canonical: '/sms-aeronautico' },
  openGraph: {
    title: 'Sistema de Gestión de Seguridad Operacional (SMS) para Drones | Bitafly',
    description: 'SMS completo: evaluación de riesgos, indicadores SPI, GAP, acciones correctivas, barreras, capacitación y VOR/MOR. Cumple con la RAC 100 y las auditorías AeroCivil.',
    url: 'https://bitafly.com/sms-aeronautico',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué es el SMS aeronáutico para operadores de drones?", "acceptedAnswer": { "@type": "Answer", "text": "El SMS (Safety Management System) aeronáutico es el Sistema de Gestión de Seguridad Operacional exigido por la RAC 100 de la AeroCivil para operadores UAS en Colombia. Requiere registrar, clasificar y dar seguimiento a todos los incidentes, eventos de seguridad y accidentes que ocurran en las operaciones de drones." } },
    { "@type": "Question", "name": "¿Qué tipos de eventos clasifica el SMS de Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly clasifica los eventos de seguridad en tres categorías según la RAC 100: Incidente (evento sin daño), Incidente Grave (evento con potencial de accidente) y Accidente (evento con daño material o personal). Cada uno incluye narrativa, acciones correctivas y trazabilidad." } },
    { "@type": "Question", "name": "¿Qué operadores UAS están obligados a tener un SMS?", "acceptedAnswer": { "@type": "Answer", "text": "Según la RAC 100, todos los operadores certificados como Explotadores de Sistemas UAS (ESUAS) ante la AeroCivil están obligados a implementar un Sistema de Gestión de la Seguridad Operacional. Bitafly digitaliza y automatiza este requisito." } },
    { "@type": "Question", "name": "¿El Gerente SMS tiene acceso diferenciado en Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Bitafly tiene un rol específico de Gerente SMS con acceso completo al módulo de seguridad, incluyendo la creación, edición, cierre de eventos y generación de reportes. Los pilotos pueden reportar eventos pero no editarlos una vez enviados." } },
    { "@type": "Question", "name": "¿Qué son los Indicadores de Desempeño en Seguridad Operacional (SPI)?", "acceptedAnswer": { "@type": "Answer", "text": "Son métricas que miden el desempeño de seguridad de tu operación mes a mes (por ejemplo, activaciones de retorno a casa por batería crítica o pérdidas de enlace de control). Bitafly calcula automáticamente una línea de alerta estadística (promedio más desviación estándar del año anterior) y te avisa cuando un indicador la supera, con su propio plan de acción." } },
    { "@type": "Question", "name": "¿Qué es la autoevaluación GAP del SMS?", "acceptedAnswer": { "@type": "Answer", "text": "Es un checklist de 100 preguntas Sí/No, organizado en 4 componentes y 12 elementos según el Apéndice 1 de las circulares SMS de la AeroCivil, que mide qué tan implementado está tu sistema de seguridad. Bitafly guarda cada evaluación y compara automáticamente el avance frente a la anterior." } },
    { "@type": "Question", "name": "¿Cómo se gestionan las acciones correctivas del SMS?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly consolida en un solo tablero las acciones pendientes de 3 fuentes reales: casos SMS/VOR/MOR abiertos, planes de acción de indicadores SPI que superaron su línea de alerta, y hallazgos de la autoevaluación GAP — cada una con responsable, plazo y estado, sin que tengas que revisar 3 pantallas distintas." } },
    { "@type": "Question", "name": "¿Qué diferencia hay entre un reporte VOR y uno MOR?", "acceptedAnswer": { "@type": "Answer", "text": "VOR (Voluntary Occurrence Report) es un reporte voluntario de una condición insegura observada. MOR (Mandatory Occurrence Report) es obligatorio para eventos específicos definidos por la AeroCivil y tiene un plazo regulatorio de radicación de 5 días hábiles. Bitafly ofrece un formulario público para cada uno, con formato configurable, y hace seguimiento automático del plazo de radicación." } },
  ],
};

export default function SMSAeronauticoPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SmsClient faqItems={faqSchema.mainEntity} />
      <RelatedReading items={[
        { href: '/blog/sms-aeronautico-operadores-rpas-colombia', title: 'SMS aeronáutico para operadores RPAS en Colombia' },
        { href: '/blog/analisis-sora-operaciones-drones-colombia', title: 'Análisis SORA para operaciones de drones' },
      ]} />
      <PublicFooter brandDesc="SMS aeronáutico para operadores UAS en Colombia. Cumplimiento RAC 100 desde el primer vuelo." />
    </>
  );
}
