import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy }                 from '@nestjs/passport';
import { ExtractJwt, Strategy }             from 'passport-jwt';
import { ConfigService }                    from '@nestjs/config';

export interface JwtPayload {
  sub:      string;   // userId
  email:    string;
  tenantId: string;
  perfil:   string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Token inválido.');
    }
    // super_admin pode operar sem tenantId (acesso global ao SaaS)
    if (!payload.tenantId && payload.perfil !== 'super_admin') {
      throw new UnauthorizedException('Token inválido.');
    }
    // O objeto retornado é injetado como req.user em todos os controllers
    return {
      userId:   payload.sub,
      email:    payload.email,
      tenantId: payload.tenantId ?? null,
      perfil:   payload.perfil,
    };
  }
}
