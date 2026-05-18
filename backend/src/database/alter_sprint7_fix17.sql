-- ================================================================
-- Fix #17: adiciona campo alerta_enviado_em na tabela produto
-- para controlar deduplicação diária de alertas de estoque (RN-E06)
-- ================================================================

ALTER TABLE produto
  ADD COLUMN alerta_enviado_em DATE NULL DEFAULT NULL
    COMMENT 'Data do último e-mail de alerta de estoque baixo enviado (máx. 1 por dia)';

-- Índice para otimizar a query do cron que filtra por essa coluna
CREATE INDEX idx_produto_alerta_enviado
  ON produto (tenant_id, alerta_enviado_em);
