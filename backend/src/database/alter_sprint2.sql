-- ================================================================
--  VENDING MANAGER — ALTER TABLE
--  Adicionar colunas de controle de login na tabela usuario
--  Execute no banco: belcafe (MySQL) via phpMyAdmin
--  Sprint 2 — Março/2026
-- ================================================================

ALTER TABLE `usuario`
  ADD COLUMN `tentativas_login` INT      NOT NULL DEFAULT 0
      COMMENT 'Contador de tentativas inválidas de login'
      AFTER `ultimo_login`,

  ADD COLUMN `bloqueado_ate`    DATETIME NULL
      COMMENT 'Conta bloqueada até esta data/hora (após 5 tentativas inválidas)'
      AFTER `tentativas_login`;

-- Confirma estrutura
-- DESCRIBE `usuario`;

-- ================================================================
--  Inserir primeiro usuário ADMIN para testes
--  Senha: Admin@2026  (hash bcrypt custo 12)
-- ================================================================
INSERT IGNORE INTO `usuario`
  (`id`, `tenant_id`, `nome`, `email`, `senha_hash`, `perfil`, `ativo`, `2fa_ativo`)
VALUES (
  UUID(),
  'belcafe',
  'Administrador BelCafé',
  'admin@belcafe.com.br',
  '$2b$12$LWr9e/l2QvJuG0.A9UoE2.m.HE78p3.IqYLJv5oVpR7nmCt9kw0g.',
  'admin',
  1,
  0
);
