import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionUser } from '@birvo/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';
import { ChannelRegistryFactory } from './channel-registry.provider';

@ApiTags('channels')
@Controller({ path: 'channels', version: '1' })
export class ChannelsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ChannelRegistryFactory,
  ) {}

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    const accounts = await this.prisma.client.channelAccount.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'asc' },
    });

    return accounts.map((account) => {
      const adapter = this.registry.registry.has(account.provider)
        ? this.registry.registry.get(account.provider)
        : undefined;
      const isEnabled =
        account.provider === 'sandbox'
          ? true
          : ((adapter as { isEnabled?: () => boolean } | undefined)?.isEnabled?.() ?? false);

      return {
        id: account.publicId,
        provider: account.provider,
        displayName: account.displayName,
        status: account.status,
        isEnabled,
        createdAt: account.createdAt,
      };
    });
  }
}
