import Link from 'next/link';
import PublicHeader from '@/components/bitafly/PublicHeader';
import PublicFooter from '@/components/bitafly/PublicFooter';
import Decor from '@/components/landing/Decor';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

export const metadata = {
  title: 'Bitafly vs UAV Forecast: ¿cuál es mejor para volar drones en Colombia?',
  description:
    'Comparativa entre Bitafly y UAV Forecast para operadores de drones en Colombia. Bitafly integra el clima directamente en la programación, el despacho y la bitácora. UAV Forecast es solo una app de clima.',
  keywords: [
    'bitafly vs uav forecast',
    'alternativa uav forecast colombia',
    'clima drones colombia comparativa',
    'meteorología drones colombia',
    'uav forecast colombia',
    'mejor app clima drones colombia',
  ],
  alternates: { canonical: '/comparativa-bitafly-uav-forecast' },
  openGraph: {
    title: 'Bitafly vs UAV Forecast — Comparativa para Operadores UAS en Colombia',
    description:
      'UAV Forecast verifica el clima. Bitafly lo integra en tu operación RAC 100 — programación, despacho, bitácora e histórico por vuelo.',
    url: `${SITE_URL}/comparativa-bitafly-uav-forecast`,
    type: 'website',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Bitafly reemplaza a UAV Forecast para operadores en Colombia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Para operadores que deben cumplir la RAC 100, Bitafly va mucho más allá: incluye verificación meteorológica integrada en la programación de misiones y el despacho, además de bitácora digital, SMS aeronáutico, autorizaciones AeroCivil y replay GPS con clima histórico. UAV Forecast solo ofrece la verificación del clima — debes cambiar de app para todo lo demás.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Qué variables meteorológicas evalúa Bitafly para los drones?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Bitafly muestra viento, ráfagas, visibilidad y precipitación, más el índice Kp de actividad geomagnética, con pronóstico por hora. Cada lectura se compara con un umbral de referencia y se marca como dentro de rango o para verificar. Fuentes: Open-Meteo y NOAA SWPC.',
      },
    },
    {
      '@type': 'Question',
      name: '¿UAV Forecast funciona para Colombia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'UAV Forecast funciona en Colombia como verificador de clima general, pero no tiene integración con la RAC 100, no genera registros documentales del clima para auditorías, no se conecta con la programación de vuelos y está en inglés. Para cumplimiento normativo colombiano, no es suficiente usarla sola.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Qué es el índice Kp y por qué importa para volar drones?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'El índice Kp mide la actividad geomagnética global (escala 0–9). Valores de 5 o más indican tormentas que pueden degradar la señal GPS y causar derivas peligrosas en drones que dependen del posicionamiento satelital. Bitafly muestra el Kp en tiempo real de NOAA y avisa cuando hay actividad solar alta.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Bitafly guarda el clima histórico de cada vuelo?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Sí. El módulo de Replay GPS de Bitafly muestra las condiciones meteorológicas históricas (viento, ráfagas, visibilidad, lluvia e índice Kp) al momento exacto del vuelo, usando los archivos de Open-Meteo Archive. Esto es útil para análisis de incidentes, auditorías SMS y reportes de seguridad.',
      },
    },
  ],
};

const accent = '#22c55e';

const ROWS = [
  {
    feature: 'Viento, ráfagas, visibilidad y lluvia con umbrales',
    bitafly: '✅ Incluido',
    uavf: '✅ Incluido',
  },
  {
    feature: 'Índice Kp (actividad geomagnética / GPS)',
    bitafly: '✅ NOAA SWPC en tiempo real',
    uavf: '✅ Incluido',
  },
  {
    feature: 'Integración con programación de misiones',
    bitafly: '✅ Clima de las zonas programadas para hoy',
    uavf: '❌ App independiente',
  },
  {
    feature: 'Integración con despacho / bitácora',
    bitafly: '✅ Clima archivado al despachar',
    uavf: '❌ No disponible',
  },
  {
    feature: 'Clima por vuelo (auditoría)',
    bitafly: '✅ Condiciones al despachar, en la bitácora',
    uavf: '❌ No disponible',
  },
  {
    feature: 'Cumplimiento RAC 100 (bitácora, SMS, autorizaciones)',
    bitafly: '✅ Completo',
    uavf: '❌ No cubre normativa colombiana',
  },
  {
    feature: 'Bitácora digital F-OPS-002',
    bitafly: '✅ Nativo',
    uavf: '❌ No disponible',
  },
  {
    feature: 'SMS aeronáutico integrado',
    bitafly: '✅ Completo',
    uavf: '❌ No disponible',
  },
  {
    feature: 'Autorizaciones AeroCivil (F-OPS-001 + KMZ)',
    bitafly: '✅ Incluido',
    uavf: '❌ No disponible',
  },
  {
    feature: 'Análisis de riesgos',
    bitafly: '✅ Incluido',
    uavf: '❌ No disponible',
  },
  {
    feature: 'Idioma',
    bitafly: '✅ Español colombiano',
    uavf: '⚠️ Inglés principalmente',
  },
  {
    feature: 'Precios en COP',
    bitafly: '✅ Desde $20.000 COP/mes',
    uavf: '⚠️ Freemium en USD (Premium ~$20 USD/año)',
  },
];

