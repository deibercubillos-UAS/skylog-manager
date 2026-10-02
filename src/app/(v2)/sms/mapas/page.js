'use client';

// Skylog V2.0 — SMS-K (40-sms.md §5.9, última de las 11 sub-frentes):
// Mapas de restricción UAS. Contenido 100% estático/regulatorio, sin
// backend propio — se porta tal cual de v1
// (src/app/dashboard/safety/mapas/page.js), solo con el lenguaje visual
// de V2 (SectionHero/SectionCard en vez del marcado propio de v1).
import { useState } from 'react';
import { SectionHero, SectionCard } from '../../_components/SectionHero';

const ARCGIS_UAS_URL =
  'https://aerocivil.maps.arcgis.com/apps/instant/media/index.html?appid=b4be4d501c8d4bcabd0c35297521c16e&center=-74.1;4.5&level=6';

const RESTRICTION_TYPES = [
  {
    icon: 'block',
    color: 'bg-red-500 text-white',
    label: 'Zona Prohibida (P)',
    desc: 'Vuelo absolutamente prohibido. Ej: instalaciones presidenciales, militares estratégicas.',
  },
  {
    icon: 'warning',
    color: 'bg-orange-500 text-white',
    label: 'Zona Restringida (R)',
    desc: 'Requiere autorización previa de la autoridad competente (Aerocivil / UAEAC).',
  },
  {
    icon: 'info',
    color: 'bg-amber-500 text-white',
    label: 'Zona de Peligro (D)',
    desc: 'Actividad peligrosa en horas determinadas. Consultar NOTAM vigentes.',
  },
  {
    icon: 'flight',
    color: 'bg-sky-500 text-white',
    label: 'CTR / TMA',
    desc: 'Zona de control de aeródromo o área de control terminal. Coordinar con TWR.',
  },
  {
    icon: 'location_city',
    color: 'bg-violet-500 text-white',
    label: 'Área Poblada',
    desc: 'RAC 100 exige categoría de riesgo BVLOS y seguro vigente sobre zonas urbanas.',
  },
  {
    icon: 'forest',
    color: 'bg-emerald-500 text-white',
    label: 'Parque Nacional / PNN',
    desc: 'Requiere permiso de Parques Nacionales Naturales adicional a Aerocivil.',
  },
];

const ALTITUDE_LIMITS = [
  { cat: 'VLOS estándar', altura: '120 m AGL', cond: 'Fuera de zonas controladas' },
  { cat: 'VLOS en CTR', altura: '30 m AGL', cond: 'Con coordinación TWR' },
  { cat: 'BVLOS', altura: 'Según aprobación', cond: 'Requiere certificación especial' },
  { cat: 'Zona urbana', altura: '120 m AGL', cond: 'Seguro obligatorio vigente' },
  { cat: 'PNN / área protegida', altura: 'Según permiso', cond: 'Doble autorización' },
];

const QUICK_LINKS = [
  { label: 'Portal Aerocivil', href: 'https://www.aerocivil.gov.co', icon: 'open_in_new' },
  {
    label: 'NOTAM Colombia',
    href: 'https://www.aerocivil.gov.co/servicios-a-la-navegacion/aip-colombia/notam',
    icon: 'notifications_active',
  },
  {
    label: 'RAC 100 — Drones',
    href: 'https://www.aerocivil.gov.co/normatividad/RAC/RAC%20100%20-%20Sistemas%20de%20Aeronaves%20Pilotadas%20a%20Distancia.pdf',
    icon: 'gavel',
  },
  { label: 'Solicitar Autorización', href: 'https://tramites.aerocivil.gov.co', icon: 'assignment_turned_in' },
];

