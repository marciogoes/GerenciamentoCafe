-- ================================================================
--  VENDING MANAGER · Sprint 4 · Script 3 de 7
--  View: vw_receita_mensal
--  Receita mensal consolidada por tenant
--  Execute no banco: belcafe (MySQL 8.0) via phpMyAdmin
-- ================================================================

CREATE OR REPLACE VIEW vw_receita_mensal AS
SELECT
  lm.tenant_id,
  DATE_FORMAT(lm.competencia, '%Y-%m')  AS mes,
  DATE_FORMAT(lm.competencia, '%b/%Y')  AS mes_label,
  COUNT(*)                               AS qtd_lancamentos,
  SUM(lm.valor)                          AS valor_faturado,
  SUM(CASE WHEN lm.situacao = 'pago'
        THEN COALESCE(lm.valor_pago, lm.valor) ELSE 0 END)
                                         AS valor_recebido,
  COUNT(DISTINCT lm.contrato_id)         AS qtd_contratos
FROM lancamento_mensal lm
GROUP BY
  lm.tenant_id,
  DATE_FORMAT(lm.competencia, '%Y-%m'),
  DATE_FORMAT(lm.competencia, '%b/%Y');

-- Verificação
-- SELECT * FROM vw_receita_mensal WHERE tenant_id = 'SEU_TENANT_ID' ORDER BY mes DESC LIMIT 12;
