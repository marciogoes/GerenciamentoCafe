-- ============================================================
-- Vending Manager — Seed Sprint 14
-- Atividades fixas mensais da BelCafé (13 contas fixas)
-- Execute APÓS alter_sprint14.sql
-- ATENÇÃO: substitua o tenant_id pelo UUID real da BelCafé no banco
-- ============================================================

-- Descubra o tenant_id com: SELECT id FROM tenant WHERE slug = 'belcafe';
-- Depois substitua o valor em @tid abaixo:
SET @tid = (SELECT id FROM tenant WHERE slug = 'belcafe' LIMIT 1);

INSERT INTO atividade_modelo
  (id, tenant_id, tipo, descricao, dia_vencimento, valor_referencia, recorrente, ordem)
VALUES
  (UUID(), @tid, 'conta_fixa', 'REVENMAR',           8,  NULL,    1, 1),
  (UUID(), @tid, 'conta_fixa', 'YELLUM',             10, NULL,    1, 2),
  (UUID(), @tid, 'conta_fixa', 'YELLUM VEÍCULO',     10, NULL,    1, 3),
  (UUID(), @tid, 'conta_fixa', 'NEWCOOP',            10, NULL,    1, 4),
  (UUID(), @tid, 'conta_fixa', 'VENPAGO',            10, NULL,    1, 5),
  (UUID(), @tid, 'conta_fixa', 'UPPAY',              15, NULL,    1, 6),
  (UUID(), @tid, 'conta_fixa', 'TRR CONTABILIDADE',  15, NULL,    1, 7),
  (UUID(), @tid, 'conta_fixa', 'ÁGUAS DO PARÁ',      19, NULL,    1, 8),
  (UUID(), @tid, 'conta_fixa', 'DARF INSS',          20, NULL,    1, 9),
  (UUID(), @tid, 'conta_fixa', 'DAS',                20, NULL,    1, 10),
  (UUID(), @tid, 'conta_fixa', 'EQUATORIAL',         20, NULL,    1, 11),
  (UUID(), @tid, 'conta_fixa', 'FGTS',               20, NULL,    1, 12),
  (UUID(), @tid, 'conta_fixa', 'VIVO',               21, NULL,    1, 13);
