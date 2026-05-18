import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { Tenant }            from './entities/tenant.entity';
import { TenantsService }    from './tenants.service';
import { TenantsController } from './tenants.controller';
import { UsersModule }       from '../users/users.module';
import { MailModule }        from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant]),
    forwardRef(() => UsersModule),
    MailModule,
  ],
  controllers: [TenantsController],
  providers:   [TenantsService],
  exports:     [TenantsService],
})
export class TenantsModule {}
