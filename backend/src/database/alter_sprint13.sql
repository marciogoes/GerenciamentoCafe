-- ============================================================
-- Vending Manager — Sprint 13
-- Leituras de Doses (Comodato) + Gastos/Despesas Operacionais
-- ============================================================

-- 1. Leituras de doses mensais (RF-C10)
CREATE TABLE leitura_doses (
  id                   CHAR(36)        NOT NULL,
  tenant_id            CHAR(36)        NOT NULL,
  contrato_id          CHAR(36)        NOT NULL,
  maquina_id           CHAR(36)        NULL,
  cliente_id           CHAR(36)        NOT NULL,
  competencia          DATE            NOT NULL COMMENT 'Primeiro dia do mês (ex: 2026-03-01)',
  dose_inicial         INT UNSIGNED    NOT NULL DEFAULT 0,
  dose_final           INT UNSIGNED    NOT NULL DEFAULT 0,
  total_doses          INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT 'Calculado: dose_final - dose_inicial',
  enviado_contratante  TINYINT(1)      NOT NULL DEFAULT 0,
  data_envio           DATE            NULL,
  observacao           VARCHAR(500)    NULL,
  usuario_id           CHAR(36)        NULL,
  criado_em            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ld_contrato_comp (contrato_id, competencia),
  INDEX idx_ld_tenant        (tenant_id),
  INDEX idx_ld_cliente       (cliente_id),
  INDEX idx_ld_competencia   (competencia),
  INDEX idx_ld_maquina       (maquina_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Leituras mensais de doses para contratos de comodato';

-- 2. Gastos / Despesas operacionais
CREATE TABLE gasto (
  id               CHAR(36)        NOT NULL,
  tenant_id        CHAR(36)        NOT NULL,
  categoria        ENUM(
    'aluguel','energia','agua','contabilidade',
    'folha','impostos','combustivel','manutencao',
    'fornecedor','telefone','software','outros'
  )                                NOT NULL DEFAULT 'outros',
  descricao        VARCHAR(200)    NOT NULL,
  fornecedor       VARCHAR(200)    NULL,
  valor            DECIMAL(12,2)   NOT NULL,
  competencia      DATE            NOT NULL COMMENT 'Mês de referência (1º dia do mês)',
  data_vencimento  DATE            NULL,
  data_pagamento   DATE            NULL,
  situacao         ENUM('pendente','pago','cancelado')
                                   NOT NULL DEFAULT 'pendente',
  nota_fiscal      VARCHAR(50)     NULL,
  observacao       VARCHAR(500)    NULL,
  recorrente       TINYINT(1)      NOT NULL DEFAULT 0,
  usuario_id       CHAR(36)        NULL,
  criado_em        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_gasto_tenant      (tenant_id),
  INDEX idx_gasto_competencia (competencia),
  INDEX idx_gasto_situacao    (situacao),
  INDEX idx_gasto_categoria   (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Gastos e despesas operacionais do tenant';
