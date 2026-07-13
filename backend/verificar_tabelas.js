/** Verificacao rapida — somente leitura. */
require('dotenv').config();
const mysql = require('mysql2/promise');

const TABELAS = [
  'pagamento_assinatura',
  'assinatura_tenant',
  'contrato_maquinas',
  'movimentacao_maquina',
  'leitura_doses',
];

(async () => {
  const c = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  for (const t of TABELAS) {
    try {
      const [r] = await c.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
      console.log(`  OK   ${t.padEnd(22)} existe · ${r[0].n} linha(s)`);
    } catch (e) {
      console.log(`  --   ${t.padEnd(22)} NAO EXISTE`);
    }
  }

  await c.end();
})().catch(e => { console.error('Falha:', e.message); process.exit(1); });
