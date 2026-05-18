import { Module }      from '@nestjs/common';

import { SettingsController } from './settings.controller';
import { SettingsService }    from './settings.service';
import { TenantsModule }      from '../tenants/tenants.module';

@Module({
  imports: [
    TenantsModule,  // provê TenantsService via exports
  ],
  controllers: [SettingsController],
  providers:   [SettingsService],
  exports:     [SettingsService],
})
export class SettingsModule {}
