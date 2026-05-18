import { Module }           from '@nestjs/common';
import { TypeOrmModule }    from '@nestjs/typeorm';

import { RelatorioAgendado }      from './entities/relatorio-agendado.entity';
import { ReportsService }         from './reports.service';
import { ReportsController }      from './reports.controller';
import { ReportSchedulerService } from './report-scheduler.service';
import { MailModule }             from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RelatorioAgendado]),
    MailModule,   // provê MailService para envio de relatórios agendados
  ],
  controllers: [ReportsController],
  providers:   [ReportsService, ReportSchedulerService],
  exports:     [ReportsService, ReportSchedulerService],
})
export class ReportsModule {}
