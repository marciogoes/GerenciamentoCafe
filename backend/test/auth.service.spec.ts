import { Test, TestingModule }      from '@nestjs/testing';
import { JwtService }               from '@nestjs/jwt';
import { ConfigService }            from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

import { AuthService }    from '../../src/modules/auth/auth.service';
import { UsersService }   from '../../src/modules/users/users.service';
import { TenantsService } from '../../src/modules/tenants/tenants.service';
import { AuditService }   from '../../src/modules/audit/audit.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTenant(overrides: any = {}) {
  return {
    id:               'tenant-uuid-001',
    slug:             'belcafe',
    status:           'ativo',
    email_verificado: true,
    ...overrides,
  };
}

function makeUsuario(overrides: any = {}) {
  return {
    id:               'user-uuid-001',
    tenant_id:        'tenant-uuid-001',
    nome:             'Admin BelCafé',
    email:            'admin@belcafe.com.br',
    senha_hash:       '$2b$12$mock_hash_placeholder',   // será substituído pelo mock
    perfil:           'admin',
    ativo:            true,
    dois_fa_ativo:    false,
    dois_fa_secret:   null,
    bloqueado_ate:    null,
    tentativas_login: 0,
    ...overrides,
  };
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service:        AuthService;
  let usersService:   jest.Mocked<UsersService>;
  let tenantsService: jest.Mocked<TenantsService>;
  let jwtService:     jest.Mocked<JwtService>;
  let auditService:   jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail:               jest.fn(),
            findById:                  jest.fn(),
            findByIdComSecret:         jest.fn(),
            registrarTentativaFalha:   jest.fn(),
            atualizarLogin:            jest.fn(),
            salvar2FaSecretPendente:   jest.fn(),
            ativar2Fa:                 jest.fn(),
          },
        },
        {
          provide: TenantsService,
          useValue: { buscarPorSlug: jest.fn(), buscarPorId: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'mock-token'), verify: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const cfg: Record<string, any> = {
                LOGIN_MAX_ATTEMPTS:  5,
                LOGIN_BLOCK_MINUTES: 15,
                JWT_SECRET:          'test-secret',
                JWT_REFRESH_SECRET:  'test-refresh-secret',
                JWT_EXPIRES_IN:      '8h',
              };
              return cfg[key];
            },
          },
        },
        {
          provide: AuditService,
          useValue: { registrar: jest.fn() },
        },
      ],
    }).compile();

    service        = module.get(AuthService);
    usersService   = module.get(UsersService)   as jest.Mocked<UsersService>;
    tenantsService = module.get(TenantsService) as jest.Mocked<TenantsService>;
    jwtService     = module.get(JwtService)     as jest.Mocked<JwtService>;
    auditService   = module.get(AuditService)   as jest.Mocked<AuditService>;
  });

  // ── login() ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('deve retornar tokens quando credenciais são válidas e 2FA inativo', async () => {
      tenantsService.buscarPorSlug.mockResolvedValue(makeTenant());

      const usuario = makeUsuario();
      usersService.findByEmail.mockResolvedValue(usuario);

      // Mock bcrypt.compare retornando true
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true as any);

      usersService.atualizarLogin.mockResolvedValue(undefined);
      auditService.registrar.mockResolvedValue(undefined);
      jwtService.sign.mockReturnValue('mock-jwt-token' as any);

      const result = await service.login('admin@belcafe.com.br', 'Admin@2026', 'belcafe');

      expect(result.requer2FA).toBe(false);
      expect(result.access_token).toBeDefined();
      expect(auditService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ acao: 'LOGIN' }),
      );
    });

    it('deve retornar requer2FA=true quando usuário tem 2FA ativo', async () => {
      tenantsService.buscarPorSlug.mockResolvedValue(makeTenant());
      usersService.findByEmail.mockResolvedValue(makeUsuario({ dois_fa_ativo: true }));
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true as any);
      jwtService.sign.mockReturnValue('temp-token' as any);

      const result = await service.login('admin@belcafe.com.br', 'Admin@2026', 'belcafe');
      expect(result.requer2FA).toBe(true);
      expect(result.tokenTemp).toBeDefined();
    });

    it('deve lançar UnauthorizedException quando tenant não existe', async () => {
      tenantsService.buscarPorSlug.mockResolvedValue(null);

      await expect(service.login('x@x.com', 'senha', 'inexistente'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar ForbiddenException quando tenant está suspenso', async () => {
      tenantsService.buscarPorSlug.mockResolvedValue(makeTenant({ status: 'suspenso' }));

      await expect(service.login('x@x.com', 'senha', 'belcafe'))
        .rejects.toThrow(ForbiddenException);
    });

    it('deve lançar UnauthorizedException quando usuário não existe no tenant', async () => {
      tenantsService.buscarPorSlug.mockResolvedValue(makeTenant());
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login('naoexiste@x.com', 'senha', 'belcafe'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('deve incrementar tentativas e lançar erro quando senha está errada', async () => {
      tenantsService.buscarPorSlug.mockResolvedValue(makeTenant());
      usersService.findByEmail.mockResolvedValue(makeUsuario({ tentativas_login: 0 }));
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false as any);
      usersService.registrarTentativaFalha.mockResolvedValue(undefined);

      await expect(service.login('admin@belcafe.com.br', 'senha-errada', 'belcafe'))
        .rejects.toThrow(UnauthorizedException);

      expect(usersService.registrarTentativaFalha).toHaveBeenCalledTimes(1);
    });

    it('deve bloquear conta após 5 tentativas inválidas', async () => {
      tenantsService.buscarPorSlug.mockResolvedValue(makeTenant());
      // Usuário já com 4 tentativas anteriores → 5ª vai bloquear
      usersService.findByEmail.mockResolvedValue(makeUsuario({ tentativas_login: 4 }));
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false as any);
      usersService.registrarTentativaFalha.mockResolvedValue(undefined);
      auditService.registrar.mockResolvedValue(undefined);

      await expect(service.login('admin@belcafe.com.br', 'errada', 'belcafe'))
        .rejects.toThrow(ForbiddenException);

      expect(auditService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ acao: 'LOGIN_BLOQUEADO' }),
      );
    });

    it('deve lançar ForbiddenException quando conta está bloqueada', async () => {
      const bloqueadoAte = new Date(Date.now() + 10 * 60 * 1000); // bloqueado por 10 min
      tenantsService.buscarPorSlug.mockResolvedValue(makeTenant());
      usersService.findByEmail.mockResolvedValue(makeUsuario({ bloqueado_ate: bloqueadoAte }));

      await expect(service.login('admin@belcafe.com.br', 'qualquer', 'belcafe'))
        .rejects.toThrow(ForbiddenException);
    });

    it('deve lançar ForbiddenException quando e-mail da empresa não foi verificado', async () => {
      tenantsService.buscarPorSlug.mockResolvedValue(makeTenant({ email_verificado: false }));
      usersService.findByEmail.mockResolvedValue(makeUsuario());
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true as any);

      await expect(service.login('admin@belcafe.com.br', 'Admin@2026', 'belcafe'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // ── validarForcaSenha() ──────────────────────────────────────────────────────

  describe('validarForcaSenha() — método estático', () => {
    it('deve aprovar senha forte', () => {
      const { valida, erros } = AuthService.validarForcaSenha('Admin@2026');
      expect(valida).toBe(true);
      expect(erros).toHaveLength(0);
    });

    it('deve rejeitar senha curta', () => {
      const { valida, erros } = AuthService.validarForcaSenha('Ab1@');
      expect(valida).toBe(false);
      expect(erros).toContain('Mínimo 8 caracteres.');
    });

    it('deve rejeitar senha sem maiúscula', () => {
      const { valida, erros } = AuthService.validarForcaSenha('admin@2026');
      expect(valida).toBe(false);
      expect(erros.some(e => e.includes('maiúscula'))).toBe(true);
    });

    it('deve rejeitar senha sem número', () => {
      const { valida, erros } = AuthService.validarForcaSenha('Admin@abc');
      expect(valida).toBe(false);
      expect(erros.some(e => e.includes('número'))).toBe(true);
    });

    it('deve rejeitar senha sem símbolo especial', () => {
      const { valida, erros } = AuthService.validarForcaSenha('Admin2026');
      expect(valida).toBe(false);
      expect(erros.some(e => e.includes('símbolo'))).toBe(true);
    });
  });
});
