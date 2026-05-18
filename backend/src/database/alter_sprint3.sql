-- ================================================================
--  VENDING MANAGER — ALTER TABLE / Sprint 3
--  Adicionar colunas de onboarding e verificação na tabela tenant
--  Execute no banco: belcafe (MySQL) via phpMyAdmin
--  Março/2026
-- ================================================================

-- ── Colunas de verificação de e-mail ─────────────────────────
ALTER TABLE `tenant`
  ADD COLUMN `email_verificado`   TINYINT(1)   NOT NULL DEFAULT 0
      COMMENT 'E-mail do admin confirmado'
      AFTER `fuso_horario`,

  ADD COLUMN `token_verificacao`  VARCHAR(100) NULL
      COMMENT 'Token para verificar o e-mail (expira em 24h)'
      AFTER `email_verificado`,

  ADD COLUMN `token_expira_em`    DATETIME     NULL
      COMMENT 'Expiração do token de verificação'
      AFTER `token_verificacao`;

-- ── Colunas de wizard de onboarding ──────────────────────────
ALTER TABLE `tenant`
  ADD COLUMN `wizard_status`      JSON         NULL
      COMMENT 'Estado dos 5 passos do wizard: {passo1:bool,...}'
      AFTER `token_expira_em`,

  ADD COLUMN `wizard_concluido`   TINYINT(1)   NOT NULL DEFAULT 0
      COMMENT 'Todos os passos do wizard foram concluídos'
      AFTER `wizard_status`;

-- ── Colunas de limites por plano ──────────────────────────────
ALTER TABLE `tenant`
  ADD COLUMN `max_usuarios`   INT NOT NULL DEFAULT 20
      COMMENT 'Limite de usuários (0 = ilimitado)'
      AFTER `wizard_concluido`,

  ADD COLUMN `max_maquinas`   INT NOT NULL DEFAULT 200
      AFTER `max_usuarios`,

  ADD COLUMN `max_contratos`  INT NOT NULL DEFAULT 0
      COMMENT 'Limite de contratos (0 = ilimitado)'
      AFTER `max_maquinas`;

-- ── Colunas opcionais (telefone e nome_exibicao) ─────────────
ALTER TABLE `tenant`
  ADD COLUMN `telefone`       VARCHAR(20)  NULL AFTER `email_admin`,
  ADD COLUMN `nome_exibicao`  VARCHAR(200) NULL AFTER `razao_social`;

-- Verifica a estrutura final
-- DESCRIBE `tenant`;

-- ================================================================
--  Atualizar o tenant belcafe de teste com os novos campos
-- ================================================================
UPDATE `tenant`
SET
  email_verificado = 1,
  wizard_status    = '{"passo1":false,"passo2":false,"passo3":false,"passo4":false,"passo5":false}',
  wizard_concluido = 0,
  max_usuarios     = 20,
  max_maquinas     = 200,
  max_contratos    = 0
WHERE slug = 'belcafe';
