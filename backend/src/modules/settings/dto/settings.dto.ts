import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional, IsString, IsNumber, Min, Max, IsUrl, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/** PATCH /settings/operacional */
export class AtualizarConfiguracaoOperacionalDto {

  @ApiPropertyOptional({ example: 'BelCafé Soluções', description: 'Nome de exibição do tenant' })
  @IsOptional() @IsString() @MaxLength(200)
  nome_exibicao?: string;

  @ApiPropertyOptional({ example: 'America/Belem', description: 'Fuso horário (IANA)' })
  @IsOptional() @IsString() @MaxLength(60)
  fuso_horario?: string;

  @ApiPropertyOptional({ example: 'https://s3.amazonaws.com/logo.png' })
  @IsOptional() @IsString() @MaxLength(500)
  logo_url?: string;

  @ApiPropertyOptional({
    example: 30,
    description: 'Dias sem retorno para alerta de máquina fora da base (1–365)',
  })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(365)
  dias_alerta_maquina?: number;

  @ApiPropertyOptional({
    example: 60,
    description: 'Minutos de inatividade antes de logout automático (5–480)',
  })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(5) @Max(480)
  tempo_inatividade_min?: number;
}

/** PATCH /settings/notificacoes (Sprint 17) — placeholder */
export class AtualizarConfiguracaoNotificacoesDto {
  @ApiPropertyOptional({ description: 'Receber alertas de estoque baixo por e-mail' })
  @IsOptional()
  alerta_estoque_email?: boolean;

  @ApiPropertyOptional({ description: 'Receber alertas de máquinas fora da base por e-mail' })
  @IsOptional()
  alerta_maquina_email?: boolean;

  @ApiPropertyOptional({ description: 'Receber relatório mensal por e-mail' })
  @IsOptional()
  relatorio_mensal_email?: boolean;
}
