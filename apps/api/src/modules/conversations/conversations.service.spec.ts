import { ConversationsService } from './conversations.service';
import type { SessionUser } from '@birvo/contracts';

function buildUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    userId: 'user-1',
    name: 'Agente de prueba',
    email: 'agent@birvo.local',
    avatarUrl: null,
    organizationId: 'org-1',
    organizationName: 'BIRVO Demo',
    organizationSlug: 'birvo-demo',
    membershipId: 'membership-1',
    roleId: 'role-1',
    roleName: 'agent',
    permissions: ['conversations:view_assigned', 'conversations:reply'],
    ...overrides,
  };
}

describe('ConversationsService — aislamiento multiempresa y RBAC', () => {
  function buildService() {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      client: {
        conversation: { findMany, count, findFirst: jest.fn(), findUnique: jest.fn() },
        channelAccount: { findFirst: jest.fn() },
        tag: { findFirst: jest.fn() },
        user: { findUnique: jest.fn() },
      },
    };
    const audit = { record: jest.fn() };
    const realtime = { publish: jest.fn() };
    const queue = { cancelInactivityTimeout: jest.fn() };

    const service = new ConversationsService(prisma as never, audit as never, realtime as never, queue as never);
    return { service, findMany, count };
  }

  it('siempre filtra por organizationId del usuario autenticado, nunca por uno externo', async () => {
    const { service, findMany } = buildService();
    const user = buildUser({ permissions: ['conversations:view_all'] });

    await service.list(user, { page: 1, pageSize: 25 });

    const whereArg = findMany.mock.calls[0][0].where;
    expect(whereArg.organizationId).toBe('org-1');
  });

  it('restringe la lista a las conversaciones asignadas cuando el usuario no tiene conversations:view_all', async () => {
    const { service, findMany } = buildService();
    const user = buildUser(); // agent, sin conversations:view_all

    await service.list(user, { page: 1, pageSize: 25 });

    const whereArg = findMany.mock.calls[0][0].where;
    expect(whereArg.assignedUserId).toBe('user-1');
  });

  it('un supervisor con conversations:view_all puede pedir explícitamente "unassigned"', async () => {
    const { service, findMany } = buildService();
    const user = buildUser({ roleName: 'supervisor', permissions: ['conversations:view_all'] });

    await service.list(user, { page: 1, pageSize: 25, assignedUserId: 'unassigned' });

    const whereArg = findMany.mock.calls[0][0].where;
    expect(whereArg.assignedUserId).toBeNull();
  });
});
