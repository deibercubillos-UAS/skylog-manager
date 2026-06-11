/**
 * Illustrations — "imágenes" vectoriales temáticas (UAS / drones / cumplimiento).
 *
 * Son ilustraciones SVG inline: leen como imágenes pero pesan ~2-4 KB de markup,
 * cero peticiones de red, nítidas en cualquier resolución y sin licencias.
 * Pensadas como VISUAL DE HERO (no decorativas) → llevan role/aria-label.
 *
 * Paleta de marca: navy #1A202C · naranja #ec5b13 · slate.
 *
 * Uso:
 *   <DroneOpsScene />        visual de operación de dron sobre zona
 *   <ComplianceScene />      reporte RAC 100 con sello + checks
 *   <FleetScene />           flota / múltiples aeronaves
 */

const ORANGE = '#ec5b13';
const NAVY = '#1A202C';

const frame = {
  width: '100%',
  height: 'auto',
  maxWidth: 520,
  display: 'block',
  margin: '0 auto',
};

/* Quadcopter visto en 3/4 sobre una zona de operación con ruta GPS */
export function DroneOpsScene({ className }) {
  return (
    <svg className={className} style={frame} viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dron operando sobre una zona de vuelo autorizada">
      <defs>
        <linearGradient id="il-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#eef2f7" />
        </linearGradient>
        <linearGradient id="il-zone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={ORANGE} stopOpacity="0.18" />
          <stop offset="1" stopColor={ORANGE} stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* lienzo */}
      <rect x="0.5" y="0.5" width="519" height="439" rx="28" fill="url(#il-sky)" stroke="#e2e8f0" />

      {/* zona de operación (polígono) sobre el "terreno" */}
      <g transform="translate(60 250)">
        <path d="M20 70 L150 30 L320 60 L380 150 L210 185 L40 150 Z" fill="url(#il-zone)" stroke={ORANGE} strokeWidth="2.5" strokeLinejoin="round" />
        {/* vértices */}
        {[[20,70],[150,30],[320,60],[380,150],[210,185],[40,150]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="4" fill="#fff" stroke={ORANGE} strokeWidth="2" />
        ))}
        {/* ruta GPS punteada dentro de la zona */}
        <path d="M70 120 C 130 60, 230 70, 250 110 S 330 120, 340 95" fill="none" stroke={NAVY} strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" opacity="0.5" />
      </g>

      {/* sombra del dron */}
      <ellipse cx="250" cy="300" rx="60" ry="12" fill={NAVY} opacity="0.08" />

      {/* dron */}
      <g transform="translate(250 150)">
        {/* brazos */}
        <g stroke={NAVY} strokeWidth="8" strokeLinecap="round">
          <line x1="0" y1="0" x2="-78" y2="-30" />
          <line x1="0" y1="0" x2="78" y2="-30" />
          <line x1="0" y1="0" x2="-78" y2="30" />
          <line x1="0" y1="0" x2="78" y2="30" />
        </g>
        {/* rotores (discos + arco de giro) */}
        {[[-78,-30],[78,-30],[-78,30],[78,30]].map(([x,y],i)=>(
          <g key={i}>
            <circle cx={x} cy={y} r="22" fill="none" stroke={ORANGE} strokeWidth="2.5" strokeDasharray="3 5" opacity="0.7" />
            <circle cx={x} cy={y} r="6" fill={NAVY} />
          </g>
        ))}
        {/* cuerpo */}
        <rect x="-30" y="-20" width="60" height="40" rx="12" fill={NAVY} />
        <rect x="-30" y="-20" width="60" height="40" rx="12" fill="#fff" opacity="0.06" />
        {/* cámara / gimbal */}
        <circle cx="0" cy="22" r="9" fill={ORANGE} />
        <circle cx="0" cy="22" r="4" fill="#fff" opacity="0.8" />
        {/* led frontal */}
        <circle cx="-18" cy="0" r="3" fill={ORANGE} />
        <circle cx="18" cy="0" r="3" fill="#22c55e" />
      </g>

      {/* badge de estado flotante */}
      <g transform="translate(330 60)">
        <rect x="0" y="0" width="150" height="46" rx="14" fill="#fff" stroke="#e2e8f0" />
        <circle cx="24" cy="23" r="7" fill="#22c55e" />
        <text x="42" y="20" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="800" fill={NAVY}>VUELO AUTORIZADO</text>
        <text x="42" y="34" fontFamily="monospace" fontSize="10" fill="#94a3b8">RAC 100 · OK</text>
      </g>
    </svg>
  );
}

