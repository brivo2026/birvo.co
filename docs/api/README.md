# Documentación de la API

La API expone documentación OpenAPI/Swagger interactiva y autogenerada en:

```
http://localhost:4000/docs
```

Se genera desde los decoradores de NestJS (`@nestjs/swagger`) directamente sobre los
controladores reales en `apps/api/src/modules/*`, por lo que siempre está sincronizada
con el código. No se mantiene una copia estática de la especificación en este
repositorio para evitar que se desactualice.

## Autenticación

Todos los endpoints (salvo los marcados `@Public()`: registro, login, recuperación de
contraseña, verificación de webhooks, healthcheck) requieren la cookie de sesión
httpOnly `birvo_session`, emitida por `POST /v1/auth/login` o `POST /v1/auth/register`.
Al probar la API con herramientas como `curl` o Postman, usa `--cookie-jar` /
"Send cookies automatically" para conservarla entre solicitudes.

## Convenciones

- Todas las rutas de negocio están versionadas bajo `/v1`.
- Los identificadores expuestos en la API son siempre UUID públicos (`publicId`),
  nunca los identificadores internos (`cuid`) usados por Prisma.
- El `organizationId` nunca se acepta como parámetro: se deriva siempre de la sesión.
