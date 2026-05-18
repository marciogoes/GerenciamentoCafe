import {
  Injectable, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';

import { TipoImportacao, LinhaCliente, LinhaMaquina, LinhaEstoque } from './dto/import.dto';

// Entities reutilizadas de outros módulos
import { Cliente }    from '../contracts/entities/cliente.entity';
import { Maquina }    from '../machines/entities/maquina.entity';
import { Produto }    from '../stock/entities/produto.entity';
import { MovimentacaoEstoque } from '../stock/entities/movimentacao-estoque.entity';

// ── Helpers ─────────────────────────────────────────────────────
function validarCNPJ(cnpj: string): boolean {
  const digits = String(cnpj).replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;  // todos iguais
  const calc = (n: number) => {
    let sum = 0;
    const fator = n === 1 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    for (let i = 0; i < fator.length; i++) sum += Number(digits[i]) * fator[i];
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  return calc(1) === Number(digits[12]) && calc(2) === Number(digits[13]);
}

function limpaCNPJ(raw: any): string {
  return String(raw ?? '').replace(/\D/g, '').padStart(14, '0').slice(-14);
}

function valorString(raw: any): string {
  return String(raw ?? '').trim();
}

function valorNumero(raw: any): number | undefined {
  const n = parseFloat(String(raw ?? '').replace(',', '.'));
  return isNaN(n) ? undefined : n;
}

function valorData(raw: any): string | undefined {
  if (!raw) return undefined;
  if (raw instanceof Date) {
    return raw.toISOString().split('T')[0];
  }
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // tenta formato dd/mm/yyyy
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return undefined;
}

const CATEGORIAS_VALIDAS = ['cappuccino','chocolate','cafe_graos','cafe_leite','descartavel','outros'];

// ══════════════════════════════════════════════════════════════════
@Injectable()
export class ImportService {

  constructor(
    @InjectRepository(Cliente)     private clienteRepo:  Repository<Cliente>,
    @InjectRepository(Maquina)     private maquinaRepo:  Repository<Maquina>,
    @InjectRepository(Produto)     private produtoRepo:  Repository<Produto>,
    @InjectRepository(MovimentacaoEstoque) private movEstoqueRepo: Repository<MovimentacaoEstoque>,
    private dataSource: DataSource,
  ) {}

  // ══════════════════════════════════════════════════════════════
  //  TEMPLATES EXCEL
  // ══════════════════════════════════════════════════════════════

  async gerarTemplate(tipo: TipoImportacao): Promise<Buffer<ArrayBufferLike>> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Vending Manager';

    const ws = wb.addWorksheet('Importação');

    const headerStyle: Partial<ExcelJS.Style> = {
      font:      { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        bottom: { style: 'thin', color: { argb: 'FFBFDBFE' } },
      },
    };

    if (tipo === 'clientes') {
      ws.columns = [
        { header: 'Razão Social *',    key: 'razao_social',      width: 35 },
        { header: 'CNPJ *',            key: 'cnpj',              width: 20 },
        { header: 'Endereço',          key: 'endereco',           width: 40 },
        { header: 'Segmento',          key: 'segmento',           width: 25 },
        { header: 'Contato Nome',      key: 'contato_nome',       width: 25 },
        { header: 'Contato E-mail',    key: 'contato_email',      width: 30 },
        { header: 'Contato Telefone',  key: 'contato_telefone',   width: 20 },
      ];
      // Linha de exemplo
      ws.addRow({
        razao_social:    'Empresa Exemplo Ltda',
        cnpj:            '11.222.333/0001-81',
        endereco:        'Av. Principal, 100 - Belém/PA',
        segmento:        'Indústria',
        contato_nome:    'João Silva',
        contato_email:   'joao@empresa.com',
        contato_telefone:'(91) 99999-9999',
      });

    } else if (tipo === 'maquinas') {
      ws.columns = [
        { header: 'Patrimônio *',      key: 'patrimonio',       width: 20 },
        { header: 'Nº de Série',       key: 'numero_serie',     width: 25 },
        { header: 'Fornecedor',        key: 'fornecedor',        width: 35 },
        { header: 'Valor Aquisição',   key: 'valor_aquisicao',   width: 20 },
        { header: 'Data Registro (AAAA-MM-DD)', key: 'data_registro', width: 28 },
        { header: 'Nota Fiscal',       key: 'nota_fiscal',       width: 20 },
      ];
      ws.addRow({
        patrimonio:      'BC160',
        numero_serie:    'SN-000001',
        fornecedor:      'Necta Brasil',
        valor_aquisicao: 12000.00,
        data_registro:   '2024-01-15',
        nota_fiscal:     'NF-1234',
      });

    } else { // estoque
      ws.columns = [
        { header: 'Código *',          key: 'codigo',           width: 12 },
        { header: 'Descrição *',       key: 'descricao',        width: 35 },
        { header: 'Marca',             key: 'marca',             width: 20 },
        { header: 'Categoria *',       key: 'categoria',         width: 20 },
        { header: 'Unidade *',         key: 'unidade',           width: 12 },
        { header: 'Valor Unit. R$ *',  key: 'valor_unitario',    width: 18 },
        { header: 'Qtd. Inicial',      key: 'quantidade_inicial', width: 15 },
        { header: 'Estoque Mínimo',    key: 'estoque_minimo',    width: 16 },
      ];
      ws.addRow({
        codigo:            '0001',
        descricao:         'Cappuccino Premium 1KG',
        marca:             'Três Corações',
        categoria:         'cappuccino',
        unidade:           'KG',
        valor_unitario:    28.50,
        quantidade_inicial: 10,
        estoque_minimo:    2,
      });

      // Aba de referência de categorias
      const wsRef = wb.addWorksheet('Categorias Válidas');
      wsRef.addRow(['Categoria', 'Descrição']);
      wsRef.addRow(['cappuccino',  'Cappuccino em pó']);
      wsRef.addRow(['chocolate',   'Chocolate em pó']);
      wsRef.addRow(['cafe_graos',  'Café em grãos']);
      wsRef.addRow(['cafe_leite',  'Café com leite / creme']);
      wsRef.addRow(['descartavel', 'Copos e descartáveis']);
      wsRef.addRow(['outros',      'Outros insumos']);
    }

    // Aplica estilo ao cabeçalho (linha 1)
    ws.getRow(1).eachCell(cell => {
      Object.assign(cell, headerStyle);
    });
    ws.getRow(1).height = 22;

    // Linhas de dados com fundo suave alternado
    ws.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  // ══════════════════════════════════════════════════════════════
  //  VALIDAÇÃO (sem persistir)
  // ══════════════════════════════════════════════════════════════

  async validar(
    tenantId: string,
    tipo: TipoImportacao,
    fileBuffer: Buffer | Buffer<ArrayBufferLike>,
  ): Promise<{ valid: any[]; errors: Array<{ linha: number; campos: string; erro: string }> }> {

    const wb = new ExcelJS.Workbook();
    await (wb.xlsx as any).load(Buffer.from(fileBuffer));
    const ws = wb.worksheets[0];

    const valid:  any[]  = [];
    const errors: Array<{ linha: number; campos: string; erro: string }> = [];

    // Pula linha 1 (cabeçalho); começa na linha 2
    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return;

      const cells = row.values as any[]; // índice 1-based
      const get = (i: number) => cells[i];

      try {
        if (tipo === 'clientes') {
          this.validarLinhaCliente(get, rowNum, valid, errors, tenantId);
        } else if (tipo === 'maquinas') {
          this.validarLinhaMaquina(get, rowNum, valid, errors);
        } else {
          this.validarLinhaEstoque(get, rowNum, valid, errors);
        }
      } catch (e) {
        errors.push({ linha: rowNum, campos: '*', erro: (e as Error).message });
      }
    });

    // Verifica duplicatas dentro do próprio arquivo
    this.detectarDuplicatasInternas(tipo, valid, errors);

    return { valid, errors };
  }

  private validarLinhaCliente(
    get: (i: number) => any,
    rowNum: number,
    valid: any[],
    errors: Array<{ linha: number; campos: string; erro: string }>,
    _tenantId: string,
  ) {
    const razao_social = valorString(get(1));
    const cnpj_raw    = valorString(get(2));
    const cnpj        = limpaCNPJ(cnpj_raw);

    const errosLinha: string[] = [];
    if (!razao_social) errosLinha.push('Razão Social obrigatória');
    if (!cnpj_raw)     errosLinha.push('CNPJ obrigatório');
    else if (!validarCNPJ(cnpj)) errosLinha.push(`CNPJ inválido: "${cnpj_raw}"`);

    if (errosLinha.length) {
      errors.push({ linha: rowNum, campos: 'razao_social, cnpj', erro: errosLinha.join('; ') });
      return;
    }

    valid.push({
      razao_social,
      cnpj,
      endereco:        valorString(get(3)) || null,
      segmento:        valorString(get(4)) || null,
      contato_nome:    valorString(get(5)) || null,
      contato_email:   valorString(get(6)) || null,
      contato_telefone:valorString(get(7)) || null,
    } as LinhaCliente);
  }

  private validarLinhaMaquina(
    get: (i: number) => any,
    rowNum: number,
    valid: any[],
    errors: Array<{ linha: number; campos: string; erro: string }>,
  ) {
    const patrimonio = valorString(get(1));
    if (!patrimonio) {
      errors.push({ linha: rowNum, campos: 'patrimonio', erro: 'Patrimônio obrigatório' });
      return;
    }

    valid.push({
      patrimonio,
      numero_serie:    valorString(get(2)) || null,
      fornecedor:      valorString(get(3)) || null,
      valor_aquisicao: valorNumero(get(4)) ?? null,
      data_registro:   valorData(get(5)) ?? null,
      nota_fiscal:     valorString(get(6)) || null,
    } as LinhaMaquina);
  }

  private validarLinhaEstoque(
    get: (i: number) => any,
    rowNum: number,
    valid: any[],
    errors: Array<{ linha: number; campos: string; erro: string }>,
  ) {
    const codigo       = valorString(get(1));
    const descricao    = valorString(get(2));
    const categoria    = valorString(get(4)).toLowerCase();
    const unidade      = valorString(get(5));
    const valor_raw    = get(6);
    const valor        = valorNumero(valor_raw);

    const errosLinha: string[] = [];
    if (!codigo)    errosLinha.push('Código obrigatório');
    if (!descricao) errosLinha.push('Descrição obrigatória');
    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      errosLinha.push(`Categoria inválida: "${categoria}". Use: ${CATEGORIAS_VALIDAS.join(', ')}`);
    }
    if (!unidade)            errosLinha.push('Unidade obrigatória');
    if (valor === undefined) errosLinha.push('Valor unitário obrigatório e deve ser número');

    if (errosLinha.length) {
      errors.push({ linha: rowNum, campos: 'codigo, descricao, categoria, unidade, valor_unitario', erro: errosLinha.join('; ') });
      return;
    }

    valid.push({
      codigo,
      descricao,
      marca:              valorString(get(3)) || null,
      categoria,
      unidade,
      valor_unitario:     valor!,
      quantidade_inicial: valorNumero(get(7)) ?? 0,
      estoque_minimo:     valorNumero(get(8)) ?? null,
    } as LinhaEstoque);
  }

  private detectarDuplicatasInternas(
    tipo: TipoImportacao,
    valid: any[],
    errors: Array<{ linha: number; campos: string; erro: string }>,
  ) {
    const vistos = new Set<string>();
    const paraRemover: number[] = [];

    valid.forEach((row, idx) => {
      const chave = tipo === 'clientes'  ? row.cnpj
                  : tipo === 'maquinas'  ? row.patrimonio
                  :                        row.codigo;
      if (vistos.has(chave)) {
        errors.push({ linha: idx + 2, campos: tipo === 'clientes' ? 'cnpj' : tipo === 'maquinas' ? 'patrimonio' : 'codigo',
          erro: `Duplicata no arquivo: "${chave}" aparece mais de uma vez` });
        paraRemover.push(idx);
      } else {
        vistos.add(chave);
      }
    });

    // Remove duplicatas (de trás pra frente)
    for (let i = paraRemover.length - 1; i >= 0; i--) {
      valid.splice(paraRemover[i], 1);
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  CONFIRMAÇÃO — PERSISTE NO BANCO
  // ══════════════════════════════════════════════════════════════

  async confirmar(
    tenantId: string,
    tipo: TipoImportacao,
    rows: any[],
    usuarioId: string,
  ): Promise<{ importados: number; ignorados: number; detalhes: string[] }> {

    const detalhes: string[] = [];
    let importados = 0;
    let ignorados  = 0;
    const hoje = new Date().toISOString().split('T')[0];

    if (tipo === 'clientes') {
      for (const row of rows as LinhaCliente[]) {
        const existe = await this.clienteRepo.findOne({
          where: { cnpj: row.cnpj, tenant_id: tenantId },
        });
        if (existe) {
          ignorados++;
          detalhes.push(`⚠️  CNPJ ${row.cnpj} já cadastrado — ignorado`);
          continue;
        }
        await this.clienteRepo.save(this.clienteRepo.create({
          id: uuidv4(), tenant_id: tenantId, ativo: true, ...row,
        }));
        importados++;
      }

    } else if (tipo === 'maquinas') {
      for (const row of rows as LinhaMaquina[]) {
        const existe = await this.maquinaRepo.findOne({
          where: { patrimonio: row.patrimonio, tenant_id: tenantId },
        });
        if (existe) {
          ignorados++;
          detalhes.push(`⚠️  Patrimônio ${row.patrimonio} já cadastrado — ignorado`);
          continue;
        }
        await this.maquinaRepo.save(this.maquinaRepo.create({
          id: uuidv4(), tenant_id: tenantId,
          situacao: 'apta' as any,
          modelo_id: null,
          ...row,
        }));
        importados++;
      }

    } else { // estoque
      for (const row of rows as LinhaEstoque[]) {
        const existe = await this.produtoRepo.findOne({
          where: { codigo: row.codigo, tenant_id: tenantId },
        });
        if (existe) {
          ignorados++;
          detalhes.push(`⚠️  Código ${row.codigo} já cadastrado — ignorado`);
          continue;
        }
        const { quantidade_inicial, ...produtoData } = row;
        const produto = await this.produtoRepo.save(this.produtoRepo.create({
          id: uuidv4(), tenant_id: tenantId, ativo: true,
          ...produtoData,
          categoria_id:     null,
          categoria_legado: produtoData.categoria ?? null,  // ERR-14: legado do import
        })) as any;
        importados++;

        // Lança entrada inicial se quantidade > 0
        if (quantidade_inicial && quantidade_inicial > 0) {
          await this.movEstoqueRepo.save(this.movEstoqueRepo.create({
            id:         uuidv4(),
            tenant_id:  tenantId,
            produto_id: produto.id,
            data:       hoje,
            tipo:       'entrada' as any,
            quantidade: quantidade_inicial,
            origem:     'Importação inicial',
            usuario_id: usuarioId,
          }));
        }
      }
    }

    // Grava log de importação
    await this.dataSource.query(
      `INSERT INTO log_importacao (id, tenant_id, usuario_id, tipo, status, total_linhas, importados, erros, criado_em)
       VALUES (?, ?, ?, ?, 'concluido', ?, ?, ?, NOW())`,
      [uuidv4(), tenantId, usuarioId, tipo, rows.length, importados, ignorados],
    );

    return { importados, ignorados, detalhes };
  }
}
