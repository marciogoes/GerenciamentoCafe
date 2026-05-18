-- ================================================================
--  VENDING MANAGER — Sprint 5 · Módulo Máquinas
--  Criação das tabelas: modelo_catalogo, maquina, movimentacao_maquina
--  Execute no banco: belcafe (MySQL 8.0) via phpMyAdmin
--  Março/2026
-- ================================================================

-- ── 1. Catálogo de modelos ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `modelo_catalogo` (
  `id`             CHAR(36)     NOT NULL,
  `tenant_id`      CHAR(36)     NOT NULL,
  `nome`           VARCHAR(150) NOT NULL,
  `categoria`      ENUM('bebidas','snacks','combinado','outros') NOT NULL DEFAULT 'bebidas',
  `bebidas`        TEXT         NULL   COMMENT 'Lista de bebidas/produtos separados por vírgula',
  `especificacoes` TEXT         NULL   COMMENT 'Especificações técnicas livres',
  `foto_url`       VARCHAR(500) NULL,
  `ativo`          TINYINT(1)   NOT NULL DEFAULT 1,
  `criado_em`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_modelo_tenant` (`tenant_id`, `ativo`),
  KEY `idx_modelo_categoria` (`tenant_id`, `categoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Catálogo de modelos de máquinas por tenant';

-- ── 2. Máquinas (patrimônio) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS `maquina` (
  `id`                CHAR(36)       NOT NULL,
  `tenant_id`         CHAR(36)       NOT NULL,
  `patrimonio`        VARCHAR(20)    NOT NULL  COMMENT 'Código patrimonial (ex: BC160)',
  `modelo_id`         CHAR(36)       NULL,
  `numero_serie`      VARCHAR(50)    NULL,
  `nota_fiscal`       VARCHAR(50)    NULL,
  `fornecedor`        VARCHAR(200)   NULL,
  `valor_aquisicao`   DECIMAL(12,2)  NULL,
  `data_registro`     DATE           NULL,
  `situacao`          ENUM(
                        'apta',
                        'em_locacao',
                        'manutencao',
                        'evento',
                        'nao_localizada',
                        'desativada'
                      ) NOT NULL DEFAULT 'apta',
  `localizacao_atual` VARCHAR(500)   NULL  COMMENT 'Endereço/cliente atual quando fora da base',
  `contrato_ativo_id` CHAR(36)       NULL  COMMENT 'FK para contrato vigente',
  `observacao`        TEXT           NULL,
  `criado_em`         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em`     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_patrimonio_tenant` (`tenant_id`, `patrimonio`),
  KEY `idx_maquina_tenant_situacao` (`tenant_id`, `situacao`),
  KEY `idx_maquina_modelo` (`modelo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cadastro patrimonial de máquinas';

-- ── 3. Movimentações de máquinas ─────────────────────────────
CREATE TABLE IF NOT EXISTS `movimentacao_maquina` (
  `id`                 CHAR(36)     NOT NULL,
  `tenant_id`          CHAR(36)     NOT NULL,
  `maquina_id`         CHAR(36)     NOT NULL,
  `data_saida`         DATE         NOT NULL,
  `hora_saida`         TIME         NULL,
  `cliente_id`         CHAR(36)     NULL,
  `local`              VARCHAR(500) NULL,
  `contrato_os`        VARCHAR(50)  NULL  COMMENT 'Nº contrato ou OS',
  `responsavel_id`     CHAR(36)     NULL  COMMENT 'FK usuario — quem registrou a saída',
  `ocorrencia`         TEXT         NULL  COMMENT 'Observação na saída',
  `data_retorno`       DATE         NULL  COMMENT 'Null = ainda fora da base',
  `hora_retorno`       TIME         NULL,
  `periodo_dias`       INT          NULL  COMMENT 'Calculado: data_retorno - data_saida',
  `ocorrencia_retorno` TEXT         NULL  COMMENT 'Observação no retorno',
  `criado_em`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_movmaq_tenant_maquina`  (`tenant_id`, `maquina_id`),
  KEY `idx_movmaq_tenant_saida`    (`tenant_id`, `data_saida`),
  KEY `idx_movmaq_retorno_nulo`    (`tenant_id`, `data_retorno`),
  KEY `idx_movmaq_cliente`         (`tenant_id`, `cliente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Registro de saídas e retornos de máquinas';

-- ── 4. View auxiliar: frota atual consolidada ─────────────────
CREATE OR REPLACE VIEW vw_frota_atual AS
SELECT
  m.tenant_id,
  m.situacao,
  COUNT(*) AS total
FROM maquina m
GROUP BY m.tenant_id, m.situacao;

-- ── 5. View: máquinas fora da base com dias em aberto ─────────
CREATE OR REPLACE VIEW vw_maquinas_fora_base AS
SELECT
  mv.tenant_id,
  mv.id                                                  AS movimentacao_id,
  mv.maquina_id,
  m.patrimonio,
  m.situacao,
  m.localizacao_atual,
  mv.cliente_id,
  mv.data_saida,
  mv.contrato_os,
  mv.responsavel_id,
  DATEDIFF(CURDATE(), mv.data_saida)                     AS dias_fora,
  CASE WHEN DATEDIFF(CURDATE(), mv.data_saida) >= 30
       THEN 1 ELSE 0 END                                 AS alerta
FROM movimentacao_maquina mv
JOIN maquina m
  ON m.id = mv.maquina_id
 AND m.tenant_id = mv.tenant_id
WHERE mv.data_retorno IS NULL;

-- ── 6. Dados de teste — modelos BelCafé ───────────────────────
-- Execute SOMENTE se quiser popular o ambiente de testes.
-- Substitua 'SEU_TENANT_ID' pelo UUID real do tenant belcafe.
--
-- INSERT INTO `modelo_catalogo` (`id`, `tenant_id`, `nome`, `categoria`, `bebidas`, `especificacoes`, `ativo`) VALUES
-- (UUID(), 'SEU_TENANT_ID', 'Necta Kikko Max',     'bebidas', 'Café, Cappuccino, Chocolate, Leite', '220V / 1.800W',  1),
-- (UUID(), 'SEU_TENANT_ID', 'Rheavendors LC6S',    'bebidas', 'Café, Espresso, Cappuccino',         '220V / 1.600W',  1),
-- (UUID(), 'SEU_TENANT_ID', 'Bianchi B2P',         'bebidas', 'Café, Cappuccino, Achocolatado',     '127V / 1.400W',  1),
-- (UUID(), 'SEU_TENANT_ID', 'Crane Media Plus',    'snacks',  'Snacks, Refrigerantes, Água',         '220V / 600W',   1);

-- ================================================================
--  Verificações
-- ================================================================
-- SHOW TABLES LIKE '%model%';
-- DESCRIBE maquina;
-- DESCRIBE movimentacao_maquina;
-- SELECT * FROM vw_frota_atual;
-- SELECT * FROM vw_maquinas_fora_base LIMIT 10;
