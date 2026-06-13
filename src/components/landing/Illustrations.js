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

/* Batería LiPo con conteo de ciclos + alerta de mantenimiento */
export function BatteryMaintScene({ className }) {
  return (
    <svg className={className} style={frame} viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Control de ciclos de baterías LiPo y alertas de mantenimiento programado">
      <rect x="0.5" y="0.5" width="519" height="439" rx="28" fill="#f8fafc" stroke="#e2e8f0" />

      {/* batería */}
      <g transform="translate(70 120)">
        <rect x="0" y="0" width="200" height="110" rx="18" fill="#fff" stroke={NAVY} strokeWidth="3" />
        <rect x="200" y="38" width="16" height="34" rx="4" fill={NAVY} />
        {/* celdas de carga */}
        {[0,1,2].map((i)=>(
          <rect key={i} x={18 + i*60} y="22" width="46" height="66" rx="8" fill={i<2?ORANGE:'#e2e8f0'} opacity={i<2?0.9:1} />
        ))}
        <text x="100" y="135" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="700" fill="#64748b">LiPo · S/N B-0241</text>
      </g>

      {/* gauge de ciclos */}
      <g transform="translate(370 175)">
        <circle cx="0" cy="0" r="56" fill="#fff" stroke="#e2e8f0" strokeWidth="2" />
        <circle cx="0" cy="0" r="56" fill="none" stroke="#eef2f7" strokeWidth="10" />
        <path d="M0 -56 A 56 56 0 1 1 -38 41" fill="none" stroke={ORANGE} strokeWidth="10" strokeLinecap="round" />
        <text x="0" y="-2" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="26" fontWeight="800" fill={NAVY}>147</text>
        <text x="0" y="18" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="700" fill="#94a3b8">CICLOS / 200</text>
      </g>

      {/* tarjeta de alerta de mantenimiento */}
      <g transform="translate(70 290)">
        <rect x="0" y="0" width="380" height="92" rx="18" fill="#fff" stroke="rgba(236,91,19,0.35)" strokeWidth="1.5" />
        <rect x="0" y="0" width="6" height="92" rx="3" fill={ORANGE} />
        <circle cx="42" cy="46" r="20" fill="rgba(236,91,19,0.1)" />
        {/* llave inglesa */}
        <path d="M50 36 a8 8 0 1 0 -2 11 l-12 12 a3 3 0 0 0 4 4 l12 -12 a8 8 0 0 0 -2 -15 z" fill={ORANGE} />
        <text x="78" y="40" fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="800" fill={NAVY}>MANTENIMIENTO PROGRAMADO</text>
        <text x="78" y="60" fontFamily="system-ui, sans-serif" fontSize="12" fill="#64748b">Aeronave a 200 h o 6 meses · revisión requerida</text>
        <g transform="translate(330 34)"><rect x="0" y="0" width="34" height="24" rx="12" fill="rgba(236,91,19,0.12)" /><text x="17" y="16" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="800" fill={ORANGE}>!</text></g>
      </g>
    </svg>
  );
}

