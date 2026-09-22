# A.R.D.I.S.
Asistente personal de tareas, proyectos y agenda · Uso 100 % personal · v8 — 21 sep 2026

---

## 1. Qué es

Le hablas con naturalidad, te responde con voz, anota tareas, lleva proyectos con Gantt, te avisa lo que vence y guarda copia en Google Drive.
Vive en `/ardis` dentro del repo y la infraestructura de Bitafly, totalmente aislado. Costo: $0.

---

## 2. Bitafly: lo que NO se toca

Estado verificado (21 sep 2026): Supabase `skylog-manager` (ref `ilozajejhecskmhwxkui`, us-east-1) con **85 tablas en `public`**, todas con RLS y datos reales: `profiles`, `organizations`, `organization_members`, `flights`, `pilots`, `aircraft`, `sms_*`, `safety_*`, `training_*`, `epayco_plan_config`, `pending_subscriptions`, `billing_history`, `notifications`, `audit_log`, entre otras.

Intocable:
- **Schema `public` y `auth` completos.** ARDIS no lee, no escribe y no crea usuarios en Supabase Auth.
- **Todo archivo existente del repo** (`skylog-manager`): rutas, `middleware.ts`, layouts, `next.config`, `package.json`, estilos, `CLAUDE.md`.
- **Pagos ePayco y sus webhooks**, la app Android (Capacitor), el service worker y manifest de Bitafly (si existen).
- **Variables de entorno existentes de Vercel.** Solo se leen, nunca se renombran ni se editan.
- **Supabase Auth:** ARDIS usa un login propio (contraseña + cookie firmada) para no crear perfiles, miembros ni notificaciones en Bitafly.

---

## 3. Arquitectura

```
Voz (micrófono) → texto → parser de comandos (sin IA)
                               │ no reconocido
                               ▼
                      Gemini Flash (gratis) → confirmas → se aprende la frase
                               │
                 Acción → Supabase, schema "ardis" (servidor, clave admin confinada)
                               │
Respuesta en voz del navegador ◀┘

Avisos: Web Push (PWA) ← cron de GitHub Actions
Drive y Calendar: Google Apps Script (sin OAuth)
Siri: atajo → /api/ardis/capture
```

| Pieza | Herramienta | Costo |
|---|---|---|
| Web y API | Next.js dentro de Bitafly, Vercel Hobby | $0 |
| Datos | Supabase de Bitafly, schema `ardis` | $0 |
| IA | Parser propio + Gemini Flash (free tier) | $0 |
| Voz | Web Speech API del navegador | $0 |
| Avisos | Web Push + GitHub Actions | $0 |
| Drive/Calendar | Google Apps Script | $0 |

---

## 4. Voz y micrófono

ARDIS necesita permiso de micrófono. Tiene dos modos:
- **Pulsar para hablar:** mantienes el botón, hablas, sueltas. Para capturas rápidas.
- **Conversación:** un toque; ARDIS escucha, responde en voz alta y vuelve a escuchar solo. Si hablas mientras responde, se calla y te escucha. Terminas diciendo "gracias ARDIS" o tocando la pantalla.

Límites: solo escucha con la app abierta (no hay "Oye ARDIS" en segundo plano; para eso está Siri). Chrome recuerda el permiso; Safari en iPhone puede pedirlo cada sesión y fallar dentro de la app instalada, con el dictado del teclado como respaldo.

---

## 5. Datos (schema `ardis`)

```sql
create schema if not exists ardis;

create table ardis.projects (
  id uuid primary key default gen_random_uuid(),
  area text,                         -- SKY | WAS | BIT | PER
  name text not null,
  start_date date, due_date date,
  status text default 'active',      -- active | paused | done
  created_at timestamptz default now()
);

create table ardis.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references ardis.projects(id) on delete cascade,
  area text,
  title text not null,
  start_date date, due_at timestamptz,
  priority int default 2,            -- 1 alta · 2 media · 3 baja
  status text default 'inbox',       -- inbox | todo | waiting | done
  waiting_for text,
  recurrence text,                   -- weekly:MO | monthly:1
  depends_on uuid references ardis.tasks(id),
  done_at timestamptz,
  created_at timestamptz default now()
);

create table ardis.learned_phrases (
  pattern text primary key,
  action jsonb not null,
  hits int default 1
);

create table ardis.conversation (
  id int primary key default 1,
  summary text,                      -- resumen corto
  last jsonb                         -- últimos 4 mensajes
);

create table ardis.push_subscriptions (
  endpoint text primary key,
  keys jsonb not null,
  device text
);

-- Sin acceso para anon ni authenticated: solo el servidor (service_role)
alter table ardis.projects enable row level security;
alter table ardis.tasks enable row level security;
alter table ardis.learned_phrases enable row level security;
alter table ardis.conversation enable row level security;
alter table ardis.push_subscriptions enable row level security;
revoke all on schema ardis from anon, authenticated;
grant usage on schema ardis to service_role;
grant all on all tables in schema ardis to service_role;
```
Avance del proyecto = tareas hechas / total (se calcula, no se guarda).
Configuración única en Supabase: añadir `ardis` en API → Exposed schemas.

