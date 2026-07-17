import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  createContactSchema,
  listContactsQuerySchema,
  updateContactSchema,
  type CreateContactDto,
  type ListContactsQuery,
  type SessionUser,
  type UpdateContactDto,
} from '@birvo/contracts';
import { ContactsService } from './contacts.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../auth/dto/zod-dto';

@ApiTags('contacts')
@Controller({ path: 'contacts', version: '1' })
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(listContactsQuerySchema)) query: ListContactsQuery,
  ) {
    return this.contactsService.list(user.organizationId, query);
  }

  @Get(':contactId')
  getById(@CurrentUser() user: SessionUser, @Param('contactId') contactId: string) {
    return this.contactsService.getById(user.organizationId, contactId);
  }

  @Post()
  @RequirePermissions('contacts:manage')
  create(@CurrentUser() user: SessionUser, @Body(new ZodValidationPipe(createContactSchema)) dto: CreateContactDto) {
    return this.contactsService.create(user.organizationId, dto);
  }

  @Patch(':contactId')
  @RequirePermissions('contacts:manage')
  update(
    @CurrentUser() user: SessionUser,
    @Param('contactId') contactId: string,
    @Body(new ZodValidationPipe(updateContactSchema)) dto: UpdateContactDto,
  ) {
    return this.contactsService.update(user.organizationId, contactId, dto);
  }
}
