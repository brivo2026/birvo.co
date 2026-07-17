import { Injectable } from '@nestjs/common';
import type { AuditAction } from '@birvo/contracts';
import type { Prisma } from '@birvo/database';
import { PrismaService } from '../../database/prisma.service';

export interface RecordAuditInput {
  organizationId: string;
  actorUserId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Registro de auditoría centralizado. Se inyecta en cualquier módulo que
 * necesite dejar traza de una acción sensible (login, envío de mensaje,
 * asignación, cambios de estado, gestión de miembros, etc.).
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditInput): Promise<void> {
    await this.prisma.client.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        // Cast justificado: el registro de auditoría acepta metadata
        // arbitraria por diseño (cada módulo registra lo relevante para su
        // acción); Prisma exige InputJsonValue para el campo Json.
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }
}
