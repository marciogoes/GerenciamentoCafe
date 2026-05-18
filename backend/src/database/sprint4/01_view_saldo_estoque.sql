-- ================================================================
--  VENDING MANAGER · Sprint 4 · Script 1 de 7
--  View: vw_saldo_estoque
--  Saldo atual de cada produto por tenant
--  Execute no banco: belcafe (MySQL 8.0) via phpMyAdmin
-- ================================================================

CREATE OR REPLACE VIEW vw_saldo_estoque AS
SELECT
  p.tenant_id,
  p.id                    AS produto_id,
  p.codigo,
  p.descricao,
  p.categoria,
  p.unidade,
  p.valor_unitario,
  p.estoque_minimo,
  p.ativo,
  COALESCE(SUM(CASE WHEN me.tipo = 'entrada' THEN me.quantidade ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN me.tipo = 'saida'  THEN me.quantidade ELSE 0 END), 0)
                          AS saldo_atual,
  COALESCE(
    (COALESCE(SUM(CASE WHEN me.tipo = 'entrada' THEN me.quantidade ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN me.tipo = 'saida'  THEN me.quantidade ELSE 0 END), 0))
    * p.valor_unitario, 0
  )                       AS valor_em_estoque
FROM produto p
LEFT JOIN movimentacao_estoque me
       ON me.produto_id = p.id
      AND me.tenant_id  = p.tenant_id
WHERE p.ativo = 1
GROUP BY
  p.tenant_id, p.id, p.codigo, p.descricao,
  p.categoria, p.unidade, p.valor_unitario, p.estoque_minimo, p.ativo;

-- Verificação
-- SELECT * FROM vw_saldo_estoque WHERE tenant_id = 'SEU_TENANT_ID';
