import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString,
  IsNumber, Min, IsUUID, Length, IsPositive, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─────────────────────────────────────────────────────────────
//  CATÁLOGO DE MODELOS
// ─────────────────────────────────────────────────────────────

export class CriarModeloDto {
  @ApiProperty({ example: 'Necta Kikko Max' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  nome: string;

  @ApiProperty({ enum: ['bebidas', 'snacks', 'combinado', 'outros'] })
  @IsEnum(['bebidas', 'snacks', 'combinado', 'outros'])
  categoria: string;

  @ApiPropertyOptional({ example: 'Café, Cappuccino, Chocolate, Leite' })
  @IsOptional() @IsString()
  bebidas?: string;

  @ApiPropertyOptional({ example: '220V / 1.800W / Capacidade 200 doses/dia' })
  @IsOptional() @IsString()
  especificacoes?: string;

  @ApiPropertyOptional({ example: 'https://s3.amazonaws.com/foto.jpg' })
  @IsOptional() @IsString() @MaxLength(500)
  foto_url?: string;
}

export class AtualizarModeloDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150)
  nome?: string;

  @ApiPropertyOptional({ enum: ['bebidas', 'snacks', 'combinado', 'outros'] })
  @IsOptional() @IsEnum(['bebidas', 'snacks', 'combinado', 'outros'])
  categoria?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  bebidas?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  especificacoes?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  foto_url?: string;

  @ApiPropertyOptional() @IsOptional()
  ativo?: boolean;
}

// ─────────────────────────────────────────────────────────────
//  MÁQUINAS (PATRIMÔNIO)
// ─────────────────────────────────────────────────────────────

export class CriarMaquinaDto {
  @ApiProperty({ example: 'BC160' })
  @IsString() @IsNotEmpty() @MaxLength(20)
  patrimonio: string;

  @ApiPropertyOptional({ example: 'uuid-do-modelo' })
  @IsOptional() @IsUUID()
  modelo_id?: string;

  @ApiPropertyOptional({ example: 'SN-00123456' })
  @IsOptional() @IsString() @MaxLength(50)
  numero_serie?: string;

  @ApiPropertyOptional({ example: 'NF-000456' })
  @IsOptional() @IsString() @MaxLength(50)
  nota_fiscal?: string;

  @ApiPropertyOptional({ example: 'Fornecedor Equipamentos LTDA' })
  @IsOptional() @IsString() @MaxLength(200)
  fornecedor?: string;

  @ApiPropertyOptional({ example: 4500.00 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  valor_aquisicao?: number;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional() @IsDateString()
  data_registro?: string;

  @ApiPropertyOptional({ example: 'Máquina recém adquirida' })
  @IsOptional() @IsString()
  observacao?: string;
}

export class AtualizarMaquinaDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  patrimonio?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  modelo_id?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  numero_serie?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  nota_fiscal?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  fornecedor?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  valor_aquisicao?: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  data_registro?: string;

  @ApiPropertyOptional({
    enum: ['apta', 'em_locacao', 'manutencao', 'evento', 'nao_localizada', 'desativada'],
  })
  @IsOptional()
  @IsEnum(['apta', 'em_locacao', 'manutencao', 'evento', 'nao_localizada', 'desativada'])
  situacao?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  localizacao_atual?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  observacao?: string;
}

// ─────────────────────────────────────────────────────────────
//  MOVIMENTAÇÕES — SAÍDA
// ─────────────────────────────────────────────────────────────

export class RegistrarSaidaDto {
  @ApiProperty({ example: '2026-03-10' })
  @IsDateString()
  data_saida: string;

  @ApiPropertyOptional({ example: '08:30' })
  @IsOptional() @IsString()
  hora_saida?: string;

  /**
   * Tipo de saída — determina a situação da máquina (RF-M02):
   * 'locacao' | 'comodato' → em_locacao
   * 'evento'              → evento
   */
  @ApiPropertyOptional({
    example: 'locacao',
    enum: ['locacao', 'comodato', 'evento'],
    description: 'Tipo de saída. Define a situação da máquina (em_locacao ou evento)',
  })
  @IsOptional() @IsEnum(['locacao', 'comodato', 'evento'])
  tipo_saida?: string;

  @ApiPropertyOptional({ description: 'UUID do cliente cadastrado' })
  @IsOptional() @IsUUID()
  cliente_id?: string;

  @ApiPropertyOptional({ example: 'Av. Almirante Barroso, 1234 — Belém/PA' })
  @IsOptional() @IsString() @MaxLength(500)
  local?: string;

  // ERR-11 CORRIGIDO: contrato_os separado em dois campos
  @ApiPropertyOptional({ description: 'UUID do contrato interno (FK para contrato.id)' })
  @IsOptional() @IsUUID()
  contrato_id?: string;

  @ApiPropertyOptional({ description: 'Número de OS externa (texto livre)', example: 'OS-2026-001' })
  @IsOptional() @IsString() @MaxLength(50)
  os_referencia?: string;

  @ApiPropertyOptional({ description: 'UUID do usuário responsável (default: usuário logado)' })
  @IsOptional() @IsUUID()
  responsavel_id?: string;

  @ApiPropertyOptional({ example: 'Máquina com pequeno arranhão na lataria' })
  @IsOptional() @IsString()
  ocorrencia?: string;
}

// ─────────────────────────────────────────────────────────────
//  MOVIMENTAÇÕES — RETORNO
// ─────────────────────────────────────────────────────────────

export class RegistrarRetornoDto {
  @ApiProperty({ example: '2026-03-20' })
  @IsDateString()
  data_retorno: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional() @IsString()
  hora_retorno?: string;

  @ApiPropertyOptional({
    example: 'manutencao',
    description: 'Situação após retorno. Padrão: apta',
    enum: ['apta', 'manutencao'],
  })
  @IsOptional() @IsEnum(['apta', 'manutencao'])
  situacao_retorno?: string;

  @ApiPropertyOptional({ example: 'Placa de controle com defeito' })
  @IsOptional() @IsString()
  ocorrencia_retorno?: string;
}

// ─────────────────────────────────────────────────────────────
//  FILTROS
// ─────────────────────────────────────────────────────────────

export class FiltrosMaquinaDto {
  @ApiPropertyOptional({ example: 'apta' })
  @IsOptional() @IsString()
  situacao?: string;

  @ApiPropertyOptional({ example: 'BC160' })
  @IsOptional() @IsString()
  patrimonio?: string;

  @ApiPropertyOptional({ description: 'UUID do cliente' })
  @IsOptional() @IsString()
  cliente_id?: string;
}

export class FiltrosMovimentacaoDto {
  @ApiPropertyOptional({ description: 'UUID da máquina' })
  @IsOptional() @IsString()
  maquina_id?: string;

  @ApiPropertyOptional({ description: 'Apenas abertas (sem retorno)?', example: 'true' })
  @IsOptional() @IsString()
  em_aberto?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional() @IsDateString()
  data_fim?: string;
}
