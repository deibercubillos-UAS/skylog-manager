'use client';
import { useState } from 'react';
import Link from 'next/link';

// Visor oficial ArcGIS — Aerocivil Colombia (restricciones UAS reales)
// center: -74.1;4.5 = centro geográfico de Colombia · level=6 = país completo
const ARCGIS_UAS_URL =
  'https://aerocivil.maps.arcgis.com/apps/instant/media/index.html?appid=b4be4d501c8d4bcabd0c35297521c16e&center=-74.1;4.5&level=6';

// Fallback si el iframe no carga
const FALLBACK_AEROCIVIL_URL =
  'https://aerocivil.maps.arcgis.com/apps/instant/media/index.html?appid=b4be4d501c8d4bcabd0c35297521c16e&center=-74.1;4.5&level=6';

const RESTRICTION_TYPES = [
  {
    icon: 'block',
    color: 'text-red-600 bg-red-50 border-red-200',
    label: 'Zona Prohibida (P)',
    desc: 'Vuelo absolutamente prohibido. Ej: instalaciones presidenciales, militares estratégicas.',
  },
  {
    icon: 'warning',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    label: 'Zona Restringida (R)',
    desc: 'Requiere autorización previa de la autoridad competente (Aerocivil / UAEAC).',
  },
  {
    icon: 'info',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    label: 'Zona de Peligro (D)',
    desc: 'Actividad peligrosa en horas determinadas. Consultar NOTAM vigentes.',
  },
  {
    icon: 'flight',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    label: 'CTR / TMA',
    desc: 'Zona de control de aeródromo o área de control terminal. Coordinar con TWR.',
  },
  {
    icon: 'location_city',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    label: 'Área Poblada',
    desc: 'RAC 100 exige categoría de riesgo BVLOS y seguro vigente sobre zonas urbanas.',
  },
  {
    icon: 'forest',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    label: 'Parque Nacional / PNN',
    desc: 'Requiere permiso de Parques Nacionales Naturales adicional a Aerocivil.',
  },
];

const QUICK_LINKS = [
  {
    label: 'Portal Aerocivil',
    href: 'https://www.aerocivil.gov.co',
    icon: 'open_in_new',
  },
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
  {
    label: 'Solicitar Autorización',
    href: 'https://tramites.aerocivil.gov.co',
    icon: 'assignment_turned_in',
  },
];