export default function SmsMapasPage() {
  const [iframeError, setIframeError] = useState(false);

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="SMS"
        title="Mapas de restricción UAS"
        description="Visor oficial Aerocivil / UAEAC (ArcGIS) + referencia rápida de zonas restringidas y límites de altura — RAC 100."
      />

      <SectionCard icon="map" tile="bg-red-500 text-white" wash="from-red-50 to-white" title="Visor" description="Fuente oficial — Aerocivil / UAEAC">
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-4">
          <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">info</span>
          <p>
            Este visor utiliza datos del sistema ArcGIS de la Unidad Administrativa Especial de Aeronáutica Civil
            (UAEAC). Siempre verifica NOTAMs vigentes antes de cada operación. La información cartográfica no
            reemplaza la coordinación directa con las autoridades.
          </p>
        </div>

        {!iframeError ? (
          <div className="relative bg-navy-50 border border-navy-100 rounded-2xl overflow-hidden" style={{ height: '560px' }}>
            <iframe
              src={ARCGIS_UAS_URL}
              title="Visor UAS Aerocivil Colombia — Restricciones espacio aéreo"
              className="w-full h-full border-0"
              onError={() => setIframeError(true)}
              allow="geolocation"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 p-10 bg-navy-50 border border-navy-100 rounded-2xl text-center">
            <span className="material-symbols-outlined text-5xl text-navy-200">map</span>
            <div>
              <p className="text-sm font-bold text-navy">Visor no disponible en este momento</p>
              <p className="text-xs text-navy-400 mt-1">
                El servidor ArcGIS de Aerocivil puede estar en mantenimiento o bloquear iframes externos.
              </p>
            </div>
            <a
              href={ARCGIS_UAS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              Abrir en Aerocivil.gov.co
            </a>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          <a
            href={ARCGIS_UAS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-navy-100 hover:border-primary-300 text-xs font-bold text-navy-500 hover:text-primary-700 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Abrir visor completo
          </a>
          <a
            href="https://www.aerocivil.gov.co"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-navy-100 hover:border-primary-300 text-xs font-bold text-navy-500 hover:text-primary-700 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">flight_takeoff</span>
            Portal Aerocivil
          </a>
        </div>
      </SectionCard>

      <SectionCard
        icon="layers"
        tile="bg-navy text-white"
        wash="from-navy-50 to-white"
        title="Tipos de restricción aérea"
        description="Referencia rápida — espacio aéreo colombiano"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RESTRICTION_TYPES.map((r) => (
            <div key={r.label} className="flex items-start gap-3 p-3.5 bg-white border border-navy-100 rounded-xl">
              <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 shadow-sm ${r.color}`}>
                <span className="material-symbols-outlined text-base">{r.icon}</span>
              </span>
              <div>
                <p className="text-xs font-bold text-navy">{r.label}</p>
                <p className="text-xs text-navy-400 mt-0.5 leading-snug">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        icon="height"
        tile="bg-sky-500 text-white"
        wash="from-sky-50 to-white"
        title="Límites de altura — RAC 100"
        description="Según categoría de operación"
      >
        <div className="overflow-x-auto border border-navy-100 rounded-xl">
          <table className="w-full text-xs min-w-[420px]">
            <thead className="bg-navy-50 border-b border-navy-100">
              <tr>
                <th className="px-4 py-2.5 text-left font-bold text-navy-400 uppercase tracking-wide">Categoría</th>
                <th className="px-4 py-2.5 text-left font-bold text-navy-400 uppercase tracking-wide">Altura máx.</th>
                <th className="px-4 py-2.5 text-left font-bold text-navy-400 uppercase tracking-wide">Condición</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {ALTITUDE_LIMITS.map((row) => (
                <tr key={row.cat} className="bg-white">
                  <td className="px-4 py-2.5 font-semibold text-navy">{row.cat}</td>
                  <td className="px-4 py-2.5 text-navy-500">{row.altura}</td>
                  <td className="px-4 py-2.5 text-navy-400">{row.cond}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        icon="link"
        tile="bg-emerald-500 text-white"
        wash="from-emerald-50 to-white"
        title="Recursos oficiales"
        description="Enlaces directos — UAEAC"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3.5 bg-white border border-navy-100 hover:border-primary-300 hover:shadow-sm rounded-xl transition-all group"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-50 border border-primary-100 shrink-0">
                <span className="material-symbols-outlined text-primary-600 text-base">{link.icon}</span>
              </span>
              <span className="text-xs font-bold text-navy group-hover:text-primary-700 transition-colors">{link.label}</span>
              <span className="material-symbols-outlined text-navy-200 group-hover:text-primary-400 text-base ml-auto shrink-0">arrow_forward</span>
            </a>
          ))}
        </div>

        <p className="text-xs text-navy-300 leading-relaxed border-t border-navy-50 pt-4 mt-4">
          ⚠️ La información de referencia aquí presentada es orientativa. BitaFly no garantiza la exactitud o
          vigencia de los datos regulatorios. Siempre consulta directamente con la Aeronáutica Civil de Colombia
          (UAEAC) antes de realizar operaciones.
        </p>
      </SectionCard>
    </div>
  );
}