---

## 6. Comandos sin IA

| Dices | Acción |
|---|---|
| "tarea llamar a Iván mañana 3 pm SKY" | Crea la tarea |
| "listo llamar a Iván" | La completa |
| "pospón cotización al viernes" | Cambia la fecha |
| "avance inventario 70%" | Registra avance |
| "buenos días" / "qué sigue" / "cierre" | Resumen, siguiente tarea, cierre del día |
| Otra frase | Gemini la interpreta y pide confirmación |

**Aprendizaje:** si confirmas sin cambios, la frase se guarda como patrón (`llamar a {persona} {fecha}`) y la próxima vez se resuelve sin IA. Si la corriges, no se aprende.

---

## 7. Avisos, Drive, Calendar y Siri

**Web Push** (iPhone con la app instalada, iOS 16.4+; Mac; Windows). Cron en GitHub Actions contra `/api/ardis/cron`:
| Hora (Colombia) | Aviso |
|---|---|
| 6:30 lun–vie | Resumen del día |
| Cada hora | Vencimientos en menos de 24 h |
| 18:00 lun–vie | Recordatorio de cierre |
| Viernes 16:00 | Revisión semanal |
| Viernes 18:00 | Copia del Gantt y respaldo a Drive |

Sin avisos entre 21:00 y 6:00. Máximo 6 al día.

**Google Apps Script** (una URL, un secreto): leer reuniones de la semana, crear bloques en el calendario (con confirmación), copiar el Gantt a una hoja de cálculo por proyecto y guardar un respaldo JSON.

**Siri:** atajo "Anota en ARDIS" → dicta → POST a `/api/ardis/capture` con token → ARDIS responde "Anotado".

---

## 8. Variables de entorno (nuevas, en Vercel)

| Variable | Uso |
|---|---|
| `ARDIS_ENABLED` | `true`/`false`: apaga ARDIS al instante |
| `ARDIS_PASSWORD_HASH` | Hash bcrypt/scrypt de tu contraseña |
| `ARDIS_SESSION_SECRET` | Firma de la cookie de sesión |
| `ARDIS_SUPABASE_SERVICE_KEY` | Copia de la service_role, usada solo en `lib/ardis/admin.ts` |
| `ARDIS_GEMINI_KEY` / `ARDIS_GEMINI_MODEL` | IA gratuita (el modelo se verifica en AI Studio) |
| `NEXT_PUBLIC_ARDIS_VAPID_PUBLIC` / `ARDIS_VAPID_PRIVATE` | Web Push |
| `ARDIS_CRON_SECRET` | Autoriza el cron |
| `ARDIS_CAPTURE_TOKEN` | Autoriza el atajo de Siri |
| `ARDIS_GAS_URL` / `ARDIS_GAS_SECRET` | Apps Script |

La URL de Supabase se lee de la variable existente de Bitafly, sin modificarla.

---

## 9. Reglas de oro

1. **Aislamiento:** solo se crean archivos en `app/ardis/`, `app/api/ardis/`, `lib/ardis/`, `public/ardis/`, `supabase/migrations/*_ardis_*.sql`, `.github/workflows/ardis-*.yml` y `ARDIS.md`. Nada más.
2. **Bitafly intocable:** ningún archivo existente se modifica. Si algo lo exige (por ejemplo, excluir `/ardis` del middleware), se detiene el trabajo y se pide aprobación con el cambio mínimo exacto.
3. **Base de datos:** solo el schema `ardis`. Nunca `public` ni `auth`. Sin claves foráneas hacia Bitafly.
4. **Sin Supabase Auth:** login propio, sin crear usuarios en Bitafly.
5. **Clave admin confinada:** `ARDIS_SUPABASE_SERVICE_KEY` solo en `lib/ardis/admin.ts`, con `import 'server-only'` y `db: { schema: 'ardis' }`.
6. **Invisible:** toda ruta responde 404 si `ARDIS_ENABLED` no es `true` o no hay sesión válida (salvo `/ardis/entrar`). `noindex`, sin enlaces desde Bitafly, fuera del sitemap.
7. **Sin dependencias nuevas** salvo `chrono-node` y `web-push`. Lo demás (frappe-gantt) por CDN.
8. **Build verde:** `npm run build` y `npm run lint` antes de cada commit. Si falla, no se sube. Rama `ardis/*`.
9. **Datos:** solo títulos, fechas, áreas y nombres de pila. Nada reservado de Sky Motion, WAS ni clientes.
10. **Orden:** backend primero, frontend al final. Mientras tanto, la interfaz es básica y funcional.
11. **Continuidad:** al terminar cada fase, se entrega el **prompt completo de la siguiente fase** (§11), listo para pegar en una sesión nueva.

