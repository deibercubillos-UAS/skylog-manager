# BitaFly (Skylog V2.0)

Plataforma SaaS de operaciones con drones para Colombia: bitácora y despacho, flota y mantenimiento, tiempos de servicio (RAC 100),
Sistema de Gestión de Seguridad Operacional (RAC 219), capacitación, reportes y expediente Aerocivil. Producción: <https://bitafly.com>.

## Empezar

```bash
npm install
cp .env.example .env.local   # completa las variables (ver CLAUDE.md)
npm run dev                  # http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `npm run build` | build de producción |
| `npm run lint` | ESLint |
| `npm run test:domain` | pruebas de las reglas de negocio (`packages/domain`) |
| `npm run test:integration` | pruebas de API (requiere servidor local y base de desarrollo) |

## Documentación

- **Guía del proyecto y convenciones**: [`CLAUDE.md`](CLAUDE.md)
- **Índice maestro** (normativa, diseño, decisiones, permisos): [`docs/skylog-v2/00-INDICE.md`](docs/skylog-v2/00-INDICE.md)
- Archivo histórico de la v1: [`docs/legacy-v1/`](docs/legacy-v1/)

## Estructura

```
src/app/(v2)/   aplicación autenticada y sus APIs
src/app/        sitio público, legales, blog, login/registro, APIs de socios y cron
src/lib/v2/     lógica del servidor
packages/       domain (reglas puras) y ui (componentes base)
supabase/       migraciones y baseline
tools/          barrido móvil y utilidades de CI
```
