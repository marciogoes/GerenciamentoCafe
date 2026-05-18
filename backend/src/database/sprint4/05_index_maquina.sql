-- ================================================================
--  VENDING MANAGER · Sprint 4 · Script 5 de 7
--  Índice: tabela maquina
--  Compatível MySQL 8.0 — verifica antes de criar/dropar
--  Execute no banco: belcafe (MySQL 8.0) via phpMyAdmin
-- ================================================================

-- ── Remove idx_maquina_tenant_situacao (se existir) ───────────
SET @exist := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name   = 'maquina'
    AND index_name   = 'idx_maquina_tenant_situacao'
);
SET @sql := IF(@exist > 0,
  'ALTER TABLE `maquina` DROP INDEX `idx_maquina_tenant_situacao`',
  'SELECT ''idx_maquina_tenant_situacao nao existe, pulando DROP'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Recria o índice ───────────────────────────────────────────
ALTER TABLE `maquina`
  ADD INDEX `idx_maquina_tenant_situacao` (tenant_id, situacao);

-- Verificação
-- SHOW INDEX FROM `maquina`;
