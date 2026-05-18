-- ================================================================
--  VENDING MANAGER · Sprint 4 · Script 7 de 7
--  Índice: tabela produto
--  Compatível MySQL 8.0 — verifica antes de criar/dropar
--  Execute no banco: belcafe (MySQL 8.0) via phpMyAdmin
-- ================================================================

-- Remove idx_produto_tenant_ativo (se existir)
SET @exist := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name   = 'produto'
    AND index_name   = 'idx_produto_tenant_ativo'
);
SET @sql := IF(@exist > 0,
  'ALTER TABLE `produto` DROP INDEX `idx_produto_tenant_ativo`',
  'SELECT ''idx_produto_tenant_ativo nao existe, pulando DROP'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Recria o índice
ALTER TABLE `produto`
  ADD INDEX `idx_produto_tenant_ativo` (tenant_id, ativo);

-- Verificação
-- SHOW INDEX FROM `produto`;
