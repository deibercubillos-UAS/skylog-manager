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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿El plan gratuito de Bitafly requiere tarjeta de crédito?", "acceptedAnswer": { "@type": "Answer", "text": "No. El plan Piloto es gratuito por 6 meses sin necesidad de tarjeta de crédito. Solo necesitas un correo electrónico para registrarte." } },
    { "@type": "Question", "name": "¿Hay descuento por pago anual en Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. El pago anual tiene un descuento del 20%. El plan Escuadrilla pasa de $15 USD/mes a $12 USD/mes. El plan Flota pasa de $39 USD/mes a $29 USD/mes." } },
    { "@type": "Question", "name": "¿Los pagos de Bitafly son en pesos colombianos o dólares?", "acceptedAnswer": { "@type": "Answer", "text": "Los precios están expresados en USD como referencia estable. El cobro se realiza a través de Wompi en pesos colombianos a la TRM del día. Aceptamos tarjetas Visa, Mastercard y PSE." } },
    { "@type": "Question", "name": "¿Qué pasa con mis datos si cancelo la suscripción?", "acceptedAnswer": { "@type": "Answer", "text": "Tus datos se conservan durante 90 días después de la cancelación, período durante el cual puedes exportar tus bitácoras, reportes y datos de flota en PDF o Excel." } },
    { "@type": "Question", "name": "¿Puedo cambiar de plan en cualquier momento?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Puedes subir o bajar de plan en cualquier momento desde la configuración de tu cuenta. El cambio se aplica en el siguiente ciclo de facturación y la diferencia se prorratea automáticamente." } },
  ],
};

// SoftwareApplication con Offer por cada plan — Google puede mostrar precios en SERP
const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Bitafly",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "Aviation Management Software",
  "operatingSystem": "Web, iOS, Android",
  "url": SITE_URL,
  "inLanguage": "es-CO",
  "description": "Plataforma SaaS para operadores UAS en Colombia. Bitácora digital RAC 100, mantenimiento, SMS aeronáutico, autorizaciones AeroCivil y reportes oficiales.",
  "publisher": { "@id": `${SITE_URL}/#organization` },
  "offers": [
    {
      "@type": "Offer",
      "name": "Plan Piloto",
      "description": "Para operadores individuales. 1 aeronave, bitácora ilimitada, reportes PDF. Gratis por 6 meses.",
      "price": "0",
      "priceCurrency": "USD",
      "priceValidUntil": "2026-12-31",
      "availability": "https://schema.org/InStock",
      "eligibleRegion": { "@type": "Country", "name": "Colombia" },
      "url": `${SITE_URL}/registro`,
    },
    {
      "@type": "Offer",
      "name": "Plan Escuadrilla",
      "description": "Hasta 5 aeronaves, 10 pilotos, módulo SMS, autorizaciones AeroCivil.",
      "price": "15",
      "priceCurrency": "USD",
      "priceValidUntil": "2026-12-31",
      "availability": "https://schema.org/InStock",
      "eligibleRegion": { "@type": "Country", "name": "Colombia" },
      "url": `${SITE_URL}/precios`,
    },
    {
      "@type": "Offer",
      "name": "Plan Flota",
      "description": "Hasta 15 aeronaves, pilotos ilimitados, SORA, reportes avanzados.",
      "price": "39",
      "priceCurrency": "USD",
      "priceValidUntil": "2026-12-31",
      "availability": "https://schema.org/InStock",
      "eligibleRegion": { "@type": "Country", "name": "Colombia" },
      "url": `${SITE_URL}/precios`,
    },
    {
      "@type": "Offer",
      "name": "Plan Enterprise",
      "description": "Flotas ilimitadas, SLA dedicado, integración AeroCivil, soporte prioritario.",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "eligibleRegion": { "@type": "Country", "name": "Colombia" },
      "url": `${SITE_URL}/precios`,
      "priceSpecification": {
        "@type": "PriceSpecification",
        "description": "Precio personalizado según tamaño de flota"
      }
    },
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "bestRating": "5",
    "worstRating": "1",
    "ratingCount": "18",
  },
};

export default function PreciosPage() {
  return (
    <>
      {/* Inline scripts — en el HTML inicial, Googlebot los ve sin ejecutar JS */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <PreciosClient />
    </>
  );
}
