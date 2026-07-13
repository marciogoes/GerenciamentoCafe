import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString,
  IsNumber, IsInt, Min, Max, MaxLength, IsUUID, IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─────────────────────────────────────────────────────────────
//  CLIENTES
// ─────────────────────────────────────────────────────────────

export class CriarClienteDto {
  @ApiProperty({ example: 'Empresa Exemplo LTDA' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  razao_social: string;

  @ApiProperty({ example: '12345678000195', description: '14 dígitos sem formatação' })
  @IsString() @IsNotEmpty() @MaxLength(14)
  cnpj: string;

  @ApiPropertyOptional({ example: 'Av. Almirante Barroso, 1234 — Belém/PA' })
  @IsOptional() @IsString() @MaxLength(500)
  endereco?: string;

  @ApiPropertyOptional({ example: 'Alimentação' })
  @IsOptional() @IsString() @MaxLength(100)
  segmento?: string;

  @ApiPropertyOptional({ example: 'João da Silva' })
  @IsOptional() @IsString() @MaxLength(150)
  contato_nome?: string;

  @ApiPropertyOptional({ example: 'joao@empresa.com' })
  @IsOptional() @IsString() @MaxLength(255)
  contato_email?: string;

  @ApiPropertyOptional({ example: '91999999999' })
  @IsOptional() @IsString() @MaxLength(20)
  contato_telefone?: string;
}

export class AtualizarClienteDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  razao_social?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(14)
  cnpj?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  endereco?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  segmento?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150)
  contato_nome?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  contato_email?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  contato_telefone?: string;

  @ApiPropertyOptional() @IsOptional()
  ativo?: boolean;
}

export class FiltrosClienteDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  busca?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  segmento?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  ativo?: string;
}

// ─────────────────────────────────────────────────────────────
//  CONTRATOS
// ─────────────────────────────────────────────────────────────

export class CriarContratoDto {
  @ApiProperty() @IsUUID()
  cliente_id: string;

  @ApiPropertyOptional({ description: 'UUID da máquina' })
  @IsOptional() @IsUUID()
  maquina_id?: string;

  @ApiProperty({ enum: ['locacao', 'comodato', 'evento'] })
  @IsEnum(['locacao', 'comodato', 'evento'])
  tipo: string;

  @ApiProperty({ example: 350.00 })
  @Type(() => Number) @IsNumber() @Min(0)
  valor_mensal: number;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  data_assinatura: string;

  @ApiProperty({ example: '2026-02-01' })
  @IsDateString()
  data_inicio: string;

  @ApiPropertyOptional({ example: '2027-01-31', description: 'null = indeterminado' })
  @IsOptional() @IsDateString()
  data_fim?: string;

  @ApiProperty({ example: 10, description: 'Dia do mês do vencimento (1–28)' })
  @Type(() => Number) @IsInt() @Min(1) @Max(28)
  dia_vencimento: number;

  @ApiPropertyOptional({ example: 'IPCA' })
  @IsOptional() @IsString() @MaxLength(20)
  indice_reajuste?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observacao?: string;
}

export class AtualizarContratoDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID()
  maquina_id?: string;

  @ApiPropertyOptional() @IsOptional()
  @Type(() => Number) @IsNumber() @Min(0)
  valor_mensal?: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  data_fim?: string;

  @ApiPropertyOptional({ enum: ['ativo', 'encerrado', 'suspenso'] })
  @IsOptional() @IsEnum(['ativo', 'encerrado', 'suspenso'])
  situacao?: string;

  @ApiPropertyOptional() @IsOptional()
  @Type(() => Number) @IsInt() @Min(1) @Max(28)
  dia_vencimento?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  indice_reajuste?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  observacao?: string;
}

// ERR-03: vinculo N:N entre contrato e maquina (RF-C02)
export class VincularMaquinaDto {
  @ApiProperty({ description: 'UUID da máquina a vincular ao contrato' })
  @IsUUID()
  maquina_id: string;
}

export class FiltrosContratoDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  situacao?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  cliente_id?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  tipo?: string;
}

// ─────────────────────────────────────────────────────────────
//  LANÇAMENTOS MENSAIS
// ─────────────────────────────────────────────────────────────

export class GerarLancamentosDto {
  @ApiProperty({ example: '2026-03-01', description: 'Primeiro dia do mês de competência' })
  @IsDateString()
  competencia: string;

  @ApiPropertyOptional({ default: false, description: 'Forçar regeração mesmo se já existirem' })
  @IsOptional()
  forcar?: boolean;
}

export class AtualizarLancamentoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  nf_locacao?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  nf_insumos?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  boleto_codigo?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  observacao?: string;
}

export class RegistrarPagamentoDto {
  @ApiProperty({ example: 350.00 })
  @Type(() => Number) @IsNumber() @IsPositive()
  valor_pago: number;

  @ApiProperty({ example: '2026-03-10' })
  @IsDateString()
  data_pagamento: string;

  @ApiPropertyOptional({ example: '2026-03-11' })
  @IsOptional() @IsDateString()
  data_credito?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observacao?: string;
}

export class FiltrosLancamentoDto {
  @ApiPropertyOptional({ example: 'pendente' })
  @IsOptional() @IsString()
  situacao?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  cliente_id?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  contrato_id?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsDateString()
  data_fim?: string;

  @ApiPropertyOptional({ description: 'true = somente vencidos sem pagamento' })
  @IsOptional() @IsString()
  vencidos?: string;
}

// ─────────────────────────────────────────────────────────────
//  REAJUSTE CONTRATUAL
// ─────────────────────────────────────────────────────────────

export class AplicarReajusteDto {
  @ApiProperty({ example: 'IPCA' })
  @IsString() @IsNotEmpty() @MaxLength(20)
  indice: string;

  @ApiProperty({ example: 5.76, description: 'Percentual de reajuste (pode ser negativo)' })
  @Type(() => Number) @IsNumber()
  percentual: number;

  @ApiProperty({ example: '2026-04-01', description: 'Data de início da vigência (>= hoje)' })
  @IsDateString()
  data_vigencia: string;
}