/* SMS: clasificación de seguridad operacional (incidente / grave / accidente) */
export function SmsSafetyScene({ className }) {
  return (
    <svg className={className} style={frame} viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sistema de gestión de seguridad operacional con clasificación de eventos">
      <rect x="0.5" y="0.5" width="519" height="439" rx="28" fill="#f8fafc" stroke="#e2e8f0" />

      {/* escudo */}
      <g transform="translate(120 70)">
        <path d="M70 0 L130 22 V70 C130 110 104 138 70 152 C36 138 10 110 10 70 V22 Z" fill={NAVY} />
        <path d="M70 0 L130 22 V70 C130 110 104 138 70 152 C36 138 10 110 10 70 V22 Z" fill="#fff" opacity="0.05" />
        <path d="M48 74 l16 16 l30 -38" stroke={ORANGE} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* niveles de severidad */}
      <g transform="translate(70 250)">
        {[
          { c: '#22c55e', w: 150, label: 'Incidente', n: '12' },
          { c: '#f59e0b', w: 110, label: 'Grave', n: '3' },
          { c: '#ef4444', w: 70, label: 'Accidente', n: '0' },
        ].map((r, i) => (
          <g key={i} transform={`translate(0 ${i*44})`}>
            <circle cx="9" cy="14" r="9" fill={r.c} />
            <rect x="30" y="6" width={r.w} height="18" rx="9" fill={r.c} opacity="0.18" />
            <rect x="30" y="6" width={r.w*0.62} height="18" rx="9" fill={r.c} />
            <text x="250" y="20" textAnchor="end" fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="800" fill={NAVY}>{r.label}</text>
            <text x="300" y="20" textAnchor="end" fontFamily="monospace" fontSize="13" fontWeight="700" fill={r.c}>{r.n}</text>
          </g>
        ))}
      </g>

      {/* tag F-formato */}
      <g transform="translate(330 250)">
        <rect x="0" y="0" width="120" height="120" rx="18" fill="#fff" stroke="#e2e8f0" />
        <text x="60" y="34" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="800" fill="#94a3b8">REPORTE SMS</text>
        <circle cx="60" cy="66" r="22" fill="rgba(34,197,94,0.12)" />
        <path d="M50 66 l7 7 l13 -15" stroke="#16a34a" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="60" y="104" textAnchor="middle" fontFamily="monospace" fontSize="11" fontWeight="700" fill={ORANGE}>F-SMS-004</text>
      </g>
    </svg>
  );
}

/* Autorización de vuelo: mapa con polígono de operación + coordenadas */
export function AuthMapScene({ className }) {
  return (
    <svg className={className} style={frame} viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Solicitud de autorización de vuelo con polígono de operación sobre el mapa">
      <defs>
        <linearGradient id="il-poly" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={ORANGE} stopOpacity="0.22" />
          <stop offset="1" stopColor={ORANGE} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="519" height="439" rx="28" fill="#eef2f7" stroke="#e2e8f0" />

      {/* grilla de mapa */}
      <g stroke="#dbe2ea" strokeWidth="1">
        {Array.from({ length: 9 }).map((_, i) => (<line key={'v'+i} x1={40 + i*55} y1="40" x2={40 + i*55} y2="400" />))}
        {Array.from({ length: 7 }).map((_, i) => (<line key={'h'+i} x1="40" y1={40 + i*60} x2="480" y2={40 + i*60} />))}
      </g>

      {/* "vías" */}
      <path d="M40 300 C 160 280, 240 200, 480 220" fill="none" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
      <path d="M150 40 C 170 160, 120 260, 200 400" fill="none" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />

      {/* polígono de operación */}
      <path d="M150 120 L320 100 L390 210 L300 320 L160 290 Z" fill="url(#il-poly)" stroke={ORANGE} strokeWidth="2.5" strokeLinejoin="round" />
      {[[150,120],[320,100],[390,210],[300,320],[160,290]].map(([x,y],i)=>(
        <g key={i}><circle cx={x} cy={y} r="6" fill="#fff" stroke={ORANGE} strokeWidth="2.5" /><circle cx={x} cy={y} r="2" fill={ORANGE} /></g>
      ))}

      {/* pin de despegue */}
      <g transform="translate(250 200)">
        <path d="M0 -26 C 14 -26 22 -16 22 -4 C 22 10 0 22 0 22 C 0 22 -22 10 -22 -4 C -22 -16 -14 -26 0 -26 Z" fill={NAVY} />
        <circle cx="0" cy="-6" r="8" fill="#fff" />
        <circle cx="0" cy="-6" r="4" fill={ORANGE} />
      </g>

      {/* lectura de coordenadas */}
      <g transform="translate(34 350)">
        <rect x="0" y="0" width="210" height="56" rx="14" fill="#fff" stroke="#e2e8f0" />
        <text x="14" y="22" fontFamily="system-ui, sans-serif" fontSize="9" fontWeight="800" fill="#94a3b8">ZONA DE OPERACIÓN</text>
        <text x="14" y="42" fontFamily="monospace" fontSize="12" fontWeight="700" fill={NAVY}>4.6541° N, 74.0938° W</text>
      </g>

      {/* tag autorización */}
      <g transform="translate(330 56)">
        <rect x="0" y="0" width="150" height="46" rx="14" fill={NAVY} />
        <circle cx="24" cy="23" r="7" fill="#22c55e" />
        <text x="42" y="20" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="800" fill="#fff">AUTORIZADO</text>
        <text x="42" y="34" fontFamily="monospace" fontSize="10" fill={ORANGE}>F-OPS-001</text>
      </g>
    </svg>
  );
}

