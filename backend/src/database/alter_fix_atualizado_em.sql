-- ================================================================
-- FIX: adiciona SOMENTE a coluna atualizado_em na tabela tenant
-- As demais colunas já existem (adicionadas nos sprints anteriores)
-- ================================================================

ALTER TABLE tenant
  ADD COLUMN atualizado_em DATETIME NULL DEFAULT NULL;

UPDATE tenant SET atualizado_em = criado_em WHERE atualizado_em IS NULL;

-- Confirma
SELECT id, slug, criado_em, atualizado_em FROM tenant;
