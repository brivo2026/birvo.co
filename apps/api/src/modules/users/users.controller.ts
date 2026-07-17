import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createUserSchema, type CreateUserDto, type SessionUser } from '@birvo/contracts';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../auth/dto/zod-dto';

@ApiTags('users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Sin @RequirePermissions: cualquier miembro autenticado puede ver la
  // lista de compañeros de equipo (necesario, por ejemplo, para el selector
  // de "asignar a" en la bandeja). Solo mutar miembros requiere permiso.
  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.usersService.list(user.organizationId);
  }

  @Post()
  @RequirePermissions('members:manage')
  create(@CurrentUser() user: SessionUser, @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto) {
    return this.usersService.create(user.organizationId, user.userId, dto);
  }

  @Patch(':membershipId/role')
  @RequirePermissions('members:manage')
  updateRole(
    @CurrentUser() user: SessionUser,
    @Param('membershipId') membershipId: string,
    @Body() body: { roleId: string },
  ) {
    return this.usersService.updateRole(user.organizationId, user.userId, membershipId, body.roleId);
  }

  @Patch(':membershipId/suspend')
  @RequirePermissions('members:manage')
  suspend(@CurrentUser() user: SessionUser, @Param('membershipId') membershipId: string) {
    return this.usersService.updateStatus(user.organizationId, user.userId, membershipId, 'suspended');
  }

  @Patch(':membershipId/reactivate')
  @RequirePermissions('members:manage')
  reactivate(@CurrentUser() user: SessionUser, @Param('membershipId') membershipId: string) {
    return this.usersService.updateStatus(user.organizationId, user.userId, membershipId, 'active');
  }
}
