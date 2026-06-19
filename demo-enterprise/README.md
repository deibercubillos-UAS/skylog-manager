# Demo Enterprise — Pago por Vuelo (BitaFly)

Prototipo **clickable con datos simulados** del plan Enterprise pago-por-vuelo.
**Aislado** del proyecto principal: no importa nada de `../src`, no usa Supabase ni ePayco.

> ⚠️ Es una **simulación**. No hay pagos reales, base de datos ni API funcional.
> Sirve para mostrarle al cliente cómo funcionaría, antes de firmar contrato.
> El modelo completo está en `../docs/propuesta-enterprise-pay-per-flight.md`.

## 🔗 Demo en vivo

- **URL:** https://demo-bitafly-enterprise.vercel.app
- **Contraseña:** `12345678` (gate liviano client-side; no es seguridad real)
- Proyecto Vercel **separado** (`demo-bitafly-enterprise`), auto-deploy desde `main`
  con **Root Directory = `demo-enterprise`**. Independiente de producción.

## Correr en local

```bash
cd demo-enterprise
npm install
npm run dev        # http://localhost:3100
```

## Anexos (cómo se ve el perfil de la organización)

Mockups fieles del demo en funcionamiento: [`docs/ANEXOS.md`](docs/ANEXOS.md)
1. Dashboard de la organización · 2. Programar misión · 3. Replay GPS + cumplimiento · 4. API.

## Estructura

```
demo-enterprise/
├── docs/
│   ├── ANEXOS.md          ← anexos de imágenes (perfil de la organización)
│   └── anexos/*.svg       ← mockups vectoriales
├── src/
│   ├── demo.config.js     ← white-label (nombre cliente, colores, precios)
│   ├── lib/               ← demoStore, mockData, genPath (GPS+cumplimiento), apiSamples, apiDocsPdf
│   ├── components/        ← Icon, PasswordGate, FlightReplayModal, enterprise/, pilot/
│   └── app/
│       ├── layout.js      ← cinta "simulación" + gate de contraseña + branding
│       ├── page.js        ← home: elige Vista Organización / Vista Piloto
│       ├── empresa/       ← dashboard de la organización (+ /empresa/api)
│       └── piloto/        ← flujo del piloto patrocinado
```

## White-label

Editar `src/demo.config.js`: `clientName`, `accent`, `navy`, `pricePerFlight`, etc.
Los colores se inyectan como variables CSS (`--brand-accent`, `--brand-navy`).
Al hacer push, Vercel redespliega solo.

## Funcionalidades incluidas

- **Dashboard organización**: medidor de créditos prepago, alertas de saldo (100/50/25/10/5),
  letrero flotante y bloqueo (rechazo duro) en saldo 0, KPIs, recarga por paquetes.
- **Pilotos patrocinados**: alta por correo, estados (pendiente/activo/revocado), revocar.
- **Misiones**: programación RAC 100 (con ID de seguimiento `OP-26-NNN`), reasignación,
  "simular vuelo".
- **Vista piloto**: invitación → aceptación → misiones asignadas → carga de vuelos
  (descuenta crédito de la organización) con badge "Asignado por la organización".
- **Replay GPS**: visor SVG animado + cumplimiento de ruta (tolerancia 100 m).
- **API**: `/flights`, `/flights/{id}` (GPS + cruce de ruta), `/missions`, `/usage`,
  documentación interna + PDF descargable.
- **Responsive**: optimizado para PC y celular.

## Fases del demo

- **D1 — Scaffold** ✅
- **D2 — Datos mock + estado en memoria** ✅
- **D3 — Vista Organización (dashboard)** ✅
- **D4 — Vista Piloto (carga de vuelos → descuento de crédito)** ✅
- **D5 — API + documentación** ✅
- **D6 — Deploy a URL** ✅ (en vivo)

Extras posteriores: replay GPS, programar misión RAC 100, ID de seguimiento +
cumplimiento de ruta en API, mejora responsive PC/móvil, anexos de imágenes.
