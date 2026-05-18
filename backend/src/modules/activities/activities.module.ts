import { Module }             from '@nestjs/common';
import { TypeOrmModule }      from '@nestjs/typeorm';
import { ActivitiesService }  from './activities.service';
import { ActivitiesController } from './activities.controller';
import { AtividadeModelo }    from './entities/atividade-modelo.entity';
import { AtividadeExecucao }  from './entities/atividade-execucao.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AtividadeModelo, AtividadeExecucao]),
  ],
  controllers: [ActivitiesController],
  providers:   [ActivitiesService],
  exports:     [ActivitiesService],
})
export class ActivitiesModule {}
