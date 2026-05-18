import { Module }        from '@nestjs/common';
import { JwtModule }    from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService }    from './super-admin.service';
import { TenantsModule }        from '../tenants/tenants.module';

@Module({
  imports: [
    ConfigModule,               // provê ConfigService para JWT secret
    JwtModule.register({}),     // factory sem secret fixo — service usa .sign() com secret explícito
    TenantsModule,              // provê TenantsService via exports
  ],
  controllers: [SuperAdminController],
  providers:   [SuperAdminService],
})
export class SuperAdminModule {}
