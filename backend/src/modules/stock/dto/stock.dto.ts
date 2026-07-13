import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString,
  IsNumber, Min, MaxLength, IsPositive, IsUUID, IsInt, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─────────────────────────────────────────────────────────────
//  CATEGORIA DE INSUMO — ERR-14
// ─────────────────────────────────────────────────────────────

export class CriarCategoriaDto {
  @ApiProperty({ example: 'Snacks', description: 'Nome da categoria' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  nome: string;

  @ApiPropertyOptional({ example: 0, description: 'Ordem de exibição' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  ordem?: number;
}

export class AtualizarCategoriaDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  nome?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  ordem?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  ativo?: boolean;
}

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

  // ERR-14: o ENUM fixo de cafe saiu daqui. A categoria agora e uma FK para
  // categoria_insumo, configuravel por tenant — senao o SaaS so serve cafeteria.
  @ApiPropertyOptional({ description: 'UUID da categoria (tabela categoria_insumo)' })
  @IsOptional() @IsUUID()
  categoria_id?: string;

  /** @deprecated Campo legado. Mantido para nao quebrar clientes antigos. */
  @ApiPropertyOptional({ deprecated: true, description: 'Categoria legada (texto livre)' })
  @IsOptional() @IsString() @MaxLength(50)
  categoria?: string;

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

  // ERR-14: idem CriarProdutoDto — ENUM fixo substituido por FK configuravel
  @ApiPropertyOptional({ description: 'UUID da categoria (tabela categoria_insumo)' })
  @IsOptional() @IsUUID()
  categoria_id?: string;

  /** @deprecated Campo legado. */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional() @IsString() @MaxLength(50)
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
  @ApiPropertyOptional({ description: 'UUID da categoria (ERR-14)' })
  @IsOptional() @IsUUID()
  categoria_id?: string;

  /** @deprecated Filtro legado por nome de categoria. */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional() @IsString()
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
