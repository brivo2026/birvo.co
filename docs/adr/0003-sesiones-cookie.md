# ADR-0003: Sesiones por cookie httpOnly firmada en vez de JWT en localStorage

## Estado
Aceptado

## Contexto
BIRVO maneja datos sensibles de clientes finales (mensajes, notas, contactos). Guardar tokens
de sesión en `localStorage` expone la aplicación a robo de sesión vía XSS.

## Decisión
La sesión se materializa como un JWT firmado (HS256) guardado en una cookie `httpOnly`,
`sameSite=lax`, `secure` en producción, con expiración corta (`SESSION_TTL_HOURS`) y un
mecanismo de refresco silencioso antes de expirar. El JWT contiene `sub` (userId),
`organizationId`, `membershipId` y `roleId`. La revocación se soporta mediante una tabla de
sesiones activas (`sessionVersion` en `User` + lista de jti revocados) para permitir "cerrar
sesión en todos los dispositivos".

## Consecuencias
- El frontend nunca maneja el token directamente; todas las llamadas usan `credentials:
  include` y confían en la cookie.
- CSRF se mitiga con `sameSite=lax` + verificación de header `X-Requested-With` /
  origin-checking en mutaciones, ya que las cookies httpOnly no son legibles por JS pero sí
  vulnerables a CSRF si no se restringe el origen.
- El WebSocket handshake reutiliza la misma cookie de sesión para autenticar la conexión.
