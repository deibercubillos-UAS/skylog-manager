import PreciosClient from './PreciosClient';

export const metadata = {
  title: 'Planes y Precios para Operadores de Drones en Colombia',
  description: 'Bitafly desde gratis hasta Enterprise. Plan Piloto con 1 mes gratis, Escuadrilla $59.000/mes, Flota $159.000/mes. Sin contratos. Cumplimiento RAC 100 incluido. Paga con PSE o tarjeta.',
  keywords: ['precios software drones Colombia', 'plan drones RAC 100', 'software UAS precio Colombia', 'bitácora drones gratis', 'plataforma drones mensual anual'],
  alternates: { canonical: '/precios' },
  openGraph: {
    title: 'Planes y Precios para Operadores de Drones en Colombia | Bitafly',
    description: 'Desde gratis hasta Enterprise. Planes que crecen con tu flota. Sin contratos rígidos.',
    url: 'https://bitafly.com/precios',
  },
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "¿El plan gratuito de Bitafly requiere tarjeta de crédito?", "acceptedAnswer": { "@type": "Answer", "text": "No. El plan Piloto es gratuito por 6 meses sin necesidad de tarjeta de crédito. Solo necesitas un correo electrónico para registrarte." } },
    { "@type": "Question", "name": "¿Hay descuento por pago anual en Bitafly?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. El pago anual tiene un descuento del 20%. El plan Escuadrilla pasa de $59.000/mes a $49.000/mes (equivalente). El plan Flota pasa de $159.000/mes a $132.500/mes (equivalente)." } },
    { "@type": "Question", "name": "¿Los pagos de Bitafly son en pesos colombianos o dólares?", "acceptedAnswer": { "@type": "Answer", "text": "Todos los precios son en pesos colombianos (COP). El cobro se realiza a través de ePayco. Aceptamos tarjetas Visa, Mastercard, débito y PSE." } },
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
  "description": "Plataforma SaaS para operadores UAS en Colombia. Bitácora digital RAC 100, mantenimiento, SMS aeronáutico, autorizaciones AeroCivil y reportes RAC 100 con tu propio código de formato.",
  "publisher": { "@id": `${SITE_URL}/#organization` },
  "offers": [
    {
      "@type": "Offer",
      "name": "Plan Piloto",
      "description": "Para operadores individuales. 1 aeronave, bitácora ilimitada, reportes PDF. 1 mes gratis al iniciar.",
      "price": "20000",
      "priceCurrency": "COP",
      "priceValidUntil": "2026-12-31",
      "availability": "https://schema.org/InStock",
      "eligibleRegion": { "@type": "Country", "name": "Colombia" },
      "url": `${SITE_URL}/registro`,
    },
    {
      "@type": "Offer",
      "name": "Plan Escuadrilla",
      "description": "Hasta 3 aeronaves, 4 usuarios, módulo SMS, autorizaciones AeroCivil.",
      "price": "59000",
      "priceCurrency": "COP",
      "priceValidUntil": "2026-12-31",
      "availability": "https://schema.org/InStock",
      "eligibleRegion": { "@type": "Country", "name": "Colombia" },
      "url": `${SITE_URL}/precios`,
    },
    {
      "@type": "Offer",
      "name": "Plan Flota",
      "description": "Hasta 15 aeronaves, 15 usuarios, SORA, reportes avanzados RAC 100.",
      "price": "159000",
      "priceCurrency": "COP",
      "priceValidUntil": "2026-12-31",
      "availability": "https://schema.org/InStock",
      "eligibleRegion": { "@type": "Country", "name": "Colombia" },
      "url": `${SITE_URL}/precios`,
    },
    {
      "@type": "Offer",
      "name": "Plan Enterprise",
      "description": "Flotas ilimitadas, SLA dedicado, integración AeroCivil, soporte prioritario.",
      "availability": "https://schema.org/InStock",
      "eligibleRegion": { "@type": "Country", "name": "Colombia" },
      "url": `${SITE_URL}/precios`,
      "priceSpecification": {
        "@type": "PriceSpecification",
        "priceCurrency": "COP",
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
