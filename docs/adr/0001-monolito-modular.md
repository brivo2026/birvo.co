# ADR-0001: Monolito modular en lugar de microservicios

## Estado
Aceptado

## Contexto
El MVP de BIRVO necesita entregar rápidamente una bandeja omnicanal funcional. El dominio
(conversaciones, mensajes, contactos, automatizaciones, IA) tiene transacciones que cruzan
varios "módulos" con frecuencia (p. ej. un mensaje entrante toca Contact, Conversation,
Message, Automation y Notification en la misma unidad de trabajo).

## Decisión
Construir un monolito modular: tres aplicaciones (`web`, `api`, `worker`) con módulos de
dominio internos bien delimitados dentro de `api` (`src/modules/<dominio>`), cada uno separado
en dominio, casos de uso, infraestructura, controladores y DTOs. No se crean microservicios
independientes por dominio.

## Consecuencias
- Menor complejidad operativa: un solo proceso API + un worker, sin orquestación de red entre
  servicios internos ni contratos gRPC/mensajería entre ellos.
- Transacciones de base de datos simples (Prisma `$transaction`) para flujos multi-entidad.
- Preparado para extracción futura: cada módulo expone su propio `*.module.ts`, sus
  repositorios implementan interfaces (puertos), y la comunicación entre dominios ocurre por
  casos de uso inyectados, no por acceso directo a repositorios de otro dominio. Esto permite
  extraer, por ejemplo, `webhooks` + `channels` a un servicio de ingestión aparte sin romper
  contratos si en el futuro el volumen lo justifica.