---

## 10. Plan por fases (en orden)

| Fase | Contenido | Listo cuando |
|---|---|---|
| **0 · Auditoría** | Leer `CLAUDE.md`; revisar `middleware.ts`, layout raíz, `next.config` (¿`output: 'export'` por Capacitor?), service worker, cron existentes. Solo lectura | Informe entregado y aprobado |
| **1 · Base** | Migración `ardis`, `lib/ardis/admin.ts`, login propio en `/ardis/entrar`, guard, kill switch, noindex, página `/ardis` básica | Solo tú entras; Bitafly igual |
| **2 · Motor** | CRUD de tareas y proyectos, parser con `chrono-node`, recurrentes, delegadas, dependencias, avance, tests del parser con `node:test` | 30 frases de prueba, ≥27 correctas |
| **3 · IA y voz** | Gemini Flash con salida JSON, confirmación, aprendizaje, resumen de conversación, voz (pulsar y conversación) | Conversación por voz completa |
| **4 · Integraciones** | Apps Script (Calendar, bloques, Gantt a Sheets, respaldo), cron en GitHub Actions, Web Push, captura de Siri | Resumen de las 6:30 llega al iPhone |
| **5 · Frontend final** | Diseño definitivo a tu gusto: pantalla de voz, hoy, proyectos con Gantt, inbox, PWA instalable | Una semana de uso diario sin fricción |

---

## 11. Prompt de inicio (pegar en Claude Code, en el repo `skylog-manager`)

```
Eres el desarrollador de ARDIS, un asistente personal privado que voy a alojar dentro
del repo de Bitafly (skylog-manager). Bitafly es un SaaS en producción con datos reales:
tu prioridad absoluta es NO afectarlo.

LEE PRIMERO: CLAUDE.md del repo y ARDIS.md (especificación completa de ARDIS).

REGLAS INNEGOCIABLES
1. Solo creas archivos en: app/ardis/, app/api/ardis/, lib/ardis/, public/ardis/,
   supabase/migrations/*_ardis_*.sql, .github/workflows/ardis-*.yml, ARDIS.md.
2. No modificas ningún archivo existente. Si algo lo exige, DETENTE, explica el cambio
   mínimo exacto (archivo, líneas, motivo) y espera mi aprobación.
3. Base de datos: solo schema "ardis". Prohibido leer o escribir en "public" o "auth".
   Nunca crear usuarios en Supabase Auth.
4. Login propio: contraseña (ARDIS_PASSWORD_HASH) + cookie httpOnly firmada
   (ARDIS_SESSION_SECRET). Sin Supabase Auth.
5. La service_role solo en lib/ardis/admin.ts ('server-only', db.schema = 'ardis').
6. Toda ruta de ARDIS devuelve 404 si ARDIS_ENABLED !== 'true' o no hay sesión,
   excepto /ardis/entrar. Rutas de sistema (/api/ardis/cron, /api/ardis/capture)
   se validan con su secreto. Metadatos noindex en todo ARDIS.
7. Dependencias permitidas: chrono-node y web-push. Cualquier otra: pregunta.
8. Variables nuevas solo con prefijo ARDIS_ o NEXT_PUBLIC_ARDIS_.
9. Backend primero. El frontend se mantiene básico y funcional hasta la fase 5.
10. Antes de terminar cada fase: npm run build y npm run lint sin errores.
11. Trabaja en la rama ardis/fase-N. Commits con prefijo "ardis:".

FASE 0 — AUDITORÍA (solo lectura, no modifiques nada)
Responde con evidencia (archivo y línea):
a) ¿Existe middleware.ts? ¿Su matcher afectaría /ardis o /api/ardis?
b) ¿Qué carga el layout raíz (analytics, scripts, providers de auth) que ARDIS heredaría?
c) next.config: ¿usa output: 'export' u otra opción que rompa route handlers?
   ¿Cómo empaqueta Capacitor la app? ¿ARDIS terminaría dentro del APK?
d) ¿Hay service worker o manifest? ¿Con qué scope?
e) ¿Hay workflows en .github/workflows o crons en vercel.json?
f) ¿Cómo se crea el cliente de Supabase y qué variables usa?
g) Riesgos detectados y, para cada uno, la solución que no toca Bitafly
   (o el cambio mínimo si es inevitable).

ENTREGA DE CADA FASE (obligatorio)
1. Resumen: archivos creados, decisiones tomadas y pendientes.
2. Resultado de build y lint.
3. Qué debo hacer yo (variables, configuración, pruebas manuales).
4. PROMPT COMPLETO DE LA SIGUIENTE FASE, autocontenido, para pegarlo en una sesión
   nueva: contexto de ARDIS, reglas innegociables (copiadas íntegras), estado actual,
   archivos existentes de ARDIS, objetivos de la fase con criterio de "listo" y este
   mismo bloque de "Entrega de cada fase". Orden de fases: 0 auditoría → 1 base →
   2 motor → 3 IA y voz → 4 integraciones → 5 frontend final.

Empieza por la Fase 0.
```

