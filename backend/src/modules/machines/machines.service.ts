import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { v4 as uuidv4 }      from 'uuid';

import { ModeloCatalogo }      from './entities/modelo-catalogo.entity';
import { Maquina }             from './entities/maquina.entity';
import { MovimentacaoMaquina } from './entities/movimentacao-maquina.entity';
import {
  CriarModeloDto, AtualizarModeloDto,
  CriarMaquinaDto, AtualizarMaquinaDto,
  RegistrarSaidaDto, RegistrarRetornoDto,
  FiltrosMaquinaDto, FiltrosMovimentacaoDto,
} from './dto/machines.dto';

@Injectable()
export class MachinesService {

  constructor(
    @InjectRepository(ModeloCatalogo)
    private modeloRepo: Repository<ModeloCatalogo>,

    @InjectRepository(Maquina)
    private maquinaRepo: Repository<Maquina>,

    @InjectRepository(MovimentacaoMaquina)
    private movRepo: Repository<MovimentacaoMaquina>,
  ) {}

  // ══════════════════════════════════════════════════════════════
  //  CATÁLOGO DE MODELOS
  // ══════════════════════════════════════════════════════════════

  async listarModelos(tenantId: string): Promise<ModeloCatalogo[]> {
    return this.modeloRepo.find({
      where: { tenant_id: tenantId, ativo: true },
      order: { categoria: 'ASC', nome: 'ASC' },
    });
  }

