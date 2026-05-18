-- ================================================================
--  VENDING MANAGER · Sprint 4 · Script 6 de 7
--  Índices: tabelas movimentacao_maquina e movimentacao_estoque
--  Versão simplificada — apenas ADD INDEX (sem DROP)
--  Erros de "já existe" são ignorados pelo migration runner
-- ================================================================

-- ══ movimentacao_maquina ══════════════════════════════════════
ALTER TABLE `movimentacao_maquina`
  ADD INDEX `idx_movmaq_tenant_saida` (tenant_id, data_saida);

ALTER TABLE `movimentacao_maquina`
  ADD INDEX `idx_movmaq_retorno_nulo` (tenant_id, data_retorno);

-- ══ movimentacao_estoque ══════════════════════════════════════
ALTER TABLE `movimentacao_estoque`
  ADD INDEX `idx_movest_produto_tenant` (tenant_id, produto_id, tipo);
