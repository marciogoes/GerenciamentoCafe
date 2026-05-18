import { Module }              from '@nestjs/common';
import { JwtModule }          from '@nestjs/jwt';
import { PassportModule }     from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService }    from './auth.service';
import { JwtStrategy }    from './strategies/jwt.strategy';
import { UsersModule }    from '../users/users.module';
import { TenantsModule }  from '../tenants/tenants.module'; // FIX #1

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret:      cfg.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get('JWT_EXPIRES_IN') || '8h' },
      }),
    }),
    UsersModule,
    TenantsModule,   // FIX #1 — necessário para injetar TenantsService no AuthService
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy],
  exports:     [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
