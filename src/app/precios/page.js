import Script from 'next/script';
import PreciosClient from './PreciosClient';

export const metadata = {
  title: 'Planes y Precios para Operadores de Drones en Colombia | Bitafly',
  description: 'Bitafly desde gratis hasta Enterprise. Plan Piloto gratuito 6 meses, Escuadrilla $15/mes, Flota $39/mes. Sin contratos. Cumplimiento RAC 100 incluido. Paga con PSE o tarjeta.',
  keywords: ['precios software drones Colombia', 'plan drones RAC 100', 'software UAS precio Colombia', 'bitácora drones gratis', 'plataforma drones mensual anual'],
  alternates: { canonical: '/precios' },
  openGraph: {
    title: 'Planes y Precios para Operadores de Drones en Colombia | Bitafly',
    description: 'Desde gratis hasta Enterprise. Planes que crecen con tu flota. Sin contratos rígidos.',
    url: 'https://bitafly.com/precios',
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿El plan gratuito de Bitafly requiere tarjeta de crédito?", "acceptedAnswer": { "@type": "Answer", "text": "No. El plan Piloto es gratuito por 6 meses sin necesidad de tarjeta de crédito. Solo necesitas un correo electrónico para registrarte." } },
    { "@type": "Question", "name": "¿Hay descuento por pago anual en Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. El pago anual tiene un descuento del 20%. El plan Escuadrilla pasa de $15 USD/mes a $12 USD/mes. El plan Flota pasa de $39 USD/mes a $29 USD/mes." } },
    { "@type": "Question", "name": "¿Los pagos de Bitafly son en pesos colombianos o dólares?", "acceptedAnswer": { "@type": "Answer", "text": "Los precios están expresados en USD como referencia estable. El cobro se realiza a través de Wompi en pesos colombianos a la TRM del día. Aceptamos tarjetas Visa, Mastercard y PSE." } },
    { "@type": "Question", "name": "¿Qué pasa con mis datos si cancelo la suscripción?", "acceptedAnswer": { "@type": "Answer", "text": "Tus datos se conservan durante 90 días después de la cancelación, período durante el cual puedes exportar tus bitácoras, reportes y datos de flota en PDF o Excel." } },
  ],
};

export default function PreciosPage() {
  return (
    <>
      <Script id="faq-schema-precios" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <PreciosClient />
    </>
  );
}
