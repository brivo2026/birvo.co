import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Manejo centralizado de errores: normaliza la respuesta, evita filtrar
 * detalles internos en producción y siempre incluye el correlationId para
 * trazabilidad.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest & { correlationId?: string }>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException ? exception.getResponse() : undefined;

    const message = isHttpException
      ? typeof body === 'string'
        ? body
        : ((body as { message?: string | string[] })?.message ?? exception.message)
      : 'Ha ocurrido un error inesperado. Intenta nuevamente.';

    if (!isHttpException || status >= 500) {
      this.logger.error(
        `[${request.correlationId ?? 'sin-correlation-id'}] ${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    void response.status(status).send({
      statusCode: status,
      message,
      correlationId: request.correlationId,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
