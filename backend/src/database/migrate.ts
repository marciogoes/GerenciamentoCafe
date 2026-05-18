/**
 * ============================================================
 * Vending Manager — Migration Runner
 * ============================================================
 * Executa todos os scripts SQL na ordem correta.
 * Mantém a tabela `_migrations` para nunca re-executar um script.
 *
 * Uso:
 *   npx ts-node src/database/migrate.ts           → aplica pendentes
 *   npx ts-node src/database/migrate.ts --status        → mostra status
 *   npx ts-node src/database/migrate.ts --retry <nome>  → re-executa uma migração específica
 *   npx ts-node src/database/migrate.ts --reset   → limpa histórico (CUIDADO!)
 * ============================================================
 */

import * as mysql from 'mysql2/promise';
import * as fs    from 'fs';
import * as path  from 'path';
import * as dotenv from 'dotenv';

// Carrega .env do diretório raiz do backend (src/database → src → backend)
dotenv.config({ path: path.resolve(__dirname, '../..', '.env') });

// ── Cores para o terminal ────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  white:  '\x1b[97m',
};
const ok    = (s: string) => `${C.green}✔${C.reset}  ${s}`;
const skip  = (s: string) => `${C.yellow}–${C.reset}  ${C.gray}${s} (já aplicado)${C.reset}`;
const fail  = (s: string) => `${C.red}✘${C.reset}  ${C.red}${s}${C.reset}`;
const info  = (s: string) => `${C.cyan}ℹ${C.reset}  ${s}`;
const title = (s: string) => `\n${C.bold}${C.white}${s}${C.reset}`;

// ── Lista de migrações em ORDEM EXATA de aplicação ──────────
//    Adicione novos scripts ao FINAL desta lista.
const MIGRATIONS: { name: string; file: string }[] = [
  // Sprint 2 — estrutura base de contratos e máquinas
  { name: '001_sprint2',              file: 'alter_sprint2.sql'            },
  // Sprint 3 — clientes, reajustes
  { name: '002_sprint3',              file: 'alter_sprint3.sql'            },
  // Sprint 4 — views e índices de performance
  { name: '003_sprint4_view_saldo',   file: 'sprint4/01_view_saldo_estoque.sql'       },
  { name: '004_sprint4_view_inadimp', file: 'sprint4/02_view_inadimplencia.sql'       },
  { name: '005_sprint4_view_receita', file: 'sprint4/03_view_receita_mensal.sql'      },
  { name: '006_sprint4_idx_lancam',   file: 'sprint4/04_index_lancamento_mensal.sql'  },
  { name: '007_sprint4_idx_maquina',  file: 'sprint4/05_index_maquina.sql'            },
  { name: '008_sprint4_idx_movim',    file: 'sprint4/06_index_movimentacoes.sql'      },
  { name: '009_sprint4_idx_produto',  file: 'sprint4/07_index_produto.sql'            },
  // Sprint 5 — estoque
  { name: '010_sprint5',              file: 'alter_sprint5.sql'            },
  // Sprint 6 — notificações e alertas
  { name: '011_sprint6',              file: 'alter_sprint6.sql'            },
  // Fix — campo atualizado_em
  { name: '012_fix_atualizado_em',    file: 'alter_fix_atualizado_em.sql'  },
  // Seed principal — dados iniciais (tenant BelCafé, usuários, etc.)
  { name: '013_seed_principal',       file: 'seed.sql'                     },
  // Sprint 7 — relatórios e exportações
  { name: '014_sprint7',              file: 'alter_sprint7.sql'            },
  { name: '015_sprint7_fix17',        file: 'alter_sprint7_fix17.sql'      },
  // Sprint 8 — usuários e permissões
  { name: '016_sprint8',              file: 'alter_sprint8.sql'            },
  // Sprint 9 — auditoria
  { name: '017_sprint9',              file: 'alter_sprint9.sql'            },
  // Sprint 11 — configurações e super admin
  { name: '018_sprint11',             file: 'alter_sprint11.sql'           },
  // Sprint 12 — importação e catálogo
  { name: '019_sprint12',             file: 'alter_sprint12.sql'           },
  // Sprint 13 — leituras de doses + gastos operacionais
  { name: '020_sprint13',             file: 'alter_sprint13.sql'           },
  // Sprint 14 — breakdown de receita + atividades mensais
  { name: '021_sprint14',             file: 'alter_sprint14.sql'           },
  { name: '022_seed_sprint14',        file: 'seed_sprint14.sql'            },
  // Sprint 15 — Contrato de Evento (PDF) + Módulo de Manutenção
  { name: '023_sprint15',              file: 'alter_sprint15.sql'           },
];

