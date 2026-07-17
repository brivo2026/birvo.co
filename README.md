# BIRVO

**Tus conversaciones. Un solo lugar.**

BIRVO es una plataforma SaaS omnicanal que centraliza las conversaciones de WhatsApp,
Instagram, Messenger y, en el futuro, otros canales, en una sola bandeja para tu
equipo. Este repositorio contiene el MVP funcional: registro de organización, bandeja
unificada en tiempo real, asignación y etiquetado de conversaciones, notas internas,
asistencia de IA (sugerencia o respuesta automática) con modelo "humano primero",
transcripción simulada de notas de voz y analítica básica — todo ejecutable en local
sin ninguna credencial externa, gracias al canal **sandbox**.

## Índice

- [Stack técnico](#stack-técnico)
- [Estructura del monorepo](#estructura-del-monorepo)
- [Cómo ejecutarlo en local](#cómo-ejecutarlo-en-local)
- [Credenciales de demostración](#credenciales-de-demostración)
- [Comandos disponibles](#comandos-disponibles)
- [Arquitectura y decisiones](#arquitectura-y-decisiones)
- [Alcance de este MVP y próximos pasos](#alcance-de-este-mvp-y-próximos-pasos)

## Stack técnico

| Capa | Tecnología |
|---|---|
| Monorepo | pnpm workspaces + Turborepo, TypeScript estricto |
| Frontend (`apps/web`) | Next.js 16 (App Router), Tailwind CSS, componentes propios inspirados en shadcn/ui, TanStack Query, Zustand, React Hook Form + Zod, Socket.IO Client |
| Backend (`apps/api`) | NestJS 11 + Fastify, Swagger/OpenAPI, Socket.IO Gateway, Pino |
| Workers (`apps/worker`) | Node.js + BullMQ + Redis |
| Datos | PostgreSQL 18 + Prisma ORM |
| Infra local | Docker Compose (Postgres, Redis, MinIO, Mailpit) |

Ver el detalle completo de decisiones en [`docs/architecture/overview.md`](docs/architecture/overview.md)
y en las [ADR](docs/adr/).

## Estructura del monorepo

```
birvo/
├── apps/
│   ├── web/        Next.js — interfaz de usuario
│   ├── api/         NestJS — API REST + WebSocket Gateway
│   └── worker/       Node.js + BullMQ — procesamiento asíncrono
├── packages/
│   ├── ui/            Tokens de marca y componentes compartidos
│   ├── database/      Esquema Prisma, cliente, seeds
│   ├── contracts/      Esquemas Zod y tipos compartidos (API ⇄ Web ⇄ Worker)
│   ├── config/        Validación de variables de entorno
│   ├── logger/        Logger Pino estructurado
│   ├── channel-sdk/    Interfaz de canal + adaptadores (sandbox, Meta, futuro)
│   ├── ai-sdk/        Interfaz de IA + MockAiProvider + clasificador de seguridad
│   ├── eslint-config/  Configuración ESLint compartida
│   └── typescript-config/ tsconfig base compartidos
├── infrastructure/
│   ├── docker/         (reservado para Dockerfiles de producción)
│   └── scripts/        Scripts auxiliares de desarrollo
├── docs/
│   ├── architecture/    Visión general + diagramas Mermaid
│   ├── adr/             Decisiones de arquitectura registradas
│   ├── api/              Cómo consultar la documentación OpenAPI
│   └── integrations/     Estado de integraciones externas (Meta)
├── compose.yaml
├── turbo.json
└── pnpm-workspace.yaml
```

## Cómo ejecutarlo en local

Requisitos: Node.js ≥ 20, pnpm ≥ 9, Docker y Docker Compose.

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Esto levanta:

- **Web** → http://localhost:3000
- **API** → http://localhost:4000 (documentación interactiva en `/docs`)
- **Worker** → proceso en segundo plano (logs en la terminal)
- **MinIO** (consola) → http://localhost:9001
- **Mailpit** (correos de desarrollo) → http://localhost:8025

Por defecto `STORAGE_DRIVER=local` en `.env.example`, por lo que **no necesitas MinIO
para que el MVP funcione**: los adjuntos se guardan en `apps/api/storage/uploads`. Si
quieres probar el flujo S3-compatible real, cambia `STORAGE_DRIVER=s3` (con
`docker compose up -d` ya tendrás MinIO disponible) — ver ADR-0006.

### Primeros pasos dentro de la app

1. Inicia sesión con una de las [credenciales de demostración](#credenciales-de-demostración),
   o crea tu propia organización en `/register`.
2. Ve a `/dev/sandbox` (solo visible en `development`) y simula un mensaje entrante.
3. Ábrelo en `/inbox` — debería aparecer en tiempo real, sin recargar.
4. Respóndelo, asígnalo, agrégale una etiqueta y una nota interna.
5. En `/settings/ai`, activa la IA y baja el tiempo de inactividad a 1 minuto; espera
   (o usa el botón "Forzar IA ahora" en `/dev/sandbox`) para ver la sugerencia o
   respuesta automática.
6. Simula una nota de voz desde `/dev/sandbox` (tipo "Nota de voz") y observa cómo se
   transcribe automáticamente.
7. Revisa `/analytics` para ver las métricas agregadas.

### Sin Docker disponible

Si no tienes Docker, puedes usar instalaciones nativas de PostgreSQL 16+ y Redis
apuntando `DATABASE_URL` y `REDIS_URL` en tu `.env` a esos servicios, y dejar
`STORAGE_DRIVER=local`. Ver ADR-0007 para el detalle de cómo se validó este MVP en un
entorno sin Docker disponible.

## Credenciales de demostración

Creadas por `pnpm db:seed`, **solo para desarrollo**:

| Correo | Rol | Contraseña |
|---|---|---|
| `owner@birvo.local` | Owner | `Birvo#Dev2026` |
| `admin@birvo.local` | Admin | `Birvo#Dev2026` |
| `agent@birvo.local` | Agent | `Birvo#Dev2026` |

⚠️ Esta contraseña es deliberadamente insegura y está marcada como tal. BIRVO nunca
debe desplegarse fuera de `development` con estas credenciales; en producción, cada
organización se registra con su propio correo y contraseña vía `/register`, y el flujo
de invitación de miembros (`/team`) genera contraseñas temporales aleatorias.

## Comandos disponibles

Ejecutar desde la raíz del monorepo:

| Comando | Descripción |
|---|---|
| `pnpm dev` | Levanta web, api y worker en modo desarrollo (vía Turborepo) |
| `pnpm build` | Compila todos los paquetes y aplicaciones |
| `pnpm lint` | ESLint en todo el monorepo |
| `pnpm typecheck` | Verificación de tipos estricta en todo el monorepo |
| `pnpm test` | Pruebas unitarias/integración (Jest) de cada paquete/app |
| `pnpm test:e2e` | Pruebas end-to-end con Playwright (`apps/web`) — requiere el stack corriendo |
| `pnpm db:migrate` | Aplica migraciones de Prisma en desarrollo |
| `pnpm db:seed` | Siembra datos de demostración |
| `pnpm db:studio` | Abre Prisma Studio para inspeccionar la base de datos |

## Arquitectura y decisiones

- [`docs/architecture/overview.md`](docs/architecture/overview.md) — visión general,
  diagramas Mermaid del flujo de mensajes entrantes/salientes y del modelo operativo
  de IA.
- [`docs/adr/`](docs/adr/) — decisiones registradas (monolito modular, NestJS+Fastify,
  sesiones por cookie, arquitectura de canales, modelo de IA, almacenamiento,
  limitaciones del entorno de construcción).
- [`docs/integrations/meta.md`](docs/integrations/meta.md) — qué falta para activar
  WhatsApp/Instagram/Messenger reales.

## Alcance de este MVP y próximos pasos

Lo que **sí** incluye esta primera versión (ver Definición de Terminado del brief
original, sección 22): registro de organización, autenticación segura por cookie
httpOnly, bandeja unificada en tiempo real, canal sandbox completamente funcional,
envío/recepción de mensajes con estados sent/delivered/read, asignación, etiquetas,
notas internas, temporizador de inactividad configurable, sugerencia y respuesta
automática de IA con clasificador de seguridad ("humano primero"), transcripción
simulada de notas de voz con reintentos, analítica básica, auditoría, y pruebas
automatizadas de los flujos críticos.

Simplificaciones deliberadas, documentadas para transparencia:

- **Meta (WhatsApp/Instagram/Messenger)**: adaptador, contratos y verificación de
  firma completos; el mapeo de payloads reales queda pendiente de credenciales reales
  para poder implementarse de forma verificable (ver `docs/integrations/meta.md`).
- **Automatizaciones por palabra clave**: el modelo de datos (`Automation`,
  `AutomationRun`) está listo, pero el constructor visual de reglas personalizadas no
  se incluyó en esta versión; la automatización principal (temporizador de
  inactividad → IA) sí es completamente funcional.
- **Transcripción**: se modela como parte de la interfaz `AiProvider`
  (`transcribeAudio`) en vez de una interfaz `TranscriptionProvider` separada, para
  evitar duplicar dos contratos casi idénticos en el MVP.
- **PostgreSQL 18**: es la versión objetivo de `compose.yaml`; el entorno donde se
  construyó esta versión no tenía Docker disponible y se validó funcionalmente contra
  PostgreSQL 16 nativo — ver ADR-0007. No hay ninguna característica del esquema que
  dependa de PG18.

Próximos pasos razonables tras este MVP: implementar el mapeo real de Meta, un
constructor visual de automatizaciones, un proveedor de IA real (interfaz ya
preparada vía `AI_PROVIDER=openai`), y ampliar la cobertura de pruebas end-to-end.
