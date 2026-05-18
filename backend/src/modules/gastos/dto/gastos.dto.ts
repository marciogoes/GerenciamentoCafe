import {
  IsString, IsOptional, IsNumber, IsDateString,
  IsBoolean, IsIn, IsNotEmpty, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

const CATEGORIAS = [
  'aluguel','energia','agua','contabilidade','folha','impostos',
  'combustivel','manutencao','fornecedor','telefone','software','outros',
];

export class CriarGastoDto {
  @IsIn(CATEGORIAS)
  categoria: string;

  @IsString() @IsNotEmpty()
  descricao: string;

  @IsString() @IsOptional()
  fornecedor?: string;

  @IsNumber() @Min(0.01) @Type(() => Number)
  valor: number;

  @IsDateString()
  competencia: string;

  @IsDateString() @IsOptional()
  data_vencimento?: string;

  @IsDateString() @IsOptional()
  data_pagamento?: string;

  @IsIn(['pendente','pago','cancelado']) @IsOptional()
  situacao?: string;

  @IsString() @IsOptional()
  nota_fiscal?: string;

  @IsString() @IsOptional()
  observacao?: string;

  @IsBoolean() @IsOptional() @Type(() => Boolean)
  recorrente?: boolean;
}

export class AtualizarGastoDto {
  @IsIn(CATEGORIAS) @IsOptional()
  categoria?: string;

  @IsString() @IsOptional()
  descricao?: string;

  @IsString() @IsOptional()
  fornecedor?: string;

  @IsNumber() @Min(0.01) @IsOptional() @Type(() => Number)
  valor?: number;

  @IsDateString() @IsOptional()
  competencia?: string;

  @IsDateString() @IsOptional()
  data_vencimento?: string;

  @IsDateString() @IsOptional()
  data_pagamento?: string;

  @IsIn(['pendente','pago','cancelado']) @IsOptional()
  situacao?: string;

  @IsString() @IsOptional()
  nota_fiscal?: string;

  @IsString() @IsOptional()
  observacao?: string;

  @IsBoolean() @IsOptional() @Type(() => Boolean)
  recorrente?: boolean;
}

export class PagarGastoDto {
  @IsDateString()
  data_pagamento: string;

  @IsNumber() @Min(0.01) @IsOptional() @Type(() => Number)
  valor_pago?: number;

  @IsString() @IsOptional()
  observacao?: string;
}

export class FiltrosGastoDto {
  @IsOptional() @IsString()
  categoria?: string;

  @IsOptional() @IsString()
  situacao?: string;

  @IsOptional() @IsString()
  competencia?: string;

  @IsOptional() @IsString()
  data_inicio?: string;

  @IsOptional() @IsString()
  data_fim?: string;

  @IsOptional() @IsString()
  busca?: string;
}
