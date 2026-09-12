import CapacitacionClient from './CapacitacionClient';

export const metadata = {
  title: 'Capacitación y Examen para Pilotos de Drones — Bloqueo de Despacho',
  description: 'Programa de capacitación con examen calificado para tu tripulación UAS: banco de preguntas, nota mínima e intentos configurables, cronograma con recurrencia y bloqueo automático de despacho si el piloto no está al día. Cumplimiento RAC 100.',
  keywords: ['capacitación pilotos drones', 'examen piloto remoto Colombia', 'capacitación UAS RAC 100', 'evaluación piloto drones', 'certificación interna drones'],
  alternates: { canonical: '/capacitacion-drones' },
  openGraph: {
    title: 'Capacitación y Examen para Pilotos de Drones | Bitafly',
    description: 'Banco de preguntas, nota mínima, intentos configurables y bloqueo automático de despacho si el piloto no aprueba a tiempo.',
    url: 'https://bitafly.com/capacitacion-drones',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿Qué diferencia hay entre Capacitación y un simple registro de asistencia?", "acceptedAnswer": { "@type": "Answer", "text": "Bitafly no solo registra que un piloto asistió a una capacitación: incluye un examen calificado real, con banco de preguntas de opción múltiple, nota mínima e intentos configurables por ciclo. Si el piloto no aprueba a tiempo, el sistema bloquea automáticamente su despacho hasta que quede al día." } },
    { "@type": "Question", "name": "¿Qué pasa si un piloto agota sus intentos sin aprobar?", "acceptedAnswer": { "@type": "Answer", "text": "El piloto queda sin poder despachar vuelos hasta el siguiente ciclo de examen o hasta que un administrador ajuste su situación. El wizard de despacho se reemplaza por una pantalla de bloqueo con acceso directo a presentar el examen en cuanto esté disponible." } },
    { "@type": "Question", "name": "¿El examen aplica también al piloto independiente?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. El bloqueo de despacho por incumplimiento del examen aplica tanto al flujo con orden de vuelo (organizaciones) como al despacho simplificado del piloto independiente — es sobre el piloto específico, no sobre el tipo de flujo." } },
    { "@type": "Question", "name": "¿Puedo tener programas de capacitación distintos para Operaciones y Mantenimiento?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Bitafly maneja dos programas independientes — Operaciones y Mantenimiento — cada uno con su propio banco de preguntas, nota mínima, intentos y recurrencia. El examen de Mantenimiento no bloquea vuelos; solo lleva su propio cumplimiento informativo." } },
    { "@type": "Question", "name": "¿La capacitación de seguridad operacional (SMS) es lo mismo que este examen?", "acceptedAnswer": { "@type": "Answer", "text": "Son complementarias. El examen de Operaciones/Mantenimiento es calificado y bloquea el despacho. La Capacitación SMS es un cronograma con registro de asistencia para todo el personal (no solo pilotos), sin examen calificado — pensada para sesiones de seguridad operacional recurrentes." } },
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
