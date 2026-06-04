/**
 * dat-parser.js — Parser binario DJI .dat (FLY***.DAT / DJIG0***.DAT)
 *
 * Soporta los dos formatos principales:
 *   v1 — Phantom 3/4, Mavic Pro, Mavic Air, Spark (header 100 bytes)
 *   v2 — Mini 2/3/4, Air 2S, Mavic 2/3, Matrice 300/350, Agras T (header 256 bytes)
 *
 * Estructura de registro:
 *   [type: u8][length: u16 LE][payload: length bytes][checksum: u8]
 *   Total: 4 + length bytes por registro
 *
 * Referencia: datfile.net + DatCon open-source + community reverse-engineering
 */

// ── Tipos de registro ─────────────────────────────────────────────────────────
const RT = {
  OSD:             0x00,  // GPS, velocidad, actitud, modo, alertas — ~10-25Hz
  HOME:            0x01,  // Punto de home, altura RTH
  GIMBAL:          0x02,  // Gimbal pitch/roll/yaw
  RC:              0x03,  // Joystick del control remoto
  CUSTOM1400:      0x04,  // Telemetría adicional
  DEFORM:          0x05,  // Deformación (Inspire/Matrice)
  CENTER_BATTERY:  0x06,  // Batería central (voltaje total)
  SMART_BATTERY:   0x07,  // Batería inteligente (celdas, temp, ciclos)
  APP_TIP:         0x08,  // Mensajes informativos de la app
  APP_WARN:        0x09,  // Alertas de la app
  RECOVER:         0x0A,  // Datos de recuperación / números de serie
  APP_GPS:         0x0B,  // GPS del dispositivo móvil/RC
  CUSTOM1700:      0x0C,  // Motor RPM + corriente ESC (M1-M4)
  IMUEX:           0x0D,  // IMU extendido — acelerómetro+giroscopio a 100Hz
  CUSTOM2500:      0x0E,  // Datos adicionales v2
  IMUEX2:          0x2B,  // Segunda IMU
  VISION_GROUP:    0x29,  // Sensores de obstáculos
  COMPONENT_SERIAL: 0x41, // Seriales de componentes
  END:             0xFF,  // Fin del archivo
};

// ── Helpers de lectura binaria ────────────────────────────────────────────────
function readF64LE(buf, off) { return buf.readDoubleBE !== undefined ? buf.readDoubleLE(off) : new DataView(buf.buffer, buf.byteOffset + off, 8).getFloat64(0, true); }
function readF32LE(buf, off) { return buf.readFloatLE   ? buf.readFloatLE(off)   : new DataView(buf.buffer, buf.byteOffset + off, 4).getFloat32(0, true); }
function readU32LE(buf, off) { return buf.readUInt32LE  ? buf.readUInt32LE(off)  : new DataView(buf.buffer, buf.byteOffset + off, 4).getUint32(0, true); }
function readI16LE(buf, off) { return buf.readInt16LE   ? buf.readInt16LE(off)   : new DataView(buf.buffer, buf.byteOffset + off, 2).getInt16(0, true); }
function readU16LE(buf, off) { return buf.readUInt16LE  ? buf.readUInt16LE(off)  : new DataView(buf.buffer, buf.byteOffset + off, 2).getUint16(0, true); }