/* Replay GPS: ruta de vuelo sobre mapa + panel de telemetría */
export function ReplayScene({ className }) {
  return (
    <svg className={className} style={frame} viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Replay de vuelo: ruta GPS sobre el mapa con telemetría de altitud, velocidad y batería">
      <rect x="0.5" y="0.5" width="519" height="439" rx="28" fill="#eef2f7" stroke="#e2e8f0" />

      {/* mapa */}
      <g transform="translate(40 40)">
        <rect x="0" y="0" width="440" height="240" rx="16" fill="#f8fafc" stroke="#e2e8f0" />
        <g stroke="#e2e8f0" strokeWidth="1">
          {Array.from({ length: 7 }).map((_, i) => (<line key={'v'+i} x1={i*63} y1="0" x2={i*63} y2="240" />))}
          {Array.from({ length: 4 }).map((_, i) => (<line key={'h'+i} x1="0" y1={i*60} x2="440" y2={i*60} />))}
        </g>
        {/* ruta recorrida (sólida) + restante (punteada) */}
        <path d="M40 200 C 110 90, 190 150, 250 120" fill="none" stroke={ORANGE} strokeWidth="4" strokeLinecap="round" />
        <path d="M250 120 C 320 95, 360 170, 410 60" fill="none" stroke={ORANGE} strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" opacity="0.4" />
        {/* punto de inicio */}
        <circle cx="40" cy="200" r="6" fill="#fff" stroke={NAVY} strokeWidth="2.5" />
        {/* dron en posición actual */}
        <g transform="translate(250 120)">
          <circle cx="0" cy="0" r="16" fill={ORANGE} opacity="0.15" />
          <g stroke={NAVY} strokeWidth="3" strokeLinecap="round"><line x1="0" y1="0" x2="-10" y2="-7"/><line x1="0" y1="0" x2="10" y2="-7"/><line x1="0" y1="0" x2="-10" y2="7"/><line x1="0" y1="0" x2="10" y2="7"/></g>
          {[[-10,-7],[10,-7],[-10,7],[10,7]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="4" fill="none" stroke={ORANGE} strokeWidth="1.5" />))}
          <rect x="-6" y="-5" width="12" height="10" rx="3" fill={NAVY} />
        </g>
      </g>

      {/* panel de telemetría */}
      <g transform="translate(40 296)">
        <rect x="0" y="0" width="440" height="104" rx="16" fill={NAVY} />
        {[
          { label: 'ALTITUD', val: '84 m', pct: 0.6, x: 20 },
          { label: 'VELOCIDAD', val: '12 m/s', pct: 0.45, x: 160 },
          { label: 'BATERÍA', val: '68%', pct: 0.68, x: 300 },
        ].map((m) => (
          <g key={m.label} transform={`translate(${m.x} 22)`}>
            <text x="0" y="0" fontFamily="system-ui, sans-serif" fontSize="9" fontWeight="800" letterSpacing="1" fill="#64748b">{m.label}</text>
            <text x="0" y="22" fontFamily="system-ui, sans-serif" fontSize="18" fontWeight="800" fill="#fff">{m.val}</text>
            <rect x="0" y="32" width="110" height="6" rx="3" fill="rgba(255,255,255,0.1)" />
            <rect x="0" y="32" width={110*m.pct} height="6" rx="3" fill={ORANGE} />
          </g>
        ))}
        {/* scrubber */}
        <g transform="translate(20 80)">
          <rect x="0" y="0" width="400" height="5" rx="2.5" fill="rgba(255,255,255,0.12)" />
          <rect x="0" y="0" width="230" height="5" rx="2.5" fill={ORANGE} />
          <circle cx="230" cy="2.5" r="7" fill="#fff" />
        </g>
      </g>
    </svg>
  );
}

