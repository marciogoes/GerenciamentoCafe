import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { Usuario }           from './entities/usuario.entity';
import { UsersService }      from './users.service';
import { UsersController }   from './users.controller';
import { TenantsModule }     from '../tenants/tenants.module';
import { MailModule }        from '../mail/mail.module';

@Module({
  imports:     [
    TypeOrmModule.forFeature([Usuario]),
    forwardRef(() => TenantsModule),
    MailModule,
  ],
  providers:   [UsersService],
  controllers: [UsersController],
  exports:     [UsersService],
})
export class UsersModule {}
