import {
  IsString, IsOptional, IsEnum, IsInt, IsNumber,
  IsBoolean, MaxLength, Min, Max,
} from 'class-validator';

export type TipoAtividade = 'conta_fixa' | 'leitura_comodato' | 'atividade_interna';

// ── Modelo ────────────────────────────────────────────────────
export class CriarAtividadeModeloDto {
  @IsEnum(['conta_fixa', 'leitura_comodato', 'atividade_interna'])
  tipo: TipoAtividade;

  @IsString() @MaxLength(200)
  descricao: string;

  @IsOptional() @IsInt() @Min(1) @Max(31)
  dia_vencimento?: number;

  @IsOptional() @IsNumber()
  valor_referencia?: number;

  @IsOptional() @IsBoolean()
  recorrente?: boolean;

  @IsOptional() @IsInt() @Min(0)
  ordem?: number;
}

export class AtualizarAtividadeModeloDto {
  @IsOptional() @IsEnum(['conta_fixa', 'leitura_comodato', 'atividade_interna'])
  tipo?: TipoAtividade;

  @IsOptional() @IsString() @MaxLength(200)
  descricao?: string;

  @IsOptional() @IsInt() @Min(1) @Max(31)
  dia_vencimento?: number;

  @IsOptional() @IsNumber()
  valor_referencia?: number;

  @IsOptional() @IsBoolean()
  recorrente?: boolean;

  @IsOptional() @IsInt() @Min(0)
  ordem?: number;

  @IsOptional() @IsBoolean()
  ativo?: boolean;
}

// ── Execução ──────────────────────────────────────────────────
export class GerarExecucoesDto {
  /** Competência no formato YYYY-MM ou YYYY-MM-DD */
  @IsString()
  competencia: string;
}

export class BaixarAtividadeDto {
  @IsOptional() @IsString()
  data_realizacao?: string;

  @IsOptional() @IsNumber()
  valor_realizado?: number;

  @IsOptional() @IsString() @MaxLength(500)
  observacao?: string;
}