/* Tripulación: roster de pilotos con estado de certificados */
export function CrewScene({ className }) {
  const rows = [
    { ini: 'C', name: 'C. Martínez', role: 'Jefe de Pilotos', ok: true, chip: 'Médico vigente' },
    { ini: 'A', name: 'A. García', role: 'Piloto', ok: true, chip: 'Licencia OK' },
    { ini: 'L', name: 'L. Ríos', role: 'Piloto', ok: false, chip: 'Médico 28 días' },
  ];
  return (
    <svg className={className} style={frame} viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Expediente de tripulación con estado y vencimiento de certificados de cada piloto">
      <rect x="0.5" y="0.5" width="519" height="439" rx="28" fill="#f8fafc" stroke="#e2e8f0" />
      {/* cabecera */}
      <g transform="translate(50 46)">
        <rect x="0" y="0" width="420" height="44" rx="14" fill={NAVY} />
        <text x="18" y="27" fontFamily="system-ui, sans-serif" fontSize="12" fontWeight="800" fill="#fff">TRIPULACIÓN</text>
        <text x="402" y="27" textAnchor="end" fontFamily="monospace" fontSize="10" fill={ORANGE}>F-HUM-005</text>
      </g>
      {/* filas */}
      {rows.map((r, i) => (
        <g key={i} transform={`translate(50 ${108 + i*92})`}>
          <rect x="0" y="0" width="420" height="76" rx="16" fill="#fff" stroke={r.ok ? '#e2e8f0' : 'rgba(236,91,19,0.35)'} strokeWidth="1.5" />
          <circle cx="44" cy="38" r="22" fill={ORANGE} />
          <text x="44" y="44" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="16" fontWeight="800" fill="#fff">{r.ini}</text>
          <text x="82" y="32" fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="800" fill={NAVY}>{r.name}</text>
          <text x="82" y="50" fontFamily="system-ui, sans-serif" fontSize="11" fill="#94a3b8">{r.role}</text>
          {/* chip de estado */}
          <g transform="translate(250 24)">
            <rect x="0" y="0" width="150" height="28" rx="14" fill={r.ok ? 'rgba(34,197,94,0.12)' : 'rgba(236,91,19,0.12)'} />
            <circle cx="18" cy="14" r="5" fill={r.ok ? '#22c55e' : ORANGE} />
            <text x="32" y="18" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700" fill={r.ok ? '#16a34a' : ORANGE}>{r.chip}</text>
          </g>
        </g>
      ))}
    </svg>
  );
}

