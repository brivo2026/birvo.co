# ADR-0007: Entorno de construcción sin daemon Docker disponible

## Estado
Aceptado — decisión de ambigüedad menor, documentada según instrucción del proyecto.

## Contexto
Esta primera versión de BIRVO se construyó dentro de un contenedor de nube efímero que:
- Tiene el CLI de `docker` instalado pero **no** tiene el daemon Docker corriendo
  (`/var/run/docker.sock` no existe), por lo que `docker compose up` no puede ejecutarse ahí.
- Sí tiene binarios nativos de PostgreSQL 16 (no 18) y `redis-server` instalados localmente.
- No tiene MinIO instalado ni acceso para instalarlo como binario standalone verificado.

## Decisión
1. `compose.yaml` se escribe correctamente para el stack objetivo (`postgres:18-alpine`,
   `redis:7-alpine`, `minio/minio`, `axllent/mailpit`) — es el camino soportado y documentado
   para cualquier máquina de desarrollo con Docker Desktop / Docker Engine real, incluyendo la
   del usuario final.
2. Para **validar funcionalmente** el MVP dentro de este entorno de construcción sin Docker, se
   usó un modo alterno: PostgreSQL 16 nativo (vía `pg_ctlcluster`) y `redis-server` nativo,
   ambos escuchando en los mismos puertos por defecto (5432/6379) que espera `.env.example`, y
   `STORAGE_DRIVER=local` (ver ADR-0006) para evitar la dependencia de MinIO.
3. Se documenta explícitamente en el README que **PostgreSQL 18 es la versión objetivo** del
   proyecto; la diferencia 16→18 no afecta al MVP porque el schema de Prisma no usa
   características exclusivas de PG18. Se recomienda validar en PG18 antes de producción.

## Consecuencias
- Cualquier persona que clone el repositorio con Docker disponible sigue el camino estándar
  (`docker compose up -d`) sin ninguna diferencia.
- Este entorno de construcción documenta el camino alterno únicamente para dejar constancia de
  cómo se verificó el MVP end-to-end sin Docker.
