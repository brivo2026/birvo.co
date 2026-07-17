/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEV_PASSWORD = 'Birvo#Dev2026'; // INSEGURA — solo development, ver README.

const SYSTEM_ROLES: Array<{ name: string; permissions: string[] }> = [
  {
    name: 'owner',
    permissions: [
      'org:manage',
      'members:manage',
      'channels:manage',
      'conversations:view_all',
      'conversations:view_assigned',
      'conversations:reply',
      'conversations:assign',
      'conversations:close',
      'contacts:manage',
      'tags:manage',
      'notes:manage',
      'automations:manage',
      'ai:configure',
      'analytics:view',
      'audit:view',
      'settings:manage',
    ],
  },
  {
    name: 'admin',
    permissions: [
      'members:manage',
      'channels:manage',
      'conversations:view_all',
      'conversations:reply',
      'conversations:assign',
      'conversations:close',
      'contacts:manage',
      'tags:manage',
      'notes:manage',
      'automations:manage',
      'ai:configure',
      'analytics:view',
      'audit:view',
      'settings:manage',
    ],
  },
  {
    name: 'supervisor',
    permissions: [
      'conversations:view_all',
      'conversations:reply',
      'conversations:assign',
      'conversations:close',
      'contacts:manage',
      'tags:manage',
      'notes:manage',
      'analytics:view',
    ],
  },
  {
    name: 'agent',
    permissions: [
      'conversations:view_assigned',
      'conversations:reply',
      'conversations:close',
      'contacts:manage',
      'tags:manage',
      'notes:manage',
    ],
  },
  {
    name: 'viewer',
    permissions: ['conversations:view_all', 'analytics:view'],
  },
];