const REASONS = [
  {
    icon: 'cloud_done',
    title: 'Clima integrado, no una app aparte',
    description:
      'En Bitafly la meteorología aparece donde la necesitas: ves el clima de las zonas de las misiones que programaste, y al despachar queda archivado junto al vuelo. Sin cambiar de app ni copiar datos manualmente.',
  },
  {
    icon: 'history',
    title: 'Clima archivado por vuelo',
    description:
      'Al despachar una misión con zona marcada, el clima de ese punto (temperatura, viento, ráfagas y condiciones) queda archivado y se ve en la bitácora junto al vuelo. Evidencia para auditorías SMS.',
  },
  {
    icon: 'gavel',
    title: 'RAC 100 desde el primer día',
    description:
      'El clima es solo uno de los módulos. Bitafly también cubre bitácora digital, SMS aeronáutico, autorizaciones AeroCivil, análisis de riesgos, gestión de pilotos y replay GPS — todo integrado, todo en español, con soporte en Colombia.',
  },
];

export default function ComparativaUavForecastPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PublicHeader />

      {/* HERO */}
      <section className="relative overflow-hidden isolate bg-navy text-white py-20 px-6">
        <Decor variant="dark" />
        <div className="max-w-4xl mx-auto text-center">
          <span
            className="inline-block text-xs font-black uppercase tracking-widest mb-4"
            style={{ color: accent }}
          >
            Comparativa · Meteorología UAV · Colombia
          </span>
          <h1 className="font-lexend text-3xl md:text-5xl font-black uppercase tracking-tighter leading-tight mb-6">
            Bitafly vs UAV Forecast:<br />
            <span style={{ color: accent }}>verificar el clima no es suficiente</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            UAV Forecast te muestra el clima para volar. Bitafly integra ese dato en
            tu <strong className="text-white">programación de misiones, el despacho y la bitácora RAC 100</strong> —
            sin cambiar de app, sin pérdida de contexto.
          </p>
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-colors shadow-xl"
            style={{ background: accent, boxShadow: '0 16px 40px rgba(34,197,94,0.25)' }}
          >
            Comenzar gratis 15 días
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* DIFERENCIA CLAVE */}
      <section className="relative overflow-hidden isolate py-20 px-6 bg-white">
        <Decor variant="light" />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p
              className="text-xs font-black uppercase tracking-widest mb-3"
              style={{ color: accent }}
            >
              La diferencia fundamental
            </p>
            <h2 className="font-lexend text-2xl md:text-4xl font-black uppercase tracking-tight text-navy">
              Una app de clima vs. una plataforma operacional
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* UAV Forecast */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
              <div className="size-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-slate-500 text-2xl">cloud</span>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">UAV Forecast</p>
              <h3 className="font-lexend text-lg font-black text-navy mb-4 uppercase tracking-tight leading-snug">
                Verificador de clima independiente
              </h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="text-green-600 font-bold flex-shrink-0">✅</span>
                  Viento, ráfagas, visibilidad y Kp
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600 font-bold flex-shrink-0">✅</span>
                  Interfaz limpia, fácil de usar
                </li>
                <li className="flex gap-2">
                  <span className="text-red-500 font-bold flex-shrink-0">❌</span>
                  Sin integración con tu bitácora o programación de vuelos
                </li>
                <li className="flex gap-2">
                  <span className="text-red-500 font-bold flex-shrink-0">❌</span>
                  Sin registro del clima por vuelo para auditorías
                </li>
                <li className="flex gap-2">
                  <span className="text-red-500 font-bold flex-shrink-0">❌</span>
                  Sin cumplimiento RAC 100 colombiana
                </li>
                <li className="flex gap-2">
                  <span className="text-red-500 font-bold flex-shrink-0">❌</span>
                  Sin bitácora, SMS, autorizaciones ni análisis de riesgos
                </li>
              </ul>
            </div>

            {/* Bitafly */}
            <div
              className="rounded-3xl p-8 border-2"
              style={{ background: '#f0fdf4', borderColor: accent }}
            >
              <div
                className="size-12 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(34,197,94,0.1)' }}
              >
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ color: accent }}
                >
                  cloud_done
                </span>
              </div>
              <p
                className="text-xs font-black uppercase tracking-widest mb-2"
                style={{ color: '#16a34a' }}
              >
                Bitafly
              </p>
              <h3 className="font-lexend text-lg font-black text-navy mb-4 uppercase tracking-tight leading-snug">
                Clima integrado en tu operación RAC 100
              </h3>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span style={{ color: accent }} className="font-bold flex-shrink-0">✅</span>
                  Viento, ráfagas, visibilidad, lluvia y Kp, con pronóstico por hora
                </li>
                <li className="flex gap-2">
                  <span style={{ color: accent }} className="font-bold flex-shrink-0">✅</span>
                  Clima de tus zonas programadas — sin cambiar de app
                </li>
                <li className="flex gap-2">
                  <span style={{ color: accent }} className="font-bold flex-shrink-0">✅</span>
                  Clima archivado al despachar cada vuelo
                </li>
                <li className="flex gap-2">
                  <span style={{ color: accent }} className="font-bold flex-shrink-0">✅</span>
                  Condiciones del despacho visibles en la bitácora
                </li>
                <li className="flex gap-2">
                  <span style={{ color: accent }} className="font-bold flex-shrink-0">✅</span>
                  Bitácora F-OPS-002, SMS, autorizaciones y análisis de riesgos incluidos
                </li>
                <li className="flex gap-2">
                  <span style={{ color: accent }} className="font-bold flex-shrink-0">✅</span>
                  En español · Precios en COP · Soporte en Colombia
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TABLA COMPARATIVA */}
      <section className="relative overflow-hidden isolate py-20 px-6 bg-[#f8f6f6]">
        <Decor variant="light" />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p
              className="text-xs font-black uppercase tracking-widest mb-3"
              style={{ color: '#16a34a' }}
            >
              Comparativa de funciones
            </p>
            <h2 className="font-lexend text-2xl md:text-4xl font-black uppercase tracking-tight text-navy">
              Función a función
            </h2>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 bg-navy text-white text-xs font-black uppercase tracking-widest">
              <div className="p-5">Característica</div>
              <div className="p-5 text-center border-l border-white/10" style={{ color: accent }}>Bitafly</div>
              <div className="p-5 text-center border-l border-white/10 text-slate-400">UAV Forecast</div>
            </div>
            {/* Rows */}
            {ROWS.map((r, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
              >
                <div className="p-4 pl-5 flex items-center text-sm font-medium text-navy">{r.feature}</div>
                <div
                  className={`p-4 flex items-center justify-center text-xs font-bold border-l border-slate-100 ${
                    r.bitafly.startsWith('✅')
                      ? 'text-green-700'
                      : r.bitafly.startsWith('❌')
                      ? 'text-red-600'
                      : 'text-slate-600'
                  }`}
                >
                  {r.bitafly}
                </div>
                <div
                  className={`p-4 flex items-center justify-center text-xs font-bold border-l border-slate-100 ${
                    r.uavf.startsWith('✅')
                      ? 'text-green-700'
                      : r.uavf.startsWith('❌')
                      ? 'text-red-600'
                      : 'text-slate-500'
                  }`}
                >
                  {r.uavf}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 text-center mt-4">
            Comparativa basada en funciones disponibles en junio de 2026.
          </p>
        </div>
      </section>

      {/* FLUJO INTEGRADO */}
      <section className="relative overflow-hidden isolate py-20 px-6 bg-white">
        <Decor variant="light" />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p
              className="text-xs font-black uppercase tracking-widest mb-3"
              style={{ color: '#16a34a' }}
            >
              Cómo funciona en Bitafly
            </p>
            <h2 className="font-lexend text-2xl md:text-4xl font-black uppercase tracking-tight text-navy">
              El clima en cada paso de tu operación
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                step: '01',
                icon: 'edit_calendar',
                title: 'Al programar la misión',
                desc: 'Marcas la zona de operación al programar la misión. Ese punto queda como referencia para ver su clima en la sección de Meteorología, junto con el de las demás misiones de hoy.',
              },
              {
                step: '02',
                icon: 'flight_takeoff',
                title: 'Al despachar el vuelo',
                desc: 'Al despachar una misión con zona marcada, Bitafly archiva el clima del punto de operación (temperatura, viento, ráfagas y condiciones) como constancia de las condiciones con las que se decidió volar.',
              },
              {
                step: '03',
                icon: 'replay',
                title: 'Al revisar la bitácora',
                desc: 'Cada vuelo muestra el clima con el que se despachó. Evidencia para auditorías SMS y análisis de incidentes.',
              },
            ].map(s => (
              <div
                key={s.step}
                className="flex gap-6 items-start bg-[#f8f6f6] rounded-2xl p-6 border border-slate-100"
              >
                <div
                  className="size-12 flex-shrink-0 rounded-xl flex items-center justify-center font-black text-sm"
                  style={{ background: 'rgba(34,197,94,0.1)', color: accent }}
                >
                  {s.step}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="material-symbols-outlined text-lg"
                      style={{ color: accent }}
                    >
                      {s.icon}
                    </span>
                    <h3 className="text-sm font-black text-navy uppercase tracking-tight">{s.title}</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POR QUÉ ELEGIR BITAFLY */}
      <section className="relative overflow-hidden isolate py-20 px-6 bg-[#f8f6f6]">
        <Decor variant="light" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p
              className="text-xs font-black uppercase tracking-widest mb-3"
              style={{ color: '#16a34a' }}
            >
              Por qué elegir Bitafly
            </p>
            <h2 className="font-lexend text-2xl md:text-4xl font-black uppercase tracking-tight text-navy">
              ¿Por qué los operadores colombianos eligen Bitafly?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {REASONS.map(reason => (
              <article
                key={reason.title}
                className="bg-white rounded-3xl p-8 border border-slate-100 hover:border-green-200 hover:shadow-md transition-all"
              >
                <div
                  className="size-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(34,197,94,0.08)' }}
                >
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{ color: accent }}
                  >
                    {reason.icon}
                  </span>
                </div>
                <h3 className="font-lexend text-base font-black uppercase tracking-tight text-navy mb-3 leading-snug">
                  {reason.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{reason.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative overflow-hidden isolate py-20 px-6 bg-white">
        <Decor variant="light" />
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p
              className="text-xs font-black uppercase tracking-widest mb-3"
              style={{ color: '#16a34a' }}
            >
              Preguntas frecuentes
            </p>
            <h2 className="font-lexend text-2xl md:text-3xl font-black uppercase tracking-tight text-navy">
              Resolvemos tus dudas
            </h2>
          </div>

          <div className="space-y-4">
            {faqSchema.mainEntity.map((q, i) => (
              <div key={i} className="bg-[#f8f6f6] rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 className="text-sm font-black text-navy mb-3 leading-snug">{q.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{q.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden isolate py-20 px-6 bg-navy text-white">
        <Decor variant="dark" />
        <div
          className="max-w-3xl mx-auto text-center"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <p
            className="text-xs font-black uppercase tracking-widest mb-4"
            style={{ color: accent }}
          >
            Pruébalo sin riesgo
          </p>
          <h2 className="font-lexend text-2xl md:text-4xl font-black uppercase tracking-tighter mb-5 leading-tight">
            Verifica el clima y vuela con cumplimiento RAC 100
          </h2>
          <p className="text-slate-300 text-base leading-relaxed mb-8 max-w-xl mx-auto">
            Sin tarjeta de crédito. Sin compromisos. Programa tu próxima misión, verifica el
            clima integrado y genera tu primera bitácora RAC 100 en minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/registro"
              className="inline-flex items-center justify-center gap-2 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-colors"
              style={{ background: accent }}
            >
              Comenzar gratis 15 días
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
            <Link
              href="/clima-drones"
              className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-white/20 transition-colors"
            >
              Ver módulo de clima
              <span className="material-symbols-outlined text-base">partly_cloudy_day</span>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </>
  );
}
