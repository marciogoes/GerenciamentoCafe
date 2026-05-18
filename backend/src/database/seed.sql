-- ================================================================
-- SEED INICIAL — BelCafé (tenant de demonstração)
-- Execute este script UMA VEZ após rodar todos os alter_sprint*.sql
-- ================================================================

-- ── 1. Tenant BelCafé ─────────────────────────────────────────
INSERT INTO tenant (
  id, slug, razao_social, cnpj, email_admin, telefone,
  plano, status, email_verificado, fuso_horario, criado_em
) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'belcafe',
  'BEL CAFÉ Locação, Serviços e Comércio Ltda',
  '12345678000199',
  'admin@belcafe.com.br',
  '91999990000',
  'pro',
  'ativo',
  1,
  'America/Belem',
  NOW()
)
ON DUPLICATE KEY UPDATE slug = slug;   -- idempotente: não falha se já existir

-- ── 2. Usuário Admin ──────────────────────────────────────────
-- Senha: Admin@2026  (hash bcrypt custo 12)
INSERT INTO usuario (
  id, tenant_id, nome, email, senha_hash, perfil,
  ativo, `2fa_ativo`, criado_em
) VALUES (
  'b2c3d4e5-0000-0000-0000-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Administrador BelCafé',
  'admin@belcafe.com.br',
  '$2b$12$dTbRA99wrKFgs8SkXhiYbuToYowMwxO8VId8Ey6X/d/345ckoEkGO',
  'admin',
  1,
  0,
  NOW()
)
ON DUPLICATE KEY UPDATE email = email;  -- idempotente

-- ── 3. Usuário Financeiro (opcional para testes) ──────────────
-- Senha: Financeiro@2026
INSERT INTO usuario (
  id, tenant_id, nome, email, senha_hash, perfil,
  ativo, `2fa_ativo`, criado_em
) VALUES (
  'c3d4e5f6-0000-0000-0000-000000000003',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Gerente Financeiro',
  'financeiro@belcafe.com.br',
  '$2b$12$8j6J6z6h2Ytn1nHldurOOOkYm2AJi17962dXUxUFyi4hkbIPqyaEW',
  'financeiro',
  1,
  0,
  NOW()
)
ON DUPLICATE KEY UPDATE email = email;

-- ── 4. Usuário Operacional (opcional para testes) ─────────────
-- Senha: Operacional@2026
INSERT INTO usuario (
  id, tenant_id, nome, email, senha_hash, perfil,
  ativo, `2fa_ativo`, criado_em
) VALUES (
  'd4e5f6a7-0000-0000-0000-000000000004',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Operacional / Logística',
  'operacional@belcafe.com.br',
  '$2b$12$OELwQ7OIkRz5OkD7u2w3v.0gBZauP8w/4uoquQVGu/q0tQnlWLVoi',
  'operacional',
  1,
  0,
  NOW()
)
ON DUPLICATE KEY UPDATE email = email;

-- ================================================================
-- Confirmação
-- ================================================================
SELECT 'Tenant criado:' AS info, slug, razao_social, plano, status
FROM tenant WHERE slug = 'belcafe';

SELECT 'Usuários criados:' AS info, nome, email, perfil, ativo
FROM usuario WHERE tenant_id = 'a1b2c3d4-0000-0000-0000-000000000001';
