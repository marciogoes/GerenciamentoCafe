/**
 * ============================================================
 *  Vending Manager — Auditoria GERAL de Schema (banco x entidades)
 * ============================================================
 *  Lê todas as *.entity.ts de src/modules, extrai as colunas que
 *  cada entidade declara e compara com a tabela real no MySQL.
 *
 *  Detecta os 3 tipos de problema que quebram INSERT/SELECT:
 *   (A) Coluna que a entidade espera e o banco NÃO tem      → CRÍTICO
 *   (B) Coluna órfã no banco, NOT NULL sem default          → CRÍTICO
 *   (C) Entidade marca nullable, mas o banco é NOT NULL      → ALERTA
 *       (foi exatamente o caso do maquina.modelo_id)
 *
 *  NÃO altera nada no banco. Só lê. Uso (de dentro de backend\):
 *     node auditar_schema.js
 * ============================================================
 */

const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

// ── Cores ────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', gray: '\x1b[90m',
};
const ok   = (s) => `${C.green}✔${C.reset}  ${s}`;
const bad  = (s) => `  ${C.red}✘ ${s}${C.reset}`;
const alert= (s) => `  ${C.yellow}▲ ${s}${C.reset}`;
const note = (s) => `  ${C.gray}· ${s}${C.reset}`;

// ── .env manual (mesmo padrão do run_migration.js) ───────────
const env = {};
fs.readFileSync(path.join(__dirname, '.env'), 'utf-8').split('\n').forEach((line) => {
  const eq = line.indexOf('=');
  if (eq > 0 && !line.trim().startsWith('#')) {
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
});
const DB = env.DB_NAME;

// ── Coleta recursiva dos arquivos *.entity.ts ────────────────
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (e.name.endsWith('.entity.ts')) acc.push(full);
  }
  return acc;
}

// ── Parser tolerante de colunas de uma entidade ──────────────
//  Casa @Column / @PrimaryColumn / @CreateDateColumn / etc.,
//  lê o objeto de opções (com contagem de parênteses, robusto a
//  parênteses aninhados) e o nome da propriedade logo a seguir.
const DECORATORS = [
  'PrimaryGeneratedColumn', 'PrimaryColumn', 'CreateDateColumn',
  'UpdateDateColumn', 'DeleteDateColumn', 'VersionColumn', 'Column',
];

