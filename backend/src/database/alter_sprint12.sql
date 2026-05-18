CREATE TABLE IF NOT EXISTS log_importacao (
  id            CHAR(36)     NOT NULL,
  tenant_id     CHAR(36)     NOT NULL,
  usuario_id    CHAR(36)     NOT NULL,
  tipo          VARCHAR(30)  NOT NULL COMMENT 'clientes | maquinas | estoque',
  status        VARCHAR(20)  NOT NULL DEFAULT 'concluido',
  total_linhas  INT          NOT NULL DEFAULT 0,
  importados    INT          NOT NULL DEFAULT 0,
  erros         INT          NOT NULL DEFAULT 0,
  observacao    TEXT,
  criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_log_importacao_tenant (tenant_id),
  INDEX idx_log_importacao_tipo   (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
