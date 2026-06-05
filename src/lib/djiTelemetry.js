/**
 * djiTelemetry.js — helpers de telemetría DJI compartidos entre
 * servidor (import-dji route) y cliente (FlightReplayModal).
 * Sin APIs exclusivas del navegador ni del servidor.
 */

// ── Definición de alertas ────────────────────────────────────────
export const ALERT_DEFS = [
  { key: 'isCompassError',        label: 'Error de brújula',              severity: 'critical' },
  { key: 'isVibrating',           label: 'Vibraciones anormales',         severity: 'warning'  },
  { key: 'waveError',             label: 'Error evasión obstáculos',      severity: 'warning'  },
  { key: 'isOutOfLimit',          label: 'Fuera del límite de vuelo',     severity: 'critical' },
  { key: 'isNotEnoughForce',      label: 'Empuje insuficiente',           severity: 'critical' },
  { key: 'isBarometerDeadInAir',  label: 'Fallo barómetro en vuelo',      severity: 'critical' },
  { key: 'isMotorBlocked',        label: 'Motor bloqueado',               severity: 'critical' },
  { key: 'isPropellerCatapult',   label: 'Protección hélice activa',      severity: 'warning'  },
  { key: 'isAcceletorOverRange',  label: 'Acelerómetro fuera de rango',   severity: 'warning'  },
];

export const FLIGHT_ACTION_ALERTS = new Set([
  'WarningPowerGoHome','WarningPowerLanding','SmartPowerGoHome','SmartPowerLanding',
  'LowVoltageLanding','LowVoltageGoHome','SeriousLowVoltageLanding',
  'OutOfControlGoHome','AvoidGroundLanding','BatteryForceLanding','MCProtectGoHome',
  'MotorblockLanding','AppRequestForceLanding','FakeBatteryLanding','IMUErrorRTH',
]);

export const FLIGHT_ACTION_LABELS = {
  WarningPowerGoHome:       'RTH por batería baja (advertencia)',
  WarningPowerLanding:      'Aterrizaje por batería baja (advertencia)',
  SmartPowerGoHome:         'RTH inteligente por batería baja',
  SmartPowerLanding:        'Aterrizaje inteligente por batería baja',
  LowVoltageLanding:        'Aterrizaje por voltaje bajo',
  LowVoltageGoHome:         'RTH por voltaje bajo',
  SeriousLowVoltageLanding: 'ATERRIZAJE DE EMERGENCIA — voltaje crítico',
  OutOfControlGoHome:       'RTH por pérdida de señal RC',
  AvoidGroundLanding:       'Aterrizaje por proximidad al suelo',
  BatteryForceLanding:      'Aterrizaje forzado por batería',
  MCProtectGoHome:          'RTH por protección del controlador',
  MotorblockLanding:        'Aterrizaje por bloqueo de motor',
  AppRequestForceLanding:   'Aterrizaje forzado por la app',
  FakeBatteryLanding:       'Aterrizaje — batería no reconocida',
  IMUErrorRTH:              'RTH por error IMU',
};

/**
 * detectAlerts(frames) → Alert[]
 * Detecta alertas en los frames DJI parseados.
 */
export function detectAlerts(frames) {
  const alerts = [], prev = {};
  let prevAction = null, prevVoltWarn = 0;
  frames.forEach((f) => {
    const osd = f.osd;
    if (!osd) return;
    const t = osd.flyTime ?? 0;
    ALERT_DEFS.forEach(({ key, label, severity }) => {
      if (osd[key] && !prev[key]) alerts.push({ t, type: key, label, severity });
      prev[key] = osd[key];
    });
    const vw = osd.voltageWarning ?? 0;
    if (vw > prevVoltWarn) alerts.push({
      t, type: 'voltageWarning',
      severity: vw >= 2 ? 'critical' : 'warning',
      label: vw >= 2 ? 'Voltaje CRÍTICO — aterrizaje inminente' : 'Advertencia de voltaje bajo',
    });
    prevVoltWarn = vw;
    const action = typeof osd.flightAction === 'string' ? osd.flightAction : null;
    if (action && action !== prevAction && FLIGHT_ACTION_ALERTS.has(action)) {
      alerts.push({ t, type: 'flightAction', severity: 'critical',
        label: FLIGHT_ACTION_LABELS[action] ?? action });
    }
    prevAction = action;
  });
  return alerts;
}

function normalizeRC(val) {
  if (val == null) return 0;
  if (val > 2) return (val / 1024) * 2 - 1;
  return (val - 0.5) * 2;
}

/**
 * buildTelemetry(frames) → TelemetryPoint[]
 * Construye array de hasta 12k puntos de telemetría muestreados.
 */
export function buildTelemetry(frames) {
  const MAX = 12000;
  const step = frames.length > MAX ? Math.floor(frames.length / MAX) : 1;
  const out = [];
  for (let i = 0; i < frames.length; i += step) {
    const f = frames[i], osd = f.osd, bat = f.battery, rc = f.rc;
    if (!osd) continue;
    out.push({
      t:           osd.flyTime        ?? i * 0.1,
      lat:         osd.latitude       ?? null,
      lng:         osd.longitude      ?? null,
      alt:         osd.height         ?? osd.altitude ?? 0,
      yaw:         osd.yaw            ?? 0,
      pitch:       osd.pitch          ?? 0,
      roll:        osd.roll           ?? 0,
      speedH:      Math.hypot(osd.xSpeed ?? 0, osd.ySpeed ?? 0),
      speedV:      osd.zSpeed         ?? 0,
      gpsNum:      osd.gpsNum         ?? 0,
      flightMode:  typeof osd.flycState    === 'string' ? osd.flycState
                 : typeof osd.flightMode   === 'string' ? osd.flightMode : null,
      flightAction: typeof osd.flightAction === 'string' ? osd.flightAction : null,
      bat:         bat?.chargeLevel   ?? null,
      voltage:     bat?.voltage       ?? null,
      cellVolts:   bat?.cellVoltages  ?? null,
      rc_ail:      rc ? normalizeRC(rc.aileron)  : null,
      rc_ele:      rc ? normalizeRC(rc.elevator) : null,
      rc_thr:      rc ? normalizeRC(rc.throttle) : null,
      rc_rud:      rc ? normalizeRC(rc.rudder)   : null,
      hasGps:      !!(osd.latitude && Math.abs(osd.latitude) <= 90 && osd.latitude !== 0),
    });
  }
  return out;
}
