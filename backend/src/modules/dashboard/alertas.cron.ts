import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource }     from '@nestjs/typeorm';
import { DataSource }           from 'typeorm';
import { MailService }          from '../mail/mail.service';

@Injectable()
export class AlertasCronService {

  private readonly logger = new Logger(AlertasCronService.name);

  constructor(
    @InjectDataSource() private ds: DataSource,
    private mail: MailService,
  ) {}

  // ── Roda todo dia às 08h00 ────────────────────────────────────
  @Cron('0 8 * * *', { name: 'alertas-diarios', timeZone: 'America/Belem' })
  async processarAlertasDiarios() {
    this.logger.log('⏰ Iniciando processamento de alertas diários...');
    try {
      await Promise.allSettled([
        this.alertarBoletosVencidos(),
        this.alertarEstoqueBaixo(),
        this.alertarMaquinasSemRetorno(),
      ]);
      this.logger.log('✅ Alertas diários processados.');
    } catch (err) {
      this.logger.error(`Erro nos alertas diários: ${err.message}`);
    }
  }

  // ── Roda todo dia às 09h00 — verifica trials expirando ────────
  @Cron('0 9 * * *', { name: 'alertas-trial', timeZone: 'America/Belem' })
  async verificarTrials() {
    this.logger.log('⏰ Verificando trials expirando...');
    try {
      const q = `
        SELECT id, email_admin, razao_social, trial_ate
        FROM tenant
        WHERE status = 'trial'
          AND trial_ate IS NOT NULL
          AND DATEDIFF(trial_ate, CURDATE()) IN (3, 1, 0)
      `;
      const tenants = await this.ds.query(q);

      for (const t of tenants) {
        const dias = this.diasAte(t.trial_ate);
        await this.mail.enviarAlertaTrial(t.email_admin, t.razao_social, dias);
        this.logger.log(`Trial alert → ${t.email_admin} (${dias} dias)`);
      }

      // Suspende trials expirados (trial_ate < hoje)
      await this.ds.query(`
        UPDATE tenant
        SET status = 'suspenso'
        WHERE status = 'trial'
          AND trial_ate IS NOT NULL
          AND trial_ate < CURDATE()
      `);

      this.logger.log('✅ Verificação de trials concluída.');
    } catch (err) {
      this.logger.error(`Erro ao verificar trials: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Alertas individuais
  // ═══════════════════════════════════════════════════════════════

  private async alertarBoletosVencidos() {
    // Boletos vencidos exatamente há 1 dia (D+1), 3 dias (D+3) e 7 dias (D+7)
    const q = `
      SELECT
        lm.id, lm.valor, lm.data_vencimento,
        c.razao_social AS cliente,
        t.email_admin,
        DATEDIFF(CURDATE(), lm.data_vencimento) AS dias_atraso
      FROM lancamento_mensal lm
      JOIN contrato co ON co.id = lm.contrato_id
      JOIN cliente c   ON c.id  = co.cliente_id
      JOIN tenant t    ON t.id  = lm.tenant_id
      WHERE lm.situacao IN ('pendente', 'vencido')
        AND lm.data_vencimento < CURDATE()
        AND DATEDIFF(CURDATE(), lm.data_vencimento) IN (1, 3, 7)
        AND t.status IN ('ativo', 'trial')
    `;
    try {
      const rows = await this.ds.query(q);
      for (const r of rows) {
        await this.mail.enviarAlertaBoleto(
          r.email_admin,
          r.cliente,
          Number(r.valor),
          new Date(r.data_vencimento).toLocaleDateString('pt-BR'),
          Number(r.dias_atraso),
        );
      }
      this.logger.log(`Boletos: ${rows.length} alerta(s) enviados.`);
    } catch (err) {
      this.logger.error(`alertarBoletosVencidos: ${err.message}`);
    }
  }

  private async alertarEstoqueBaixo() {
    // Fix #17: filtra pelo campo alerta_enviado_em para garantir máximo 1 alerta/produto/dia
    const q = `
      SELECT
        p.id, p.descricao, p.unidade, p.estoque_minimo,
        p.alerta_enviado_em,
        t.email_admin, t.id AS tenant_id,
        (
          COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN m.tipo = 'saida'  THEN m.quantidade ELSE 0 END), 0)
        ) AS saldo_atual
      FROM produto p
      JOIN tenant t ON t.id = p.tenant_id
      LEFT JOIN movimentacao_estoque m ON m.produto_id = p.id AND m.tenant_id = p.tenant_id
      WHERE p.ativo = 1
        AND p.estoque_minimo > 0
        AND t.status IN ('ativo', 'trial')
        AND (p.alerta_enviado_em IS NULL OR DATE(p.alerta_enviado_em) < CURDATE())
      GROUP BY p.id, p.descricao, p.unidade, p.estoque_minimo, p.alerta_enviado_em, t.email_admin, t.id
      HAVING saldo_atual <= p.estoque_minimo
    `;
    try {
      const rows = await this.ds.query(q);
      const hoje = new Date().toISOString().split('T')[0];
      for (const r of rows) {
        await this.mail.enviarAlertaEstoque(
          r.email_admin,
          r.descricao,
          Number(r.saldo_atual),
          Number(r.estoque_minimo),
          r.unidade,
        );
        // Atualiza data do último alerta enviado (deduplicação diária — RN-E06)
        await this.ds.query(
          `UPDATE produto SET alerta_enviado_em = ? WHERE id = ?`,
          [hoje, r.id],
        );
      }
      this.logger.log(`Estoque: ${rows.length} alerta(s) enviados.`);
    } catch (err) {
      this.logger.error(`alertarEstoqueBaixo: ${err.message}`);
    }
  }

  private async alertarMaquinasSemRetorno() {
    // FIX #6 — consulta alterada: dispara para exatamente 30 dias (padrão) E múltiplos de 7 a partir daí
    const q = `
      SELECT
        m.patrimonio,
        COALESCE(c.razao_social, mm.local) AS destino,
        t.email_admin,
        DATEDIFF(CURDATE(), mm.data_saida) AS dias_fora
      FROM movimentacao_maquina mm
      JOIN maquina m   ON m.id  = mm.maquina_id
      JOIN tenant t    ON t.id  = mm.tenant_id
      LEFT JOIN cliente c ON c.id = mm.cliente_id
      WHERE mm.data_retorno IS NULL
        AND DATEDIFF(CURDATE(), mm.data_saida) >= 30
        AND (DATEDIFF(CURDATE(), mm.data_saida) - 30) % 7 = 0
        AND t.status IN ('ativo', 'trial')
    `;
    try {
      const rows = await this.ds.query(q);
      for (const r of rows) {
        // FIX #6 — agora envia e-mail real via MailService
        await this.mail.enviarAlertaMaquina(
          r.email_admin,
          r.patrimonio,
          r.destino,
          Number(r.dias_fora),
        );
        this.logger.log(
          `Alerta máquina: ${r.patrimonio} → ${r.destino} (${r.dias_fora}d) → ${r.email_admin}`,
        );
      }
      this.logger.log(`Máquinas: ${rows.length} alerta(s) enviados.`);
    } catch (err) {
      this.logger.error(`alertarMaquinasSemRetorno: ${err.message}`);
    }
  }

  // ── Helper ────────────────────────────────────────────────────
  private diasAte(dataStr: string): number {
    const fim = new Date(dataStr);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    fim.setHours(0, 0, 0, 0);
    return Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  }
}
