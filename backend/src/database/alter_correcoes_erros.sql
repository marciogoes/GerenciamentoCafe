-- ============================================================
-- MIGRATION: alter_correcoes_erros.sql
-- Aplicar TODOS os fixes de banco relacionados às 25 correções
-- Executar em ordem — cada bloco é idempotente (IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- ERR-04: Remover contrato_ativo_id de maquina (referência circular)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE maquina
  DROP COLUMN IF EXISTS contrato_ativo_id;

-- ──────────────────────────────────────────────────────────────
-- ERR-11: Substituir contrato_os por contrato_id + os_referencia
--         em movimentacao_maquina
-- ──────────────────────────────────────────────────────────────
ALTER TABLE movimentacao_maquina
  ADD COLUMN IF NOT EXISTS contrato_id   CHAR(36)    NULL COMMENT 'FK para contrato.id (contrato interno)'  AFTER local,
  ADD COLUMN IF NOT EXISTS os_referencia VARCHAR(50) NULL COMMENT 'Número de OS externa (texto livre)'      AFTER contrato_id;

-- Migra dados existentes do campo legado para os novos campos
UPDATE movimentacao_maquina
  SET os_referencia = contrato_os
WHERE contrato_os IS NOT NULL
  AND contrato_id IS NULL;

-- Remove o campo legado após migração
ALTER TABLE movimentacao_maquina
  DROP COLUMN IF EXISTS contrato_os;

-- ──────────────────────────────────────────────────────────────
-- ERR-03: Criar tabela contrato_maquinas (relação N:N)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contrato_maquinas (
  contrato_id    CHAR(36)     NOT NULL COMMENT 'FK para contrato.id',
  maquina_id     CHAR(36)     NOT NULL COMMENT 'FK para maquina.id',
  tenant_id      CHAR(36)     NOT NULL,
  data_inclusao  DATE         NOT NULL,
  ativo          TINYINT(1)   NOT NULL DEFAULT 1 COMMENT 'false = máquina removida do contrato',
  criado_em      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (contrato_id, maquina_id),
  INDEX idx_cm_tenant    (tenant_id),
  INDEX idx_cm_maquina   (maquina_id),
  INDEX idx_cm_contrato  (contrato_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ERR-03: Relação N:N entre Contrato e Máquina';

-- Migra vínculos existentes (maquina_id do contrato → contrato_maquinas)
INSERT IGNORE INTO contrato_maquinas (contrato_id, maquina_id, tenant_id, data_inclusao, ativo)
  SELECT id, maquina_id, tenant_id, data_inicio, 1
  FROM   contrato
  WHERE  maquina_id IS NOT NULL;

-- Não remove contrato.maquina_id ainda — mantém por backward compatibility
-- Remover manualmente quando todas as queries forem migradas para contrato_maquinas

-- ──────────────────────────────────────────────────────────────
-- ERR-14: Criar tabela categoria_insumo e migrar produto.categoria
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categoria_insumo (
  id           CHAR(36)     NOT NULL,
  tenant_id    CHAR(36)     NOT NULL,
  nome         VARCHAR(100) NOT NULL,
  ordem        INT          NOT NULL DEFAULT 0,
  ativo        TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ci_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ERR-14: Categorias de insumo configuráveis por tenant';

-- Adiciona novos campos no produto
ALTER TABLE produto
  ADD COLUMN IF NOT EXISTS categoria_id     CHAR(36)    NULL COMMENT 'FK para categoria_insumo.id' AFTER marca,
  ADD COLUMN IF NOT EXISTS categoria_legado VARCHAR(50) NULL COMMENT 'Valor ENUM antigo migrado'    AFTER categoria_id;

-- Migra o ENUM antigo para categoria_legado
UPDATE produto p
  SET p.categoria_legado = p.categoria
WHERE p.categoria_legado IS NULL
  AND p.categoria IS NOT NULL;

-- Remove o ENUM após migração dos dados
-- ATENÇÃO: em MySQL, alterar ENUM requer recrear a coluna
-- Executar apenas após confirmar migração completa:
-- ALTER TABLE produto MODIFY COLUMN categoria VARCHAR(50) NULL;
-- (ou simplesmente ignorar — categoria_id é o campo oficial a partir de agora)

-- ──────────────────────────────────────────────────────────────
-- ERR-07: Criar tabela leitura_dose
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leitura_dose (
  id                  CHAR(36)   NOT NULL,
  tenant_id           CHAR(36)   NOT NULL,
  contrato_id         CHAR(36)   NOT NULL COMMENT 'FK para contrato.id (tipo comodato)',
  cliente_id          CHAR(36)   NOT NULL COMMENT 'FK para cliente.id',
  maquina_id          CHAR(36)   NOT NULL COMMENT 'FK para maquina.id',
  data_leitura        DATE       NOT NULL,
  leitura_anterior    INT        NULL     COMMENT 'null na primeira leitura',
  leitura_atual       INT        NOT NULL,
  doses_consumidas    INT        NOT NULL COMMENT 'leitura_atual - leitura_anterior',
  enviado_contratante TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'RF-C10',
  usuario_id          CHAR(36)   NOT NULL COMMENT 'FK para usuario.id',
  observacao          TEXT       NULL,
  criado_em           DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ld_tenant    (tenant_id),
  INDEX idx_ld_contrato  (contrato_id),
  INDEX idx_ld_maquina   (maquina_id),
  INDEX idx_ld_cliente   (cliente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ERR-07: Leituras de doses para contratos comodato (RF-C10)';

-- ──────────────────────────────────────────────────────────────
-- ERR-19: Criar tabela tenant_whitelabel
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_whitelabel (
  id             CHAR(36)    NOT NULL,
  tenant_id      CHAR(36)    NOT NULL UNIQUE COMMENT 'FK para tenant.id (1:1)',
  nome_sistema   VARCHAR(150) NULL,
  logo_url       VARCHAR(500) NULL,
  favicon_url    VARCHAR(500) NULL,
  cor_primaria   CHAR(7)      NULL COMMENT 'HEX ex.: #2E86AB',
  cor_secundaria CHAR(7)      NULL,
  email_template TEXT         NULL,
  pdf_cabecalho  TEXT         NULL,
  pdf_rodape     TEXT         NULL,
  criado_em      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_wl_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ERR-19: Configurações white-label por tenant (plano Enterprise)';

-- ──────────────────────────────────────────────────────────────
-- ERR-21: Criar tabela relatorio_agendado
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relatorio_agendado (
  id             CHAR(36)     NOT NULL,
  tenant_id      CHAR(36)     NOT NULL,
  tipo           ENUM('financeiro','contratos','estoque','maquinas') NOT NULL,
  frequencia     ENUM('diario','semanal','mensal') NOT NULL,
  destinatarios  JSON         NOT NULL COMMENT 'Array de e-mails',
  proximo_envio  DATETIME     NOT NULL,
  ultimo_envio   DATETIME     NULL,
  ativo          TINYINT(1)   NOT NULL DEFAULT 1,
  criado_por     CHAR(36)     NOT NULL COMMENT 'FK para usuario.id',
  criado_em      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ra_tenant       (tenant_id),
  INDEX idx_ra_proximo      (proximo_envio),
  INDEX idx_ra_ativo_tenant (tenant_id, ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ERR-21: Agendamentos de relatórios automáticos por e-mail (RF-R06)';

-- ──────────────────────────────────────────────────────────────
-- ERR-24: Criar tabela assinatura_tenant
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assinatura_tenant (
  id                       CHAR(36)     NOT NULL,
  tenant_id                CHAR(36)     NOT NULL,
  plano                    ENUM('starter','pro','enterprise') NOT NULL,
  status                   ENUM('ativo','inadimplente','cancelado') NOT NULL DEFAULT 'ativo',
  gateway                  VARCHAR(50)  NOT NULL COMMENT 'stripe | asaas | pagarme',
  gateway_subscription_id  VARCHAR(200) NULL,
  valor_mensal             DECIMAL(12,2) NOT NULL,
  data_inicio              DATE         NOT NULL,
  proximo_vencimento       DATE         NOT NULL,
  cancelado_em             DATE         NULL,
  criado_em                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_at_tenant (tenant_id),
  INDEX idx_at_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ERR-24: Histórico de assinaturas do tenant ao SaaS (UC-12)';

-- ──────────────────────────────────────────────────────────────
-- ERR-05: Garantir prazo de 45 dias documentado no tenant
-- (a lógica está no cron do tenants.service — sem ALTER necessário,
--  mas garantimos que dias_alerta_suspenso existe)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS dias_alerta_suspenso INT NOT NULL DEFAULT 30
    COMMENT 'ERR-05: dias de suspensão antes do aviso de exclusão (padrão 30; exclusão em +15 = 45 dias total)';

-- ──────────────────────────────────────────────────────────────
-- ÍNDICES adicionais de performance e isolamento de tenant
-- ──────────────────────────────────────────────────────────────
-- Garante que queries de RLS (row-level security) sejam rápidas
CREATE INDEX IF NOT EXISTS idx_contrato_maquinas_ativo
  ON contrato_maquinas (tenant_id, maquina_id, ativo);

CREATE INDEX IF NOT EXISTS idx_leitura_dose_data
  ON leitura_dose (tenant_id, data_leitura);

CREATE INDEX IF NOT EXISTS idx_relatorio_agendado_job
  ON relatorio_agendado (ativo, proximo_envio);
