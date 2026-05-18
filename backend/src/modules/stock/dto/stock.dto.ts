import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString,
  IsNumber, Min, MaxLength, IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─────────────────────────────────────────────────────────────
//  PRODUTO
// ─────────────────────────────────────────────────────────────

export class CriarProdutoDto {
  @ApiProperty({ example: '0001' })
  @IsString() @IsNotEmpty() @MaxLength(10)
  codigo: string;

  @ApiProperty({ example: 'Cappuccino Três Corações 1kg' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  descricao: string;

  @ApiPropertyOptional({ example: 'Três Corações' })
  @IsOptional() @IsString() @MaxLength(100)
  marca?: string;

  @ApiProperty({ enum: ['cappuccino','chocolate','cafe_graos','cafe_leite','descartavel','outros'] })
  @IsEnum(['cappuccino','chocolate','cafe_graos','cafe_leite','descartavel','outros'])
  categoria: string;

  @ApiProperty({ example: 'KG' })
  @IsString() @IsNotEmpty() @MaxLength(10)
  unidade: string;

  @ApiProperty({ example: 28.50 })
  @Type(() => Number) @IsNumber() @Min(0)
  valor_unitario: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsDateString()
  validade?: string;

  @ApiPropertyOptional({ example: 5.0, description: 'Quantidade mínima para alerta' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  estoque_minimo?: number;
}

export class AtualizarProdutoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  descricao?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  marca?: string;

  @ApiPropertyOptional({ enum: ['cappuccino','chocolate','cafe_graos','cafe_leite','descartavel','outros'] })
  @IsOptional() @IsEnum(['cappuccino','chocolate','cafe_graos','cafe_leite','descartavel','outros'])
  categoria?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)
  unidade?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  valor_unitario?: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  validade?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  estoque_minimo?: number;

  @ApiPropertyOptional() @IsOptional()
  ativo?: boolean;
}

// ─────────────────────────────────────────────────────────────
//  MOVIMENTAÇÕES
// ─────────────────────────────────────────────────────────────

export class EntradaEstoqueDto {
  @ApiProperty({ description: 'UUID do produto' })
  @IsString() @IsNotEmpty()
  produto_id: string;

  @ApiProperty({ example: '2026-03-10' })
  @IsDateString()
  data: string;

  @ApiProperty({ example: 10.5 })
  @Type(() => Number) @IsNumber() @IsPositive()
  quantidade: number;

  @ApiPropertyOptional({ example: 'Distribuidor ABC Ltda' })
  @IsOptional() @IsString() @MaxLength(200)
  origem?: string;

  @ApiPropertyOptional({ example: 'NF-000789' })
  @IsOptional() @IsString() @MaxLength(50)
  nota_fiscal?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observacao?: string;
}

export class SaidaEstoqueDto {
  @ApiProperty({ description: 'UUID do produto' })
  @IsString() @IsNotEmpty()
  produto_id: string;

  @ApiProperty({ example: '2026-03-10' })
  @IsDateString()
  data: string;

  @ApiProperty({ example: 2.5 })
  @Type(() => Number) @IsNumber() @IsPositive()
  quantidade: number;

  @ApiPropertyOptional({ example: 'Hospital João Barros Barreto' })
  @IsOptional() @IsString() @MaxLength(200)
  origem?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observacao?: string;
}

// ─────────────────────────────────────────────────────────────
//  FILTROS
// ─────────────────────────────────────────────────────────────

export class FiltrosProdutoDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  categoria?: string;

  @ApiPropertyOptional({ enum: ['normal', 'baixo', 'zerado'] })
  @IsOptional() @IsString()
  situacao?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  busca?: string;
}

export class FiltrosMovimentacaoDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  produto_id?: string;

  @ApiPropertyOptional({ enum: ['entrada', 'saida'] })
  @IsOptional() @IsEnum(['entrada', 'saida'])
  tipo?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  data_fim?: string;
}
