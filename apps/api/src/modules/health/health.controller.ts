import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';
import { RedisConnectionFactory } from '../../queue/redis.provider';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisConnectionFactory,
  ) {}

  @Get()
  @Public()
  async check() {
    const [database, redis] = await Promise.allSettled([
      this.prisma.client.$queryRaw`SELECT 1`,
      this.redis.connection.ping(),
    ]);

    const status =
      database.status === 'fulfilled' && redis.status === 'fulfilled' ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      dependencies: {
        database: database.status === 'fulfilled' ? 'up' : 'down',
        redis: redis.status === 'fulfilled' ? 'up' : 'down',
      },
    };
  }

  @Get('live')
  @Public()
  live() {
    return { status: 'ok' };
  }
}
