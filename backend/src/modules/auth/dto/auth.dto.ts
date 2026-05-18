import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail, IsNotEmpty, IsString, MinLength, Length,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@belcafe.com.br' })
  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsNotEmpty({ message: 'Senha é obrigatória.' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres.' })
  senha: string;

  @ApiProperty({ example: 'belcafe', description: 'Slug do tenant (subdomínio)' })
  @IsString()
  @IsNotEmpty({ message: 'Tenant é obrigatório.' })
  tenantSlug: string;
}

export class Verify2FaDto {
  @ApiProperty({ example: '123456', description: 'Código TOTP de 6 dígitos' })
  @IsString()
  @Length(6, 6, { message: 'Código TOTP deve ter exatamente 6 dígitos.' })
  codigo: string;

  @ApiProperty({ description: 'Token temporário recebido após o login' })
  @IsString()
  @IsNotEmpty()
  tokenTemp: string;
}

export class CriarUsuarioDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString() @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 'joao@belcafe.com.br' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Senha@2026' })
  @IsString() @MinLength(8)
  senha: string;

  @ApiProperty({ enum: ['admin', 'financeiro', 'operacional', 'consulta'] })
  @IsString() @IsNotEmpty()
  perfil: string;
}
