import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsArray, IsEmail, ArrayMinSize, IsOptional, IsBoolean,
} from 'class-validator';

export type TipoRelatorio       = 'financeiro' | 'contratos' | 'estoque' | 'maquinas';
export type FrequenciaRelatorio = 'diario' | 'semanal' | 'mensal';

/**
 * POST /reports/schedules — criar agendamento (RF-R06)
 */
export class CriarAgendamentoDto {

  @ApiProperty({
    enum: ['financeiro', 'contratos', 'estoque', 'maquinas'],
    example: 'financeiro',
    description: 'Tipo de relatório a ser enviado automaticamente',
  })
  @IsEnum(['financeiro', 'contratos', 'estoque', 'maquinas'])
  tipo: TipoRelatorio;

  @ApiProperty({
    enum: ['diario', 'semanal', 'mensal'],
    example: 'mensal',
    description: 'Frequência de envio',
  })
  @IsEnum(['diario', 'semanal', 'mensal'])
  frequencia: FrequenciaRelatorio;

  @ApiProperty({
    type: [String],
    example: ['gestor@empresa.com', 'financeiro@empresa.com'],
    description: 'Lista de e-mails destinatários (mínimo 1)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  destinatarios: string[];
}

/**
 * PATCH /reports/schedules/:id — atualizar agendamento
 */
export class AtualizarAgendamentoDto {

  @ApiPropertyOptional({ enum: ['diario', 'semanal', 'mensal'] })
  @IsOptional()
  @IsEnum(['diario', 'semanal', 'mensal'])
  frequencia?: FrequenciaRelatorio;

  @ApiPropertyOptional({
    type: [String],
    example: ['novo@empresa.com'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  destinatarios?: string[];

  @ApiPropertyOptional({ example: true, description: 'Ativar ou pausar o agendamento' })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