const DB_DIR = __dirname; // pasta onde este arquivo está (src/database)

// ── Helpers ──────────────────────────────────────────────────
function splitStatements(sql: string): string[] {
  // Remove comentários de linha e divide por ";"
  // Preserva strings e blocos DELIMITER (não usados aqui, mas seguro)
  return sql
    .split('\n')
    .filter(line => !line.trimStart().startsWith('--') && line.trim() !== '')
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// ── Códigos MySQL tratados como "já existe" (aviso, não erro) ──
// 1060 Duplicate column name
// 1061 Duplicate key name
// 1062 Duplicate entry (unique)
// 1068 Multiple primary key defined
// 1050 Table already exists
// 1091 Can't DROP; check that it exists
// 1054 Unknown column (DROP de coluna inexistente)
const WARN_CODES = new Set([1060, 1061, 1062, 1068, 1050, 1091, 1054]);

function isWarn(err: any): boolean {
  return WARN_CODES.has(err?.errno) ||
    /duplicate column|duplicate key|already exists|can't drop|multiple primary/i.test(err?.message ?? '');
}

async function ensureMigrationsTable(conn: mysql.Connection): Promise<void> {
  // Cria a tabela se não existir
  await conn.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          INT          NOT NULL AUTO_INCREMENT,
      name        VARCHAR(100) NOT NULL,
      file        VARCHAR(200) NOT NULL,
      applied_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      duration_ms INT          NULL,
      warnings    TEXT         NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Controle de migrações do Vending Manager'
  `);

  // Adiciona coluna warnings se foi criada em versão anterior sem ela
  try {
    await conn.query(`ALTER TABLE _migrations ADD COLUMN warnings TEXT NULL`);
  } catch (err: any) {
    // Ignora se já existe (errno 1060 = Duplicate column name)
    if (err?.errno !== 1060) throw err;
  }
}

async function getApplied(conn: mysql.Connection): Promise<Set<string>> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    'SELECT name FROM _migrations ORDER BY id'
  );
  return new Set(rows.map(r => r.name as string));
}

async function markApplied(
  conn: mysql.Connection,
  name: string,
  file: string,
  ms: number,
  warnings: string[]
): Promise<void> {
  await conn.query(
    'INSERT INTO _migrations (name, file, duration_ms, warnings) VALUES (?, ?, ?, ?)',
    [name, file, ms, warnings.length ? warnings.join(' | ') : null]
  );
}

// ── Comando: --status ────────────────────────────────────────
async function showStatus(conn: mysql.Connection): Promise<void> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    'SELECT name, file, applied_at, duration_ms, warnings FROM _migrations ORDER BY id'
  );
  const applied = new Set(rows.map((r: any) => r.name as string));

  console.log(title('═══ Status das Migrações ═══'));
  console.log();

  for (const m of MIGRATIONS) {
    if (applied.has(m.name)) {
      const row = rows.find((r: any) => r.name === m.name) as any;
      const when = new Date(row.applied_at).toLocaleString('pt-BR');
      const dur  = row.duration_ms ? `${row.duration_ms}ms` : '';
      const warn = row.warnings ? ` ${C.yellow}⚠ ${row.warnings}${C.reset}` : '';
      console.log(ok(`${m.name.padEnd(35)} ${C.gray}${when}  ${dur}${C.reset}${warn}`));
    } else {
      console.log(`${C.yellow}○${C.reset}  ${C.yellow}${m.name}${C.reset}  ${C.gray}(pendente)${C.reset}`);
    }
  }

  const pendentes = MIGRATIONS.filter(m => !applied.has(m.name));
  console.log();
  console.log(info(`Total: ${MIGRATIONS.length} | Aplicadas: ${applied.size} | Pendentes: ${pendentes.length}`));
}

// ── Comando: --reset ─────────────────────────────────────────
async function resetMigrations(conn: mysql.Connection): Promise<void> {
  console.log(title('⚠  RESET — apagando histórico de migrações'));
  console.log(`${C.red}  Apenas o controle é apagado; as tabelas/dados NÃO são removidos.${C.reset}`);
  await conn.execute('DELETE FROM _migrations');
  console.log(ok('Histórico limpo. Próxima execução vai re-aplicar todos os scripts.'));
}

// ── Comando principal: aplicar pendentes ─────────────────────
async function runMigrations(conn: mysql.Connection): Promise<void> {
  const applied = await getApplied(conn);
  const pendentes = MIGRATIONS.filter(m => !applied.has(m.name));

  console.log(title('═══ Vending Manager — Migration Runner ═══'));
  console.log(info(`Banco: ${process.env.DB_NAME}@${process.env.DB_HOST}`));
  console.log(info(`Scripts totais: ${MIGRATIONS.length} | Já aplicados: ${applied.size} | Pendentes: ${pendentes.length}`));
  console.log();

  if (pendentes.length === 0) {
    console.log(ok('Tudo atualizado! Nenhuma migração pendente.'));
    return;
  }

  let sucessos = 0;
  let falhas   = 0;

  for (const m of MIGRATIONS) {
    if (applied.has(m.name)) {
      console.log(skip(m.name));
      continue;
    }

    const filePath = path.join(DB_DIR, m.file);

    if (!fs.existsSync(filePath)) {
      console.log(fail(`${m.name} — arquivo não encontrado: ${m.file}`));
      falhas++;
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    const statements = splitStatements(sql);

    const t0 = Date.now();
    const warnings: string[] = [];
    let fatalErr: any = null;

    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (err: any) {
        if (isWarn(err)) {
          // Já existia antes — trata como aviso e continua
          warnings.push(err.message.split('\n')[0].substring(0, 80));
        } else {
          fatalErr = err;
          break; // Erro real: para neste script
        }
      }
    }

    const ms = Date.now() - t0;

    if (fatalErr) {
      console.log(fail(`${m.name}`));
      console.log(`     ${C.red}Erro: ${fatalErr.message}${C.reset}`);
      console.log(`     ${C.gray}Arquivo: ${m.file}${C.reset}`);
      falhas++;
    } else {
      await markApplied(conn, m.name, m.file, ms, warnings);
      if (warnings.length > 0) {
        console.log(`${C.yellow}⚠${C.reset}  ${m.name.padEnd(35)} ${C.gray}${ms}ms${C.reset} ${C.yellow}(${warnings.length} aviso(s) ignorado(s))${C.reset}`);
      } else {
        console.log(ok(`${m.name.padEnd(35)} ${C.gray}${ms}ms${C.reset}`));
      }
      sucessos++;
    }
  }

  console.log();
  if (falhas === 0) {
    console.log(`${C.green}${C.bold}✔ Concluído!${C.reset} ${sucessos} migração(ões) aplicada(s) com sucesso.`);
    console.log(`  ${C.gray}Avisos de "já existia" são normais em bancos que já tinham scripts aplicados manualmente.${C.reset}`);
  } else {
    console.log(`${C.yellow}${C.bold}⚠ Concluído com erros.${C.reset} ${sucessos} ok  |  ${C.red}${falhas} com erro fatal${C.reset}`);
    console.log(`  Verifique os erros acima. Erros fatais impedem que a migração seja registrada.`);
  }
}

// ── Comando: --retry <nome> ─────────────────────────────────
async function retryMigration(conn: mysql.Connection, name: string): Promise<void> {
  console.log(title(`♻  RETRY — re-executando: ${name}`));
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    'SELECT id FROM _migrations WHERE name = ?', [name]
  );
  if ((rows as any[]).length === 0) {
    console.log(`${C.yellow}  Migração '${name}' não estava registrada. Será aplicada normalmente no próximo migrate.${C.reset}`);
  } else {
    await conn.query('DELETE FROM _migrations WHERE name = ?', [name]);
    console.log(ok(`Registro de '${name}' removido.`));
  }
  console.log(info(`Execute 'npm run migrate' para re-aplicar.`));
}

// ── Entry point ──────────────────────────────────────────────
(async () => {
  const args = process.argv.slice(2);
  const isStatus  = args.includes('--status');
  const isReset   = args.includes('--reset');
  const retryIdx  = args.indexOf('--retry');
  const retryName = retryIdx !== -1 ? args[retryIdx + 1] : null;

  const dbConfig = {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME     || 'belcafe',
    user:     process.env.DB_USER     || 'belcafe',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: false,
    connectTimeout: 15000,
  };

  // Diagnóstico — mostra host/banco sem expor a senha
  console.log(info(`Conectando em ${dbConfig.host}:${dbConfig.port}/${dbConfig.database} ...`));

  const conn = await mysql.createConnection(dbConfig);

  try {
    await ensureMigrationsTable(conn);

    if (isStatus) {
      await showStatus(conn);
    } else if (isReset) {
      await resetMigrations(conn);
    } else if (retryName) {
      await retryMigration(conn, retryName);
    } else {
      await runMigrations(conn);
    }
  } finally {
    await conn.end();
  }
})();
