/**
 * ============================================================
 *  Vending Manager — Diagnóstico de Schema da tabela `maquina`
 * ============================================================
 *  Descobre por que o cadastro de máquina falha comparando a
 *  tabela real do banco com o que a entidade TypeORM espera,
 *  e reproduz o INSERT real (em transação + ROLLBACK, sem sujar
 *  o banco) para capturar o erro EXATO que o sistema recebe.
 *
 *  Uso (de dentro da pasta backend\):
 *     node verificar_schema.js
 * ============================================================
 */

const mysql  = require('mysql2/promise');
const path   = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// ── Cores ────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', gray: '\x1b[90m',
};
const ok   = (s) => `${C.green}✔${C.reset}  ${s}`;
const bad  = (s) => `${C.red}✘${C.reset}  ${C.red}${s}${C.reset}`;
const warn = (s) => `${C.yellow}⚠${C.reset}  ${C.yellow}${s}${C.reset}`;
const info = (s) => `${C.cyan}ℹ${C.reset}  ${s}`;
const head = (s) => `\n${C.bold}═══ ${s} ═══${C.reset}`;

// ── Colunas que a ENTIDADE Maquina espera ────────────────────
//  (mantenha em sincronia com maquina.entity.ts)
const COLUNAS_ENTIDADE = [
  'id', 'tenant_id', 'patrimonio', 'modelo_id', 'numero_serie',
  'nota_fiscal', 'fornecedor', 'valor_aquisicao', 'data_registro',
  'situacao', 'localizacao_atual', 'observacao', 'criado_em', 'atualizado_em',
];

