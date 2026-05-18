import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 }    from 'uuid';

import { RelatorioAgendado }       from './entities/relatorio-agendado.entity';
import { CriarAgendamentoDto, AtualizarAgendamentoDto } from './dto/schedule.dto';
import { ReportsService }          from './reports.service';
import { MailService }             from '../mail/mail.service';

// ── Helpers de data ────────────────────────────────────────────
function anoInicio()    { return `${new Date().getFullYear()}-01-01`; }
function mesInicio()    {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function fimMesAtual()  {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
}
function hoje()         { return new Date().toISOString().split('T')[0]; }

@Injectable()
export class ReportSchedulerService {

  private readonly logger = new Logger(ReportSchedulerService.name);

  constructor(
    @InjectRepository(RelatorioAgendado)
    private repo: Repository<RelatorioAgendado>,
    private reportsService: ReportsService,
    private mailService:    MailService,
  ) {}

  // ════════════════════════════════════════════════════════════════
  //  CRUD DE AGENDAMENTOS  —  RF-R06
  // ════════════════════════════════════════════════════════════════

  /** GET /reports/schedules */
  async listar(tenantId: string): Promise<RelatorioAgendado[]> {
    return this.repo.find({
      where: { tenant_id: tenantId },
      order: { criado_em: 'DESC' },
    });
  }

  /** GET /reports/schedules/:id */
  async buscar(tenantId: string, id: string): Promise<RelatorioAgendado> {
    const ag = await this.repo.findOne({ where: { id, tenant_id: tenantId } });
    if (!ag) throw new NotFoundException('Agendamento não encontrado.');
    return ag;
  }

  /** POST /reports/schedules */
  async criar(tenantId: string, usuarioId: string, dto: CriarAgendamentoDto): Promise<RelatorioAgendado> {
    // Limite: máximo 10 agendamentos ativos por tenant
    const total = await this.repo.count({ where: { tenant_id: tenantId, ativo: true } });
    if (total >= 10) {
      throw new BadRequestException('Limite de 10 agendamentos ativos atingido.');
    }

    const proximo = this.calcularProximoEnvio(dto.frequencia);

    const ag = this.repo.create({
      id:           uuidv4(),
      tenant_id:    tenantId,
      tipo:         dto.tipo,
      frequencia:   dto.frequencia,
      destinatarios: dto.destinatarios,
      proximo_envio: proximo,
      ultimo_envio: null,
      ativo:        true,
      criado_por:   usuarioId,
    });

    return this.repo.save(ag);
  }

  /** PATCH /reports/schedules/:id */
  async atualizar(
    tenantId: string,
    id: string,
    dto: AtualizarAgendamentoDto,
  ): Promise<RelatorioAgendado> {
    const ag = await this.buscar(tenantId, id);

    if (dto.frequencia && dto.frequencia !== ag.frequencia) {
      // Recalcula próximo envio ao mudar frequência
      (ag as any).proximo_envio = this.calcularProximoEnvio(dto.frequencia);
      ag.frequencia = dto.frequencia;
    }
    if (dto.destinatarios) ag.destinatarios = dto.destinatarios;
    if (dto.ativo !== undefined) ag.ativo = dto.ativo;

    return this.repo.save(ag);
  }

  /** DELETE /reports/schedules/:id */
  async remover(tenantId: string, id: string): Promise<{ mensagem: string }> {
    const ag = await this.buscar(tenantId, id);
    await this.repo.remove(ag);
    return { mensagem: 'Agendamento removido com sucesso.' };
  }

  /** POST /reports/schedules/:id/executar — disparo manual imediato */
  async executarManual(tenantId: string, id: string): Promise<{ mensagem: string }> {
    const ag = await this.buscar(tenantId, id);
    await this.processarAgendamento(ag);
    return { mensagem: `Relatório "${ag.tipo}" enviado manualmente para ${ag.destinatarios.join(', ')}.` };
  }

  // ════════════════════════════════════════════════════════════════
  //  CRON JOB — executa a cada hora, verifica agendamentos vencidos
  // ════════════════════════════════════════════════════════════════

  /**
   * RF-R06 — Scheduler: verifica agendamentos vencidos a cada hora.
   * Para cada agendamento ativo com proximo_envio <= NOW():
   *   1. Gera o relatório (Excel)
   *   2. Envia por e-mail
   *   3. Atualiza ultimo_envio e calcula proximo_envio
   */
  @Cron(CronExpression.EVERY_HOUR)
  async executarAgendamentos(): Promise<void> {
    const vencidos = await this.repo
      .createQueryBuilder('ra')
      .where('ra.ativo = 1')
      .andWhere('ra.proximo_envio <= NOW()')
      .getMany();

    if (vencidos.length === 0) return;

    this.logger.log(`[Scheduler] ${vencidos.length} agendamento(s) para processar`);

    for (const ag of vencidos) {
      try {
        await this.processarAgendamento(ag);
      } catch (err) {
        this.logger.error(`[Scheduler] Falha no agendamento ${ag.id}: ${err.message}`);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  HELPERS PRIVADOS
  // ════════════════════════════════════════════════════════════════

  private async processarAgendamento(ag: RelatorioAgendado): Promise<void> {
    const tenantId = ag.tenant_id;
    let buffer:  Buffer;
    let filename: string;
    let assunto: string;

    // Gera o arquivo conforme tipo
    switch (ag.tipo) {
      case 'financeiro':
        buffer   = await this.reportsService.exportarFinanceiroExcel(tenantId, anoInicio(), fimMesAtual());
        filename = `relatorio-financeiro-${hoje()}.xlsx`;
        assunto  = `📊 Relatório Financeiro — ${new Date().toLocaleDateString('pt-BR')}`;
        break;

      case 'contratos':
        buffer   = await this.reportsService.exportarContratosExcel(tenantId);
        filename = `relatorio-contratos-${hoje()}.xlsx`;
        assunto  = `📋 Relatório de Contratos — ${new Date().toLocaleDateString('pt-BR')}`;
        break;

      case 'estoque':
        buffer   = await this.reportsService.exportarEstoqueExcel(tenantId);
        filename = `relatorio-estoque-${hoje()}.xlsx`;
        assunto  = `📦 Relatório de Estoque — ${new Date().toLocaleDateString('pt-BR')}`;
        break;

      case 'maquinas':
        buffer   = await this.reportsService.exportarMaquinasExcel(tenantId, mesInicio(), fimMesAtual());
        filename = `relatorio-maquinas-${hoje()}.xlsx`;
        assunto  = `🤖 Relatório de Máquinas — ${new Date().toLocaleDateString('pt-BR')}`;
        break;

      default:
        this.logger.warn(`[Scheduler] Tipo desconhecido: ${ag.tipo}`);
        return;
    }

    // Envia para cada destinatário
    await this.mailService.enviarRelatorioAgendado(
      ag.destinatarios,
      assunto,
      ag.tipo,
      ag.frequencia,
      buffer,
      filename,
    );

    // Atualiza timestamps
    const agora          = new Date();
    ag.ultimo_envio      = agora;
    (ag as any).proximo_envio = this.calcularProximoEnvio(ag.frequencia, agora);
    await this.repo.save(ag);

    this.logger.log(
      `[Scheduler] ${ag.tipo} enviado para ${ag.destinatarios.length} destinatário(s). Próximo: ${(ag as any).proximo_envio}`,
    );
  }

  /**
   * Calcula a próxima data/hora de envio a partir de uma data base (padrão: agora).
   * - diario:  D+1 às 07:00
   * - semanal: próxima segunda-feira às 07:00
   * - mensal:  dia 1 do mês seguinte às 07:00
   */
  private calcularProximoEnvio(
    frequencia: 'diario' | 'semanal' | 'mensal',
    base = new Date(),
  ): Date {
    const d = new Date(base);

    switch (frequencia) {
      case 'diario': {
        d.setDate(d.getDate() + 1);
        d.setHours(7, 0, 0, 0);
        break;
      }
      case 'semanal': {
        // Próxima segunda-feira
        const diasAteSegunda = ((8 - d.getDay()) % 7) || 7;
        d.setDate(d.getDate() + diasAteSegunda);
        d.setHours(7, 0, 0, 0);
        break;
      }
      case 'mensal': {
        // Dia 1 do próximo mês
        d.setMonth(d.getMonth() + 1, 1);
        d.setHours(7, 0, 0, 0);
        break;
      }
    }

    return d;
  }
}
