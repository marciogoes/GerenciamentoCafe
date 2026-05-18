import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(3)
  @MaxLength(150)
  nome: string;

  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres.' })
  @Matches(/[A-Z]/,      { message: 'Senha deve ter pelo menos 1 letra maiúscula.' })
  @Matches(/[0-9]/,      { message: 'Senha deve ter pelo menos 1 número.' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Senha deve ter pelo menos 1 símbolo especial.' })
  senha: string;
}
