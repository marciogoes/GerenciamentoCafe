-- ================================================================
--  VENDING MANAGER · Sprint 4 · Script 4 de 7
--  Índices: tabela lancamento_mensal
--  Compatível MySQL 8.0 — verifica antes de criar/dropar
--  Execute no banco: belcafe (MySQL 8.0) via phpMyAdmin
-- ================================================================

-- ── Remove idx_lm_tenant_situacao (se existir) ────────────────
SET @exist := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name   = 'lancamento_mensal'
    AND index_name   = 'idx_lm_tenant_situacao'
);
SET @sql := IF(@exist > 0,
  'ALTER TABLE `lancamento_mensal` DROP INDEX `idx_lm_tenant_situacao`',
  'SELECT ''idx_lm_tenant_situacao nao existe, pulando DROP'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Remove idx_lm_tenant_competencia (se existir) ─────────────
SET @exist := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name   = 'lancamento_mensal'
    AND index_name   = 'idx_lm_tenant_competencia'
);
SET @sql := IF(@exist > 0,
  'ALTER TABLE `lancamento_mensal` DROP INDEX `idx_lm_tenant_competencia`',
  'SELECT ''idx_lm_tenant_competencia nao existe, pulando DROP'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Remove idx_lm_tenant_vencimento (se existir) ──────────────
SET @exist := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name   = 'lancamento_mensal'
    AND index_name   = 'idx_lm_tenant_vencimento'
);
SET @sql := IF(@exist > 0,
  'ALTER TABLE `lancamento_mensal` DROP INDEX `idx_lm_tenant_vencimento`',
  'SELECT ''idx_lm_tenant_vencimento nao existe, pulando DROP'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Recria os três índices ─────────────────────────────────────
ALTER TABLE `lancamento_mensal`
  ADD INDEX `idx_lm_tenant_situacao`    (tenant_id, situacao),
  ADD INDEX `idx_lm_tenant_competencia` (tenant_id, competencia),
  ADD INDEX `idx_lm_tenant_vencimento`  (tenant_id, data_vencimento, situacao);

-- Verificação
-- SHOW INDEX FROM `lancamento_mensal`;
