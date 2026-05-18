import {
  IsString, IsEnum, IsOptional, IsNumber, IsDateString,
  IsNotEmpty, MinLength, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CriarManutencaoDto {
  @ApiProperty({ example: 'bc160-001' })
  @IsString() @IsNotEmpty()
  maquina_id: string;

  @ApiProperty({ example: 'Substituição da bomba d\'água' })
  @IsString() @MinLength(3)
  titulo: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  descricao?: string;

  @ApiPropertyOptional({ enum: ['preventiva','corretiva','instalacao','limpeza','outros'] })
  @IsOptional() @IsEnum(['preventiva','corretiva','instalacao','limpeza','outros'])
  tipo?: string;

  @ApiPropertyOptional({ enum: ['baixa','media','alta','urgente'] })
  @IsOptional() @IsEnum(['baixa','media','alta','urgente'])
  prioridade?: string;

  @ApiProperty({ example: '2026-03-10' })
  @IsDateString()
  data_abertura: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  data_conclusao?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  tecnico?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  fornecedor?: string;

  @ApiPropertyOptional({ type: Number, example: 0 })
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0)
  custo_pecas?: number;

  @ApiPropertyOptional({ type: Number, example: 0 })
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0)
  custo_mao_obra?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  nota_fiscal?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observacao?: string;
}

export class AtualizarManutencaoDto extends PartialType(CriarManutencaoDto) {
  @ApiPropertyOptional({ enum: ['aberta','em_andamento','concluida','cancelada'] })
  @IsOptional() @IsEnum(['aberta','em_andamento','concluida','cancelada'])
  situacao?: string;
}

export class FiltrosManutencaoDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  maquina_id?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  situacao?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  tipo?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  prioridade?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  data_fim?: string;
}

export class ConcluirManutencaoDto {
  @ApiProperty({ example: '2026-03-15' })
  @IsDateString()
  data_conclusao: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0)
  custo_pecas?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0)
  custo_mao_obra?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  nota_fiscal?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observacao?: string;
}
