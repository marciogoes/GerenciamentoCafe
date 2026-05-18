/**
 * run_migration.js — MySQL 5.7 compatible
 * Verifica existence via information_schema ANTES de qualquer ALTER/CREATE/DROP.
 * Nenhum IF NOT EXISTS / IF EXISTS em ALTER TABLE ou CREATE INDEX.
 *
 * Uso: node run_migration.js
 */
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

// ── Lê .env manualmente ──────────────────────────────────────────────────────
const env = {};
fs.readFileSync(path.join(__dirname, '.env'), 'utf-8').split('\n').forEach(line => {
  const eq = line.indexOf('=');
  if (eq > 0 && !line.trim().startsWith('#')) {
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
});
const DB = env.DB_NAME;

// ── Helpers ──────────────────────────────────────────────────────────────────
async function colExists(c, table, col) {
  const [r] = await c.query(
    `SELECT COUNT(*) n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?`,
    [DB, table, col]);
  return r[0].n > 0;
}
async function tableExists(c, table) {
  const [r] = await c.query(
    `SELECT COUNT(*) n FROM information_schema.TABLES
     WHERE TABLE_SCHEMA=? AND TABLE_NAME=?`,
    [DB, table]);
  return r[0].n > 0;
}
async function indexExists(c, table, idx) {
  const [r] = await c.query(
    `SELECT COUNT(*) n FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME=?`,
    [DB, table, idx]);
  return r[0].n > 0;
}

let ok = 0, skip = 0, err = 0;

async function run(c, label, sql) {
  try {
    await c.query(sql);
    console.log(`  ✅  ${label}`);
    ok++;
  } catch (e) {
    console.error(`  ❌  ${label}\n     → ${e.message}`);
    err++;
  }
}
function skipped(label) {
  console.log(`  ⚠️   ${label} — já existe, ignorado`);
  skip++;
}

// ── main ─────────────────────────────────────────────────────────────────────
(async () => {
  const c = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT) || 3306,
    database: DB, user: env.DB_USER, password: env.DB_PASSWORD,
    charset: 'utf8mb4',
  });
  console.log(`\n🔌  Conectado em ${env.DB_HOST}/${DB}\n`);

  // ────────────────────────────────────────────────────────────────────────────
  console.log('── ERR-04: remover maquina.contrato_ativo_id (referência circular) ──');
  if (await colExists(c, 'maquina', 'contrato_ativo_id')) {
    // Descobre o nome da FK que protege a coluna
    const [fkRows] = await c.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA=? AND TABLE_NAME='maquina'
         AND COLUMN_NAME='contrato_ativo_id'
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [DB]);
    for (const row of fkRows) {
      await run(c, `DROP FOREIGN KEY ${row.CONSTRAINT_NAME} de maquina`,
        `ALTER TABLE maquina DROP FOREIGN KEY ${row.CONSTRAINT_NAME}`);
    }
    // Agora dropa o índice (se existir separado da FK)
    const [idxRows] = await c.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA=? AND TABLE_NAME='maquina'
         AND COLUMN_NAME='contrato_ativo_id'
         AND INDEX_NAME != 'PRIMARY'`,
      [DB]);
    const idxNames = [...new Set(idxRows.map(r => r.INDEX_NAME))];
    for (const idx of idxNames) {
      await run(c, `DROP INDEX ${idx} de maquina`,
        `ALTER TABLE maquina DROP INDEX \`${idx}\``);
    }
    await run(c, 'DROP COLUMN maquina.contrato_ativo_id',
      `ALTER TABLE maquina DROP COLUMN contrato_ativo_id`);
  } else skipped('maquina.contrato_ativo_id');

  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── ERR-11: movimentacao_maquina — contrato_os → contrato_id + os_referencia ──');

  if (!await colExists(c, 'movimentacao_maquina', 'contrato_id')) {
    await run(c, 'ADD COLUMN movimentacao_maquina.contrato_id',
      `ALTER TABLE movimentacao_maquina
       ADD COLUMN contrato_id CHAR(36) NULL
       COMMENT 'FK para contrato.id' AFTER local`);
  } else skipped('movimentacao_maquina.contrato_id');

  if (!await colExists(c, 'movimentacao_maquina', 'os_referencia')) {
    await run(c, 'ADD COLUMN movimentacao_maquina.os_referencia',
      `ALTER TABLE movimentacao_maquina
       ADD COLUMN os_referencia VARCHAR(50) NULL
       COMMENT 'Numero de OS externa' AFTER contrato_id`);
  } else skipped('movimentacao_maquina.os_referencia');

  // Migra dados legados se contrato_os ainda existir
  if (await colExists(c, 'movimentacao_maquina', 'contrato_os')) {
    await run(c, 'Migrar contrato_os → os_referencia',
      `UPDATE movimentacao_maquina
       SET os_referencia = contrato_os
       WHERE contrato_os IS NOT NULL AND os_referencia IS NULL`);
    await run(c, 'DROP COLUMN movimentacao_maquina.contrato_os',
      `ALTER TABLE movimentacao_maquina DROP COLUMN contrato_os`);
  } else skipped('contrato_os (já foi removido)');

  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── ERR-03: tabela contrato_maquinas (relação N:N) ──');
  if (!await tableExists(c, 'contrato_maquinas')) {
    await run(c, 'CREATE TABLE contrato_maquinas',
      `CREATE TABLE contrato_maquinas (
        contrato_id   CHAR(36)   NOT NULL COMMENT 'FK contrato.id',
        maquina_id    CHAR(36)   NOT NULL COMMENT 'FK maquina.id',
        tenant_id     CHAR(36)   NOT NULL,
        data_inclusao DATE       NOT NULL,
        ativo         TINYINT(1) NOT NULL DEFAULT 1,
        criado_em     DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (contrato_id, maquina_id),
        INDEX idx_cm_tenant   (tenant_id),
        INDEX idx_cm_maquina  (maquina_id),
        INDEX idx_cm_contrato (contrato_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await run(c, 'Migrar vinculos contrato.maquina_id → contrato_maquinas',
      `INSERT IGNORE INTO contrato_maquinas
         (contrato_id, maquina_id, tenant_id, data_inclusao, ativo)
       SELECT id, maquina_id, tenant_id, data_inicio, 1
       FROM   contrato
       WHERE  maquina_id IS NOT NULL`);
  } else skipped('contrato_maquinas');

  if (!await indexExists(c, 'contrato_maquinas', 'idx_cm_ativo')) {
    await run(c, 'CREATE INDEX idx_cm_ativo',
      `CREATE INDEX idx_cm_ativo ON contrato_maquinas (tenant_id, maquina_id, ativo)`);
  } else skipped('idx_cm_ativo');

  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── ERR-14: categoria_insumo + produto.categoria_id ──');
  if (!await tableExists(c, 'categoria_insumo')) {
    await run(c, 'CREATE TABLE categoria_insumo',
      `CREATE TABLE categoria_insumo (
        id            CHAR(36)     NOT NULL,
        tenant_id     CHAR(36)     NOT NULL,
        nome          VARCHAR(100) NOT NULL,
        ordem         INT          NOT NULL DEFAULT 0,
        ativo         TINYINT(1)   NOT NULL DEFAULT 1,
        criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_ci_tenant (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } else skipped('categoria_insumo');

  if (!await colExists(c, 'produto', 'categoria_id')) {
    await run(c, 'ADD COLUMN produto.categoria_id',
      `ALTER TABLE produto
       ADD COLUMN categoria_id CHAR(36) NULL
       COMMENT 'FK categoria_insumo.id' AFTER marca`);
  } else skipped('produto.categoria_id');

  if (!await colExists(c, 'produto', 'categoria_legado')) {
    await run(c, 'ADD COLUMN produto.categoria_legado',
      `ALTER TABLE produto
       ADD COLUMN categoria_legado VARCHAR(50) NULL
       COMMENT 'Valor ENUM antigo migrado' AFTER categoria_id`);

    await run(c, 'Migrar produto.categoria → categoria_legado',
      `UPDATE produto SET categoria_legado = categoria WHERE categoria_legado IS NULL`);
  } else skipped('produto.categoria_legado');

  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── ERR-07: leitura_dose ──');
  if (!await tableExists(c, 'leitura_dose')) {
    await run(c, 'CREATE TABLE leitura_dose',
      `CREATE TABLE leitura_dose (
        id                  CHAR(36)   NOT NULL,
        tenant_id           CHAR(36)   NOT NULL,
        contrato_id         CHAR(36)   NOT NULL,
        cliente_id          CHAR(36)   NOT NULL,
        maquina_id          CHAR(36)   NOT NULL,
        data_leitura        DATE       NOT NULL,
        leitura_anterior    INT        NULL,
        leitura_atual       INT        NOT NULL,
        doses_consumidas    INT        NOT NULL,
        enviado_contratante TINYINT(1) NOT NULL DEFAULT 0,
        usuario_id          CHAR(36)   NOT NULL,
        observacao          TEXT       NULL,
        criado_em           DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em       DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_ld_tenant   (tenant_id),
        INDEX idx_ld_contrato (contrato_id),
        INDEX idx_ld_maquina  (maquina_id),
        INDEX idx_ld_data     (tenant_id, data_leitura)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } else skipped('leitura_dose');

  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── ERR-19: tenant_whitelabel ──');
  if (!await tableExists(c, 'tenant_whitelabel')) {
    await run(c, 'CREATE TABLE tenant_whitelabel',
      `CREATE TABLE tenant_whitelabel (
        id             CHAR(36)     NOT NULL,
        tenant_id      CHAR(36)     NOT NULL UNIQUE,
        nome_sistema   VARCHAR(150) NULL,
        logo_url       VARCHAR(500) NULL,
        favicon_url    VARCHAR(500) NULL,
        cor_primaria   CHAR(7)      NULL,
        cor_secundaria CHAR(7)      NULL,
        email_template TEXT         NULL,
        pdf_cabecalho  TEXT         NULL,
        pdf_rodape     TEXT         NULL,
        criado_em      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_wl_tenant (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } else skipped('tenant_whitelabel');

  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── ERR-21: relatorio_agendado ──');
  if (!await tableExists(c, 'relatorio_agendado')) {
    await run(c, 'CREATE TABLE relatorio_agendado',
      `CREATE TABLE relatorio_agendado (
        id            CHAR(36)   NOT NULL,
        tenant_id     CHAR(36)   NOT NULL,
        tipo          ENUM('financeiro','contratos','estoque','maquinas') NOT NULL,
        frequencia    ENUM('diario','semanal','mensal') NOT NULL,
        destinatarios JSON       NOT NULL,
        proximo_envio DATETIME   NOT NULL,
        ultimo_envio  DATETIME   NULL,
        ativo         TINYINT(1) NOT NULL DEFAULT 1,
        criado_por    CHAR(36)   NOT NULL,
        criado_em     DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_ra_tenant  (tenant_id),
        INDEX idx_ra_proximo (proximo_envio),
        INDEX idx_ra_job     (ativo, proximo_envio)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } else skipped('relatorio_agendado');

  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── ERR-24: assinatura_tenant ──');
  if (!await tableExists(c, 'assinatura_tenant')) {
    await run(c, 'CREATE TABLE assinatura_tenant',
      `CREATE TABLE assinatura_tenant (
        id                      CHAR(36)      NOT NULL,
        tenant_id               CHAR(36)      NOT NULL,
        plano                   ENUM('starter','pro','enterprise') NOT NULL,
        status                  ENUM('ativo','inadimplente','cancelado') NOT NULL DEFAULT 'ativo',
        gateway                 VARCHAR(50)   NOT NULL,
        gateway_subscription_id VARCHAR(200)  NULL,
        valor_mensal            DECIMAL(12,2) NOT NULL,
        data_inicio             DATE          NOT NULL,
        proximo_vencimento      DATE          NOT NULL,
        cancelado_em            DATE          NULL,
        criado_em               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_at_tenant (tenant_id),
        INDEX idx_at_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } else skipped('assinatura_tenant');

  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── ERR-05: tenant.dias_alerta_suspenso ──');
  if (!await colExists(c, 'tenant', 'dias_alerta_suspenso')) {
    await run(c, 'ADD COLUMN tenant.dias_alerta_suspenso',
      `ALTER TABLE tenant
       ADD COLUMN dias_alerta_suspenso INT NOT NULL DEFAULT 30
       COMMENT 'Dias de suspensao antes do aviso de exclusao'`);
  } else skipped('tenant.dias_alerta_suspenso');

  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── Sprint 17: tenant.desconto_percentual + desconto_expira_em ──');
  if (!await colExists(c, 'tenant', 'desconto_percentual')) {
    await run(c, 'ADD COLUMN tenant.desconto_percentual',
      `ALTER TABLE tenant
       ADD COLUMN desconto_percentual DECIMAL(5,2) NULL DEFAULT NULL
       COMMENT 'Percentual de desconto comercial concedido pelo super admin (0-100)'`);
  } else skipped('tenant.desconto_percentual');

  if (!await colExists(c, 'tenant', 'desconto_expira_em')) {
    await run(c, 'ADD COLUMN tenant.desconto_expira_em',
      `ALTER TABLE tenant
       ADD COLUMN desconto_expira_em DATE NULL DEFAULT NULL
       COMMENT 'Data de expiracao do desconto comercial'`);
  } else skipped('tenant.desconto_expira_em');

  // ────────────────────────────────────────────────────────────────────────────
  await c.end();

  console.log(`\n${'='.repeat(55)}`);
  console.log(`  ✅  Executados com sucesso : ${ok}`);
  console.log(`  ⚠️   Ja existiam (ignorados): ${skip}`);
  console.log(`  ❌  Erros reais            : ${err}`);
  console.log('='.repeat(55));

  if (err === 0) {
    console.log('\n🎉  Migration concluida com sucesso!\n');
  } else {
    console.error('\n❌  Alguns statements falharam. Verifique acima.\n');
    process.exit(1);
  }
})().catch(e => {
  console.error('\n❌  Falha ao conectar:', e.message);
  process.exit(1);
});
