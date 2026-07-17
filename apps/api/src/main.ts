import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import { AppModule } from './app.module';
import { loadEnv } from '@birvo/config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';

async function bootstrap() {
  const env = loadEnv();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
    { bufferLogs: true },
  );

  const logger = new Logger('Bootstrap');

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  });

  await app.register(fastifyCookie, {
    secret: env.SESSION_JWT_SECRET,
  });

  await app.register(fastifyMultipart, {
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB máximo por adjunto
  });

  await app.register(fastifyRateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  });

  const corsOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new CorrelationIdInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BIRVO API')
    .setDescription('API de la plataforma BIRVO — "Tus conversaciones. Un solo lugar."')
    .setVersion('0.1.0')
    .addCookieAuth(env.SESSION_COOKIE_NAME)
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(env.API_PORT, env.API_HOST);
  logger.log(`🚀 BIRVO API escuchando en ${env.API_BASE_URL} (docs en /docs)`);
}

bootstrap().catch((error) => {
  console.error('Error fatal al iniciar BIRVO API:', error);
  process.exit(1);
});
