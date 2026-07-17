# Integración con Meta (WhatsApp Cloud API, Instagram, Messenger)

## Estado en este MVP

`MetaChannelAdapter` (`packages/channel-sdk/src/adapters/meta.adapter.ts`) implementa el
contrato `ChannelProviderAdapter` completo, incluida la verificación de firma HMAC
(`verifyWebhookSignature`) y la validación de credenciales (`validateCredentials`). Sin
embargo, las llamadas que requieren red hacia la Graph API de Meta
(`sendTextMessage`, `sendMediaMessage`, `markAsRead`, `downloadAttachment`,
`normalizeWebhook`) están intencionalmente **desactivadas** hasta que se configuren
credenciales reales — ver `MetaChannelAdapter.isEnabled()`.

Esto es deliberado (ADR-0004): el MVP debe funcionar completamente en local sin
depender de una cuenta de Meta for Developers.

## Qué falta para activar la integración real

1. Crear una app en [Meta for Developers](https://developers.facebook.com/) con los
   productos "WhatsApp", "Instagram" y/o "Messenger".
2. Configurar las variables de entorno:
   - `META_APP_ID`, `META_APP_SECRET`
   - `META_WEBHOOK_VERIFY_TOKEN` (elegido por ti, se usa en la verificación del reto)
   - `WHATSAPP_CLOUD_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
   - `INSTAGRAM_PAGE_TOKEN`, `MESSENGER_PAGE_TOKEN`
3. Configurar el webhook en Meta apuntando a
   `https://<tu-dominio>/v1/webhooks/whatsapp` (o `instagram`/`messenger`), con el
   mismo `META_WEBHOOK_VERIFY_TOKEN`.
4. Implementar `normalizeWebhook()` en `MetaChannelAdapter` mapeando la estructura real
   de `entry[].messaging[]` (o `entry[].changes[]` para WhatsApp Cloud API) al modelo
   `NormalizedInboundMessage` de `@birvo/contracts`. El resto del sistema (contactos,
   conversaciones, mensajes, IA, tiempo real) no requiere ningún cambio: ya opera
   exclusivamente sobre el modelo normalizado.
5. Implementar `sendTextMessage` / `sendMediaMessage` con las llamadas REST reales a
   `graph.facebook.com/v20.0/...`.
6. Quitar el `throw` de "pendiente de credenciales" en cada método una vez probado.

## Por qué no se implementó completo en esta versión

Implementar el mapeo exacto de payloads reales de Meta sin poder probarlo contra la
API real (requiere una app aprobada, un número de WhatsApp Business verificado, y
tokens de larga duración) generaría código no verificable y con alto riesgo de
contener supuestos incorrectos sobre la forma exacta del payload. Se prefirió dejar el
contrato, la firma y la estructura completos y verificables (con pruebas), y no
inventar una integración de terceros no verificada (ver reglas del proyecto, §21).
