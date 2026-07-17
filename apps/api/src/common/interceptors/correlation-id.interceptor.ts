import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';

const HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest & { correlationId?: string }>();
    const response = http.getResponse<FastifyReply>();

    const incoming = request.headers[HEADER];
    const correlationId = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();

    request.correlationId = correlationId;
    void response.header(HEADER, correlationId);

    return next.handle();
  }
}
