-- ================================================================
--  VENDING MANAGER — Sprint 7 · Módulo Estoque de Insumos
--  Criação das tabelas: produto, movimentacao_estoque
--  Execute no banco: belcafe (MySQL) via phpMyAdmin / Workbench
--  Março/2026
-- ================================================================

-- ── 1. Produtos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `produto` (
  `id`               CHAR(36)       NOT NULL,
  `tenant_id`        CHAR(36)       NOT NULL,
  `codigo`           VARCHAR(10)    NOT NULL  COMMENT 'Código interno único por tenant',
  `descricao`        VARCHAR(200)   NOT NULL,
  `marca`            VARCHAR(100)   NULL,
  `categoria`        ENUM(
                       'cappuccino',
                       'chocolate',
                       'cafe_graos',
                       'cafe_leite',
                       'descartavel',
                       'outros'
                     ) NOT NULL DEFAULT 'outros',
  `unidade`          VARCHAR(10)    NOT NULL  COMMENT 'KG, UN, PCT, CX...',
  `valor_unitario`   DECIMAL(12,4)  NOT NULL  COMMENT 'Custo de compra por unidade',
  `validade`         DATE           NULL,
  `estoque_minimo`   DECIMAL(10,3)  NULL      COMMENT 'Quantidade mínima para alerta',
  `alerta_enviado_em` DATE          NULL      COMMENT 'Data do último e-mail de alerta (RN-E06)',
  `ativo`            TINYINT(1)     NOT NULL DEFAULT 1,
  `criado_em`        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_produto_codigo_tenant` (`tenant_id`, `codigo`),
  KEY `idx_produto_tenant_ativo`        (`tenant_id`, `ativo`),
  KEY `idx_produto_tenant_categoria`    (`tenant_id`, `categoria`),
  KEY `idx_produto_alerta_enviado`      (`tenant_id`, `alerta_enviado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cadastro de produtos/insumos do tenant';

-- ── 2. Movimentações de Estoque ───────────────────────────────
CREATE TABLE IF NOT EXISTS `movimentacao_estoque` (
  `id`          CHAR(36)      NOT NULL,
  `tenant_id`   CHAR(36)      NOT NULL,
  `produto_id`  CHAR(36)      NOT NULL,
  `data`        DATE          NOT NULL,
  `tipo`        ENUM('entrada','saida') NOT NULL,
  `quantidade`  DECIMAL(10,3) NOT NULL,
  `origem`      VARCHAR(200)  NULL  COMMENT 'Fornecedor (entrada) ou destino (saída)',
  `nota_fiscal` VARCHAR(50)   NULL,
  `usuario_id`  CHAR(36)      NOT NULL,
  `observacao`  TEXT          NULL,
  `criado_em`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_movest_tenant_produto`  (`tenant_id`, `produto_id`),
  KEY `idx_movest_tenant_data`     (`tenant_id`, `data`),
  KEY `idx_movest_produto_tipo`    (`tenant_id`, `produto_id`, `tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Entradas e saídas de insumos do estoque';

-- ── 3. View: saldo atual por produto ─────────────────────────
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
  COALESCE((
    COALESCE(SUM(CASE WHEN me.tipo = 'entrada' THEN me.quantidade ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN me.tipo = 'saida'  THEN me.quantidade ELSE 0 END), 0)
  ) * p.valor_unitario, 0) AS valor_em_estoque
FROM produto p
LEFT JOIN movimentacao_estoque me
       ON me.produto_id = p.id
      AND me.tenant_id  = p.tenant_id
WHERE p.ativo = 1
GROUP BY p.tenant_id, p.id, p.codigo, p.descricao,
         p.categoria, p.unidade, p.valor_unitario, p.estoque_minimo, p.ativo;

-- ── 4. Dados de exemplo para BelCafé ─────────────────────────
-- Substitua 'SEU_TENANT_ID' pelo UUID real do tenant belcafe
-- SELECT id FROM tenant WHERE slug = 'belcafe';

-- INSERT INTO `produto` (`id`,`tenant_id`,`codigo`,`descricao`,`marca`,`categoria`,`unidade`,`valor_unitario`,`estoque_minimo`) VALUES
-- (UUID(),'SEU_TENANT_ID','0001','Cappuccino 1kg','Três Corações','cappuccino','KG', 28.50, 5.0),
-- (UUID(),'SEU_TENANT_ID','0002','Chocolate em Pó 1kg','Nestlé','chocolate','KG', 22.00, 5.0),
-- (UUID(),'SEU_TENANT_ID','0003','Café em Grãos 1kg','Pilão','cafe_graos','KG', 35.00, 3.0),
-- (UUID(),'SEU_TENANT_ID','0004','Copos Descartáveis 200ml (pct 100un)','Plastipak','descartavel','PCT', 12.00, 10.0),
-- (UUID(),'SEU_TENANT_ID','0005','Café com Leite 1kg','Três Corações','cafe_leite','KG', 26.00, 5.0);

-- ── Verificações ──────────────────────────────────────────────
-- DESCRIBE produto;
-- DESCRIBE movimentacao_estoque;
-- SELECT * FROM vw_saldo_estoque WHERE tenant_id = 'SEU_TENANT_ID';