function extractTable(src) {
  const m = src.match(/@Entity\(\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

function extractColumns(src) {
  const cols = [];
  const re = new RegExp(`@(${DECORATORS.join('|')})\\b`, 'g');
  let m;
  while ((m = re.exec(src)) !== null) {
    const decType = m[1];
    let i = m.index + m[0].length;
    while (i < src.length && /\s/.test(src[i])) i++;

    // Lê o bloco de opções (...) casando parênteses
    let args = '';
    if (src[i] === '(') {
      let depth = 0; const start = i;
      for (; i < src.length; i++) {
        if (src[i] === '(') depth++;
        else if (src[i] === ')') { depth--; if (depth === 0) { i++; break; } }
      }
      args = src.slice(start + 1, i - 1);
    }

    // Nome da propriedade que vem logo depois do decorator
    const rest = src.slice(i);
    const pm = rest.match(/^[\s]*([a-zA-Z_]\w*)\s*[!?]?\s*:/);
    if (!pm) continue;
    const prop = pm[1];

    const nameMatch = args.match(/name:\s*['"]([^'"]+)['"]/);
    const colName   = nameMatch ? nameMatch[1] : prop;
    const isDate    = /DateColumn/.test(decType);
    const isPrimary = /Primary/.test(decType);
    const nullable  = /nullable:\s*true/.test(args) && !isDate && !isPrimary;

    cols.push({ prop, colName, nullable });
  }
  return cols;
}

// ── Schema real do banco ─────────────────────────────────────
async function dbColumns(conn, table) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE, EXTRA
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [DB, table],
  );
  const map = {};
  rows.forEach((r) => { map[r.COLUMN_NAME] = r; });
  return map;
}
async function tableExists(conn, table) {
  const [r] = await conn.query(
    `SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?`,
    [DB, table],
  );
  return r[0].n > 0;
}

// ── Main ─────────────────────────────────────────────────────
(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT) || 3306,
    database: DB, user: env.DB_USER, password: env.DB_PASSWORD, charset: 'utf8mb4',
  });
  console.log(`\n🔌  ${env.DB_HOST}/${DB}\n`);

  const arquivos = walk(path.join(__dirname, 'src', 'modules'));

  const tabelasVistas = {};   // tabela -> arquivo (para detectar duplicatas)
  let tabelasOk = 0, tabelasComProblema = 0, criticos = 0, alertas = 0;

  for (const file of arquivos) {
    const src   = fs.readFileSync(file, 'utf-8');
    const tabela = extractTable(src);
    if (!tabela) continue; // classe sem @Entity (abstrata/embeddable)

    const nomeCurto = path.relative(path.join(__dirname, 'src', 'modules'), file);

    // Duplicata de tabela (duas entidades para a mesma tabela)
    if (tabelasVistas[tabela]) {
      console.log(`${C.yellow}${C.bold}⚠ DUPLICADA${C.reset}  tabela '${tabela}' mapeada por 2 entidades:`);
      console.log(note(tabelasVistas[tabela]));
      console.log(note(nomeCurto));
      alertas++;
    } else {
      tabelasVistas[tabela] = nomeCurto;
    }

    if (!(await tableExists(conn, tabela))) {
      console.log(`${C.red}${C.bold}✘ ${tabela}${C.reset}  ${C.gray}(${nomeCurto})${C.reset}`);
      console.log(bad(`Tabela não existe no banco`));
      tabelasComProblema++; criticos++;
      continue;
    }

    const ent = extractColumns(src);
    const db  = await dbColumns(conn, tabela);
    const dbNomes = Object.keys(db);

    const problemas = [];

    // (A) Colunas da entidade que faltam no banco
    for (const c of ent) {
      if (!dbNomes.includes(c.colName)) {
        problemas.push({ tipo: 'CRIT', msg: `coluna '${c.colName}' (prop ${c.prop}) FALTANDO no banco` });
      }
    }

    // (C) Entidade nullable, banco NOT NULL  (caso modelo_id)
    for (const c of ent) {
      const real = db[c.colName];
      if (real && c.nullable && real.IS_NULLABLE === 'NO') {
        problemas.push({
          tipo: 'ALERT',
          msg: `coluna '${c.colName}': entidade aceita null, mas banco é NOT NULL` +
               (real.COLUMN_DEFAULT === null ? ' sem default → quebra INSERT com null' : ' (tem default)'),
        });
      }
    }

    // (B) Colunas órfãs no banco (fora da entidade)
    const entNomes = ent.map((c) => c.colName);
    for (const name of dbNomes) {
      if (!entNomes.includes(name)) {
        const real = db[name];
        const notNull    = real.IS_NULLABLE === 'NO';
        const semDefault = real.COLUMN_DEFAULT === null && !/auto_increment/i.test(real.EXTRA || '');
        if (notNull && semDefault) {
          problemas.push({ tipo: 'CRIT', msg: `coluna órfã '${name}' (${real.COLUMN_TYPE}) NOT NULL sem default → quebra todo INSERT` });
        } else {
          problemas.push({ tipo: 'NOTE', msg: `coluna órfã '${name}' (no banco, fora da entidade) — inofensiva` });
        }
      }
    }

    const crit  = problemas.filter((p) => p.tipo === 'CRIT');
    const alrt  = problemas.filter((p) => p.tipo === 'ALERT');

    if (crit.length === 0 && alrt.length === 0) {
      console.log(ok(`${tabela}  ${C.gray}(${ent.length} colunas)${C.reset}`));
      tabelasOk++;
      // mostra órfãs inofensivas de forma discreta, se houver
      problemas.filter((p) => p.tipo === 'NOTE').forEach((p) => console.log(note(p.msg)));
    } else {
      console.log(`${C.red}${C.bold}✘ ${tabela}${C.reset}  ${C.gray}(${nomeCurto})${C.reset}`);
      crit.forEach((p) => console.log(bad(p.msg)));
      alrt.forEach((p) => console.log(alert(p.msg)));
      problemas.filter((p) => p.tipo === 'NOTE').forEach((p) => console.log(note(p.msg)));
      tabelasComProblema++;
      criticos += crit.length;
      alertas  += alrt.length;
    }
  }

  await conn.end();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Tabelas OK            : ${tabelasOk}`);
  console.log(`  Tabelas com problema  : ${tabelasComProblema}`);
  console.log(`  ${C.red}Problemas CRÍTICOS    : ${criticos}${C.reset}  (quebram INSERT/SELECT)`);
  console.log(`  ${C.yellow}Alertas (nullability) : ${alertas}${C.reset}  (quebram só com valor null)`);
  console.log('='.repeat(60));
  if (criticos === 0 && alertas === 0) {
    console.log(`\n${C.green}${C.bold}🎉  Nenhuma divergência banco x entidade!${C.reset}\n`);
  } else {
    console.log(`\nCole esta saída para o Claude gerar as correções (ALTER TABLE) certas.\n`);
  }
})().catch((e) => {
  console.error(`\n${C.red}Falha:${C.reset}`, e.message);
  process.exit(1);
});
