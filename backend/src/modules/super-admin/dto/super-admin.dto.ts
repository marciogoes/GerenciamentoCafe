import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsOptional, IsString, IsDateString, IsNumber, Min, IsEmail, IsArray, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AlterarStatusTenantDto {
  @ApiProperty({ enum: ['ativo', 'suspenso', 'cancelado'] })
  @IsEnum(['ativo', 'suspenso', 'cancelado'])
  status: 'ativo' | 'suspenso' | 'cancelado';
}

export class AlterarPlanoTenantDto {
  @ApiProperty({ enum: ['starter', 'pro', 'enterprise'] })
  @IsEnum(['starter', 'pro', 'enterprise'])
  plano: 'starter' | 'pro' | 'enterprise';
}

export class AlterarTrialTenantDto {
  @ApiProperty({ example: '2026-04-30', description: 'Nova data de encerramento do trial' })
  @IsDateString()
  trial_ate: string;
}

export class AplicarDescontoDto {
  @ApiProperty({ example: 20, description: 'Percentual de desconto (0–100)' })
  @Type(() => Number) @IsNumber() @Min(0)
  percentual: number;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Data de expiração do desconto' })
  @IsOptional() @IsDateString()
  expira_em?: string;

  @ApiPropertyOptional({ example: 'Desconto de parceria comercial' })
  @IsOptional() @IsString()
  motivo?: string;
}

export class ImpersonateDto {
  @ApiPropertyOptional({ example: 'Suporte ao chamado #1234', description: 'Motivo do acesso de suporte' })
  @IsOptional() @IsString()
  motivo?: string;
}

export class FiltrosTenantDto {
  @ApiPropertyOptional({ enum: ['trial', 'ativo', 'suspenso', 'cancelado'] })
  @IsOptional() @IsEnum(['trial', 'ativo', 'suspenso', 'cancelado'])
  status?: string;

  @ApiPropertyOptional({ enum: ['starter', 'pro', 'enterprise'] })
  @IsOptional() @IsEnum(['starter', 'pro', 'enterprise'])
  plano?: string;

  @ApiPropertyOptional({ example: 'belcafe', description: 'Busca por razão social, CNPJ ou slug' })
  @IsOptional() @IsString()
  busca?: string;
}
