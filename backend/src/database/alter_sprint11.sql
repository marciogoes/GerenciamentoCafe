-- ================================================================
--  alter_sprint11.sql
--  Sprint 11 — Configurações do Tenant + Painel Super Admin
--  Execute via phpMyAdmin no banco belcafe
-- ================================================================

-- Novos campos operacionais no tenant
-- (Execute um de cada vez se aparecer erro de coluna duplicada)

ALTER TABLE tenant
  ADD COLUMN dias_alerta_maquina   INT NOT NULL DEFAULT 30
    COMMENT 'Dias sem retorno para alerta de maquina' AFTER wizard_concluido;

ALTER TABLE tenant
  ADD COLUMN tempo_inatividade_min INT NOT NULL DEFAULT 60
    COMMENT 'Minutos de inatividade para logout automatico' AFTER dias_alerta_maquina;

-- Confirmação
SELECT id, slug, razao_social, plano, status,
       dias_alerta_maquina, tempo_inatividade_min
FROM tenant LIMIT 5;