function validCoord(lat, lng) {
  return lat !== 0 && lng !== 0 &&
         Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

// ── Detección de versión del archivo ─────────────────────────────────────────
function detectVersion(buf) {
  // Los .dat DJI tienen un encabezado de longitud variable.
  // Probamos las dos firmas conocidas:
  //   v1 (Go era): primeros 2 bytes = 0x55 0xAA  o los bytes 4-5 = tipo de aeronave
  //   v2 (Fly era): los bytes 0-3 = longitud del header (típicamente 256 = 0x100)
  //
  // Estrategia robusta: buscar el primer registro válido probando ambos offsets.
  const HEADER_V1 = 100;
  const HEADER_V2 = 256;

  for (const headerSize of [HEADER_V1, HEADER_V2]) {
    if (buf.length <= headerSize + 4) continue;
    const type = buf[headerSize];
    const len  = readU16LE(buf, headerSize + 1);
    // Un primer registro válido tendrá tipo conocido y longitud razonable
    if (len > 0 && len < 2000 && (type in Object.values(RT) || type <= 0x50 || type === 0xFF)) {
      return { headerSize, version: headerSize === HEADER_V1 ? 1 : 2 };
    }
  }
  // Fallback: asumir v1
  return { headerSize: HEADER_V1, version: 1 };
}

// ── Parsear encabezado del archivo ────────────────────────────────────────────
function parseHeader(buf, headerSize) {
  try {
    // Intentar extraer timestamp de inicio (offset variable por versión)
    // v1: timestamp en offset 8 como unix seconds (uint32)
    // v2: timestamp en offset 8 también pero diferente referencia
    const tsRaw = readU32LE(buf, 8);
    const startTime = tsRaw > 1_000_000_000 && tsRaw < 2_000_000_000
      ? new Date(tsRaw * 1000).toISOString()
      : null;

    // Aircraft type code en offset 6 (v1) o 4 (v2)
    const aircraftCode = buf[6] ?? 0;

    return { startTime, aircraftCode };
  } catch {
    return { startTime: null, aircraftCode: 0 };
  }
}

// ── Parsear registro OSD (0x00) ───────────────────────────────────────────────
function parseOSD(payload) {
  if (payload.length < 60) return null;
  try {
    const lng     = readF64LE(payload, 0);
    const lat     = readF64LE(payload, 8);
    const alt     = readF32LE(payload, 16);   // ASL metros
    const height  = readF32LE(payload, 20);   // AGL metros (relativo al home)
    const xSpeed  = readF32LE(payload, 24);   // m/s East
    const ySpeed  = readF32LE(payload, 28);   // m/s North
    const zSpeed  = readF32LE(payload, 32);   // m/s Up
    const pitch   = readF32LE(payload, 36);   // grados
    const roll    = readF32LE(payload, 40);   // grados
    const yaw     = readF32LE(payload, 44);   // grados

    // flyTime en offset 72 (uint32, milisegundos desde inicio de motores)
    const flyTimeMs = payload.length > 75 ? readU32LE(payload, 72) : 0;

    // Flags de alerta — byte 48 contiene el modo de vuelo y flags críticos
    const flagByte1 = payload.length > 49 ? payload[48] : 0;
    const flagByte2 = payload.length > 57 ? payload[56] : 0;
    const flagByte3 = payload.length > 59 ? payload[58] : 0;

    const isMotorOn       = !!(flagByte1 & 0x01);
    const isOnGround      = !!(flagByte1 & 0x02);
    const flightModeCode  = (flagByte1 >> 2) & 0x3F;
    const isCompassError  = !!(flagByte2 & 0x01);
    const isGpsValid      = !!(flagByte2 & 0x02);
    const voltageWarning  = (flagByte2 >> 4) & 0x03;
    const isVibrating     = !!(flagByte3 & 0x01);
    const isOutOfLimit    = !!(flagByte3 & 0x04);
    const isNotEnoughForce = !!(flagByte3 & 0x08);
    const gpsNum          = payload.length > 53 ? payload[52] : 0;

    if (!validCoord(lat, lng)) return null;

    return {
      t:              flyTimeMs / 1000,
      lat, lng,
      alt:            height > -100 && height < 5000 ? height : alt,
      yaw:            isNaN(yaw)   ? 0 : yaw,
      pitch:          isNaN(pitch) ? 0 : pitch,
      roll:           isNaN(roll)  ? 0 : roll,
      speedH:         Math.hypot(xSpeed, ySpeed),
      speedV:         zSpeed,
      gpsNum,
      isMotorOn,
      isOnGround,
      flightModeCode,
      isCompassError,
      isGpsValid,
      voltageWarning,
      isVibrating,
      isOutOfLimit,
      isNotEnoughForce,
      hasGps: true,
    };
  } catch { return null; }
}

// ── Parsear registro RC (0x03) ────────────────────────────────────────────────
function parseRC(payload) {
  if (payload.length < 8) return null;
  try {
    // Valores: int16 en rango típico -10000..+10000
    const aileron  = readI16LE(payload, 0);  // Stick der. horizontal
    const elevator = readI16LE(payload, 2);  // Stick der. vertical
    const throttle = readI16LE(payload, 4);  // Stick izq. vertical
    const rudder   = readI16LE(payload, 6);  // Stick izq. horizontal
    const normalize = v => Math.max(-1, Math.min(1, v / 10000));
    return {
      rc_ail: normalize(aileron),
      rc_ele: normalize(elevator),
      rc_thr: normalize(throttle),
      rc_rud: normalize(rudder),
    };
  } catch { return null; }
}

// ── Parsear registro Smart Battery (0x07) ─────────────────────────────────────
function parseSmartBattery(payload) {
  if (payload.length < 10) return null;
  try {
    const currentCapMah = readU16LE(payload, 0);
    const fullCapMah    = readU16LE(payload, 2);
    const voltageRaw    = readU16LE(payload, 4);   // mV
    const currentRaw    = readI16LE(payload, 6);   // mA (positivo = cargando, negativo = descargando)
    const pct           = payload[8];               // 0-100
    const tempRaw       = payload.length > 10 ? readI16LE(payload, 9) : null; // °C * 10

    // Voltajes por celda — a partir del offset 11, 2 bytes cada una
    const cellVolts = [];
    for (let i = 11; i + 1 < payload.length && cellVolts.length < 8; i += 2) {
      const mv = readU16LE(payload, i);
      if (mv > 2000 && mv < 5000) cellVolts.push(mv / 1000); // filtrar valores inválidos
    }

    return {
      bat:         pct,
      voltage:     voltageRaw / 1000,     // Volts
      current:     Math.abs(currentRaw) / 1000, // Amperes
      currentCapMah,
      fullCapMah,
      tempC:       tempRaw != null ? tempRaw / 10 : null,
      cellVolts:   cellVolts.length > 0 ? cellVolts : null,
    };
  } catch { return null; }
}

// ── Parsear registro Center Battery (0x06) — batería simple ──────────────────
function parseCenterBattery(payload) {
  if (payload.length < 6) return null;
  try {
    const pct     = payload[0];
    const voltage = readU16LE(payload, 1) / 1000;
    return { bat: pct, voltage };
  } catch { return null; }
}

// ── Parsear registro Custom1700 (0x0C) — motores M1-M4 ───────────────────────
function parseCustom1700(payload) {
  if (payload.length < 24) return null;
  try {
    // Estructura: 4 motores × (RPM u16 + corriente u16 + temperatura u8)
    // Layout aproximado según DatCon source (varía ligeramente por modelo):
    const motors = [];
    // Buscar motores en el payload (offset 0 para M1, 6 para M2, 12 para M3, 18 para M4)
    const motorOffsets = [0, 6, 12, 18];
    for (let i = 0; i < 4; i++) {
      const off = motorOffsets[i];
      if (off + 5 >= payload.length) break;
      const rpm  = readU16LE(payload, off);
      const curr = readU16LE(payload, off + 2) / 100;  // Amperes
      const temp = payload[off + 4];                   // °C
      if (rpm > 0 || curr > 0) {
        motors.push({ motor: i + 1, rpm, current: curr, tempC: temp });
      }
    }
    return motors.length > 0 ? { motors } : null;
  } catch { return null; }
}

// ── Parsear registro IMUEX (0x0D) — acelerómetro + giroscopio raw 100Hz ──────
function parseIMUEX(payload) {
  if (payload.length < 24) return null;
  try {
    // Acelerómetro: 3 × float32 (m/s²)
    // Giroscopio: 3 × float32 (°/s)
    const accX  = readF32LE(payload, 0);
    const accY  = readF32LE(payload, 4);
    const accZ  = readF32LE(payload, 8);
    const gyroX = readF32LE(payload, 12);
    const gyroY = readF32LE(payload, 16);
    const gyroZ = readF32LE(payload, 20);

    if ([accX, accY, accZ, gyroX, gyroY, gyroZ].some(v => isNaN(v) || !isFinite(v))) return null;
    return { accX, accY, accZ, gyroX, gyroY, gyroZ };
  } catch { return null; }
}

// ── Parsear registro App Warning (0x09) ───────────────────────────────────────
function parseAppWarn(payload) {
  try {
    const text = payload.toString('utf8', 0, payload.length).replace(/\0/g, '').trim();
    return text.length > 0 ? { message: text } : null;
  } catch { return null; }
}

// ── Parsear registro Recover (0x0A / 0x41) — números de serie ────────────────
function parseRecover(payload) {
  try {
    // Serial de aeronave en los primeros 16 bytes (ASCII)
    const serial = payload.slice(0, 16).toString('ascii').replace(/\0/g, '').trim();
    return serial.length > 3 ? { serial } : null;
  } catch { return null; }
}

// ── Función principal de parseo ───────────────────────────────────────────────
export function parseDatBuffer(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  if (buf.length < 200) {
    throw new Error('Archivo .dat demasiado pequeño o corrupto.');
  }

  const { headerSize, version } = detectVersion(buf);
  const fileHeader = parseHeader(buf, headerSize);

  // ── Iterar registros ───────────────────────────────────────────────────────
  const frames    = [];   // telemetría GPS (OSD) — para path y replay
  const imuFrames = [];   // IMU raw a 100Hz — para análisis de vibración
  const appWarnings = []; // mensajes de la app
  let serial = null;
  let lastRC  = null;
  let lastBat = null;
  let lastMotors = null;

  let pos = headerSize;
  let recordCount = 0;
  const MAX_RECORDS = 500_000; // safety cap

  while (pos + 4 <= buf.length && recordCount < MAX_RECORDS) {
    const type   = buf[pos];
    const length = readU16LE(buf, pos + 1);

    if (type === RT.END) break;

    const nextPos = pos + 3 + length + 1; // type(1) + len(2) + payload(len) + checksum(1)
    if (nextPos > buf.length || length > 10000) {
      pos++; // registro corrupto, avanzar un byte y reintentar
      continue;
    }

    const payload = buf.slice(pos + 3, pos + 3 + length);

    switch (type) {
      case RT.OSD: {
        const osd = parseOSD(payload);
        if (osd) {
          // Adjuntar RC y batería más recientes
          if (lastRC)  Object.assign(osd, lastRC);
          if (lastBat) Object.assign(osd, lastBat);
          if (lastMotors) osd.motors = lastMotors;
          frames.push(osd);
        }
        break;
      }
      case RT.RC: {
        lastRC = parseRC(payload);
        break;
      }
      case RT.SMART_BATTERY: {
        const bat = parseSmartBattery(payload);
        if (bat) lastBat = bat;
        break;
      }
      case RT.CENTER_BATTERY: {
        const bat = parseCenterBattery(payload);
        if (bat && !lastBat) lastBat = bat;  // solo si no hay smart battery
        break;
      }
      case RT.CUSTOM1700: {
        const motorData = parseCustom1700(payload);
        if (motorData) lastMotors = motorData.motors;
        break;
      }
      case RT.IMUEX: {
        const imu = parseIMUEX(payload);
        if (imu) {
          // Asociar tiempo del último OSD frame
          imu.t = frames.length > 0 ? frames[frames.length - 1].t : 0;
          imuFrames.push(imu);
        }
        break;
      }
      case RT.APP_WARN: {
        const warn = parseAppWarn(payload);
        if (warn) {
          warn.t = frames.length > 0 ? frames[frames.length - 1].t : 0;
          appWarnings.push(warn);
        }
        break;
      }
      case RT.RECOVER:
      case RT.COMPONENT_SERIAL: {
        const rec = parseRecover(payload);
        if (rec?.serial) serial = rec.serial;
        break;
      }
    }

    pos = nextPos;
    recordCount++;
  }

  if (frames.length === 0) {
    throw new Error(
      'No se encontraron frames de vuelo válidos en el .dat. ' +
      'El modelo puede no estar soportado todavía (Mini 4 Pro, Avata 2). ' +
      'Prueba exportando el vuelo con DatCon primero.'
    );
  }

  return buildResult(frames, imuFrames, appWarnings, serial, fileHeader, version);
}

// ── Construir resultado estandarizado ────────────────────────────────────────
function buildResult(frames, imuFrames, appWarnings, serial, fileHeader, version) {
  const totalDuration = frames[frames.length - 1].t;

  // Path para el mapa (máx 2000 puntos)
  const MAX_PATH = 2000;
  const pathStep = Math.max(1, Math.floor(frames.length / MAX_PATH));
  const path = [];
  for (let i = 0; i < frames.length; i += pathStep) {
    const f = frames[i];
    path.push({ lat: f.lat, lng: f.lng, alt: f.alt, t: f.t });
  }

  // Telemetría para animación (máx 12000 puntos)
  const MAX_TELEM = 12000;
  const telemStep = Math.max(1, Math.floor(frames.length / MAX_TELEM));
  const telemetry = [];
  for (let i = 0; i < frames.length; i += telemStep) {
    telemetry.push(frames[i]);
  }

  // IMU (máx 20000 puntos para FFT — 100Hz durante 200s)
  const MAX_IMU = 20000;
  const imuStep = Math.max(1, Math.floor(imuFrames.length / MAX_IMU));
  const imu = imuFrames.filter((_, i) => i % imuStep === 0);

  // Alertas
  const alerts = detectDatAlerts(frames, appWarnings);

  // Meta estadísticas
  const altVals   = frames.map(f => f.alt).filter(Boolean);
  const speedVals = frames.map(f => f.speedH).filter(Boolean);
  const batVals   = frames.map(f => f.bat).filter(v => v != null);
  const hasMotors = frames.some(f => f.motors?.length > 0);
  const hasImu    = imu.length > 0;

  const meta = {
    source:       'dat',
    version,
    datVersion:   version,
    totalFrames:  frames.length,
    gpsFrames:    frames.length,
    pathPoints:   path.length,
    imuFrames:    imu.length,
    serial:       serial ?? null,
    model:        null,  // se puede inferir del aircraft code si se necesita
    startTime:    fileHeader.startTime,
    totalDuration,
    durationS:    totalDuration,
    altMax:       altVals.length   ? Math.max(...altVals)                         : null,
    speedMax:     speedVals.length ? Math.max(...speedVals)                       : null,
    speedAvg:     speedVals.length ? speedVals.reduce((a,b)=>a+b,0)/speedVals.length : null,
    distanceM:    calcDistance(frames),
    batStart:     batVals[0]               ?? null,
    batEnd:       batVals[batVals.length-1] ?? null,
    hasRC:        frames.some(f => f.rc_ail != null),
    hasMotors,
    hasImu,
    alertCount:   alerts.length,
    recordsParsed: frames.length,
  };

  return { path, telemetry, imu, alerts, meta };
}

// ── Detección de alertas desde frames .dat ────────────────────────────────────
function detectDatAlerts(frames, appWarnings) {
  const alerts = [];
  const prev = {};

  frames.forEach(f => {
    const checks = [
      { key: 'isCompassError',   label: 'Error de brújula',         severity: 'critical' },
      { key: 'isVibrating',      label: 'Vibraciones anormales',    severity: 'warning'  },
      { key: 'isOutOfLimit',     label: 'Fuera del límite',         severity: 'critical' },
      { key: 'isNotEnoughForce', label: 'Empuje insuficiente',      severity: 'critical' },
    ];
    checks.forEach(({ key, label, severity }) => {
      if (f[key] && !prev[key]) alerts.push({ t: f.t, type: key, label, severity });
      prev[key] = f[key];
    });
    const vw = f.voltageWarning ?? 0;
    if (vw > (prev.vw ?? 0)) {
      alerts.push({ t: f.t, type: 'voltageWarning', severity: vw >= 2 ? 'critical' : 'warning',
        label: vw >= 2 ? 'Voltaje CRÍTICO' : 'Voltaje bajo' });
    }
    prev.vw = vw;

    // Alertas de motores — divergencia > 15% entre M1-M4
    if (f.motors?.length === 4) {
      const rpms = f.motors.map(m => m.rpm).filter(r => r > 0);
      if (rpms.length === 4) {
        const avg  = rpms.reduce((a,b)=>a+b,0) / 4;
        const maxDiv = Math.max(...rpms.map(r => Math.abs(r - avg) / avg));
        if (maxDiv > 0.15 && !prev.motorImbalance) {
          alerts.push({ t: f.t, type: 'motorImbalance', severity: 'warning',
            label: `Desbalance de motores: ${(maxDiv*100).toFixed(0)}% de divergencia` });
          prev.motorImbalance = true;
        }
        if (maxDiv < 0.05) prev.motorImbalance = false;
      }
    }
  });

  // Agregar mensajes de la app como alertas de información
  appWarnings.forEach(w => {
    alerts.push({ t: w.t, type: 'app', severity: 'warning', label: w.message });
  });

  return alerts.sort((a, b) => a.t - b.t);
}

// ── Distancia total haversine ─────────────────────────────────────────────────
function calcDistance(frames) {
  let total = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i-1], b = frames[i];
    const R = 6371000;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lng - a.lng) * Math.PI / 180;
    const x = Math.sin(dLat/2)**2 +
              Math.cos(a.lat*Math.PI/180) * Math.cos(b.lat*Math.PI/180) * Math.sin(dLon/2)**2;
    total += R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
  }
  return Math.round(total);
}
