-- ================================================================
--  VENDING MANAGER — Views e Índices para o Dashboard · Sprint 4
--  Execute no banco: belcafe (MySQL 8.0) via phpMyAdmin
--  Março/2026
-- ================================================================

-- ── 1. View: saldo atual de cada produto ─────────────────────
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
  )                        AS valor_em_estoque
FROM produto p
LEFT JOIN movimentacao_estoque me
       ON me.produto_id = p.id
      AND me.tenant_id  = p.tenant_id
WHERE p.ativo = 1
GROUP BY
  p.tenant_id, p.id, p.codigo, p.descricao,
  p.categoria, p.unidade, p.valor_unitario, p.estoque_minimo, p.ativo;

-- ── 2. View: KPI de inadimplência por tenant ─────────────────
CREATE OR REPLACE VIEW vw_inadimplencia AS
SELECT
  lm.tenant_id,
  c.id          AS cliente_id,
  c.razao_social,
  SUM(lm.valor) AS valor_total_aberto,
  COUNT(*)      AS qtd_boletos,
  MIN(lm.data_vencimento) AS vencimento_mais_antigo,
  DATEDIFF(CURDATE(), MIN(lm.data_vencimento)) AS maior_atraso_dias
FROM lancamento_mensal lm
JOIN contrato co ON co.id = lm.contrato_id
JOIN cliente  c  ON c.id  = co.cliente_id
WHERE lm.situacao IN ('pendente', 'vencido')
  AND lm.data_vencimento < CURDATE()
GROUP BY lm.tenant_id, c.id, c.razao_social;

-- ── 3. View: receita mensal consolidada ───────────────────────
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
GROUP BY lm.tenant_id,
         DATE_FORMAT(lm.competencia, '%Y-%m'),
         DATE_FORMAT(lm.competencia, '%b/%Y');

-- ── 4. Índices de performance para as queries do dashboard ────
-- Obs.: Execute cada bloco separadamente se algum índice já existir.

-- lancamento_mensal
ALTER TABLE `lancamento_mensal`
  ADD INDEX `idx_lm_tenant_situacao`    (tenant_id, situacao),
  ADD INDEX `idx_lm_tenant_competencia` (tenant_id, competencia),
  ADD INDEX `idx_lm_tenant_vencimento`  (tenant_id, data_vencimento, situacao);

-- maquina
ALTER TABLE `maquina`
  ADD INDEX `idx_maquina_tenant_situacao` (tenant_id, situacao);

-- movimentacao_maquina
ALTER TABLE `movimentacao_maquina`
  ADD INDEX `idx_movmaq_tenant_saida`   (tenant_id, data_saida),
  ADD INDEX `idx_movmaq_retorno_nulo`   (tenant_id, data_retorno);

-- movimentacao_estoque
ALTER TABLE `movimentacao_estoque`
  ADD INDEX `idx_movest_produto_tenant` (tenant_id, produto_id, tipo);

-- produto
ALTER TABLE `produto`
  ADD INDEX `idx_produto_tenant_ativo`  (tenant_id, ativo);

-- ── Verificação ───────────────────────────────────────────────
-- SELECT * FROM vw_saldo_estoque  WHERE tenant_id = 'SEU_TENANT_ID';
-- SELECT * FROM vw_inadimplencia  WHERE tenant_id = 'SEU_TENANT_ID';
-- SELECT * FROM vw_receita_mensal WHERE tenant_id = 'SEU_TENANT_ID' ORDER BY mes DESC LIMIT 12;
