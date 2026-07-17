import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ROLE_PERMISSIONS, RoleName } from '@birvo/contracts';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.client.user.findUnique({ where: { email } });
  }

  findOrganizationBySlug(slug: string) {
    return this.prisma.client.organization.findUnique({ where: { slug } });
  }

  async createOrganizationWithOwner(input: {
    organizationName: string;
    slug: string;
    timezone: string;
    ownerName: string;
    ownerEmail: string;
    passwordHash: string;
  }) {
    return this.prisma.client.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug: input.slug,
          timezone: input.timezone,
          status: 'active',
        },
      });

      const roles = await Promise.all(
        Object.values(RoleName).map((roleName) =>
          tx.role.create({
            data: {
              organizationId: organization.id,
              name: roleName,
              permissions: ROLE_PERMISSIONS[roleName],
              isSystem: true,
            },
          }),
        ),
      );
      const ownerRole = roles.find((r) => r.name === RoleName.OWNER)!;

      const user = await tx.user.create({
        data: {
          name: input.ownerName,
          email: input.ownerEmail,
          passwordHash: input.passwordHash,
          status: 'active',
        },
      });

      const membership = await tx.membership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          roleId: ownerRole.id,
          status: 'active',
        },
        include: { role: true, user: true, organization: true },
      });

      await tx.aiConfiguration.create({
        data: { organizationId: organization.id },
      });

      const sandbox = await tx.channelAccount.create({
        data: {
          organizationId: organization.id,
          provider: 'sandbox',
          externalAccountId: 'sandbox-main',
          displayName: 'Canal Sandbox (desarrollo)',
          status: 'active',
        },
      });

      return { organization, user, membership, sandbox };
    });
  }

  findMembershipById(membershipId: string) {
    return this.prisma.client.membership.findUnique({
      where: { id: membershipId },
      include: { user: true, role: true, organization: true },
    });
  }

  incrementSessionVersion(userId: string) {
    return this.prisma.client.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    });
  }

  registerFailedLogin(userId: string, lockUntil?: Date) {
    return this.prisma.client.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
        lockedUntil: lockUntil,
      },
    });
  }

  resetFailedLogins(userId: string) {
    return this.prisma.client.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }
}
