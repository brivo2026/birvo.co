# ADR-0004: Arquitectura de canales desacoplada

## Estado
Aceptado

## Contexto
BIRVO debe soportar WhatsApp, Instagram, Messenger y canales futuros sin acoplar el núcleo del
dominio a los payloads específicos de cada proveedor (que cambian con el tiempo y difieren
mucho entre sí).

## Decisión
Se define la interfaz `ChannelProviderAdapter` en `packages/channel-sdk` con los métodos:
`connect`, `disconnect`, `validateCredentials`, `normalizeWebhook`, `sendTextMessage`,
`sendMediaMessage`, `markAsRead`, `downloadAttachment`, `refreshCredentials`,
`verifyWebhookSignature`. Todo webhook entrante se transforma primero a un
`NormalizedInboundMessage` (definido en `packages/contracts`) antes de tocar cualquier caso de
uso de dominio. Ningún módulo de dominio conoce la forma de los payloads de Meta.

Se implementan tres adaptadores en el MVP:
1. `SandboxChannelAdapter` — totalmente funcional, sin credenciales externas, pensado para
   desarrollo y demo.
2. `MetaChannelAdapter` — estructura, contratos y verificación de firma HMAC listos; queda
   inactivo (`status: disabled`) si no hay credenciales de Meta configuradas.
3. `FutureChannelAdapter` — contrato de referencia documentado para nuevos canales.

## Consecuencias
- Añadir un canal nuevo implica implementar la interfaz y registrar el proveedor en el
  `ChannelRegistry`; no requiere tocar `conversations`, `messages` ni `contacts`.
- Los tests de dominio pueden ejecutarse íntegramente contra `SandboxChannelAdapter`.
