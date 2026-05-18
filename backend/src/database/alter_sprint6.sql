-- ================================================================
--  VENDING MANAGER — Sprint 6 · Módulo Clientes & Contratos
--  Criação: cliente, contrato, lancamento_mensal, reajuste_contratual
--  Execute no banco: belcafe (MySQL 8.0) via phpMyAdmin
--  Março/2026
-- ================================================================

-- ── 1. Clientes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `cliente` (
  `id`                CHAR(36)     NOT NULL,
  `tenant_id`         CHAR(36)     NOT NULL,
  `razao_social`      VARCHAR(200) NOT NULL,
  `cnpj`              CHAR(14)     NOT NULL,
  `endereco`          VARCHAR(500) NULL,
  `segmento`          VARCHAR(100) NULL,
  `contato_nome`      VARCHAR(150) NULL,
  `contato_email`     VARCHAR(255) NULL,
  `contato_telefone`  VARCHAR(20)  NULL,
  `ativo`             TINYINT(1)   NOT NULL DEFAULT 1,
  `criado_em`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cliente_cnpj_tenant` (`tenant_id`, `cnpj`),
  KEY `idx_cliente_tenant_ativo`     (`tenant_id`, `ativo`),
  KEY `idx_cliente_razao`            (`tenant_id`, `razao_social`(50))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Clientes corporativos do tenant';

-- ── 2. Contratos ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `contrato` (
  `id`                 CHAR(36)      NOT NULL,
  `tenant_id`          CHAR(36)      NOT NULL,
  `cliente_id`         CHAR(36)      NOT NULL,
  `maquina_id`         CHAR(36)      NULL  COMMENT 'FK para maquina (pode ser null)',
  `tipo`               ENUM('locacao','comodato','evento') NOT NULL DEFAULT 'locacao',
  `valor_mensal`       DECIMAL(12,2) NOT NULL,
  `data_assinatura`    DATE          NOT NULL,
  `data_inicio`        DATE          NOT NULL,
  `data_fim`           DATE          NULL   COMMENT 'NULL = vigência indeterminada',
  `situacao`           ENUM('ativo','encerrado','suspenso') NOT NULL DEFAULT 'ativo',
  `dia_vencimento`     SMALLINT      NOT NULL  COMMENT 'Dia do mês (1-28)',
  `ultimo_reajuste_em` DATE          NULL,
  `indice_reajuste`    VARCHAR(20)   NULL   COMMENT 'Ex: IPCA, IGP-M, fixo',
  `observacao`         TEXT          NULL,
  `criado_em`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_contrato_tenant_situacao` (`tenant_id`, `situacao`),
  KEY `idx_contrato_cliente`         (`tenant_id`, `cliente_id`),
  KEY `idx_contrato_maquina`         (`maquina_id`),
  CONSTRAINT `chk_dia_vencimento` CHECK (`dia_vencimento` BETWEEN 1 AND 28)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Contratos de locação / comodato / evento';

-- ── 3. Lançamentos mensais (cobranças) ───────────────────────
CREATE TABLE IF NOT EXISTS `lancamento_mensal` (
  `id`               CHAR(36)      NOT NULL,
  `tenant_id`        CHAR(36)      NOT NULL,
  `contrato_id`      CHAR(36)      NOT NULL,
  `competencia`      DATE          NOT NULL  COMMENT '1º dia do mês de referência',
  `valor`            DECIMAL(12,2) NOT NULL,
  `data_emissao`     DATE          NOT NULL,
  `data_vencimento`  DATE          NOT NULL,
  `nf_locacao`       VARCHAR(50)   NULL,
  `nf_insumos`       VARCHAR(50)   NULL,
  `boleto_codigo`    VARCHAR(200)  NULL,
  `valor_pago`       DECIMAL(12,2) NULL,
  `data_pagamento`   DATE          NULL,
  `data_credito`     DATE          NULL,
  `situacao`         ENUM('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente',
  `origem`           ENUM('automatico','manual')                   NOT NULL DEFAULT 'manual',
  `observacao`       TEXT          NULL,
  `criado_em`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lancamento_contrato_comp` (`tenant_id`, `contrato_id`, `competencia`),
  KEY `idx_lanc_tenant_situacao`    (`tenant_id`, `situacao`),
  KEY `idx_lanc_tenant_vencimento`  (`tenant_id`, `data_vencimento`),
  KEY `idx_lanc_contrato`           (`contrato_id`),
  KEY `idx_lanc_competencia`        (`tenant_id`, `competencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Lançamentos mensais de cobrança por contrato';

-- ── 4. Histórico de reajustes contratuais (imutável) ─────────
CREATE TABLE IF NOT EXISTS `reajuste_contratual` (
  `id`             CHAR(36)      NOT NULL,
  `tenant_id`      CHAR(36)      NOT NULL,
  `contrato_id`    CHAR(36)      NOT NULL,
  `indice`         VARCHAR(20)   NOT NULL  COMMENT 'Ex: IPCA, IGP-M, fixo',
  `percentual`     DECIMAL(8,4)  NOT NULL  COMMENT 'Ex: 5.7600 = 5.76%',
  `valor_anterior` DECIMAL(12,2) NOT NULL,
  `valor_novo`     DECIMAL(12,2) NOT NULL,
  `data_vigencia`  DATE          NOT NULL,
  `usuario_id`     CHAR(36)      NOT NULL  COMMENT 'FK usuario que aplicou',
  `criado_em`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
  -- Sem atualizado_em: registro imutável (RN-F11)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Histórico imutável de reajustes contratuais';

ALTER TABLE `reajuste_contratual`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reaj_contrato`     (`tenant_id`, `contrato_id`),
  ADD KEY `idx_reaj_vigencia`     (`data_vigencia`);

-- ── 5. Views analíticas ───────────────────────────────────────

-- Inadimplência consolidada por cliente
CREATE OR REPLACE VIEW vw_inadimplencia AS
SELECT
  lm.tenant_id,
  co.cliente_id,
  cl.razao_social                          AS cliente_nome,
  cl.contato_email,
  cl.contato_telefone,
  COUNT(lm.id)                             AS qtd_boletos,
  SUM(lm.valor)                            AS valor_total,
  MIN(lm.data_vencimento)                  AS vencimento_mais_antigo,
  DATEDIFF(CURDATE(), MIN(lm.data_vencimento)) AS maior_atraso_dias
FROM lancamento_mensal lm
JOIN contrato co ON co.id = lm.contrato_id
JOIN cliente  cl ON cl.id = co.cliente_id
WHERE lm.situacao IN ('pendente','vencido')
  AND lm.data_vencimento < CURDATE()
GROUP BY lm.tenant_id, co.cliente_id, cl.razao_social, cl.contato_email, cl.contato_telefone;

-- Receita mensal por competência
CREATE OR REPLACE VIEW vw_receita_mensal AS
SELECT
  lm.tenant_id,
  DATE_FORMAT(lm.competencia, '%Y-%m')  AS mes,
  SUM(lm.valor)                          AS faturado,
  SUM(CASE WHEN lm.situacao = 'pago' THEN lm.valor_pago ELSE 0 END) AS recebido,
  COUNT(lm.id)                           AS qtd_lancamentos,
  SUM(CASE WHEN lm.situacao IN ('pendente','vencido') AND lm.data_vencimento < CURDATE()
           THEN lm.valor ELSE 0 END)    AS inadimplencia
FROM lancamento_mensal lm
GROUP BY lm.tenant_id, DATE_FORMAT(lm.competencia, '%Y-%m');

-- Contratos a vencer em 30 dias
CREATE OR REPLACE VIEW vw_contratos_a_vencer AS
SELECT
  co.tenant_id,
  co.id         AS contrato_id,
  cl.razao_social AS cliente_nome,
  co.tipo,
  co.valor_mensal,
  co.data_fim,
  DATEDIFF(co.data_fim, CURDATE()) AS dias_para_vencimento
FROM contrato co
JOIN cliente cl ON cl.id = co.cliente_id
WHERE co.situacao = 'ativo'
  AND co.data_fim IS NOT NULL
  AND co.data_fim BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY);

-- ── 6. Dados de teste — BelCafé ───────────────────────────────
-- Execute SOMENTE para popular ambiente de testes.
-- Substitua 'SEU_TENANT_ID' pelo UUID real do tenant belcafe.
--
-- INSERT INTO `cliente` (`id`,`tenant_id`,`razao_social`,`cnpj`,`segmento`,`contato_nome`,`contato_email`) VALUES
-- (UUID(),'SEU_TENANT_ID','Hospital Universitário João de Barros Barreto','01234567000100','Saúde','Maria Oliveira','financeiro@hujbb.com'),
-- (UUID(),'SEU_TENANT_ID','UFPA — Universidade Federal do Pará','05073da000130','Educação','Carlos Lima','diretoria@ufpa.br'),
-- (UUID(),'SEU_TENANT_ID','Supermercado Líder Ltda','12345678000150','Alimentação','Paulo Santos','operacional@lider.com');

-- ================================================================
--  Verificações
-- ================================================================
-- SHOW TABLES LIKE '%cliente%';
-- SHOW TABLES LIKE '%contrato%';
-- SHOW TABLES LIKE '%lancamento%';
-- SHOW TABLES LIKE '%reajuste%';
-- SELECT * FROM vw_inadimplencia LIMIT 10;
-- SELECT * FROM vw_receita_mensal LIMIT 12;
-- SELECT * FROM vw_contratos_a_vencer;
