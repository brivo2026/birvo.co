// Valores por defecto seguros para que las pruebas unitarias puedan cargar
// los módulos de configuración (@birvo/config) sin depender del .env real
// del desarrollador ni de una base de datos/Redis reales.
process.env.NODE_ENV ??= 'test';
process.env.SESSION_JWT_SECRET ??= 'test-session-jwt-secret-0123456789';
process.env.CREDENTIALS_ENCRYPTION_KEY ??= 'test-credentials-encryption-key-01';
process.env.DATABASE_URL ??= 'postgresql://birvo:birvo@localhost:5432/birvo_test?schema=public';
process.env.REDIS_URL ??= 'redis://localhost:6379/1';
