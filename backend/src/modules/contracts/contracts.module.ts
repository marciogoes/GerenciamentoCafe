import { Module }         from '@nestjs/common';
import { TypeOrmModule }  from '@nestjs/typeorm';
import { MailModule }     from '../mail/mail.module';

import { Cliente }            from './entities/cliente.entity';
import { Contrato }           from './entities/contrato.entity';
import { LancamentoMensal }   from './entities/lancamento-mensal.entity';
import { ReajusteContratual } from './entities/reajuste-contratual.entity';

import { ContractsService }  from './contracts.service';
import { ContractsCronService } from './contracts.cron';
import {
  ClientesController,
  ContratosController,
  LancamentosController,
} from './contracts.controller';

@Module({
  imports: [
    MailModule,
    TypeOrmModule.forFeature([
      Cliente,
      Contrato,
      LancamentoMensal,
      ReajusteContratual,
    ]),
  ],
  controllers: [
    ClientesController,
    ContratosController,
    LancamentosController,
  ],
  providers: [
    ContractsService,
    ContractsCronService,
  ],
  exports: [ContractsService],
})
export class ContractsModule {}