async function getColumns(conn, table) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE, EXTRA
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION`,
    [process.env.DB_NAME, table],
  );
  return rows;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [process.env.DB_NAME, table],
  );
  return rows[0].n > 0;
}

(async () => {
  const cfg = {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME     || 'belcafe',
    user:     process.env.DB_USER     || 'belcafe',
    password: process.env.DB_PASSWORD || '',
    connectTimeout: 15000,
  };

  console.log(info(`Conectando em ${cfg.host}:${cfg.port}/${cfg.database} ...`));

  let conn;
  try {
    conn = await mysql.createConnection(cfg);
  } catch (e) {
    console.log(bad(`Não consegui conectar ao banco: ${e.message}`));
    console.log(info('Confira o .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) e rode de dentro de backend\\'));
    process.exit(1);
  }

  let problemas = 0;

  try {
    if (!(await tableExists(conn, 'maquina'))) {
      console.log(bad('A tabela "maquina" não existe no banco!'));
      return;
    }

    const cols  = await getColumns(conn, 'maquina');
    const nomes = cols.map((c) => c.COLUMN_NAME);

    console.log(head('Tabela: maquina'));
    console.log(info(`Colunas no banco: ${nomes.join(', ')}`));

    // ── 1. Colunas órfãs (no banco, fora da entidade) ──────────
    console.log(head('Colunas órfãs (existem no banco, mas a entidade não conhece)'));
    const orfas = cols.filter((c) => !COLUNAS_ENTIDADE.includes(c.COLUMN_NAME));
    if (orfas.length === 0) {
      console.log(ok('Nenhuma coluna órfã.'));
    } else {
      for (const c of orfas) {
        const notNull    = c.IS_NULLABLE === 'NO';
        const semDefault = c.COLUMN_DEFAULT === null && !/auto_increment/i.test(c.EXTRA || '');
        if (notNull && semDefault) {
          problemas++;
          console.log(bad(`${c.COLUMN_NAME} (${c.COLUMN_TYPE}) — NOT NULL sem default → QUEBRA todo INSERT de máquina!`));
        } else {
          console.log(warn(`${c.COLUMN_NAME} (${c.COLUMN_TYPE}) — órfã, mas nullable/com default (não quebra o INSERT)`));
        }
      }
    }

    // ── 2. Colunas faltando (na entidade, fora do banco) ───────
    console.log(head('Colunas faltando (a entidade espera, mas o banco não tem)'));
    const faltando = COLUNAS_ENTIDADE.filter((n) => !nomes.includes(n));
    if (faltando.length === 0) {
      console.log(ok('Nenhuma coluna faltando.'));
    } else {
      faltando.forEach((n) => {
        problemas++;
        console.log(bad(`${n} — FALTANDO → quebra INSERT/SELECT`));
      });
    }

    // ── 3. Foco: contrato_ativo_id (ERR-04) ────────────────────
    console.log(head('Verificação específica: contrato_ativo_id (ERR-04)'));
    const cai = cols.find((c) => c.COLUMN_NAME === 'contrato_ativo_id');
    if (!cai) {
      console.log(ok('Coluna já removida — correção ERR-04 aplicada no banco.'));
    } else {
      console.log(bad(`Ainda existe: ${cai.COLUMN_TYPE}, Null=${cai.IS_NULLABLE}, Default=${cai.COLUMN_DEFAULT}`));
      if (cai.IS_NULLABLE === 'NO' && cai.COLUMN_DEFAULT === null) {
        console.log(bad('  → Causa provável do cadastro falhar. Precisa do DROP COLUMN.'));
      } else {
        console.log(warn('  → Existe mas é nullable; sozinha não quebra o INSERT.'));
      }
    }

    // ── 4. Integridade de tenant (FK fk_maquina_tenant) ──────────
    console.log(head('Integridade de tenant (FK fk_maquina_tenant)'));
    const [tenants] = await conn.query('SELECT id FROM tenant');
    if (tenants.length === 0) {
      console.log(bad('Nenhum tenant na tabela "tenant"! Nenhum cadastro com FK de tenant funciona.'));
    } else {
      console.log(info(`Tenants (id): ${tenants.map((t) => `'${t.id}'`).join(', ')}`));
    }
    const [usuarios] = await conn.query('SELECT email, tenant_id FROM usuario');
    for (const u of usuarios) {
      const existe = tenants.some((t) => t.id === u.tenant_id);
      if (existe) {
        console.log(ok(`usuario ${u.email}: tenant_id '${u.tenant_id}' existe em tenant`));
      } else {
        problemas++;
        console.log(bad(`usuario ${u.email}: tenant_id '${u.tenant_id}' NAO existe em tenant -> FK falha ao cadastrar!`));
      }
    }

    // ── 5. Teste REAL de INSERT (transação + ROLLBACK) ─────────
    //  Usa um tenant_id VALIDO (o do usuario logado) para nao gerar
    //  falso positivo de FK. Reproduz fielmente o INSERT do TypeORM.
    console.log(head('Teste real de INSERT (em transação, desfeito com ROLLBACK)'));
    const tenantValido =
      (usuarios.find((u) => tenants.some((t) => t.id === u.tenant_id)) || {}).tenant_id
      || (tenants[0] && tenants[0].id)
      || 'belcafe';
    console.log(info(`Usando tenant_id de teste: '${tenantValido}'`));

    const insertCols = COLUNAS_ENTIDADE.filter((n) => nomes.includes(n));
    const valores = insertCols.map((c) => {
      switch (c) {
        case 'id':            return 'ffffffff-dead-beef-dead-ffffffffffff';
        case 'tenant_id':     return tenantValido;
        case 'patrimonio':    return '__DIAG_TESTE__';
        case 'situacao':      return 'apta';
        case 'criado_em':     return new Date();
        case 'atualizado_em': return new Date();
        default:              return null; // todos os opcionais
      }
    });
    const placeholders = insertCols.map(() => '?').join(', ');
    const sqlInsert = `INSERT INTO maquina (${insertCols.join(', ')}) VALUES (${placeholders})`;

    await conn.query('START TRANSACTION');
    try {
      await conn.query(sqlInsert, valores);
      console.log(ok('INSERT de teste FUNCIONOU - a maquina aceita um cadastro novo com tenant valido.'));
    } catch (e) {
      problemas++;
      console.log(bad(`INSERT de teste FALHOU:  [${e.code}]  ${e.sqlMessage || e.message}`));
      console.log(info('  ↑ Este é exatamente o erro que o backend recebe ao tentar cadastrar.'));
    } finally {
      await conn.query('ROLLBACK');
    }

    // ── 5. Outras correções pendentes (alter_correcoes_erros.sql) ─
    console.log(head('Outras correções de schema (alter_correcoes_erros.sql)'));

    if (await tableExists(conn, 'movimentacao_maquina')) {
      const mm      = await getColumns(conn, 'movimentacao_maquina');
      const mmNomes = mm.map((c) => c.COLUMN_NAME);
      console.log(mmNomes.includes('contrato_id')
        ? ok('movimentacao_maquina.contrato_id presente (ERR-11)')
        : bad('movimentacao_maquina.contrato_id FALTANDO (ERR-11)'));
      console.log(mmNomes.includes('os_referencia')
        ? ok('movimentacao_maquina.os_referencia presente (ERR-11)')
        : bad('movimentacao_maquina.os_referencia FALTANDO (ERR-11)'));
      console.log(!mmNomes.includes('contrato_os')
        ? ok('movimentacao_maquina.contrato_os legada já removida (ERR-11)')
        : warn('movimentacao_maquina.contrato_os legada ainda existe'));
    } else {
      console.log(warn('tabela movimentacao_maquina não encontrada'));
    }

    const tabelasEsperadas = [
      'contrato_maquinas', 'leitura_dose', 'relatorio_agendado',
      'assinatura_tenant', 'tenant_whitelabel', 'categoria_insumo',
    ];
    for (const t of tabelasEsperadas) {
      console.log((await tableExists(conn, t))
        ? ok(`tabela ${t} existe`)
        : bad(`tabela ${t} FALTANDO`));
    }

    // ── Veredito ───────────────────────────────────────────────
    console.log(head('VEREDITO'));
    if (problemas === 0) {
      console.log(ok('Schema da maquina está consistente.'));
      console.log(info('Se o cadastro ainda falha, o erro é em outra camada — me mande o erro do terminal do backend.'));
    } else {
      console.log(bad(`${problemas} problema(s) que afeta(m) o cadastro de máquina.`));
      console.log(info('Correção recomendada: registrar alter_correcoes_erros.sql no migrate.ts e rodar a migração'));
      console.log(info('(o runner trata "já existe / já removido" como aviso, então é seguro re-rodar).'));
    }

  } finally {
    await conn.end();
  }
})().catch((e) => {
  console.error(`\n${C.red}Erro inesperado no diagnóstico:${C.reset}`, e.message);
  process.exit(1);
});
