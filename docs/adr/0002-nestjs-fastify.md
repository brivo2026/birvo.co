# ADR-0002: NestJS 11 con adaptador Fastify

## Estado
Aceptado

## Contexto
Se requiere una API REST con Swagger, WebSocket Gateway, validación fuerte y buen rendimiento
bajo carga de webhooks entrantes.

## Decisión
Usar NestJS 11 con `@nestjs/platform-fastify` en lugar de Express. Fastify ofrece mejor
rendimiento en I/O intensivo (relevante para picos de webhooks) y buen soporte de esquemas.
Mantenemos `class-validator`/`class-transformer` para DTOs de NestJS, pero los contratos que
se comparten con el frontend (`packages/contracts`) se definen en Zod para evitar duplicar
tipos entre frontend y backend.

## Consecuencias
- Los `ValidationPipe` de Nest siguen funcionando igual con Fastify.
- Algunos middlewares de terceros pensados solo para Express no son compatibles; se usan
  los plugins oficiales de Fastify (`@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`,
  `@fastify/cookie`) en su lugar.
- Socket.IO se integra mediante `@nestjs/platform-socket.io`, compatible con el adaptador HTTP
  de Fastify.
