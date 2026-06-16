import { PipeTransform, Injectable } from '@nestjs/common';

/**
 * Converte strings vazias ('') em `undefined` no corpo da requisição.
 *
 * Motivo: no class-validator, @IsOptional() só ignora a validação quando o
 * valor é null/undefined. Um campo de formulário em branco chega como '' e,
 * em campos opcionais como @IsDateString()/@IsUUID(), dispara erro 400.
 * Registrar este pipe ANTES do ValidationPipe normaliza esses vazios.
 */
@Injectable()
export class EmptyStringToUndefinedPipe implements PipeTransform {
  transform(value: any) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const k of Object.keys(value)) {
        if (value[k] === '') value[k] = undefined;
      }
    }
    return value;
  }
}
