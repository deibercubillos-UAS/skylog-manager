import CapacitacionClient from './CapacitacionClient';

export const metadata = {
  title: 'Capacitación y Evaluaciones para Pilotos de Drones | Bitafly',
  description: 'Programa de capacitación con evaluaciones calificadas para tu tripulación UAS: banco de preguntas, nota mínima, intentos, fecha límite, recordatorios y seguimiento de cumplimiento. Cumplimiento RAC 100.',
  keywords: ['capacitación pilotos drones', 'examen piloto remoto Colombia', 'capacitación UAS RAC 100', 'evaluación piloto drones', 'certificación interna drones'],
  alternates: { canonical: '/capacitacion-drones' },
  openGraph: {
    title: 'Capacitación y Evaluaciones para Pilotos de Drones | Bitafly',
    description: 'Banco de preguntas, nota mínima, intentos, fecha límite y recordatorios automáticos para la capacitación de tu tripulación.',
    url: 'https://bitafly.com/capacitacion-drones',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué diferencia hay entre Capacitación y un simple registro de asistencia?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly no solo registra que un piloto asistió a una capacitación: incluye evaluaciones calificadas, con banco de preguntas de opción múltiple, nota mínima, intentos y fecha límite. Los gestores ven quién está al día, quién está pendiente y quién venció." } },
    { "@type": "Question", "name": "¿Qué pasa si un piloto agota sus intentos sin aprobar?", "acceptedAnswer": { "@type": "Answer", "text": "Queda registrado como incumplimiento en el seguimiento de la evaluación y se avisa a los gestores, para que decidan cómo dejarlo al día." } },
    { "@type": "Question", "name": "¿Puedo tener varias evaluaciones y programas distintos?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Bitafly maneja tres pistas — Operacional, Mantenimiento y Seguridad Operacional — y en cada una puedes crear varias evaluaciones a lo largo del tiempo, cada una con su fecha límite, su material de apoyo y su banco de preguntas." } },
    { "@type": "Question", "name": "¿Cuándo avisa Bitafly que una evaluación va a vencer?", "acceptedAnswer": { "@type": "Answer", "text": "A los 7, 3 y 1 días antes del vencimiento, el día del vencimiento y cuando vence. El aviso llega por notificación y por correo, y los gestores reciben aviso si queda alguien pendiente." } },
    { "@type": "Question", "name": "¿La capacitación de seguridad operacional (SMS) es lo mismo que estas evaluaciones?", "acceptedAnswer": { "@type": "Answer", "text": "Son complementarias. Las evaluaciones son calificadas, por pista. La Capacitación SMS es un cronograma recurrente con registro de asistencia de todo el personal (no solo pilotos), pensado para sesiones de seguridad operacional periódicas." } },
  ],
};

export default function CapacitacionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <CapacitacionClient faqItems={faqSchema.mainEntity} />
    </>
  );
}
