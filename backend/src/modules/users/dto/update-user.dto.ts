import { IsIn, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  nome?: string;

  @IsOptional()
  @IsIn(['admin', 'financeiro', 'operacional', 'consulta'], {
    message: 'Perfil inválido.',
  })
  perfil?: string;
}
