-- ================================================================
--  VENDING MANAGER · Sprint 4 · Script 2 de 7
--  View: vw_inadimplencia
--  Inadimplência agrupada por cliente e tenant
--  Execute no banco: belcafe (MySQL 8.0) via phpMyAdmin
-- ================================================================

CREATE OR REPLACE VIEW vw_inadimplencia AS
SELECT
  lm.tenant_id,
  c.id          AS cliente_id,
  c.razao_social,
  SUM(lm.valor) AS valor_total_aberto,
  COUNT(*)      AS qtd_boletos,
  MIN(lm.data_vencimento)                        AS vencimento_mais_antigo,
  DATEDIFF(CURDATE(), MIN(lm.data_vencimento))   AS maior_atraso_dias
FROM lancamento_mensal lm
JOIN contrato co ON co.id = lm.contrato_id
JOIN cliente  c  ON c.id  = co.cliente_id
WHERE lm.situacao IN ('pendente', 'vencido')
  AND lm.data_vencimento < CURDATE()
GROUP BY lm.tenant_id, c.id, c.razao_social;

-- Verificação
-- SELECT * FROM vw_inadimplencia WHERE tenant_id = 'SEU_TENANT_ID';
