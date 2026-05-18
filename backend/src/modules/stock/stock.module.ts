import { Module }           from '@nestjs/common';
import { TypeOrmModule }    from '@nestjs/typeorm';
import { Produto }             from './entities/produto.entity';
import { MovimentacaoEstoque } from './entities/movimentacao-estoque.entity';
import { StockService }        from './stock.service';
import { StockController }     from './stock.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Produto, MovimentacaoEstoque])],
  controllers: [StockController],
  providers:   [StockService],
  exports:     [StockService],   // exportado para o AlertasCronService
})
export class StockModule {}
