/**
 * server.js — Bitafly AeroCivil Robot v1.2
 * Express microservice — dos funciones:
 *   1. Automatización AeroCivil (Playwright)
 *   2. Parser de archivos .dat DJI (nuevos endpoints)
 *
 * Endpoints:
 *   /health         — estado del servicio
 *   /automate       — automatización AeroCivil
 *   /inspect        — diagnóstico portal
 *   /api/dat/parse  — parsear archivo .dat DJI (multipart, hasta 600MB)
 *   /api/dat/health — info del parser (modelos soportados)
 *
 * Autenticación: header x-api-secret = RAILWAY_API_SECRET
 */

import express           from 'express';
import { Readable }      from 'stream';
import { runAutomation } from './automator.js';
import { inspectPortal } from './inspector.js';
import { parseDatBuffer } from './dat-parser.js';

const app    = express();
const SECRET = process.env.RAILWAY_API_SECRET;

if (!SECRET) {
  console.error('[FATAL] RAILWAY_API_SECRET no está configurado. Abortando.');
  process.exit(1);
}

// ── CORS — permite peticiones directas desde el browser de Bitafly ────────────
const ALLOWED_ORIGINS = [
  'https://bitafly.com',
  'https://www.bitafly.com',
  'http://localhost:3000',   // desarrollo local
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-secret');
  res.setHeader('Access-Control-Max-Age', '86400'); // cachear preflight 24h
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '10mb' }));

// ── Leer body raw como Buffer (para endpoints .dat) ───────────────────────────
function readRawBody(req, maxBytes = 650 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy();
        reject(new Error(`Archivo demasiado grande. Máximo: ${Math.round(maxBytes/1024/1024)} MB`));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end',   () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ── Extraer archivo de multipart/form-data (sin dependencias externas) ────────
function extractMultipartFile(buffer, boundary) {
  const boundaryBuf = Buffer.from('--' + boundary);
  const crlfBuf     = Buffer.from('\r\n');
  const dcrlf       = Buffer.from('\r\n\r\n');

  let start = buffer.indexOf(boundaryBuf);
  if (start === -1) return null;
  start += boundaryBuf.length + crlfBuf.length;

  const headerEnd = buffer.indexOf(dcrlf, start);
  if (headerEnd === -1) return null;

  const dataStart = headerEnd + dcrlf.length;
  const endBound  = Buffer.from('\r\n--' + boundary);
  let dataEnd     = buffer.indexOf(endBound, dataStart);
  if (dataEnd === -1) dataEnd = buffer.length;

  return buffer.slice(dataStart, dataEnd);
}

// ── Middleware de autenticación ────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const incoming = req.headers['x-api-secret'];
  if (!incoming || incoming !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// ── GET /health ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bitafly-robot', ts: new Date().toISOString() });
});

// ── POST /automate ─────────────────────────────────────────────────────────
// Body: { jobId, credentials: {username, password, solicitante, contact_name},
//         formData: {...aeroForm}, kmlContent: "<kml>...</kml>" }
app.post('/automate', async (req, res) => {
  const { jobId, credentials, formData, kmlContent } = req.body;

  if (!jobId || !credentials?.username || !credentials?.password) {
    return res.status(400).json({ error: 'Faltan campos requeridos: jobId, credentials' });
  }

  // Responder de inmediato → Vercel no se cuelga esperando
  res.json({ jobId, status: 'started', message: 'Automatización iniciada en background' });

  // Ejecutar en background (no bloqueante)
  runAutomation(jobId, credentials, formData, kmlContent).catch(err => {
    console.error(`[JOB ${jobId}] Error no capturado:`, err.message);
  });
});

// ── POST /inspect ──────────────────────────────────────────────────────────
// Body: { credentials: { username, password } }
// Navega el portal paso a paso y devuelve screenshots + elementos detectados.
// Solo para diagnóstico de selectores — NO crear solicitudes.
app.post('/inspect', async (req, res) => {
  const { credentials } = req.body;

  if (!credentials?.username || !credentials?.password) {
    return res.status(400).json({ error: 'Faltan credentials.username / credentials.password' });
  }

  try {
    console.log(`[INSPECT] Iniciando inspección del portal para ${credentials.username}`);
    const result = await inspectPortal(credentials);
    console.log(`[INSPECT] Completado: ${result.totalSteps} pasos`);

    // Devolvemos los pasos pero sin el screenshot completo en logs
    return res.json(result);
  } catch (err) {
    console.error('[INSPECT] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/dat/health ───────────────────────────────────────────────────────
// Info sobre modelos soportados — sin autenticación para diagnóstico
app.get('/api/dat/health', (_req, res) => {
  res.json({
    status: 'ok',
    parser: 'bitafly-dat-parser-v1',
    supported: [
      'Phantom 3/4 (v1)', 'Mavic Pro/Air (v1)',
      'Mini 2/3/4 Pro (v2)', 'Air 2S (v2)',
      'Mavic 2 Pro/Zoom (v2)', 'Mavic 3/3E/3T (v2)',
      'Matrice 300/350 RTK (v2)', 'Agras T-series (v2)',
    ],
    unsupported: ['Avata 2 (cifrado propietario)', 'FPV Goggles logs'],
    maxFileSizeMb: 600,
  });
});

// ── POST /api/dat/parse ───────────────────────────────────────────────────────
// Recibe un archivo .dat DJI como multipart/form-data (campo "file")
// o como raw binary body (Content-Type: application/octet-stream)
// Devuelve: { path, telemetry, imu, alerts, meta } — mismo schema que .txt
app.post('/api/dat/parse', async (req, res) => {
  const startMs = Date.now();
  console.log('[DAT] Recibiendo archivo...');

  try {
    let fileBuffer;
    const ct = req.headers['content-type'] ?? '';

    if (ct.includes('multipart/form-data')) {
      // Extraer boundary del content-type
      const boundaryMatch = ct.match(/boundary=([^\s;]+)/);
      if (!boundaryMatch) {
        return res.status(400).json({ error: 'multipart sin boundary' });
      }
      const rawBody = await readRawBody(req);
      fileBuffer = extractMultipartFile(rawBody, boundaryMatch[1]);
      if (!fileBuffer) {
        return res.status(400).json({ error: 'No se encontró el archivo en el multipart' });
      }
    } else {
      // Raw binary body
      fileBuffer = await readRawBody(req);
    }

    console.log(`[DAT] Archivo recibido: ${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB`);

    // Parsear
    const result = parseDatBuffer(fileBuffer);

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    console.log(`[DAT] Parseado en ${elapsed}s — ${result.meta.totalFrames} frames GPS, ${result.meta.imuFrames} IMU`);

    // Agregar info de timing al meta
    result.meta.parseTimeS = parseFloat(elapsed);
    result.meta.fileSizeMb = parseFloat((fileBuffer.length / 1024 / 1024).toFixed(1));

    return res.json(result);

  } catch (err) {
    console.error('[DAT] Error:', err.message);
    const status = err.message.includes('demasiado grande') ? 413 : 422;
    return res.status(status).json({ error: err.message });
  }
});

// ── Iniciar servidor ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Robot] Escuchando en puerto ${PORT}`);
  console.log(`[Robot] Build: ${new Date().toISOString()}`);
  console.log(`[Robot] DAT parser: activo (máx 600 MB)`);
});
