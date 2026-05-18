-- ================================================================
-- Vending Manager SaaS — Sprint 8: Notificações e Relatórios
-- ================================================================
-- Não cria novas tabelas — os relatórios consultam tabelas já existentes.
-- Este script adiciona índices de performance para as queries de relatório.
-- ================================================================
-- ⚠️  Se já executou antes, ignore os erros "Duplicate key name".
--     Cada ALTER pode ser executado individualmente se necessário.
-- ================================================================

-- Índice para relatório financeiro (filtra por tenant + competência)
ALTER TABLE lancamento_mensal
  ADD INDEX idx_lm_tenant_competencia (tenant_id, competencia);

ALTER TABLE lancamento_mensal
  ADD INDEX idx_lm_tenant_vencimento (tenant_id, data_vencimento, situacao);

-- Índice para alerta D-3 (filtra boletos pendentes por vencimento)
ALTER TABLE lancamento_mensal
  ADD INDEX idx_lm_situacao_vencimento (situacao, data_vencimento);

-- Índice para relatório de máquinas (filtra por tenant + data_saida)
ALTER TABLE movimentacao_maquina
  ADD INDEX idx_mm_tenant_saida (tenant_id, data_saida);

-- Índice para relatório de estoque (filtra movimentações por produto)
ALTER TABLE movimentacao_estoque
  ADD INDEX idx_me_produto_data (produto_id, data, tipo);
