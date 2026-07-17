import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}
