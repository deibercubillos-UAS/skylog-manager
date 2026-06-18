# Demo Enterprise — Pago por Vuelo (BitaFly)

Prototipo **clickable con datos simulados** del plan Enterprise pago-por-vuelo.
**Aislado** del proyecto principal: no importa nada de `../src`, no usa Supabase ni ePayco.

> ⚠️ Es una **simulación**. No hay pagos reales, base de datos ni API funcional.
> Sirve para mostrarle al cliente cómo funcionaría, antes de firmar contrato.
> El modelo completo está en `../docs/propuesta-enterprise-pay-per-flight.md`.

## Correr en local

```bash
cd demo-enterprise
npm install
npm run dev        # http://localhost:3100
```

## Estructura

```
demo-enterprise/
├── src/
│   ├── demo.config.js     ← white-label (nombre cliente, colores, precios)
│   └── app/
│       ├── layout.js      ← cinta de "simulación" + branding
│       ├── page.js        ← home: elige Vista Organización / Vista Piloto
│       ├── empresa/       ← dashboard de la organización (D3)
│       └── piloto/        ← flujo del piloto patrocinado (D4)
```

## White-label

Editar `src/demo.config.js`: `clientName`, `accent`, `navy`, `pricePerFlight`, etc.
Los colores se inyectan como variables CSS (`--brand-accent`, `--brand-navy`).

## Despliegue (Vercel — proyecto SEPARADO)

- Crear un **proyecto Vercel nuevo** (no el de producción) con **Root Directory = `demo-enterprise`**.
- Resultado: URL propia compartible (ej. `demo-bitafly-enterprise.vercel.app`).
- No comparte build, env vars ni base de datos con producción.

## Fases del demo

- **D1 — Scaffold** ✅ (app standalone, branding, home, placeholders)
- D2 — Datos mock + estado en memoria
- D3 — Vista Organización (dashboard)
- D4 — Vista Piloto (carga de vuelos → descuento de crédito)
- D5 — API + documentación
- D6 — Deploy a URL