export default function MapasRestriccionPage() {
  const [iframeError, setIframeError] = useState(false);
  const [activeTab, setActiveTab] = useState('mapa'); // 'mapa' | 'referencia'

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 text-left pb-20">

      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/safety"
          className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-orange-500 transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Seguridad Operacional
        </Link>
      </div>

      <header className="border-b border-slate-200 pb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">
              Mapas de Restricción UAS
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
              Aerocivil · UAEAC · RAC 100 · ArcGIS Colombia
            </p>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
            {[
              { id: 'mapa', icon: 'map', label: 'Visor' },
              { id: 'referencia', icon: 'menu_book', label: 'Referencia' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── TAB: VISOR ── */}
      {activeTab === 'mapa' && (
        <div className="space-y-4">

          {/* Aviso regulatorio */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <span className="material-symbols-outlined text-amber-500 text-xl shrink-0 mt-0.5">
              info
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                Fuente oficial — Aerocivil / UAEAC
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Este visor utiliza datos del sistema ArcGIS de la Unidad Administrativa Especial de Aeronáutica Civil (UAEAC). Siempre verifica NOTAMs vigentes antes de cada operación. La información cartográfica no reemplaza la coordinación directa con las autoridades.
              </p>
            </div>
          </div>

          {/* Iframe */}
          {!iframeError ? (
            <div className="relative bg-slate-100 border border-slate-200 rounded-3xl overflow-hidden" style={{ height: '600px' }}>
              <iframe
                src={ARCGIS_UAS_URL}
                title="Visor UAS Aerocivil Colombia — Restricciones espacio aéreo"
                className="w-full h-full border-0"
                onError={() => setIframeError(true)}
                allow="geolocation"
                loading="lazy"
              />
              {/* Overlay hint */}
              <div className="absolute bottom-4 right-4 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-slate-400 text-sm">open_in_full</span>
                  <span className="text-xs text-slate-500 font-medium">Mapa interactivo</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 p-12 bg-slate-50 border border-slate-200 rounded-3xl text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300">map</span>
              <div>
                <p className="text-sm font-black text-slate-700 uppercase tracking-tight">
                  Visor no disponible en este momento
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  El servidor ArcGIS de Aerocivil puede estar en mantenimiento o bloquear iframes externos.
                </p>
              </div>
              <a
                href={FALLBACK_AEROCIVIL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wide rounded-2xl transition-colors"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                Abrir en Aerocivil.gov.co
              </a>
            </div>
          )}

          {/* Abrir en nueva pestaña */}
          <div className="flex flex-wrap gap-3">
            <a
              href={ARCGIS_UAS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-orange-300 hover:shadow-sm text-xs font-black uppercase tracking-wide text-slate-600 hover:text-orange-600 rounded-2xl transition-all"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Abrir visor completo
            </a>
            <a
              href="https://www.aerocivil.gov.co"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-orange-300 hover:shadow-sm text-xs font-black uppercase tracking-wide text-slate-600 hover:text-orange-600 rounded-2xl transition-all"
            >
              <span className="material-symbols-outlined text-sm">flight_takeoff</span>
              Portal Aerocivil
            </a>
          </div>
        </div>
      )}

      {/* ── TAB: REFERENCIA ── */}
      {activeTab === 'referencia' && (
        <div className="space-y-6">

          {/* Tipos de restricción */}
          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Tipos de restricción aérea
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RESTRICTION_TYPES.map(r => (
                <div
                  key={r.label}
                  className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-2xl"
                >
                  <div className={`size-9 rounded-xl flex items-center justify-center border shrink-0 ${r.color}`}>
                    <span className="material-symbols-outlined text-base">{r.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{r.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Alturas RAC 100 */}
          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Límites de altura — RAC 100
            </h3>
            <div className="overflow-hidden border border-slate-200 rounded-2xl">
              <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[420px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-black uppercase tracking-wide text-slate-500">Categoría</th>
                    <th className="px-4 py-3 text-left font-black uppercase tracking-wide text-slate-500">Altura máx.</th>
                    <th className="px-4 py-3 text-left font-black uppercase tracking-wide text-slate-500">Condición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { cat: 'VLOS estándar', altura: '120 m AGL', cond: 'Fuera de zonas controladas' },
                    { cat: 'VLOS en CTR', altura: '30 m AGL', cond: 'Con coordinación TWR' },
                    { cat: 'BVLOS', altura: 'Según aprobación', cond: 'Requiere certificación especial' },
                    { cat: 'Zona urbana', altura: '120 m AGL', cond: 'Seguro obligatorio vigente' },
                    { cat: 'PNN / área protegida', altura: 'Según permiso', cond: 'Doble autorización' },
                  ].map(row => (
                    <tr key={row.cat} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800">{row.cat}</td>
                      <td className="px-4 py-3 text-slate-600">{row.altura}</td>
                      <td className="px-4 py-3 text-slate-400">{row.cond}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </section>

          {/* Links rápidos */}
          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Recursos oficiales
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QUICK_LINKS.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-white border border-slate-200 hover:border-orange-300 hover:shadow-md rounded-2xl transition-all group"
                >
                  <div className="size-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-orange-500 text-base">{link.icon}</span>
                  </div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-tight group-hover:text-orange-600 transition-colors">
                    {link.label}
                  </span>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-orange-400 text-base ml-auto shrink-0">
                    arrow_forward
                  </span>
                </a>
              ))}
            </div>
          </section>

          {/* Nota legal */}
          <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-4">
            ⚠️ La información de referencia aquí presentada es orientativa. BitaFly no garantiza la exactitud o vigencia de los datos regulatorios. Siempre consulta directamente con la Aeronáutica Civil de Colombia (UAEAC) antes de realizar operaciones.
          </p>
        </div>
      )}

    </div>
  );
}
