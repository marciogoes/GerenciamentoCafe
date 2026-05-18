// ── JwtAuthGuard ──────────────────────────────────────────────
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException('Token de acesso inválido ou ausente.');
    }
    return user;
  }
}

// ── RolesGuard ────────────────────────────────────────────────
import {
  Injectable as Inj, CanActivate, ExecutionContext as EC, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Inj()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: EC): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!roles.includes(user?.perfil)) {
      throw new ForbiddenException(
        `Acesso negado. Perfil necessário: ${roles.join(' ou ')}. Seu perfil: ${user?.perfil}`,
      );
    }
    return true;
  }
}

// ── Decorators ────────────────────────────────────────────────
import { SetMetadata, createParamDecorator, ExecutionContext as ExCtx } from '@nestjs/common';

export const Roles       = (...roles: string[]) => SetMetadata('roles', roles);
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExCtx) =>
  ctx.switchToHttp().getRequest().user,
);
export const TenantId    = createParamDecorator((_: unknown, ctx: ExCtx) =>
  ctx.switchToHttp().getRequest().user?.tenantId,
);

export const PERFIS = {
  SUPER_ADMIN:  'super_admin',
  ADMIN:        'admin',
  FINANCEIRO:   'financeiro',
  OPERACIONAL:  'operacional',
  CONSULTA:     'consulta',
} as const;
