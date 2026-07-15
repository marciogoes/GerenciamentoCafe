/**
 * rodar_fluxo.js — executa o ciclo operacional do BelCafe pela API.
 *
 * NAO cria leitura de dose: o numero do contador e dado real de faturamento,
 * so o Marcio tem. Inventar um numero aqui viraria fatura errada.
 *
 * Requer o backend rodando (npm run start:dev).
 * Uso: node rodar_fluxo.js
 */
const API = 'http://localhost:3000/api/v1';

let token = '';

async function req(metodo, rota, corpo) {
  const r = await fetch(API + rota, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  const texto = await r.text();
  let dados;
  try { dados = JSON.parse(texto); } catch { dados = texto; }
  if (!r.ok) {
    const msg = dados?.message ?? texto;
    throw new Error(`${r.status} ${metodo} ${rota} -> ${JSON.stringify(msg)}`);
  }
  return dados;
}

const hoje = new Date().toISOString().slice(0, 10);

(async () => {
  // ── 1. Login ────────────────────────────────────────────────
  const login = await req('POST', '/auth/login', {
    tenantSlug: 'belcafe',
    email:      'admin@belcafe.com.br',
    senha:      'Admin@2026',
  });
  token = login.access_token ?? login.token ?? login.accessToken;
  if (!token) throw new Error('Login OK mas nao achei o token: ' + JSON.stringify(login));
  console.log('1. login                       OK');

  // ── 2. ERR-14: importar categorias ──────────────────────────
  const cat = await req('POST', '/stock/categories/importar-legado');
  console.log(`2. ERR-14 categorias           ${cat.criadas} criada(s), ${cat.produtos_ligados} produto(s) ligado(s)`);

  // ── 3. Achar a maquina 200 e o contrato ─────────────────────
  const maquinas  = await req('GET', '/machines');
  const maquina   = maquinas.find(m => String(m.patrimonio) === '200');
  if (!maquina) throw new Error('Maquina de patrimonio 200 nao encontrada.');

  const contratos = await req('GET', '/contracts');
  const contrato  = contratos.find(c => c.situacao === 'ativo');
  if (!contrato) throw new Error('Nenhum contrato ativo encontrado.');

  console.log(`3. alvos                       maquina ${maquina.patrimonio} (${maquina.situacao}) -> contrato de ${contrato.cliente_nome}`);

  // ── 4. Registrar saida (era o bug do contrato_os) ───────────
  if (maquina.situacao === 'apta') {
    await req('POST', `/machines/${maquina.id}/departure`, {
      data_saida:  hoje,
      hora_saida:  '09:00',
      tipo_saida:  contrato.tipo === 'evento' ? 'evento' : 'locacao',
      local:       'BASA Ed. Sede - Av Pres Vargas, 800',
      contrato_id: contrato.id,
      ocorrencia:  'Entrega de equipamento. Inicio da operacao.',
    });
    console.log('4. saida de maquina            OK  (movimentacao_maquina)');
  } else {
    console.log(`4. saida de maquina            pulada — maquina ja esta "${maquina.situacao}"`);
  }

  // ── 5. ERR-03: vincular maquina ao contrato ─────────────────
  const vinculo = await req('POST', `/contracts/${contrato.id}/maquinas`, {
    maquina_id: maquina.id,
  });
  console.log(`5. ERR-03 vinculo contrato     OK  (${vinculo.length} maquina(s) no contrato)`);

  console.log('\n--- pendente, so voce pode fazer ---');
  console.log('leitura de dose: precisa do numero real do contador da maquina.');
  console.log('Tela: Doses > Nova leitura.\n');
})().catch(e => {
  console.error('\nFALHOU: ' + e.message + '\n');
  process.exit(1);
});