/* Reportes: stack de PDFs con código de formato y descarga */
export function ReportsScene({ className }) {
  const docs = [
    { code: 'F-HUM-005', title: 'Bitácora de Piloto', x: 110, y: 56, rot: -7 },
    { code: 'F-MNT-003', title: 'Registro de Baterías', x: 150, y: 78, rot: 4 },
    { code: 'F-OPS-002', title: 'Maestro de Vuelo', x: 130, y: 110, rot: 0 },
  ];
  return (
    <svg className={className} style={frame} viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Reportes RAC 100 exportados en PDF con código de formato y descarga">
      <rect x="0.5" y="0.5" width="519" height="439" rx="28" fill="#f8fafc" stroke="#e2e8f0" />
      {docs.map((d, i) => (
        <g key={i} transform={`translate(${d.x} ${d.y}) rotate(${d.rot})`}>
          <rect x="0" y="0" width="260" height="250" rx="14" fill="#fff" stroke="#e2e8f0" strokeWidth="1.5" />
          <rect x="0" y="0" width="260" height="46" rx="14" fill={NAVY} />
          <rect x="0" y="30" width="260" height="16" fill={NAVY} />
          <circle cx="26" cy="23" r="10" fill={ORANGE} />
          <path d="M21 23 l3.5 3.5 l6.5 -7.5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x="44" y="20" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="800" fill="#fff">{d.title}</text>
          <text x="44" y="34" fontFamily="monospace" fontSize="9" fill={ORANGE}>{d.code}</text>
          {i === docs.length - 1 && (
            <>
              {[0,1,2,3].map((k)=>(<g key={k}><rect x="24" y={70 + k*22} width={[180,150,170,120][k]} height="6" rx="3" fill="#cbd5e1" /></g>))}
              {/* botón descargar PDF */}
              <g transform="translate(24 170)">
                <rect x="0" y="0" width="212" height="42" rx="12" fill="rgba(236,91,19,0.1)" stroke="rgba(236,91,19,0.3)" />
                <path d="M22 14 v12 m0 0 l-5 -5 m5 5 l5 -5" stroke={ORANGE} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <text x="44" y="26" fontFamily="system-ui, sans-serif" fontSize="12" fontWeight="800" fill={ORANGE}>DESCARGAR PDF</text>
              </g>
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

/* SORA: matriz de evaluación de riesgo con nivel SAIL */
export function SoraScene({ className }) {
  const cells = [
    ['#bbf7d0','#bbf7d0','#fde68a','#fde68a','#fecaca'],
    ['#bbf7d0','#fde68a','#fde68a','#fecaca','#fecaca'],
    ['#fde68a','#fde68a','#fecaca','#fecaca','#fca5a5'],
    ['#fde68a','#fecaca','#fecaca','#fca5a5','#fca5a5'],
  ];
  return (
    <svg className={className} style={frame} viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Evaluación de riesgo SORA con matriz y nivel de aseguramiento SAIL">
      <rect x="0.5" y="0.5" width="519" height="439" rx="28" fill="#f8fafc" stroke="#e2e8f0" />
      {/* matriz */}
      <g transform="translate(60 70)">
        <text x="0" y="-14" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="800" letterSpacing="1" fill="#94a3b8">RIESGO EN TIERRA (GRC) × RIESGO EN AIRE (ARC)</text>
        {cells.map((row, r) => row.map((c, col) => {
          const sel = r === 2 && col === 2;
          return (
            <g key={`${r}-${col}`}>
              <rect x={col*76} y={r*58} width="68" height="50" rx="8" fill={c} opacity={sel ? 1 : 0.55} stroke={sel ? NAVY : 'transparent'} strokeWidth={sel ? 3 : 0} />
              {sel && <text x={col*76+34} y={r*58+30} textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="12" fontWeight="800" fill={NAVY}>SAIL III</text>}
            </g>
          );
        }))}
      </g>
      {/* tarjeta resultado */}
      <g transform="translate(60 322)">
        <rect x="0" y="0" width="400" height="70" rx="16" fill="#fff" stroke="#e2e8f0" />
        <circle cx="40" cy="35" r="22" fill="rgba(236,91,19,0.1)" />
        <text x="40" y="41" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="800" fill={ORANGE}>III</text>
        <text x="76" y="30" fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="800" fill={NAVY}>NIVEL DE ASEGURAMIENTO SAIL III</text>
        <text x="76" y="50" fontFamily="system-ui, sans-serif" fontSize="11" fill="#64748b">Robustez media · OSO aplicables definidos</text>
      </g>
    </svg>
  );
}

/* Clima UAV: tarjeta de aptitud de vuelo (score + métricas + Kp/GPS) */
export function WeatherScene({ className }) {
  const GREEN = '#22c55e';
  const R = 40, C = 2 * Math.PI * R, pct = 0.82;
  const tiles = [
    { label: 'VIENTO', val: '14', unit: 'km/h', bad: false },
    { label: 'RÁFAGAS', val: '22', unit: 'km/h', bad: false },
    { label: 'VISIB.', val: '9.0', unit: 'km', bad: false },
    { label: 'LLUVIA', val: '10', unit: '%', bad: false },
  ];
  return (
    <svg className={className} style={frame} viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Verificación meteorológica pre-vuelo: score de aptitud, viento, ráfagas, visibilidad, lluvia e índice Kp para GPS">
      <rect x="0.5" y="0.5" width="519" height="439" rx="28" fill="#eef2f7" stroke="#e2e8f0" />

      {/* tarjeta de clima */}
      <g transform="translate(60 50)">
        <rect x="0" y="0" width="400" height="340" rx="22" fill={NAVY} />

        {/* sol/nube decorativo */}
        <g transform="translate(330 34)" opacity="0.9">
          <circle cx="0" cy="0" r="14" fill="#fbbf24" />
          <path d="M-22 14 a12 12 0 0 1 4 -23 a16 16 0 0 1 30 4 a11 11 0 0 1 2 19 z" fill="#cbd5e1" />
        </g>

        {/* gauge + estado */}
        <g transform="translate(70 80)">
          <circle cx="0" cy="0" r={R} fill="none" stroke="#1e293b" strokeWidth="9" />
          <circle cx="0" cy="0" r={R} fill="none" stroke={GREEN} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${C * pct} ${C * (1 - pct)}`} strokeDashoffset={C / 4} transform="rotate(-90)" />
          <text x="0" y="8" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="26" fontWeight="800" fill="#fff">82</text>
        </g>
        <g transform="translate(130 52)">
          <rect x="0" y="0" width="150" height="30" rx="15" fill="rgba(34,197,94,0.16)" />
          <circle cx="20" cy="15" r="6" fill={GREEN} />
          <text x="34" y="20" fontFamily="system-ui, sans-serif" fontSize="12" fontWeight="800" fill={GREEN}>APTO PARA VOLAR</text>
          <text x="0" y="56" fontFamily="system-ui, sans-serif" fontSize="11" fill="#94a3b8">Bogotá · Parcialmente nublado · 07:15h</text>
        </g>

        {/* tiles de métricas */}
        <g transform="translate(20 150)">
          {tiles.map((t, i) => (
            <g key={t.label} transform={`translate(${i*92} 0)`}>
              <rect x="0" y="0" width="84" height="74" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" />
              <text x="42" y="28" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="18" fontWeight="800" fill="#fff">{t.val}</text>
              <text x="42" y="44" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="9" fill="#64748b">{t.unit}</text>
              <text x="42" y="62" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="9" fontWeight="700" letterSpacing="0.5" fill="#94a3b8">{t.label}</text>
            </g>
          ))}
        </g>

        {/* fila Kp / GPS */}
        <g transform="translate(20 250)">
          <rect x="0" y="0" width="360" height="44" rx="12" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.2)" />
          <circle cx="26" cy="22" r="7" fill={GREEN} />
          <text x="44" y="19" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="800" fill="#fff">ÍNDICE Kp 2.0 · GPS ÓPTIMO</text>
          <text x="44" y="34" fontFamily="system-ui, sans-serif" fontSize="10" fill="#94a3b8">Actividad geomagnética baja · señal estable</text>
          <text x="340" y="27" textAnchor="end" fontFamily="monospace" fontSize="11" fontWeight="700" fill={GREEN}>NOAA</text>
        </g>
      </g>
    </svg>
  );
}

const Illustrations = { DroneOpsScene, ComplianceScene, FleetScene, BatteryMaintScene, SmsSafetyScene, AuthMapScene, ReplayScene, CrewScene, ReportsScene, SoraScene, WeatherScene };
export default Illustrations;
