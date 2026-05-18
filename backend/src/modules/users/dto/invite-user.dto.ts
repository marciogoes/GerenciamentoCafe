import { IsEmail, IsIn, IsNotEmpty } from 'class-validator';

export class InviteUserDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @IsIn(['admin', 'financeiro', 'operacional', 'consulta'], {
    message: 'Perfil inválido.',
  })
  perfil: string;
}
