# ADR-0006: Almacenamiento S3-compatible con adaptador local de respaldo

## Estado
Aceptado

## Contexto
`compose.yaml` provee MinIO como almacenamiento S3-compatible para adjuntos y notas de voz.
Sin embargo, algunos entornos de desarrollo (incluyendo el entorno donde se construyó esta
primera versión, ver ADR-0007) no siempre tienen Docker disponible.

## Decisión
Se define la interfaz `StorageProvider` (`upload`, `getSignedUrl`, `delete`, `exists`) con dos
implementaciones:
- `S3StorageProvider`: usa `@aws-sdk/client-s3` contra MinIO o cualquier S3 compatible.
- `LocalDiskStorageProvider`: guarda archivos bajo `STORAGE_LOCAL_PATH` y sirve URLs firmadas
  de corta duración a través de un endpoint propio de la API.

La selección se hace con `STORAGE_DRIVER=s3|local`. Por defecto en desarrollo es `local` para
que el MVP funcione sin Docker; `compose.yaml` y el README documentan cómo pasar a `s3` cuando
MinIO está disponible.

## Consecuencias
- El dominio (`attachments`, `transcriptions`) depende solo de `StorageProvider`, nunca del
  SDK de AWS ni del sistema de archivos directamente.
- Cambiar de almacenamiento es una variable de entorno, no un cambio de código.
