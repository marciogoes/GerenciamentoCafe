import {
  Injectable, NotFoundException, ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 }    from 'uuid';

import { AtividadeModelo }   from './entities/atividade-modelo.entity';
import { AtividadeExecucao } from './entities/atividade-execucao.entity';
import {
  CriarAtividadeModeloDto,
  AtualizarAtividadeModeloDto,
  GerarExecucoesDto,
  BaixarAtividadeDto,
} from './dto/activities.dto';

@Injectable()
export class ActivitiesService {

  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectRepository(AtividadeModelo)
    private modeloRepo: Repository<AtividadeModelo>,

    @InjectRepository(AtividadeExecucao)
    private execucaoRepo: Repository<AtividadeExecucao>,
  ) {}

  // ══════════════════════════════════════════════════════════════
  //  MODELOS
  // ══════════════════════════════════════════════════════════════

  async listarModelos(tenantId: string) {
    return this.modeloRepo.find({
      where: { tenant_id: tenantId, ativo: true as any },
      order: { ordem: 'ASC', descricao: 'ASC' },
    });
  }

  async listarTodosModelos(tenantId: string) {
    return this.modeloRepo.find({
      where: { tenant_id: tenantId },
      order: { ordem: 'ASC', descricao: 'ASC' },
    });
  }

  async criarModelo(tenantId: string, dto: CriarAtividadeModeloDto): Promise<AtividadeModelo> {
    const modelo = this.modeloRepo.create({
      id:               uuidv4(),
      tenant_id:        tenantId,
      tipo:             dto.tipo,
      descricao:        dto.descricao,
      dia_vencimento:   dto.dia_vencimento   ?? null,
      valor_referencia: dto.valor_referencia ?? null,
      recorrente:       dto.recorrente       ?? true,
      ordem:            dto.ordem            ?? 0,
      ativo:            true,
    });
    return this.modeloRepo.save(modelo);
  }

  async atualizarModelo(tenantId: string, id: string, dto: AtualizarAtividadeModeloDto) {
    const modelo = await this.modeloRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!modelo) throw new NotFoundException('Atividade não encontrada.');
    Object.assign(modelo, dto);
    return this.modeloRepo.save(modelo);
  }

  async excluirModelo(tenantId: string, id: string) {
    const modelo = await this.modeloRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!modelo) throw new NotFoundException('Atividade não encontrada.');
    modelo.ativo = false as any;
    await this.modeloRepo.save(modelo);
    return { success: true };
  }

  // ══════════════════════════════════════════════════════════════
  //  EXECUÇÕES (checklist mensal)
  // ══════════════════════════════════════════════════════════════

  /** Normaliza para o primeiro dia do mês */
  private normCompetencia(competencia: string): string {
    return competencia.slice(0, 7) + '-01';
  }

  async gerarExecucoes(tenantId: string, dto: GerarExecucoesDto) {
    const comp = this.normCompetencia(dto.competencia);

    // Modelos ativos e recorrentes
    const modelos = await this.modeloRepo.find({
      where: { tenant_id: tenantId, recorrente: true as any, ativo: true as any },
    });

    // Evita duplicar execuções já existentes
    const existentes = await this.execucaoRepo.find({
      where: { tenant_id: tenantId, competencia: comp },
      select: ['atividade_id'],
    });
    const jaExiste = new Set(existentes.map(e => e.atividade_id));

    const novas: AtividadeExecucao[] = [];
    for (const m of modelos) {
      if (!jaExiste.has(m.id)) {
        novas.push(this.execucaoRepo.create({
          id:            uuidv4(),
          tenant_id:     tenantId,
          atividade_id:  m.id,
          competencia:   comp,
          situacao:      'pendente',
        }));
      }
    }

    if (novas.length > 0) {
      await this.execucaoRepo.save(novas);
    }

    return { geradas: novas.length, ja_existiam: existentes.length, competencia: comp };
  }

  async listarExecucoes(tenantId: string, competencia?: string) {
    const comp = competencia
      ? this.normCompetencia(competencia)
      : this.normCompetencia(new Date().toISOString().split('T')[0]);

    // JOIN manual para enriquecer com dados do modelo
    const execucoes = await this.execucaoRepo.find({
      where: { tenant_id: tenantId, competencia: comp },
    });

    if (execucoes.length === 0) {
      // Gera automaticamente se não existir para o mês
      await this.gerarExecucoes(tenantId, { competencia: comp });
      const geradas = await this.execucaoRepo.find({
        where: { tenant_id: tenantId, competencia: comp },
      });
      return this.enriquecerExecucoes(tenantId, geradas);
    }

    return this.enriquecerExecucoes(tenantId, execucoes);
  }

  private async enriquecerExecucoes(tenantId: string, execucoes: AtividadeExecucao[]) {
    const modelos = await this.modeloRepo.find({ where: { tenant_id: tenantId } });
    const mapaModelos = new Map(modelos.map(m => [m.id, m]));

    const resultado = execucoes.map(e => {
      const modelo = mapaModelos.get(e.atividade_id);
      return {
        ...e,
        modelo_descricao:    modelo?.descricao    ?? '—',
        modelo_tipo:         modelo?.tipo         ?? 'conta_fixa',
        modelo_dia_vencimento: modelo?.dia_vencimento ?? null,
        modelo_valor_referencia: modelo?.valor_referencia ?? null,
      };
    });

    // Ordenar por: tipo, dia_vencimento, descricao
    resultado.sort((a, b) => {
      const ordemTipo: Record<string, number> = {
        conta_fixa: 0, leitura_comodato: 1, atividade_interna: 2,
      };
      const ot = (ordemTipo[a.modelo_tipo] ?? 9) - (ordemTipo[b.modelo_tipo] ?? 9);
      if (ot !== 0) return ot;
      const dv = (a.modelo_dia_vencimento ?? 99) - (b.modelo_dia_vencimento ?? 99);
      if (dv !== 0) return dv;
      return a.modelo_descricao.localeCompare(b.modelo_descricao);
    });

    return resultado;
  }

  async resumoExecucoes(tenantId: string, competencia?: string) {
    const comp = competencia
      ? this.normCompetencia(competencia)
      : this.normCompetencia(new Date().toISOString().split('T')[0]);

    const execucoes = await this.execucaoRepo.find({
      where: { tenant_id: tenantId, competencia: comp },
    });

    const total       = execucoes.length;
    const realizadas  = execucoes.filter(e => e.situacao === 'realizado').length;
    const pendentes   = execucoes.filter(e => e.situacao === 'pendente').length;
    const naAplicavel = execucoes.filter(e => e.situacao === 'nao_aplicavel').length;

    return { total, realizadas, pendentes, nao_aplicavel: naAplicavel, competencia: comp };
  }

  async baixarAtividade(tenantId: string, execucaoId: string, dto: BaixarAtividadeDto, usuarioId: string) {
    const exec = await this.execucaoRepo.findOne({
      where: { id: execucaoId, tenant_id: tenantId },
    });
    if (!exec) throw new NotFoundException('Execução não encontrada.');

    const hoje = new Date().toISOString().split('T')[0];
    exec.situacao        = 'realizado';
    exec.data_realizacao = dto.data_realizacao  ?? hoje;
    exec.valor_realizado = dto.valor_realizado  ?? null;
    exec.observacao      = dto.observacao       ?? null;
    exec.usuario_id      = usuarioId;

    return this.execucaoRepo.save(exec);
  }

  async marcarNaoAplicavel(tenantId: string, execucaoId: string, usuarioId: string) {
    const exec = await this.execucaoRepo.findOne({
      where: { id: execucaoId, tenant_id: tenantId },
    });
    if (!exec) throw new NotFoundException('Execução não encontrada.');
    exec.situacao   = 'nao_aplicavel';
    exec.usuario_id = usuarioId;
    return this.execucaoRepo.save(exec);
  }

  async reabrirAtividade(tenantId: string, execucaoId: string) {
    const exec = await this.execucaoRepo.findOne({
      where: { id: execucaoId, tenant_id: tenantId },
    });
    if (!exec) throw new NotFoundException('Execução não encontrada.');
    exec.situacao        = 'pendente';
    exec.data_realizacao = null;
    exec.valor_realizado = null;
    return this.execucaoRepo.save(exec);
  }

  // ── Cron: 1º de cada mês às 00:05 gera execuções automaticamente ──
  @Cron('5 0 1 * *')
  async gerarExecucoesAutomaticas() {
    this.logger.log('Cron: gerando execuções de atividades do mês');
    const hoje = new Date();
    const comp = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;

    // Busca todos os tenants com modelos ativos
    const modelos = await this.modeloRepo
      .createQueryBuilder('am')
      .select('DISTINCT am.tenant_id', 'tenant_id')
      .where('am.ativo = 1 AND am.recorrente = 1')
      .getRawMany();

    for (const { tenant_id } of modelos) {
      try {
        const resultado = await this.gerarExecucoes(tenant_id, { competencia: comp });
        this.logger.log(`Tenant ${tenant_id}: ${resultado.geradas} execuções geradas`);
      } catch (err) {
        this.logger.error(`Erro ao gerar execuções do tenant ${tenant_id}: ${err.message}`);
      }
    }
  }
}
