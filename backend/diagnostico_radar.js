/**
 * diagnostico_radar.js — SOMENTE LEITURA (SELECT). Nao altera nada.
 * Retrato do estado real da operacao. Rodar de dentro de backend/.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const TENANT = 'a1b2c3d4-0000-0000-0000-000000000001';

(async () => {
  const c = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT || 3306),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const q = async (label, sql) => {
    try {
      const [rows] = await c.query(sql);
      console.log(`\n--- ${label} ---`);
      if (!rows.length) console.log('(vazio)');
      else console.table(rows);
    } catch (e) {
      console.log(`\n--- ${label} ---\nERRO: ${e.message}`);
    }
  };

  await q('VOLUME POR TABELA',
    `SELECT 'cliente' AS tabela, COUNT(*) AS linhas FROM cliente WHERE tenant_id='${TENANT}'
     UNION ALL SELECT 'maquina',              COUNT(*) FROM maquina              WHERE tenant_id='${TENANT}'
     UNION ALL SELECT 'contrato',             COUNT(*) FROM contrato             WHERE tenant_id='${TENANT}'
     UNION ALL SELECT 'contrato_maquinas',    COUNT(*) FROM contrato_maquinas    WHERE tenant_id='${TENANT}'
     UNION ALL SELECT 'leitura_doses',        COUNT(*) FROM leitura_doses        WHERE tenant_id='${TENANT}'
     UNION ALL SELECT 'leitura_dose (orfa)',  COUNT(*) FROM leitura_dose
     UNION ALL SELECT 'movimentacao_maquina', COUNT(*) FROM movimentacao_maquina WHERE tenant_id='${TENANT}'
     UNION ALL SELECT 'lancamento_mensal',    COUNT(*) FROM lancamento_mensal    WHERE tenant_id='${TENANT}'`);

  await q('MAQUINAS POR SITUACAO',
    `SELECT situacao, COUNT(*) AS qtd FROM maquina
     WHERE tenant_id='${TENANT}' GROUP BY situacao ORDER BY qtd DESC`);

  await q('CONTRATOS',
    `SELECT c.tipo, c.situacao, c.valor_mensal, c.data_inicio, cl.razao_social
     FROM contrato c
     LEFT JOIN cliente cl ON cl.id=c.cliente_id AND cl.tenant_id=c.tenant_id
     WHERE c.tenant_id='${TENANT}'`);

  await q('MAQUINAS FORA DA BASE (saida sem retorno)',
    `SELECT m.patrimonio, mv.data_saida, mv.local, mv.os_referencia,
            DATEDIFF(CURDATE(), mv.data_saida) AS dias_fora
     FROM movimentacao_maquina mv
     JOIN maquina m ON m.id=mv.maquina_id AND m.tenant_id=mv.tenant_id
     WHERE mv.tenant_id='${TENANT}' AND mv.data_retorno IS NULL
     ORDER BY mv.data_saida`);

  await c.end();
})().catch(e => { console.error('FALHA:', e.message); process.exit(1); });
