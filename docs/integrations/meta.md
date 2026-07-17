# Integración con Meta (WhatsApp Cloud API, Instagram, Messenger)

## Estado actual

`MetaChannelAdapter` (`packages/channel-sdk/src/adapters/meta.adapter.ts`) implementa:

- Verificación de firma HMAC (`verifyWebhookSignature`), sin cambios respecto al MVP original.
- **Normalización real de webhooks entrantes** (`normalizeWebhook`):
  - WhatsApp Cloud API: `entry[].changes[].value.messages[]` (texto, imagen, audio, video,
    documento) y `entry[].changes[].value.statuses[]` (sent/delivered/read/failed).
  - Instagram / Messenger (Messenger Platform, formato compartido):
    `entry[].messaging[]` (texto y adjuntos con URL directa) y confirmaciones de entrega.
- **Envío real** (`sendTextMessage`, `sendMediaMessage`) contra la Graph API de Meta
  (`POST /{phone_number_id}/messages` para WhatsApp, `POST /me/messages` para
  Instagram/Messenger).
- **Marcado de lectura** (`markAsRead`).
- **Descarga de adjuntos** (`downloadAttachment`): WhatsApp requiere resolver primero el
  `media id` a una URL temporal autenticada (dos llamadas); Instagram/Messenger entregan
  una URL directa descargable.
- El controlador (`apps/api/src/modules/webhooks/webhooks.controller.ts`) ahora enruta por
  el `:provider` real de la URL (antes estaba fijo a `whatsapp`) y verifica la firma HMAC
  contra el **body crudo** de la petición (antes solo comprobaba que el header existiera,
  sin validar nada). El body crudo se conserva mediante un content-type parser propio en
  `apps/api/src/main.ts`.

Todo lo anterior sigue **desactivado** (`isEnabled() === false`) mientras no haya
credenciales configuradas (`META_APP_SECRET` + el token correspondiente), por lo que el
MVP sigue funcionando en local sin depender de una cuenta de Meta — ver ADR-0004.

## Sin verificar contra tráfico real

Esta implementación sigue el esquema público y estable documentado por Meta para cada
producto, pero **no se ha probado contra la Graph API real** (requiere una app de Meta
aprobada, un número de WhatsApp Business o página verificados, y tokens reales — algo que
no estaba disponible al escribir este código). Antes de confiar en ella en producción:

1. Configura una app en [Meta for Developers](https://developers.facebook.com/) con los
   productos "WhatsApp", "Instagram" y/o "Messenger".
2. Configura las variables de entorno: `META_APP_ID`, `META_APP_SECRET`,
   `META_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_CLOUD_API_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID`,
   `INSTAGRAM_PAGE_TOKEN`, `MESSENGER_PAGE_TOKEN`.
3. Configura el webhook en Meta apuntando a
   `https://<tu-dominio>/v1/webhooks/whatsapp` (o `/instagram` / `/messenger`), con el
   mismo `META_WEBHOOK_VERIFY_TOKEN`.
4. Envía un mensaje real de prueba y revisa los logs de `apps/worker` — si la forma exacta
   del payload no coincide con lo documentado (Meta cambia campos ocasionalmente entre
   versiones de la Graph API), ajusta `normalizeWhatsAppWebhook` /
   `normalizeMessengerStyleWebhook` en `meta.adapter.ts`.

## Limitación conocida: adjuntos entrantes no se descargan todavía

`processWebhookJob` (`apps/worker/src/processors/webhook.processor.ts`) crea el registro
`Attachment` con los metadatos del adjunto (tipo, mime, duración) pero **no descarga ni
almacena los bytes reales** — esto es igual para el canal sandbox. `downloadAttachment()`
ya está implementado y listo para usarse; falta conectarlo en el procesador del webhook
(descargar con el adaptador correspondiente y subirlo con el `StorageProvider` de
`apps/api`, que hoy no es accesible desde `apps/worker` — requeriría un paquete compartido
o mover la subida al flujo de la API).
