// Skylog V2.0 — Flota & Equipo. Catálogo DJI precargable (regla C1: plantilla
// oficial que el cliente adopta tal cual o edita, nunca un catálogo fijo
// incrustado sin salida). Solo `brand`/`model`/`category` — nunca se
// fabrican mtow/autonomía/etc. sin verificar la ficha exacta de cada
// variante regional; la organización completa esos atributos técnicos del
// Apéndice 1 por su cuenta si los necesita (ver aircraft_models en
// 31-esquema-datos.md §2).
//
// Dos fuentes reales, combinadas:
// 1. La línea Enterprise/comercial vigente en 2026 (Matrice 4/400/30,
//    Mavic 3 Enterprise, Agras) — verificada por búsqueda web antes de
//    escribir este archivo (decisión 118, 51-bitacora.md).
// 2. Los modelos que `lib/djiParser.js` (v1, `PRODUCT_TYPE_OVERRIDES`) ya
//    reconoce de logs reales importados — para que el catálogo manual use
//    exactamente el mismo nombre que el import automático reportaría,
//    evitando que "Mavic 3 Classic" (aquí) y "Mavic3Classic" (parser)
//    queden como dos identidades distintas de facto.

export const DJI_MODELS_CATALOG = [
  // Enterprise — línea vigente 2026
  { brand: 'DJI', model: 'Matrice 400', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Matrice 4E', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Matrice 4T', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Matrice 30', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Matrice 30T', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Matrice 350 RTK', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Matrice 300 RTK', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Mavic 3 Enterprise', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Mavic 3 Thermal', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Agras T50', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Agras T100', category: 'ala_rotatoria' },
  // Consumo/prosumer de uso comercial frecuente (ya reconocidos por el
  // parser de logs, lib/djiParser.js PRODUCT_TYPE_OVERRIDES)
  { brand: 'DJI', model: 'Mavic 3 Pro', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Mavic 3 Classic', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Mavic 3', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Mavic 2 Enterprise', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Mini 4 Pro', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Mini 3 Pro', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Air 3', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Mavic Air 2S', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Phantom 4 Pro V2', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Phantom 4 RTK', category: 'ala_rotatoria' },
  { brand: 'DJI', model: 'Phantom 4 Multispectral', category: 'ala_rotatoria' },
];