---

## 12. Antes de empezar

- [ ] Copiar este archivo como `ARDIS.md` en la raíz del repo, en la rama `ardis/fase-0`
- [ ] Probar el micrófono en Safari del iPhone
- [ ] Clave gratuita de Gemini en Google AI Studio
- [ ] Generar las claves VAPID (`npx web-push generate-vapid-keys`) y los secretos

---

## 13. Google Apps Script (Fase 4)

El script vive fuera del repo, en [script.google.com](https://script.google.com) — esto es
la referencia para crearlo.

**Pasos:**
1. `script.google.com` → **Nuevo proyecto**.
2. Pega el código de abajo (reemplaza el `Code.gs` que trae por defecto).
3. **Configuración del proyecto** (ícono de engranaje) → **Propiedades del script** → agrega
   `ARDIS_GAS_SECRET` con un valor aleatorio largo (el mismo que pondrás en Vercel como
   `ARDIS_GAS_SECRET`).
4. **Implementar** → **Nueva implementación** → tipo **Aplicación web** → Ejecutar como: **Yo**,
   Quién tiene acceso: **Cualquier usuario**.
5. Copia la URL que te da (termina en `/exec`) → esa es `ARDIS_GAS_URL` en Vercel.
6. La primera vez te pedirá autorizar permisos de Calendar/Sheets/Drive — acéptalos (es tu
   propia cuenta, tu propio script).

```javascript
const GAS_SECRET_PROPERTY = 'ARDIS_GAS_SECRET';
const BACKUP_FOLDER_NAME = 'ARDIS backups';

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: 'JSON inválido' });
  }

  const expectedSecret = PropertiesService.getScriptProperties().getProperty(GAS_SECRET_PROPERTY);
  if (!expectedSecret || body.secret !== expectedSecret) {
    return jsonResponse({ error: 'No autorizado' });
  }

  try {
    switch (body.action) {
      case 'get_week_meetings':
        return jsonResponse({ meetings: getWeekMeetings() });
      case 'create_calendar_block':
        return jsonResponse({ event: createCalendarBlock(body.payload) });
      case 'sync_gantt':
        syncGantt(body.payload);
        return jsonResponse({ ok: true });
      case 'backup':
        return jsonResponse({ ok: true, file: backupToDrive(body.payload) });
      default:
        return jsonResponse({ error: 'Acción desconocida' });
    }
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getWeekMeetings() {
  const cal = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return cal.getEvents(start, end).map(function (ev) {
    return { title: ev.getTitle(), start: ev.getStartTime(), end: ev.getEndTime() };
  });
}

function createCalendarBlock(payload) {
  const cal = CalendarApp.getDefaultCalendar();
  const ev = cal.createEvent(payload.title, new Date(payload.start), new Date(payload.end));
  return { id: ev.getId(), title: ev.getTitle() };
}

function getGanttSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('GANTT_SHEET_ID');
  if (savedId) {
    try {
      return SpreadsheetApp.openById(savedId);
    } catch (err) {
      // El archivo pudo haberse borrado o movido — se crea uno nuevo abajo.
    }
  }
  const ss = SpreadsheetApp.create('ARDIS Gantt');
  props.setProperty('GANTT_SHEET_ID', ss.getId());
  return ss;
}

function syncGantt(payload) {
  const ss = getGanttSpreadsheet();
  let sheet = ss.getSheetByName(payload.projectName);
  if (!sheet) sheet = ss.insertSheet(payload.projectName);
  sheet.clear();
  sheet.appendRow(['Título', 'Estado', 'Inicio', 'Vence']);
  (payload.tasks || []).forEach(function (t) {
    sheet.appendRow([t.title, t.status, t.start_date || '', t.due_at || '']);
  });
}

function backupToDrive(payload) {
  const folders = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(BACKUP_FOLDER_NAME);
  const filename = 'ardis-backup-' + new Date().toISOString() + '.json';
  const file = folder.createFile(filename, JSON.stringify(payload), MimeType.PLAIN_TEXT);
  return file.getName();
}
```

**Nota:** `syncGantt` crea la hoja "ARDIS Gantt" la primera vez que corre y guarda su ID en las
Propiedades del script (`GANTT_SHEET_ID`) — las siguientes veces reusa la misma hoja, con una
pestaña por proyecto.
