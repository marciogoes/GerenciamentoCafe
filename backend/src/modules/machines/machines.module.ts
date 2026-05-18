import { Module }           from '@nestjs/common';
import { TypeOrmModule }    from '@nestjs/typeorm';

import { ModeloCatalogo }      from './entities/modelo-catalogo.entity';
import { Maquina }             from './entities/maquina.entity';
import { MovimentacaoMaquina } from './entities/movimentacao-maquina.entity';
import { MachinesService }     from './machines.service';
import {
  CatalogController,
  MachinesController,
  MovementsController,
} from './machines.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ModeloCatalogo, Maquina, MovimentacaoMaquina]),
  ],
  controllers: [CatalogController, MachinesController, MovementsController],
  providers:   [MachinesService],
  exports:     [MachinesService],  // exportado para uso no DashboardModule (alertas)
})
export class MachinesModule {}
