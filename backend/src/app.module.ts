import { Module }              from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }      from '@nestjs/typeorm';
import { ThrottlerModule }    from '@nestjs/throttler';
import { ScheduleModule }     from '@nestjs/schedule';

import { AuthModule }      from './modules/auth/auth.module';
import { UsersModule }     from './modules/users/users.module';
import { TenantsModule }   from './modules/tenants/tenants.module';
import { MailModule }      from './modules/mail/mail.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MachinesModule }   from './modules/machines/machines.module';
import { ContractsModule }  from './modules/contracts/contracts.module';
import { StockModule }      from './modules/stock/stock.module';
import { ReportsModule }    from './modules/reports/reports.module';
import { ImportModule }      from './modules/import/import.module';
import { ActivitiesModule }  from './modules/activities/activities.module';  // Sprint 14
import { DosesModule }       from './modules/doses/doses.module';              // Sprint 13
import { GastosModule }      from './modules/gastos/gastos.module';            // Sprint 13
import { ManutencaoModule }  from './modules/manutencao/manutencao.module';    // Sprint 15
import { SuperAdminModule }  from './modules/super-admin/super-admin.module';  // Sprint 16
import { SettingsModule }    from './modules/settings/settings.module';        // Sprint 16
import { AuditModule }     from './modules/audit/audit.module';
import { HealthModule }    from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    TypeOrmModule.forRootAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type:        'mysql',
        host:        cfg.get('DB_HOST'),
        port:        cfg.get<number>('DB_PORT'),
        database:    cfg.get('DB_NAME'),
        username:    cfg.get('DB_USER'),
        password:    cfg.get('DB_PASSWORD'),
        charset:     'utf8mb4',
        timezone:    '-03:00',
        entities:    [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging:     cfg.get('APP_ENV') === 'development',
        extra:       { connectionLimit: 10, waitForConnections: true },
      }),
    }),

    ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: 120 }]),
    ScheduleModule.forRoot(),

    AuditModule,          // @Global() — deve vir antes dos módulos que usam AuditService
    MailModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    DashboardModule,
    MachinesModule,
    ContractsModule,
    StockModule,
    ReportsModule,
    ImportModule,
    ActivitiesModule,      // Sprint 14
    DosesModule,           // Sprint 13
    GastosModule,          // Sprint 13
    ManutencaoModule,      // Sprint 15
    SuperAdminModule,      // Sprint 16
    SettingsModule,        // Sprint 16
    HealthModule,
  ],
})
export class AppModule {}
