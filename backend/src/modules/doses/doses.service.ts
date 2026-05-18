import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { v4 as uuidv4 }    from 'uuid';
import { LeituraDoses }    from './entities/leitura-doses.entity';
import {
  CriarLeituraDto, AtualizarLeituraDto, MarcarEnvioDto, FiltrosLeituraDto,
} from './dto/doses.dto';

@Injectable()
export class DosesService {
  constructor(
    @InjectRepository(LeituraDoses)
    private leituraRepo: Repository<LeituraDoses>,
  ) {}

  // ── Listar leituras ──────────────────────────────────────────
  async listar(tenantId: string, filtros: FiltrosLeituraDto) {
    const qb = this.leituraRepo
      .createQueryBuilder('ld')
      .leftJoin('contrato', 'co', 'co.id = ld.contrato_id AND co.tenant_id = ld.tenant_id')
      .leftJoin('cliente',  'cl', 'cl.id = ld.cliente_id  AND cl.tenant_id = ld.tenant_id')
      .leftJoin('maquina',  'm',  'm.id  = ld.maquina_id  AND m.tenant_id  = ld.tenant_id')
      .addSelect([
        'cl.razao_social AS cl_nome',
        'co.tipo          AS co_tipo',
        'co.valor_mensal  AS co_valor',
        'm.patrimonio     AS m_patrimonio',
      ])
      .where('ld.tenant_id = :tenantId', { tenantId });

    if (filtros.cliente_id)  qb.andWhere('ld.cliente_id = :cid',  { cid: filtros.cliente_id });
    if (filtros.contrato_id) qb.andWhere('ld.contrato_id = :coid', { coid: filtros.contrato_id });
    if (filtros.maquina_id)  qb.andWhere('ld.maquina_id = :mid',  { mid: filtros.maquina_id });
    if (filtros.competencia) {
      const comp = filtros.competencia.slice(0, 7) + '-01';
      qb.andWhere('ld.competencia = :comp', { comp });
    }
    if (filtros.enviado !== undefined) {
      qb.andWhere('ld.enviado_contratante = :env', { env: filtros.enviado === 'true' ? 1 : 0 });
    }

    qb.orderBy('ld.competencia', 'DESC').addOrderBy('cl.razao_social', 'ASC');

    const rows = await qb.getRawMany();
    return rows.map(r => ({
      id:                   r.ld_id,
      tenant_id:            r.ld_tenant_id,
      contrato_id:          r.ld_contrato_id,
      maquina_id:           r.ld_maquina_id,
      cliente_id:           r.ld_cliente_id,
      competencia:          r.ld_competencia,
      dose_inicial:         Number(r.ld_dose_inicial),
      dose_final:           Number(r.ld_dose_final),
      total_doses:          Number(r.ld_total_doses),
      enviado_contratante:  Boolean(r.ld_enviado_contratante),
      data_envio:           r.ld_data_envio,
      observacao:           r.ld_observacao,
      criado_em:            r.ld_criado_em,
      // enriquecidos
      cliente_nome:         r.cl_nome,
      contrato_tipo:        r.co_tipo,
      contrato_valor:       r.co_valor,
      maquina_patrimonio:   r.m_patrimonio,
    }));
  }

