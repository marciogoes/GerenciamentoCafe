-- ================================================================
-- Vending Manager SaaS — Sprint 9: Usuários, Permissões e Auditoria
-- ================================================================
-- Execute na ordem abaixo.
-- ⚠️  Se já executou antes, ignore "Duplicate column name" e
--     "Duplicate key name" — significa que já estava aplicado.
-- ================================================================

-- ── 1. Colunas de convite na tabela usuario ──────────────────────
ALTER TABLE usuario
  ADD COLUMN token_convite   VARCHAR(100) NULL AFTER bloqueado_ate,
  ADD COLUMN token_expira_em DATETIME     NULL AFTER token_convite;

-- Índice para lookup rápido de convite
ALTER TABLE usuario
  ADD INDEX idx_usuario_token_convite (token_convite);

-- ── 2. Tabela de log de auditoria ─────────────────────────────────
CREATE TABLE IF NOT EXISTS log_auditoria (
  id           CHAR(36)      NOT NULL,
  tenant_id    CHAR(36)      NOT NULL,
  usuario_id   CHAR(36)          NULL COMMENT 'NULL = ação do sistema (cron)',
  usuario_nome VARCHAR(150)      NULL,
  acao         VARCHAR(100)  NOT NULL COMMENT 'Ex: LOGIN, USUARIO_CRIADO, BOLETO_PAGO',
  modulo       VARCHAR(50)   NOT NULL COMMENT 'auth | users | machines | contracts | stock | ...',
  entidade_id  VARCHAR(100)      NULL COMMENT 'UUID da entidade afetada',
  descricao    TEXT              NULL COMMENT 'Detalhe livre da operação',
  ip           VARCHAR(45)       NULL,
  criado_em    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  INDEX idx_la_tenant_criado  (tenant_id, criado_em),
  INDEX idx_la_usuario        (usuario_id),
  INDEX idx_la_modulo_tenant  (modulo, tenant_id),
  INDEX idx_la_acao           (acao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Registro imutável de todas as ações sensíveis do sistema';
