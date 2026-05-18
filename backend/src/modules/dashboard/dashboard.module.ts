import { Module }        from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService }    from './dashboard.service';
import { AlertasCronService }  from './alertas.cron';
import { MailModule }          from '../mail/mail.module';

@Module({
  imports:     [MailModule],
  controllers: [DashboardController],
  providers:   [DashboardService, AlertasCronService],
  exports:     [DashboardService],
})
export class DashboardModule {}
