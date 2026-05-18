-- ============================================================
-- Vending Manager — Sprint 14
-- Breakdown de Receita por Tipo + Controle de Atividades Mensais
-- ============================================================

-- 1. Adiciona tipo_receita ao lançamento mensal
ALTER TABLE lancamento_mensal
  ADD COLUMN tipo_receita ENUM('locacao','doses','servico','insumos','evento')
    NOT NULL DEFAULT 'locacao'
    COMMENT 'Categoria da receita para breakdown no dashboard'
  AFTER competencia;

ALTER TABLE lancamento_mensal
  ADD COLUMN valor_breakdown JSON DEFAULT NULL
    COMMENT 'Breakdown detalhado quando há múltiplos tipos no mesmo lançamento'
  AFTER tipo_receita;

-- Migração automática: ajusta tipo_receita pelos contratos existentes
UPDATE lancamento_mensal lm
  JOIN contrato co ON co.id = lm.contrato_id
  SET lm.tipo_receita = CASE
    WHEN co.tipo = 'comodato' THEN 'doses'
    WHEN co.tipo = 'evento'   THEN 'evento'
    ELSE 'locacao'
  END;

-- 2. Tabela de modelos de atividades mensais recorrentes
CREATE TABLE atividade_modelo (
  id              CHAR(36)         NOT NULL,
  tenant_id       CHAR(36)         NOT NULL,
  tipo            ENUM('conta_fixa','leitura_comodato','atividade_interna')
                                   NOT NULL DEFAULT 'conta_fixa',
  descricao       VARCHAR(200)     NOT NULL,
  dia_vencimento  SMALLINT UNSIGNED NULL        COMMENT 'Dia do mês (1-31)',
  valor_referencia DECIMAL(12,2)   NULL,
  recorrente      TINYINT(1)       NOT NULL DEFAULT 1,
  ordem           SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Ordem de exibição',
  ativo           TINYINT(1)       NOT NULL DEFAULT 1,
  criado_em       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_am_tenant (tenant_id),
  INDEX idx_am_tipo   (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Modelos de atividades/contas recorrentes mensais';

-- 3. Tabela de execuções mensais (checklist gerado por mês)
CREATE TABLE atividade_execucao (
  id               CHAR(36)       NOT NULL,
  tenant_id        CHAR(36)       NOT NULL,
  atividade_id     CHAR(36)       NOT NULL,
  competencia      DATE           NOT NULL COMMENT 'Primeiro dia do mês (ex: 2026-03-01)',
  situacao         ENUM('pendente','realizado','nao_aplicavel')
                                  NOT NULL DEFAULT 'pendente',
  data_realizacao  DATE           NULL,
  valor_realizado  DECIMAL(12,2)  NULL,
  observacao       VARCHAR(500)   NULL,
  usuario_id       CHAR(36)       NULL,
  criado_em        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ae_ativ_comp (atividade_id, competencia),
  INDEX idx_ae_tenant      (tenant_id),
  INDEX idx_ae_competencia (competencia),
  INDEX idx_ae_situacao    (situacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Execuções mensais do checklist de atividades';
