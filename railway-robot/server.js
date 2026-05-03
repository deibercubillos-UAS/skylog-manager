/**
 * server.js — Bitafly AeroCivil Robot
 * Express microservice que recibe instrucciones de Vercel (Bitafly)
 * y ejecuta la automatización Playwright contra el portal AeroCivil.
 *
 * Puerto: Railway inyecta PORT automáticamente.
 * Autenticación: header x-api-secret debe coincidir con RAILWAY_API_SECRET.
 */

import express        from 'express';
import { runAutomation } from './automator.js';

const app    = express();
const SECRET = process.env.RAILWAY_API_SECRET;

if (!SECRET) {
  console.error('[FATAL] RAILWAY_API_SECRET no está configurado. Abortando.');
  process.exit(1);
}

app.use(express.json({ limit: '10mb' }));

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

// ── Iniciar servidor ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Robot] Escuchando en puerto ${PORT}`);
  console.log(`[Robot] Build: ${new Date().toISOString()}`);
});
