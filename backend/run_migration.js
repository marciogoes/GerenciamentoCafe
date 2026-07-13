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
  // ERR-07: o CREATE TABLE leitura_dose foi REMOVIDO daqui.
  // Ela era duplicata de leitura_doses (a viva, usada por DosesModule). A entity
  // LeituraDose nunca foi registrada em nenhum TypeOrmModule, entao a tabela era
  // criada a cada migration e nunca recebia uma linha. O DROP esta no fim deste
  // arquivo, com guarda de "so se estiver vazia".
  // ────────────────────────────────────────────────────────────────────────────

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
  console.log('\n── FIX maquina: alinhar tabela com a entidade (cadastro estava quebrado) ──');

  // 1) modelo_id era NOT NULL (versao antiga). Agora e OPCIONAL no cadastro.
  {
    const [r] = await c.query(
      `SELECT IS_NULLABLE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA=? AND TABLE_NAME='maquina' AND COLUMN_NAME='modelo_id'`, [DB]);
    if (r.length && r[0].IS_NULLABLE === 'NO') {
      await run(c, 'MODIFY maquina.modelo_id -> NULL',
        `ALTER TABLE maquina MODIFY COLUMN modelo_id CHAR(36) NULL COMMENT 'FK modelo_catalogo.id (opcional)'`);
    } else skipped('maquina.modelo_id ja e nullable');
  }

  // 2) numero_serie tambem e opcional
  {
    const [r] = await c.query(
      `SELECT IS_NULLABLE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA=? AND TABLE_NAME='maquina' AND COLUMN_NAME='numero_serie'`, [DB]);
    if (r.length && r[0].IS_NULLABLE === 'NO') {
      await run(c, 'MODIFY maquina.numero_serie -> NULL',
        `ALTER TABLE maquina MODIFY COLUMN numero_serie VARCHAR(50) NULL`);
    } else skipped('maquina.numero_serie ja e nullable');
  }

  // 3) observacao (a entidade espera, o banco nao tinha)
  if (!await colExists(c, 'maquina', 'observacao')) {
    await run(c, 'ADD COLUMN maquina.observacao',
      `ALTER TABLE maquina ADD COLUMN observacao TEXT NULL AFTER localizacao_atual`);
  } else skipped('maquina.observacao');

  // 4) criado_em
  if (!await colExists(c, 'maquina', 'criado_em')) {
    await run(c, 'ADD COLUMN maquina.criado_em',
      `ALTER TABLE maquina ADD COLUMN criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  } else skipped('maquina.criado_em');

  // 5) atualizado_em
  if (!await colExists(c, 'maquina', 'atualizado_em')) {
    await run(c, 'ADD COLUMN maquina.atualizado_em',
      `ALTER TABLE maquina ADD COLUMN atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
  } else skipped('maquina.atualizado_em');

  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── FIX GERAL: alinhar tabelas com as entidades (auditoria) ──');

  // helper local: ADD COLUMN idempotente
  const addColIf = async (table, col, ddl) => {
    if (await colExists(c, table, col)) skipped(`${table}.${col}`);
    else await run(c, `ADD ${table}.${col}`, `ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  };
  const TS_CRIADO = `criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`;
  const TS_ATUAL  = `atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`;

  // ── cliente ──
  await addColIf('cliente', 'criado_em', TS_CRIADO);
  await addColIf('cliente', 'atualizado_em', TS_ATUAL);

  // ── lancamento_mensal ──
  await addColIf('lancamento_mensal', 'criado_em', TS_CRIADO);
  await addColIf('lancamento_mensal', 'atualizado_em', TS_ATUAL);

  // ── contrato ──
  await addColIf('contrato', 'observacao', 'observacao TEXT NULL');
  await addColIf('contrato', 'criado_em', TS_CRIADO);
  await addColIf('contrato', 'atualizado_em', TS_ATUAL);
  await run(c, 'MODIFY contrato.maquina_id -> NULL (deprecated/opcional)',
    `ALTER TABLE contrato MODIFY COLUMN maquina_id CHAR(36) NULL`);

  // ── movimentacao_maquina ──
  await addColIf('movimentacao_maquina', 'ocorrencia_retorno', 'ocorrencia_retorno TEXT NULL');

  // ── modelo_catalogo: bebidas_opcoes -> bebidas (rename preservando dados) ──
  {
    const temAntiga = await colExists(c, 'modelo_catalogo', 'bebidas_opcoes');
    const temNova   = await colExists(c, 'modelo_catalogo', 'bebidas');
    if (temAntiga && !temNova) {
      await run(c, 'RENAME modelo_catalogo.bebidas_opcoes -> bebidas',
        `ALTER TABLE modelo_catalogo CHANGE COLUMN bebidas_opcoes bebidas TEXT NULL`);
    } else if (!temNova) {
      await run(c, 'ADD modelo_catalogo.bebidas',
        `ALTER TABLE modelo_catalogo ADD COLUMN bebidas TEXT NULL`);
    } else skipped('modelo_catalogo.bebidas');
  }
  await addColIf('modelo_catalogo', 'criado_em', TS_CRIADO);
  await addColIf('modelo_catalogo', 'atualizado_em', TS_ATUAL);

  // ── produto: criado_em + categoria(enum legado) -> NULL ──
  await addColIf('produto', 'criado_em', TS_CRIADO);
  if (await colExists(c, 'produto', 'categoria')) {
    await run(c, 'MODIFY produto.categoria -> NULL (enum legado ERR-14)',
      `ALTER TABLE produto MODIFY COLUMN categoria ENUM('cappuccino','chocolate','cafe_graos','cafe_leite','descartavel','outros') NULL`);
  } else skipped('produto.categoria (ja removida)');

  // ── log_auditoria: colunas novas + antigas viram nullable (preserva historico) ──
  await addColIf('log_auditoria', 'usuario_nome', `usuario_nome VARCHAR(150) NULL`);
  await addColIf('log_auditoria', 'acao',         `acao VARCHAR(100) NOT NULL DEFAULT ''`);
  await addColIf('log_auditoria', 'modulo',       `modulo VARCHAR(50) NOT NULL DEFAULT ''`);
  await addColIf('log_auditoria', 'entidade_id',  `entidade_id VARCHAR(100) NULL`);
  await addColIf('log_auditoria', 'descricao',    `descricao TEXT NULL`);
  for (const [col, ddl] of [
    ['tabela',      `tabela VARCHAR(60) NULL`],
    ['registro_id', `registro_id CHAR(36) NULL`],
    ['operacao',    `operacao ENUM('INSERT','UPDATE','DELETE') NULL`],
  ]) {
    if (await colExists(c, 'log_auditoria', col)) {
      await run(c, `MODIFY log_auditoria.${col} -> NULL (legado)`,
        `ALTER TABLE log_auditoria MODIFY COLUMN ${ddl}`);
    } else skipped(`log_auditoria.${col} (ja nao existe)`);
  }

  // ── manutencao: tabela inteira nao existe ──
  if (!await tableExists(c, 'manutencao')) {
    await run(c, 'CREATE TABLE manutencao',
      `CREATE TABLE manutencao (
        id             CHAR(36)      NOT NULL,
        tenant_id      CHAR(36)      NOT NULL,
        maquina_id     CHAR(36)      NOT NULL,
        titulo         VARCHAR(200)  NOT NULL,
        descricao      TEXT          NULL,
        tipo           ENUM('preventiva','corretiva','instalacao','limpeza','outros') NOT NULL DEFAULT 'corretiva',
        situacao       ENUM('aberta','em_andamento','concluida','cancelada')          NOT NULL DEFAULT 'aberta',
        prioridade     ENUM('baixa','media','alta','urgente')                         NOT NULL DEFAULT 'media',
        data_abertura  DATE          NOT NULL,
        data_inicio    DATE          NULL,
        data_conclusao DATE          NULL,
        tecnico        VARCHAR(150)  NULL,
        fornecedor     VARCHAR(200)  NULL,
        custo_pecas    DECIMAL(12,2) NOT NULL DEFAULT 0,
        custo_mao_obra DECIMAL(12,2) NOT NULL DEFAULT 0,
        nota_fiscal    VARCHAR(50)   NULL,
        observacao     TEXT          NULL,
        usuario_id     CHAR(36)      NULL,
        criado_em      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_man_tenant   (tenant_id),
        INDEX idx_man_maquina  (maquina_id),
        INDEX idx_man_situacao (tenant_id, situacao)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } else skipped('tabela manutencao');

  // ────────────────────────────────────────────────────────────────────────────
  // ERR-24: historico de pagamentos da assinatura do tenant ao SaaS.
  // A tabela assinatura_tenant guarda a assinatura VIGENTE (plano, valor,
  // proximo vencimento). Ela nao guarda quais meses ja foram pagos — sem isso
  // nao da para cobrar manualmente nem saber quem esta devendo.
  // ────────────────────────────────────────────────────────────────────────────
  if (!await tableExists(c, 'pagamento_assinatura')) {
    await run(c, 'tabela pagamento_assinatura (ERR-24)', `
      CREATE TABLE pagamento_assinatura (
        id              CHAR(36)      NOT NULL,
        tenant_id       CHAR(36)      NOT NULL,
        assinatura_id   CHAR(36)      NOT NULL,
        competencia     DATE          NOT NULL COMMENT 'Mes de referencia, sempre dia 01',
        valor           DECIMAL(12,2) NOT NULL,
        data_vencimento DATE          NOT NULL,
        data_pagamento  DATE          NULL     COMMENT 'NULL = ainda nao pago',
        forma_pagamento VARCHAR(30)   NULL     COMMENT 'pix, boleto, transferencia, dinheiro',
        observacao      VARCHAR(500)  NULL,
        registrado_por  CHAR(36)      NULL     COMMENT 'usuario super admin que baixou o pagamento',
        criado_em       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_pag_competencia (tenant_id, competencia),
        INDEX idx_pag_tenant     (tenant_id),
        INDEX idx_pag_em_aberto  (data_pagamento, data_vencimento)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='ERR-24: cobranca do SaaS ao tenant (nao confundir com lancamento_mensal, que e o tenant cobrando os clientes dele)'`);
  } else skipped('tabela pagamento_assinatura');

  // ────────────────────────────────────────────────────────────────────────────
  // ERR-07: leitura_dose era duplicata de leitura_doses. A entity nunca foi
  // registrada em nenhum module (o TypeORM nao a conhecia) e a tabela nasceu e
  // morreu vazia. Dropa — mas so se estiver realmente vazia. Se alguem gravou
  // algo nela, a tabela fica e o aviso aparece: e sinal de que nao era morta.
  // ────────────────────────────────────────────────────────────────────────────
  if (await tableExists(c, 'leitura_dose')) {
    const [r] = await c.query('SELECT COUNT(*) AS n FROM leitura_dose');
    if (Number(r[0].n) === 0) {
      await run(c, 'DROP tabela leitura_dose (ERR-07, orfa e vazia)', 'DROP TABLE leitura_dose');
    } else {
      console.log(`  ⚠️   leitura_dose tem ${r[0].n} linha(s) — NAO dropada. Investigue antes.`);
      skip++;
    }
  } else skipped('DROP leitura_dose — tabela ja nao existe');

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