async function main() {
  console.log('🌱 Sembrando datos demo de BIRVO...');
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  const organization = await prisma.organization.upsert({
    where: { slug: 'birvo-demo' },
    update: {},
    create: {
      name: 'BIRVO Demo',
      slug: 'birvo-demo',
      status: 'active',
      timezone: 'America/Bogota',
    },
  });

  const roles = new Map<string, string>();
  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: roleDef.name } },
      update: { permissions: roleDef.permissions },
      create: {
        organizationId: organization.id,
        name: roleDef.name,
        permissions: roleDef.permissions,
        isSystem: true,
      },
    });
    roles.set(roleDef.name, role.id);
  }

  const demoUsers = [
    { email: 'owner@birvo.local', name: 'Sofía Owner', role: 'owner' },
    { email: 'admin@birvo.local', name: 'Andrés Admin', role: 'admin' },
    { email: 'agent@birvo.local', name: 'Camila Agente', role: 'agent' },
  ];

  const users = new Map<string, { id: string }>();
  for (const demoUser of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {},
      create: {
        name: demoUser.name,
        email: demoUser.email,
        passwordHash,
        status: 'active',
      },
    });
    users.set(demoUser.email, user);

    await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
      update: {},
      create: {
        organizationId: organization.id,
        userId: user.id,
        roleId: roles.get(demoUser.role)!,
        status: 'active',
      },
    });
  }

  const sandboxChannel = await prisma.channelAccount.upsert({
    where: {
      organizationId_provider_externalAccountId: {
        organizationId: organization.id,
        provider: 'sandbox',
        externalAccountId: 'sandbox-main',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      provider: 'sandbox',
      externalAccountId: 'sandbox-main',
      displayName: 'Canal Sandbox (desarrollo)',
      status: 'active',
      metadata: { note: 'Canal de demostración sin credenciales externas' },
    },
  });

  await prisma.aiConfiguration.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: {
      organizationId: organization.id,
      aiEnabled: true,
      inactivityMinutes: 5,
      mode: 'suggestion',
      businessHoursStart: '08:00',
      businessHoursEnd: '18:00',
      businessDays: [1, 2, 3, 4, 5],
      maximumAutomaticReplies: 3,
      confidenceThreshold: 0.7,
      escalationKeywords: ['urgente', 'emergencia', 'reclamo', 'demanda'],
      excludedTopics: ['salud', 'legal', 'pagos', 'datos personales'],
    },
  });

  const tagLabels = [
    { name: 'Ventas', color: '#7C3AED' },
    { name: 'Soporte', color: '#1E3A8A' },
    { name: 'VIP', color: '#F59E0B' },
  ];
  const tags = new Map<string, { id: string }>();
  for (const t of tagLabels) {
    const tag = await prisma.tag.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: t.name } },
      update: {},
      create: { organizationId: organization.id, name: t.name, color: t.color },
    });
    tags.set(t.name, tag);
  }

  const demoContacts = [
    { name: 'Laura Gómez', phone: '+573001112233', email: 'laura.gomez@example.com', externalUserId: 'sandbox-contact-1' },
    { name: 'Carlos Pérez', phone: '+573004445566', email: 'carlos.perez@example.com', externalUserId: 'sandbox-contact-2' },
    { name: 'Valentina Ruiz', phone: '+573007778899', email: 'valentina.ruiz@example.com', externalUserId: 'sandbox-contact-3' },
  ];

  const agent = users.get('agent@birvo.local')!;

  for (const [index, c] of demoContacts.entries()) {
    const existingIdentity = await prisma.contactIdentity.findUnique({
      where: { channelAccountId_externalUserId: { channelAccountId: sandboxChannel.id, externalUserId: c.externalUserId } },
    });
    if (existingIdentity) continue;

    const contact = await prisma.contact.create({
      data: {
        organizationId: organization.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        identities: {
          create: {
            channelAccountId: sandboxChannel.id,
            provider: 'sandbox',
            externalUserId: c.externalUserId,
            username: c.name,
          },
        },
      },
    });

    const conversation = await prisma.conversation.create({
      data: {
        organizationId: organization.id,
        contactId: contact.id,
        channelAccountId: sandboxChannel.id,
        assignedUserId: index === 0 ? agent.id : null,
        status: index === 2 ? 'resolved' : 'open',
        aiMode: 'suggestion',
        lastMessageAt: new Date(),
        unreadCount: index === 1 ? 2 : 0,
        messages: {
          create: [
            {
              organizationId: organization.id,
              direction: 'inbound',
              senderType: 'contact',
              messageType: 'text',
              content: `Hola, soy ${c.name}. Quisiera más información sobre BIRVO 👋`,
              status: 'delivered',
              sentAt: new Date(Date.now() - 1000 * 60 * 30),
              deliveredAt: new Date(Date.now() - 1000 * 60 * 30),
              createdAt: new Date(Date.now() - 1000 * 60 * 30),
            },
            {
              organizationId: organization.id,
              direction: 'outbound',
              senderType: 'user',
              senderUserId: index === 0 ? agent.id : undefined,
              messageType: 'text',
              content: '¡Hola! Claro, con gusto te cuento. Un momento por favor.',
              status: 'read',
              sentAt: new Date(Date.now() - 1000 * 60 * 25),
              deliveredAt: new Date(Date.now() - 1000 * 60 * 25),
              readAt: new Date(Date.now() - 1000 * 60 * 24),
              createdAt: new Date(Date.now() - 1000 * 60 * 25),
            },
          ],
        },
      },
    });

    if (index === 0) {
      await prisma.conversationTag.create({
        data: { conversationId: conversation.id, tagId: tags.get('VIP')!.id },
      });
      await prisma.internalNote.create({
        data: {
          organizationId: organization.id,
          conversationId: conversation.id,
          authorUserId: agent.id,
          body: 'Cliente interesado en el plan Pro. Hacer seguimiento mañana.',
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      action: 'create',
      entityType: 'organization',
      entityId: organization.id,
      metadata: { source: 'seed' },
    },
  });

  console.log('✅ Seed completado.');
  console.log('   Organización: BIRVO Demo (birvo-demo)');
  console.log('   Usuarios demo (contraseña de desarrollo INSEGURA: %s):', DEV_PASSWORD);
  for (const u of demoUsers) console.log(`     - ${u.email} (${u.role})`);
}

main()
  .catch((error) => {
    console.error('❌ Error sembrando datos:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
