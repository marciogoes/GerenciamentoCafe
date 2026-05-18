import {
  IsString, IsOptional, IsInt, IsDateString,
  IsBoolean, Min, IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CriarLeituraDto {
  @IsString() @IsNotEmpty()
  contrato_id: string;

  @IsString() @IsOptional()
  maquina_id?: string;

  @IsString() @IsNotEmpty()
  cliente_id: string;

  @IsDateString()
  competencia: string;

  @IsInt() @Min(0) @Type(() => Number)
  dose_inicial: number;

  @IsInt() @Min(0) @Type(() => Number)
  dose_final: number;

  @IsString() @IsOptional()
  observacao?: string;
}

export class AtualizarLeituraDto {
  @IsInt() @Min(0) @IsOptional() @Type(() => Number)
  dose_inicial?: number;

  @IsInt() @Min(0) @IsOptional() @Type(() => Number)
  dose_final?: number;

  @IsString() @IsOptional()
  observacao?: string;
}

export class MarcarEnvioDto {
  @IsDateString()
  data_envio: string;
}

export class FiltrosLeituraDto {
  @IsOptional() @IsString()
  cliente_id?: string;

  @IsOptional() @IsString()
  contrato_id?: string;

  @IsOptional() @IsString()
  maquina_id?: string;

  @IsOptional() @IsString()
  competencia?: string;

  @IsOptional() @IsString()
  enviado?: string;
}
