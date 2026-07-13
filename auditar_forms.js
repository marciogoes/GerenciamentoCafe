/**
 * auditar_forms.js — Auditoria de drift frontend -> backend
 *
 * PROBLEMA QUE ESTE SCRIPT RESOLVE:
 * O backend usa ValidationPipe com forbidNonWhitelisted: true. Qualquer campo
 * enviado pelo front que nao esteja declarado no DTO retorna 400
 * ("property X should not exist"). E o TypeScript NAO pega isso, porque os
 * hooks de mutation tipam o payload como `any`:
 *
 *     mutationFn: (dto: any) => api.post(...)   <-- o `any` desliga a checagem
 *
 * Resultado: quando uma migration renomeia/remove um campo (ex: ERR-11 dividiu
 * contrato_os em contrato_id + os_referencia), o DTO e atualizado mas o form do
 * front continua mandando o campo antigo. O erro so aparece em runtime, quando
 * o usuario clica em salvar.
 *
 * COMO USAR:  node auditar_forms.js      (da raiz do repo)
 *
 * O QUE ELE FAZ:
 * 1. Extrai os campos de todos os schemas zod do frontend.
 * 2. Extrai os campos de todas as classes *Dto do backend.
 * 3. Lista os campos do front que nao existem em NENHUM DTO.
 *
 * FALSOS POSITIVOS ESPERADOS: campos que so vivem no form e nunca sao enviados
 * (confirmar_senha, confirmar). Se o onSubmit monta o payload campo a campo,
 * o campo e seguro. Confira o onSubmit antes de mexer.
 */
const fs = require('fs');
const path = require('path');

const ROOT  = __dirname;
const FRONT = path.join(ROOT, 'frontend', 'src');
const BACK  = path.join(ROOT, 'backend', 'src');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Le o corpo de um bloco a partir da posicao de abertura, respeitando aninhamento. */
function corpoDoBloco(src, inicio) {
  let i = inicio, depth = 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  return src.slice(inicio, i - 1);
}

// ── Backend: campos de todos os DTOs ─────────────────────────
const dtoFields = new Map(); // campo -> Set(classes que o declaram)
for (const f of walk(BACK)) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /export\s+class\s+(\w*Dto)\s*(?:extends[^{]+)?\{/g;
  let m;
  while ((m = re.exec(src))) {
    const cls  = m[1];
    const body = corpoDoBloco(src, re.lastIndex);
    for (const line of body.split('\n')) {
      if (line.trim().startsWith('//') || line.includes('(')) continue;
      const pm = line.match(/^\s{2,}(\w+)\??\s*:\s*[^;=]+;/);
      if (!pm) continue;
      if (!dtoFields.has(pm[1])) dtoFields.set(pm[1], new Set());
      dtoFields.get(pm[1]).add(cls);
    }
  }
}

// ── Frontend: campos de cada schema zod ──────────────────────
const problemas = [];
for (const f of walk(FRONT)) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /z\.object\(\{/g;
  let m;
  while ((m = re.exec(src))) {
    const body = corpoDoBloco(src, re.lastIndex);
    const campos = [];
    let depth = 0;
    for (const line of body.split('\n')) {
      if (line.trim().startsWith('//')) continue;
      const fm = line.match(/^\s+(\w+)\s*:\s*z\./);
      if (fm && depth === 0) campos.push(fm[1]);
      depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    }
    const orfaos = campos.filter(c => !dtoFields.has(c));
    if (orfaos.length) problemas.push({ file: path.relative(ROOT, f), campos, orfaos });
  }
}

// ── Relatorio ────────────────────────────────────────────────
console.log(`\nDTOs analisados: ${dtoFields.size} campos distintos no backend\n`);

if (!problemas.length) {
  console.log('OK — nenhum campo orfao. Todo campo dos schemas zod existe em algum DTO.\n');
  process.exit(0);
}

console.log('SUSPEITOS — campos no schema zod que nao existem em nenhum DTO:\n');
for (const p of problemas) {
  console.log(`  ${p.file}`);
  console.log(`    orfaos: ${p.orfaos.join(', ')}`);
  console.log(`    schema: ${p.campos.join(', ')}\n`);
}
console.log('Confira o onSubmit de cada um: se o payload e montado campo a campo,');
console.log('o campo orfao nunca e enviado e o alerta e falso positivo.\n');
process.exit(1);
