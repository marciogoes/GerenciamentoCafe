import { Module }           from '@nestjs/common';
import { TypeOrmModule }    from '@nestjs/typeorm';
import { LeituraDoses }     from './entities/leitura-doses.entity';
import { DosesService }     from './doses.service';
import { DosesController }  from './doses.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([LeituraDoses])],
  controllers: [DosesController],
  providers:   [DosesService],
  exports:     [DosesService],
})
export class DosesModule {}