  // ── Buscar por ID ─────────────────────────────────────────────
  async buscar(tenantId: string, id: string): Promise<LeituraDoses> {
    const l = await this.leituraRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!l) throw new NotFoundException('Leitura não encontrada.');
    return l;
  }

  // ── Criar leitura ─────────────────────────────────────────────
  async criar(tenantId: string, dto: CriarLeituraDto, usuarioId: string): Promise<LeituraDoses> {
    const comp = dto.competencia.slice(0, 7) + '-01';

    // Unicidade por contrato + competência
    const existe = await this.leituraRepo.findOne({
      where: { contrato_id: dto.contrato_id, competencia: comp, tenant_id: tenantId },
    });
    if (existe) throw new ConflictException(
      `Já existe leitura para este contrato em ${comp}. Use PATCH para editar.`
    );

    if (dto.dose_final < dto.dose_inicial) {
      throw new BadRequestException('Dose final não pode ser menor que dose inicial.');
    }

    const l = this.leituraRepo.create({
      id:                   uuidv4(),
      tenant_id:            tenantId,
      contrato_id:          dto.contrato_id,
      maquina_id:           dto.maquina_id ?? null,
      cliente_id:           dto.cliente_id,
      competencia:          comp,
      dose_inicial:         dto.dose_inicial,
      dose_final:           dto.dose_final,
      total_doses:          dto.dose_final - dto.dose_inicial,
      enviado_contratante:  false,
      observacao:           dto.observacao ?? null,
      usuario_id:           usuarioId,
    });
    return this.leituraRepo.save(l);
  }

  // ── Atualizar leitura ─────────────────────────────────────────
  async atualizar(tenantId: string, id: string, dto: AtualizarLeituraDto): Promise<LeituraDoses> {
    const l = await this.buscar(tenantId, id);

    if (l.enviado_contratante) {
      throw new BadRequestException('Leitura já enviada ao contratante. Crie uma observação de correção.');
    }

    const di = dto.dose_inicial ?? l.dose_inicial;
    const df = dto.dose_final   ?? l.dose_final;
    if (df < di) throw new BadRequestException('Dose final não pode ser menor que dose inicial.');

    l.dose_inicial = di;
    l.dose_final   = df;
    l.total_doses  = df - di;
    if (dto.observacao !== undefined) l.observacao = dto.observacao;

    return this.leituraRepo.save(l);
  }

  // ── Marcar como enviada ao contratante (RF-C10) ───────────────
  async marcarEnvio(tenantId: string, id: string, dto: MarcarEnvioDto): Promise<LeituraDoses> {
    const l = await this.buscar(tenantId, id);
    if (l.enviado_contratante) {
      throw new BadRequestException('Leitura já foi marcada como enviada.');
    }
    l.enviado_contratante = true;
    l.data_envio          = dto.data_envio;
    return this.leituraRepo.save(l);
  }

  // ── Excluir ───────────────────────────────────────────────────
  async excluir(tenantId: string, id: string): Promise<void> {
    const l = await this.buscar(tenantId, id);
    if (l.enviado_contratante) {
      throw new BadRequestException('Não é possível excluir leitura já enviada ao contratante.');
    }
    await this.leituraRepo.remove(l);
  }

  // ── Resumo de doses por mês (para dashboard) ──────────────────
  async resumoMensal(tenantId: string, meses = 6) {
    const rows = await this.leituraRepo
      .createQueryBuilder('ld')
      .select([
        "DATE_FORMAT(ld.competencia, '%Y-%m') AS mes",
        "DATE_FORMAT(ld.competencia, '%b/%y') AS mes_label",
        'SUM(ld.total_doses) AS total_doses',
        'COUNT(ld.id)        AS qtd_leituras',
        'SUM(CASE WHEN ld.enviado_contratante = 1 THEN 1 ELSE 0 END) AS enviadas',
      ])
      .where('ld.tenant_id = :tenantId', { tenantId })
      .andWhere('ld.competencia >= DATE_SUB(CURDATE(), INTERVAL :meses MONTH)', { meses })
      .groupBy("DATE_FORMAT(ld.competencia, '%Y-%m')")
      .orderBy("DATE_FORMAT(ld.competencia, '%Y-%m')", 'ASC')
      .getRawMany();

    return rows.map(r => ({
      mes:          r.mes,
      mes_label:    r.mes_label,
      total_doses:  Number(r.total_doses),
      qtd_leituras: Number(r.qtd_leituras),
      enviadas:     Number(r.enviadas),
    }));
  }

  // ── Leituras pendentes de envio (para alerta) ─────────────────
  async pendenteEnvio(tenantId: string) {
    return this.leituraRepo.find({
      where: { tenant_id: tenantId, enviado_contratante: false as any },
      order: { competencia: 'DESC' },
    });
  }
}
