import { Module }           from '@nestjs/common';
import { TypeOrmModule }    from '@nestjs/typeorm';
import { Produto }             from './entities/produto.entity';
import { MovimentacaoEstoque } from './entities/movimentacao-estoque.entity';
import { CategoriaInsumo }     from './entities/categoria-insumo.entity';
import { StockService }        from './stock.service';
import { CategoriasService }   from './categorias.service';
import { StockController }     from './stock.controller';

@Module({
  // ERR-14: CategoriaInsumo existia como entity mas nunca foi registrada aqui.
  imports: [TypeOrmModule.forFeature([Produto, MovimentacaoEstoque, CategoriaInsumo])],
  controllers: [StockController],
  providers:   [StockService, CategoriasService],
  exports:     [StockService, CategoriasService],   // StockService: AlertasCronService
})
export class StockModule {}
