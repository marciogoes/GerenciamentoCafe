import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail, IsNotEmpty, IsString, IsEnum, IsOptional,
  Length, Matches, MinLength, IsBoolean, IsInt, Min, Max,
} from 'class-validator';

// ── Cadastro inicial do tenant (auto-cadastro público) ─────────
export class CadastroTenantDto {
  @ApiProperty({ example: 'BelCafé Locação e Serviços Ltda' })
  @IsString() @IsNotEmpty({ message: 'Razão social é obrigatória.' })
  razao_social: string;

  @ApiProperty({ example: '12345678000195', description: '14 dígitos, sem pontuação' })
  @IsString()
  @Length(14, 14, { message: 'CNPJ deve ter exatamente 14 dígitos.' })
  @Matches(/^\d{14}$/, { message: 'CNPJ deve conter apenas números.' })
  cnpj: string;

  @ApiProperty({ example: 'admin@belcafe.com.br' })
  @IsEmail({}, { message: 'E-mail inválido.' })
  email_admin: string;

  @ApiProperty({ example: '(91) 99999-9999', required: false })
  @IsOptional() @IsString()
  telefone?: string;

  @ApiProperty({ enum: ['starter', 'pro', 'enterprise'], example: 'pro' })
  @IsEnum(['starter', 'pro', 'enterprise'], { message: 'Plano inválido.' })
  plano: 'starter' | 'pro' | 'enterprise';

  @ApiProperty({ example: 'Admin@2026', description: 'Senha do administrador inicial' })
  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres.' })
  senha: string;
}

// ── Configuração do tenant após verificação de e-mail ──────────
export class ConfigurarTenantDto {
  @ApiProperty({ example: 'belcafe', description: '3-60 chars: letras minúsculas, números e hífens' })
  @IsString()
  @Length(3, 60, { message: 'Slug deve ter entre 3 e 60 caracteres.' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug inválido. Use apenas letras minúsculas, números e hífens (sem iniciar/terminar com hífen).',
  })
  slug: string;

  @ApiProperty({ example: 'BelCafé', description: 'Nome de exibição no sistema' })
  @IsString() @IsNotEmpty()
  nome_exibicao: string;

  @ApiProperty({ example: 'America/Belem', required: false })
  @IsOptional() @IsString()
  fuso_horario?: string;

  @ApiProperty({ example: 'https://...', description: 'URL do logo (upload separado)', required: false })
  @IsOptional() @IsString()
  logo_url?: string;
}

// FIX #5 — WizardPassoDto com validações completas
export class WizardPassoDto {
  @ApiProperty({ example: 1, description: 'Número do passo (1 a 5)' })
  @IsInt({ message: 'Passo deve ser um número inteiro.' })
  @Min(1, { message: 'Passo mínimo é 1.' })
  @Max(5, { message: 'Passo máximo é 5.' })
  passo: number;

  @ApiProperty({ example: true })
  @IsBoolean({ message: 'Concluído deve ser verdadeiro ou falso.' })
  concluido: boolean;
}
