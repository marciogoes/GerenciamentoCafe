import { Injectable, Logger } from '@nestjs/common';
import { Cron }            from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource }       from 'typeorm';

import { ContractsService }    from './contracts.service';
import { GerarLancamentosDto } from './dto/contracts.dto';
import { MailService }         from '../mail/mail.service';

/**
 * Cron do módulo de Contratos
 * ─ Gera lançamentos mensais automaticamente no 1º dia de cada mês (RF-C03 / UC-04)
 * ─ Marca como 'vencido' todos os lançamentos pendentes com data_vencimento < hoje
 */
@Injectable()
export class ContractsCronService {

  private readonly logger = new Logger(ContractsCronService.name);

  constructor(
    @InjectDataSource() private ds: DataSource,
    private contracts: ContractsService,
    private mail: MailService,
  ) {}

  // ── Gera lançamentos no 1º dia de cada mês às 06h00 ──────────
  @Cron('0 6 1 * *', { name: 'gerar-lancamentos-mensais', timeZone: 'America/Belem' })
  async gerarLancamentosMensais() {
    this.logger.log('⏰ Gerando lançamentos mensais automáticos...');

    try {
      // Busca todos os tenants ativos (não suspensos nem cancelados)
      const tenants: { id: string }[] = await this.ds.query(
        `SELECT id FROM tenant WHERE status IN ('ativo','trial')`,
      );

      // Calcula a competência: 1º dia do mês corrente
      const hoje = new Date();
      const competencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;

      let totalGerados = 0;

      for (const tenant of tenants) {
        try {
          const dto: GerarLancamentosDto = { competencia };
          const result = await this.contracts.gerarLancamentos(tenant.id, dto, 'automatico');
          totalGerados += result.gerados;
          this.logger.log(
            `Tenant ${tenant.id}: ${result.gerados} lançamento(s) gerados para ${competencia}.`,
          );
        } catch (err) {
          // Se já existem lançamentos para essa competência, o service lança BadRequestException
          // Isso é esperado se o cron rodar mais de uma vez
          this.logger.warn(`Tenant ${tenant.id}: ${err.message}`);
        }
      }

      this.logger.log(`✅ Total gerado: ${totalGerados} lançamento(s) em ${tenants.length} tenant(s).`);

    } catch (err) {
      this.logger.error(`Erro ao gerar lançamentos mensais: ${err.message}`);
    }
  }

  // ── Marca pendentes vencidos todo dia às 07h30 ────────────────
  @Cron('30 7 * * *', { name: 'marcar-lancamentos-vencidos', timeZone: 'America/Belem' })
  async marcarLancamentosVencidos() {
    this.logger.log('⏰ Marcando lançamentos pendentes como vencidos...');
    try {
      // Fix #14: usa o service em vez de raw SQL direto
      const tenants: { id: string }[] = await this.ds.query(
        `SELECT id FROM tenant WHERE status IN ('ativo','trial')`,
      );

      let totalAfetados = 0;
      for (const tenant of tenants) {
        const afetados = await this.contracts.atualizarSituacaoVencidos(tenant.id);
        totalAfetados += afetados;
      }

      this.logger.log(`✅ ${totalAfetados} lançamento(s) marcados como vencidos.`);
    } catch (err) {
      this.logger.error(`Erro ao marcar vencidos: ${err.message}`);
    }
  }

  // ── Alerta D-3: e-mail ao cliente antes do vencimento (RF-C07) ─
  @Cron('0 8 * * *', { name: 'alerta-vencimento-d3', timeZone: 'America/Belem' })
  async alertarVencimentoD3() {
    this.logger.log('⏰ Enviando alertas D-3 de vencimento para clientes...');
    try {
      const alvo = new Date();
      alvo.setDate(alvo.getDate() + 3);
      const dataAlvo = alvo.toISOString().split('T')[0];

      const rows: any[] = await this.ds.query(`
        SELECT
          lm.id, lm.valor, lm.data_vencimento,
          cl.razao_social  AS cliente_nome,
          cl.contato_email AS cliente_email
        FROM lancamento_mensal lm
        JOIN contrato co ON co.id = lm.contrato_id
        JOIN cliente cl  ON cl.id = co.cliente_id
        JOIN tenant t    ON t.id  = lm.tenant_id
        WHERE lm.situacao = 'pendente'
          AND lm.data_vencimento = ?
          AND cl.contato_email IS NOT NULL
          AND t.status IN ('ativo', 'trial')
      `, [dataAlvo]);

      for (const r of rows) {
        await this.mail.enviarAlertaVencimentoCliente(
          r.cliente_email,
          r.cliente_nome,
          Number(r.valor),
          new Date(r.data_vencimento).toLocaleDateString('pt-BR'),
          3,
        );
      }
      this.logger.log(`✅ Alertas D-3: ${rows.length} e-mail(s) enviados.`);
    } catch (err) {
      this.logger.error(`Erro no alerta D-3: ${err.message}`);
    }
  }
}
