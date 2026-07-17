import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { parse } from 'cookie';
import {
  organizationRoom,
  REALTIME_EVENTS_CHANNEL,
  SocketEvent,
  userRoom,
  type RealtimeEventEnvelope,
} from '@birvo/contracts';
import { SessionService } from '../common/services/session.service';
import { PrismaService } from '../database/prisma.service';
import { RedisConnectionFactory } from '../queue/redis.provider';

/**
 * Gateway de Socket.IO. Autentica el handshake reutilizando la misma
 * cookie de sesión que la API REST (ver ADR-0003) y agrega el socket a las
 * rooms `organization:{id}` y `user:{id}`. Un usuario NUNCA puede unirse a
 * la room de otra organización porque el organizationId se deriva de la
 * sesión verificada, no de un parámetro del cliente.
 *
 * También se suscribe al canal de Redis Pub/Sub que usa apps/worker para
 * notificar cambios de dominio ocurridos en otro proceso, y los reemite a
 * las rooms correspondientes.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  path: '/socket.io',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private subscriberStarted = false;

  constructor(
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisConnectionFactory,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.subscriberStarted) return;
    this.subscriberStarted = true;

    const subscriber = this.redis.connection.duplicate();
    await subscriber.subscribe(REALTIME_EVENTS_CHANNEL);
    subscriber.on('message', (_channel, message) => {
      try {
        const envelope = JSON.parse(message) as RealtimeEventEnvelope;
        this.server.to(envelope.room).emit(envelope.event, envelope.payload);
      } catch (error) {
        this.logger.error('No se pudo procesar un evento de tiempo real entrante', error as Error);
      }
    });
    this.logger.log(`Suscrito a eventos de dominio en "${REALTIME_EVENTS_CHANNEL}"`);
  }

  async onModuleDestroy(): Promise<void> {
    // La conexión duplicada de Redis se cierra junto con el proceso.
  }

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const cookieHeader = client.handshake.headers.cookie;
      if (!cookieHeader) throw new Error('Sin cookie de sesión');

      const cookies = parse(cookieHeader);
      const token = cookies[this.sessionService.cookieName];
      if (!token) throw new Error('Sin token de sesión');

      const payload = this.sessionService.verify(token);
      const membership = await this.prisma.client.membership.findFirst({
        where: { id: payload.membershipId, status: 'active' },
        include: { user: true },
      });

      if (!membership || membership.user.sessionVersion !== payload.sessionVersion) {
        throw new Error('Sesión inválida');
      }

      client.data.userId = membership.userId;
      client.data.organizationId = membership.organizationId;

      await client.join(organizationRoom(membership.organizationId));
      await client.join(userRoom(membership.userId));

      this.server.to(organizationRoom(membership.organizationId)).emit(SocketEvent.USER_PRESENCE_UPDATED, {
        userId: membership.userId,
        status: 'online',
      });
    } catch (error) {
      this.logger.warn(`Conexión WebSocket rechazada: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const organizationId = client.data.organizationId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (organizationId && userId) {
      this.server.to(organizationRoom(organizationId)).emit(SocketEvent.USER_PRESENCE_UPDATED, {
        userId,
        status: 'offline',
      });
    }
  }
}
