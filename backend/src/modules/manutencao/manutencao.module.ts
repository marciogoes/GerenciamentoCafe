import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Manutencao }    from './entities/manutencao.entity';
import { ManutencaoService }    from './manutencao.service';
import { ManutencaoController } from './manutencao.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Manutencao])],
  controllers: [ManutencaoController],
  providers:   [ManutencaoService],
  exports:     [ManutencaoService],
})
export class ManutencaoModule {}
