import { Module }            from '@nestjs/common';
import { TypeOrmModule }    from '@nestjs/typeorm';

import { ImportController } from './import.controller';
import { ImportService }    from './import.service';

// Entities reutilizadas
import { Cliente }              from '../contracts/entities/cliente.entity';
import { Maquina }              from '../machines/entities/maquina.entity';
import { Produto }              from '../stock/entities/produto.entity';
import { MovimentacaoEstoque }  from '../stock/entities/movimentacao-estoque.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cliente,
      Maquina,
      Produto,
      MovimentacaoEstoque,
    ]),
  ],
  controllers: [ImportController],
  providers:   [ImportService],
})
export class ImportModule {}
