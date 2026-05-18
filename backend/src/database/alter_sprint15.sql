-- ============================================================
-- Sprint 15 — Contrato de Evento (PDF) + Módulo de Manutenção
-- ============================================================

-- ── 1. Campos extras no contrato de evento ──────────────────
ALTER TABLE contrato
  ADD COLUMN IF NOT EXISTS local_evento   VARCHAR(500) DEFAULT NULL COMMENT 'Local/endereço do evento',
  ADD COLUMN IF NOT EXISTS nome_evento    VARCHAR(200) DEFAULT NULL COMMENT 'Nome do evento',
  ADD COLUMN IF NOT EXISTS condicoes_comerciais TEXT DEFAULT NULL  COMMENT 'Condições comerciais do evento',
  ADD COLUMN IF NOT EXISTS responsavel_contrato VARCHAR(150) DEFAULT NULL COMMENT 'Nome do responsável pelo contrato';

-- ── 2. Tabela de Manutenção ──────────────────────────────────
CREATE TABLE IF NOT EXISTS manutencao (
  id              CHAR(36)      NOT NULL,
  tenant_id       CHAR(36)      NOT NULL,
  maquina_id      CHAR(36)      NOT NULL,
  titulo          VARCHAR(200)  NOT NULL,
  descricao       TEXT,
  tipo            ENUM('preventiva','corretiva','instalacao','limpeza','outros')    NOT NULL DEFAULT 'corretiva',
  situacao        ENUM('aberta','em_andamento','concluida','cancelada')             NOT NULL DEFAULT 'aberta',
  prioridade      ENUM('baixa','media','alta','urgente')                           NOT NULL DEFAULT 'media',
  data_abertura   DATE          NOT NULL,
  data_inicio     DATE          DEFAULT NULL,
  data_conclusao  DATE          DEFAULT NULL,
  tecnico         VARCHAR(150)  DEFAULT NULL  COMMENT 'Nome do técnico responsável',
  fornecedor      VARCHAR(200)  DEFAULT NULL  COMMENT 'Empresa prestadora do serviço',
  custo_pecas     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  custo_mao_obra  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  nota_fiscal     VARCHAR(50)   DEFAULT NULL,
  observacao      TEXT,
  usuario_id      CHAR(36)      DEFAULT NULL  COMMENT 'Usuário que abriu o chamado',
  criado_em       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_man_tenant   (tenant_id),
  KEY idx_man_maquina  (maquina_id),
  KEY idx_man_situacao (situacao),
  KEY idx_man_data     (data_abertura),
  KEY idx_man_tipo     (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Chamados de manutenção das máquinas';