/* Reporte RAC 100 con sello de cumplimiento y checks */
export function ComplianceScene({ className }) {
  return (
    <svg className={className} style={frame} viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Reporte de cumplimiento RAC 100 generado en PDF con sello y verificaciones">
      <defs>
        <linearGradient id="il-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="519" height="439" rx="28" fill="#f8fafc" stroke="#e2e8f0" />

      {/* hoja trasera */}
      <g transform="translate(150 70) rotate(6)">
        <rect x="0" y="0" width="220" height="300" rx="14" fill="#fff" stroke="#e2e8f0" opacity="0.7" />
      </g>

      {/* hoja principal */}
      <g transform="translate(130 60)">
        <rect x="0" y="0" width="240" height="320" rx="16" fill="url(#il-paper)" stroke="#e2e8f0" />
        {/* cabecera */}
        <rect x="0" y="0" width="240" height="58" rx="16" fill={NAVY} />
        <rect x="0" y="42" width="240" height="16" fill={NAVY} />
        <circle cx="28" cy="29" r="12" fill={ORANGE} />
        <path d="M22 29 l4 4 l8 -9" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="48" y="26" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="800" fill="#fff">MAESTRO DE VUELO</text>
        <text x="48" y="40" fontFamily="monospace" fontSize="10" fill={ORANGE}>F-OPS-002</text>

        {/* filas de checks */}
        {[0,1,2,3,4].map((i)=>(
          <g key={i} transform={`translate(22 ${86 + i*40})`}>
            <circle cx="8" cy="8" r="9" fill="rgba(34,197,94,0.12)" stroke="#22c55e" strokeWidth="1.5" />
            <path d="M3 8 l3.5 3.5 l6 -7" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="30" y="2" width={[150,120,140,110,135][i]} height="6" rx="3" fill="#cbd5e1" />
            <rect x="30" y="12" width={[90,70,100,60,80][i]} height="6" rx="3" fill="#e2e8f0" />
          </g>
        ))}
      </g>

      {/* sello de cumplimiento */}
      <g transform="translate(300 300)">
        <circle cx="0" cy="0" r="52" fill="none" stroke={ORANGE} strokeWidth="3" opacity="0.9" />
        <circle cx="0" cy="0" r="44" fill="none" stroke={ORANGE} strokeWidth="1.5" strokeDasharray="2 4" opacity="0.7" />
        <circle cx="0" cy="0" r="34" fill={ORANGE} opacity="0.1" />
        <path d="M-14 0 l9 9 l19 -20" stroke={ORANGE} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="0" y="30" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="9" fontWeight="800" fill={ORANGE}>EN CUMPLIMIENTO</text>
      </g>
    </svg>
  );
}

/* Flota: grilla de aeronaves con métricas (mockup-ilustración) */
export function FleetScene({ className }) {
  return (
    <svg className={className} style={frame} viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Panel de gestión de flota con aeronaves y horas de vuelo">
      <rect x="0.5" y="0.5" width="519" height="439" rx="28" fill="#f8fafc" stroke="#e2e8f0" />
      {/* tarjetas de aeronave */}
      {[0,1,2,3].map((i)=>{
        const x = 40 + (i%2)*230;
        const y = 50 + Math.floor(i/2)*180;
        const active = i===0;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <rect x="0" y="0" width="210" height="160" rx="18" fill="#fff" stroke={active?ORANGE:'#e2e8f0'} strokeWidth={active?'2':'1.5'} />
            {/* mini dron */}
            <g transform="translate(34 44)" stroke={NAVY} strokeWidth="4" strokeLinecap="round">
              <line x1="0" y1="0" x2="-16" y2="-10" /><line x1="0" y1="0" x2="16" y2="-10" />
              <line x1="0" y1="0" x2="-16" y2="10" /><line x1="0" y1="0" x2="16" y2="10" />
            </g>
            {[[-16,-10],[16,-10],[-16,10],[16,10]].map(([dx,dy],k)=>(
              <circle key={k} cx={34+dx} cy={44+dy} r="6" fill="none" stroke={ORANGE} strokeWidth="2" />
            ))}
            <rect x="26" y="36" width="16" height="16" rx="4" fill={NAVY} />
            {/* texto */}
            <text x="64" y="36" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="800" fill={NAVY}>DJI M350</text>
            <text x="64" y="50" fontFamily="monospace" fontSize="9" fill="#94a3b8">MAT-CO-004{i+1}</text>
            {/* barra de horas */}
            <rect x="20" y="92" width="170" height="8" rx="4" fill="#eef2f7" />
            <rect x="20" y="92" width={[150,110,90,130][i]} height="8" rx="4" fill={ORANGE} />
            <text x="20" y="126" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="700" fill="#64748b">{[124,86,52,103][i]}.5 h totales</text>
            {active && <g transform="translate(176 18)"><circle cx="0" cy="0" r="6" fill="#22c55e" /></g>}
          </g>
        );
      })}
    </svg>
  );
}

export default { DroneOpsScene, ComplianceScene, FleetScene };
