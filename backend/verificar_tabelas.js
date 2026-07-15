/**
 * verificar_tabelas.js — SOMENTE LEITURA.
 * Mostra o estado das tabelas que importam, agrupadas pelo que elas significam.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const GRUPOS = [
  ['CICLO OPERACIONAL (maquina -> contrato -> dose -> fatura)', [
    ['movimentacao_maquina', 'saida/retorno de maquina'],
    ['contrato_maquinas',    'vinculo maquina <-> contrato (ERR-03)'],
    ['leitura_doses',        'leitura mensal de dose'],
    ['lancamento_mensal',    'fatura ao cliente'],
  ]],
  ['ESTOQUE', [
    ['produto',          'insumos cadastrados'],
    ['categoria_insumo', 'categorias por tenant (ERR-14)'],
  ]],
  ['COBRANCA DO SAAS (voce cobrando o tenant)', [
    ['assinatura_tenant',    'assinatura vigente (ERR-24)'],
    ['pagamento_assinatura', 'cobrancas mes a mes (ERR-24)'],
  ]],
];

(async () => {
  const c = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  for (const [titulo, tabelas] of GRUPOS) {
    console.log(`\n${titulo}`);
    console.log('-'.repeat(70));

    for (const [t, desc] of tabelas) {
      try {
        const [r] = await c.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
        const n = Number(r[0].n);
        const marca = n > 0 ? 'ok ' : '-- ';
        console.log(`  ${marca} ${t.padEnd(22)} ${String(n).padStart(4)} linha(s)   ${desc}`);
      } catch {
        console.log(`  !!  ${t.padEnd(22)}    NAO EXISTE   ${desc}`);
      }
    }
  }

  // Produtos ainda sem categoria vinculada (ERR-14)
  try {
    const [p] = await c.query(
      'SELECT COUNT(*) AS total, SUM(categoria_id IS NULL) AS sem_categoria FROM produto',
    );
    const { total, sem_categoria } = p[0];
    console.log(`\n  produtos sem categoria vinculada: ${sem_categoria} de ${total}`);
    if (Number(sem_categoria) > 0) {
      console.log('  -> Estoque > Categorias > "Importar categorias existentes"');
    }
  } catch { /* tabela produto pode nao existir */ }

  console.log('');
  await c.end();
})().catch(e => { console.error('Falha:', e.message); process.exit(1); });