  async buscarModelo(tenantId: string, id: string): Promise<ModeloCatalogo> {
    const modelo = await this.modeloRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!modelo) throw new NotFoundException('Modelo não encontrado.');
    return modelo;
  }

  async criarModelo(tenantId: string, dto: CriarModeloDto): Promise<ModeloCatalogo> {
    const modelo = this.modeloRepo.create({
      id:             uuidv4(),
      tenant_id:      tenantId,
      nome:           dto.nome,
      categoria:      dto.categoria as any,
      bebidas:        dto.bebidas       ?? null,
      especificacoes: dto.especificacoes ?? null,
      foto_url:       dto.foto_url      ?? null,
      ativo:          true,
    });
    return this.modeloRepo.save(modelo);
  }

  async atualizarModelo(
    tenantId: string, id: string, dto: AtualizarModeloDto,
  ): Promise<ModeloCatalogo> {
    const modelo = await this.buscarModelo(tenantId, id);
    Object.assign(modelo, dto);
    return this.modeloRepo.save(modelo);
  }

  async excluirModelo(tenantId: string, id: string): Promise<{ acao: 'excluido' | 'desativado'; mensagem: string }> {
    await this.buscarModelo(tenantId, id);
    const emUso = await this.maquinaRepo.count({ where: { modelo_id: id, tenant_id: tenantId } });
    if (emUso > 0) {
      await this.modeloRepo.update(id, { ativo: false });
      return {
        acao:     'desativado',
        mensagem: `Modelo desativado (possui ${emUso} máquina(s) associada(s)).`,
      };
    }
    await this.modeloRepo.delete(id);
    return { acao: 'excluido', mensagem: 'Modelo excluído com sucesso.' };
  }

  // ══════════════════════════════════════════════════════════════
  //  MÁQUINAS (PATRIMÔNIO)
  // ══════════════════════════════════════════════════════════════

  async listarMaquinas(tenantId: string, filtros: FiltrosMaquinaDto): Promise<any[]> {
    const qb = this.maquinaRepo
      .createQueryBuilder('m')
      .leftJoin(
        'modelo_catalogo', 'mc',
        'mc.id = m.modelo_id AND mc.tenant_id = m.tenant_id',
      )
      .addSelect(['mc.nome', 'mc.categoria', 'mc.foto_url'])
      .where('m.tenant_id = :tenantId', { tenantId });

    if (filtros.situacao) {
      qb.andWhere('m.situacao = :situacao', { situacao: filtros.situacao });
    }
    if (filtros.patrimonio) {
      qb.andWhere('m.patrimonio LIKE :pat', { pat: `%${filtros.patrimonio}%` });
    }
    if (filtros.cliente_id) {
      qb.andWhere(`EXISTS (
        SELECT 1 FROM movimentacao_maquina mv
        WHERE mv.maquina_id = m.id
          AND mv.tenant_id  = m.tenant_id
          AND mv.cliente_id = :clienteId
          AND mv.data_retorno IS NULL
      )`, { clienteId: filtros.cliente_id });
    }

    qb.orderBy('m.patrimonio', 'ASC');
    const rows = await qb.getRawMany();

    return rows.map(r => ({
      id:               r.m_id,
      tenant_id:        r.m_tenant_id,
      patrimonio:       r.m_patrimonio,
      modelo_id:        r.m_modelo_id,
      modelo_nome:      r.mc_nome,
      modelo_categoria: r.mc_categoria,
      modelo_foto:      r.mc_foto_url,
      numero_serie:     r.m_numero_serie,
      nota_fiscal:      r.m_nota_fiscal,
      fornecedor:       r.m_fornecedor,
      valor_aquisicao:  r.m_valor_aquisicao,
      data_registro:    r.m_data_registro,
      situacao:         r.m_situacao,
      localizacao_atual: r.m_localizacao_atual,
      observacao:       r.m_observacao,
      criado_em:        r.m_criado_em,
    }));
  }

  async buscarMaquina(tenantId: string, id: string): Promise<Maquina> {
    const maquina = await this.maquinaRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!maquina) throw new NotFoundException('Máquina não encontrada.');
    return maquina;
  }

  async buscarMaquinaCompleta(tenantId: string, id: string): Promise<any> {
    const maquina = await this.buscarMaquina(tenantId, id);

    const modelo = maquina.modelo_id
      ? await this.modeloRepo.findOne({ where: { id: maquina.modelo_id, tenant_id: tenantId } })
      : null;

    const movimentacaoAberta = await this.movRepo.findOne({
      where: { maquina_id: id, tenant_id: tenantId, data_retorno: IsNull() },
      order: { data_saida: 'DESC' },
    });

    const historico = await this.movRepo.find({
      where: { maquina_id: id, tenant_id: tenantId },
      order: { data_saida: 'DESC' },
    });

    return { ...maquina, modelo, movimentacao_aberta: movimentacaoAberta, historico };
  }

  async criarMaquina(tenantId: string, dto: CriarMaquinaDto): Promise<Maquina> {
    const existe = await this.maquinaRepo.findOne({
      where: { patrimonio: dto.patrimonio, tenant_id: tenantId },
    });
    if (existe) {
      throw new ConflictException(`Patrimônio "${dto.patrimonio}" já cadastrado.`);
    }

    if (dto.modelo_id) {
      const modelo = await this.modeloRepo.findOne({
        where: { id: dto.modelo_id, tenant_id: tenantId },
      });
      if (!modelo) throw new NotFoundException('Modelo de catálogo não encontrado.');
    }

    const maquina = this.maquinaRepo.create({
      id:              uuidv4(),
      tenant_id:       tenantId,
      patrimonio:      dto.patrimonio,
      modelo_id:       dto.modelo_id       ?? null,
      numero_serie:    dto.numero_serie    ?? null,
      nota_fiscal:     dto.nota_fiscal     ?? null,
      fornecedor:      dto.fornecedor      ?? null,
      valor_aquisicao: dto.valor_aquisicao ?? null,
      data_registro:   dto.data_registro   ?? null,
      situacao:        'apta',
      observacao:      dto.observacao      ?? null,
    });
    return this.maquinaRepo.save(maquina);
  }

  async atualizarMaquina(
    tenantId: string, id: string, dto: AtualizarMaquinaDto,
  ): Promise<Maquina> {
    const maquina = await this.buscarMaquina(tenantId, id);

    if (dto.patrimonio && dto.patrimonio !== maquina.patrimonio) {
      const existe = await this.maquinaRepo.findOne({
        where: { patrimonio: dto.patrimonio, tenant_id: tenantId },
      });
      if (existe) throw new ConflictException(`Patrimônio "${dto.patrimonio}" já em uso.`);
    }

    Object.assign(maquina, dto);
    return this.maquinaRepo.save(maquina);
  }

  async excluirMaquina(
    tenantId: string, id: string,
  ): Promise<{ acao: 'excluido' | 'desativado'; mensagem: string }> {
    await this.buscarMaquina(tenantId, id);

    // Não permitir excluir máquina fora da base (saída em aberto)
    const aberta = await this.movRepo.count({
      where: { maquina_id: id, tenant_id: tenantId, data_retorno: IsNull() },
    });
    if (aberta > 0) {
      throw new BadRequestException(
        'Máquina está fora da base (saída em aberto). Registre o retorno antes de excluir.',
      );
    }

    // Se houver histórico de movimentações, desativa (preserva histórico) em vez de excluir
    const historico = await this.movRepo.count({
      where: { maquina_id: id, tenant_id: tenantId },
    });
    if (historico > 0) {
      await this.maquinaRepo.update({ id, tenant_id: tenantId }, { situacao: 'desativada' as any });
      return {
        acao:     'desativado',
        mensagem: `Máquina desativada (possui ${historico} movimentação(ões) no histórico, preservadas).`,
      };
    }

    await this.maquinaRepo.delete({ id, tenant_id: tenantId });
    return { acao: 'excluido', mensagem: 'Máquina excluída com sucesso.' };
  }

  // ══════════════════════════════════════════════════════════════
  //  MOVIMENTAÇÕES — SAÍDA (RN-M01 a RN-M05)
  // ══════════════════════════════════════════════════════════════

  async registrarSaida(
    tenantId: string,
    maquinaId: string,
    dto: RegistrarSaidaDto,
    usuarioId: string,
  ): Promise<MovimentacaoMaquina> {
    const maquina = await this.buscarMaquina(tenantId, maquinaId);

    if (maquina.situacao !== 'apta') {
      throw new BadRequestException(
        `Saída não permitida. Situação atual da máquina: "${maquina.situacao}". ` +
        `Apenas máquinas com situação "Apta" podem ser enviadas.`,
      );
    }

    const hoje = new Date().toISOString().split('T')[0];
    if (dto.data_saida > hoje) {
      throw new BadRequestException('Data de saída não pode ser uma data futura.');
    }

    const saidaAberta = await this.movRepo.findOne({
      where: { maquina_id: maquinaId, tenant_id: tenantId, data_retorno: IsNull() },
    });
    if (saidaAberta) {
      throw new BadRequestException(
        'Esta máquina já possui uma saída em aberto sem retorno registrado.',
      );
    }

    const mov = this.movRepo.create({
      id:             uuidv4(),
      tenant_id:      tenantId,
      maquina_id:     maquinaId,
      data_saida:     dto.data_saida,
      hora_saida:     dto.hora_saida     ?? null,
      cliente_id:     dto.cliente_id     ?? null,
      local:          dto.local          ?? null,
      contrato_id:    dto.contrato_id    ?? null,   // ERR-11 corrigido
      os_referencia:  dto.os_referencia  ?? null,   // ERR-11 corrigido
      responsavel_id: dto.responsavel_id ?? usuarioId,
      ocorrencia:     dto.ocorrencia     ?? null,
      data_retorno:   null,
    });

    const movSalva = await this.movRepo.save(mov);

    const novaSituacao = dto.tipo_saida === 'evento' ? 'evento' : 'em_locacao';
    await this.maquinaRepo.update(maquinaId, {
      situacao:          novaSituacao as any,
      localizacao_atual: dto.local ?? null,
    });

    return movSalva;
  }

  // ══════════════════════════════════════════════════════════════
  //  MOVIMENTAÇÕES — RETORNO (RN-M06 a RN-M09)
  // ══════════════════════════════════════════════════════════════

  async registrarRetorno(
    tenantId: string,
    movimentacaoId: string,
    dto: RegistrarRetornoDto,
  ): Promise<MovimentacaoMaquina> {
    const mov = await this.movRepo.findOne({
      where: { id: movimentacaoId, tenant_id: tenantId },
    });
    if (!mov) throw new NotFoundException('Movimentação não encontrada.');
    if (mov.data_retorno) {
      throw new BadRequestException('Esta movimentação já possui retorno registrado.');
    }

    if (dto.data_retorno < mov.data_saida) {
      throw new BadRequestException(
        `Data de retorno (${dto.data_retorno}) não pode ser anterior à data de saída (${mov.data_saida}).`,
      );
    }

    const diasMs      = new Date(dto.data_retorno).getTime() - new Date(mov.data_saida).getTime();
    const periodoDias = Math.round(diasMs / (1000 * 60 * 60 * 24));

    mov.data_retorno       = dto.data_retorno;
    mov.hora_retorno       = dto.hora_retorno       ?? null;
    mov.periodo_dias       = periodoDias;
    mov.ocorrencia_retorno = dto.ocorrencia_retorno ?? null;

    const movAtualizada = await this.movRepo.save(mov);

    const novaSituacao = dto.situacao_retorno === 'manutencao' ? 'manutencao' : 'apta';
    await this.maquinaRepo.update(mov.maquina_id, {
      situacao:          novaSituacao as any,
      localizacao_atual: null,
    });

    return movAtualizada;
  }

  // ══════════════════════════════════════════════════════════════
  //  MOVIMENTAÇÕES — LISTAGEM
  // ══════════════════════════════════════════════════════════════

  async listarMovimentacoes(tenantId: string, filtros: FiltrosMovimentacaoDto) {
    const qb = this.movRepo
      .createQueryBuilder('mv')
      .where('mv.tenant_id = :tenantId', { tenantId });

    if (filtros.maquina_id) {
      qb.andWhere('mv.maquina_id = :maqId', { maqId: filtros.maquina_id });
    }
    if (filtros.em_aberto === 'true') {
      qb.andWhere('mv.data_retorno IS NULL');
    }
    if (filtros.data_inicio) {
      qb.andWhere('mv.data_saida >= :di', { di: filtros.data_inicio });
    }
    if (filtros.data_fim) {
      qb.andWhere('mv.data_saida <= :df', { df: filtros.data_fim });
    }

    qb.orderBy('mv.data_saida', 'DESC');
    return qb.getMany();
  }

  // ══════════════════════════════════════════════════════════════
  //  MÁQUINAS FORA DA BASE — BUG-FIX ERR-11
  //  (contrato_os removido — agora usa contrato_id + os_referencia)
  // ══════════════════════════════════════════════════════════════

  async maquinasForaDaBase(tenantId: string): Promise<any[]> {
    const rows = await this.movRepo
      .createQueryBuilder('mv')
      .leftJoin('maquina', 'm', 'm.id = mv.maquina_id AND m.tenant_id = mv.tenant_id')
      .addSelect(['m.patrimonio', 'm.situacao', 'm.localizacao_atual'])
      .where('mv.tenant_id = :tenantId', { tenantId })
      .andWhere('mv.data_retorno IS NULL')
      .orderBy('mv.data_saida', 'ASC')
      .getRawMany();

    const hoje = new Date().toISOString().split('T')[0];
    return rows.map(r => {
      const diasMs   = new Date(hoje).getTime() - new Date(r.mv_data_saida).getTime();
      const diasFora = Math.round(diasMs / (1000 * 60 * 60 * 24));
      return {
        movimentacao_id: r.mv_id,
        maquina_id:      r.mv_maquina_id,
        patrimonio:      r.m_patrimonio,
        situacao:        r.m_situacao,
        localizacao:     r.m_localizacao_atual,
        cliente_id:      r.mv_cliente_id,
        data_saida:      r.mv_data_saida,
        // ERR-11 CORRIGIDO: contrato_os dividido em dois campos
        contrato_id:     r.mv_contrato_id    ?? null,
        os_referencia:   r.mv_os_referencia  ?? null,
        dias_fora:       diasFora,
        alerta:          diasFora >= 30,
      };
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  MÁQUINAS NA BASE — BUG-FIX ERR-04
  //  (contrato_ativo_id removido da entidade e da query)
  // ══════════════════════════════════════════════════════════════

  async maquinasNaBase(tenantId: string): Promise<any[]> {
    const rows = await this.maquinaRepo
      .createQueryBuilder('m')
      .leftJoin(
        qb => qb
          .select('mv.maquina_id',         'maquina_id')
          .addSelect('MAX(mv.data_saida)', 'ultima_saida')
          .from('movimentacao_maquina', 'mv')
          .where('mv.tenant_id = :tenantId', { tenantId })
          .andWhere('mv.data_retorno IS NOT NULL')
          .groupBy('mv.maquina_id'),
        'ult',
        'ult.maquina_id = m.id',
      )
      .leftJoin(
        'movimentacao_maquina', 'mv2',
        'mv2.maquina_id = m.id AND mv2.data_saida = ult.ultima_saida AND mv2.tenant_id = :tenantId',
        { tenantId },
      )
      // ERR-04 CORRIGIDO: contrato_ativo_id removido da entidade; não selecionar
      .select([
        'm.id',            'm.patrimonio',      'm.situacao',
        'm.tenant_id',     'm.modelo_id',       'm.numero_serie',
        'm.nota_fiscal',   'm.fornecedor',      'm.valor_aquisicao',
        'm.data_registro', 'm.localizacao_atual',
        'm.criado_em',
      ])
      .addSelect('mv2.data_retorno', 'ultimo_retorno')
      .where('m.tenant_id = :tenantId', { tenantId })
      .andWhere("m.situacao = 'apta'")
      .orderBy('m.patrimonio', 'ASC')
      .getRawMany();

    const hoje = new Date().getTime();
    return rows.map(r => {
      const diasNaBase = r.ultimo_retorno
        ? Math.round((hoje - new Date(r.ultimo_retorno).getTime()) / 86400000)
        : null;
      return {
        id:                r.m_id,
        tenant_id:         r.m_tenant_id,
        patrimonio:        r.m_patrimonio,
        situacao:          r.m_situacao,
        modelo_id:         r.m_modelo_id,
        numero_serie:      r.m_numero_serie,
        nota_fiscal:       r.m_nota_fiscal,
        fornecedor:        r.m_fornecedor,
        valor_aquisicao:   r.m_valor_aquisicao,
        data_registro:     r.m_data_registro,
        localizacao_atual: r.m_localizacao_atual,
        criado_em:         r.m_criado_em,
        dias_na_base:      diasNaBase,
      };
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  CATÁLOGO HTML IMPRIMÍVEL (RF-CAT04) — sem dependência externa
  // ══════════════════════════════════════════════════════════════

  /**
   * Gera o catálogo de modelos como HTML imprimível (A4 landscape).
   * Controller serve com Content-Type: text/html
   * Browser converte para PDF via Ctrl+P → "Salvar como PDF".
   * Não depende de pdfkit nem de nenhuma lib externa.
   */
  async exportarCatalogoPdf(tenantId: string): Promise<Buffer> {
    const modelos = await this.listarModelos(tenantId);
    const hoje    = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const catLabel: Record<string, string> = {
      bebidas: 'Bebidas', snacks: 'Snacks', combinado: 'Combinado', outros: 'Outros',
    };

    // ModeloCatalogo não tem campo fabricante — coluna omitida do HTML
    const linhas = modelos.map((m, i) => `
      <tr class="${i % 2 === 0 ? 'par' : 'impar'}">
        <td class="num">${i + 1}</td>
        <td class="nome"><strong>${this.esc(m.nome)}</strong></td>
        <td>${catLabel[m.categoria] ?? this.esc(m.categoria)}</td>
        <td>${this.esc(m.bebidas)}</td>
        <td>${this.esc(m.especificacoes)}</td>
        <td>${this.esc(m.foto_url) !== '—' ? `<a href="${this.esc(m.foto_url)}" target="_blank">Ver foto</a>` : '—'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Catalogo de Maquinas - Vending Manager</title>
<style>
  @page { size: A4 landscape; margin: 15mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #111827; }
  .header { background: #1E3A8A; color: #fff; padding: 14px 20px; border-radius: 6px 6px 0 0;
            display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 15pt; font-weight: 700; }
  .header .sub { font-size: 9pt; color: #BFDBFE; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #1E40AF; color: #fff; }
  thead th { padding: 7px 8px; text-align: left; font-size: 8.5pt; font-weight: 600;
             border-right: 1px solid #2563EB; }
  thead th:last-child { border-right: none; }
  tbody td { padding: 6px 8px; vertical-align: top; border-bottom: 1px solid #E5E7EB; font-size: 8pt; }
  tbody tr.par   { background: #fff; }
  tbody tr.impar { background: #F8FAFC; }
  .num { text-align: center; color: #1E40AF; font-weight: 700; width: 30px; }
  th:nth-child(1) { width: 30px; }
  th:nth-child(2) { width: 22%; }
  th:nth-child(3) { width: 10%; }
  th:nth-child(4) { width: 25%; }
  th:nth-child(5) { width: 30%; }
  th:nth-child(6) { width: 10%; }
  .footer { margin-top: 10px; display: flex; justify-content: space-between;
            font-size: 7.5pt; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 6px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { background: #1E3A8A !important; }
    thead tr { background: #1E40AF !important; }
    tbody tr.impar { background: #F8FAFC !important; }
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>&#9749; Catalogo de Modelos de Maquinas</h1>
      <div class="sub">Vending Manager &mdash; BEL CAFE Locacao, Servicos e Comercio Ltda &mdash; Belem/PA</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:10pt;font-weight:600;">${modelos.length} modelo(s)</div>
      <div class="sub">Gerado em ${hoje}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Modelo</th><th>Categoria</th>
        <th>Bebidas/Produtos</th><th>Especificacoes</th><th>Foto</th>
      </tr>
    </thead>
    <tbody>
      ${linhas || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9CA3AF;">Nenhum modelo cadastrado</td></tr>'}
    </tbody>
  </table>
  <div class="footer">
    <span>Vending Manager SaaS &mdash; www.vendingmanager.com.br</span>
    <span>Gerado em ${hoje}</span>
  </div>
</body>
</html>`;

    return Buffer.from(html, 'utf-8');
  }

  /** Escapa caracteres HTML para evitar XSS no catalogo */
  private esc(val: any): string {
    if (!val) return '—';
    return String(val)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** Resumo de frota para o dashboard (counts por situacao) */
  async resumoFrota(tenantId: string): Promise<Record<string, number>> {
    const rows = await this.maquinaRepo
      .createQueryBuilder('m')
      .select('m.situacao', 'situacao')
      .addSelect('COUNT(*)', 'total')
      .where('m.tenant_id = :tenantId', { tenantId })
      .groupBy('m.situacao')
      .getRawMany();

    const resumo: Record<string, number> = {
      apta: 0, em_locacao: 0, manutencao: 0,
      evento: 0, nao_localizada: 0, desativada: 0,
    };
    rows.forEach(r => { resumo[r.situacao] = Number(r.total); });
    return resumo;
  }
}
