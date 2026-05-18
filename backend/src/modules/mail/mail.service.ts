import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import * as nodemailer        from 'nodemailer';

@Injectable()
export class MailService {

  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly from:  string;
  private readonly appUrl: string;

  constructor(private config: ConfigService) {
    this.from   = config.get('MAIL_FROM') || '"Vending Manager" <noreply@vendingmanager.com.br>';
    this.appUrl = config.get('FRONTEND_URL') || 'http://localhost:5173';

    this.transporter = nodemailer.createTransport({
      host:   config.get('MAIL_HOST')   || 'smtp.gmail.com',
      port:   config.get<number>('MAIL_PORT') || 587,
      secure: false,
      auth: {
        user: config.get('MAIL_USER'),
        pass: config.get('MAIL_PASS'),
      },
    });
  }

  // ── Confirmação de e-mail (cadastro) ──────────────────────────
  async enviarConfirmacaoEmail(
    email: string,
    razaoSocial: string,
    token: string,
  ): Promise<void> {
    const link = `${this.appUrl}/verificar-email?token=${token}`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:32px 40px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:12px;">
            <span style="font-size:28px;">☕</span>
            <span style="color:#fff;font-size:22px;font-weight:700;">Vending Manager</span>
          </div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:24px;color:#111827;">Confirme seu e-mail</h1>
          <p style="color:#6b7280;font-size:15px;margin:0 0 24px;">
            Olá! Recebemos o cadastro de <strong>${razaoSocial}</strong> no Vending Manager.<br>
            Clique no botão abaixo para confirmar seu e-mail e ativar sua conta.
          </p>

          <div style="text-align:center;margin:32px 0;">
            <a href="${link}"
               style="display:inline-block;background:#2563eb;color:#fff;font-size:16px;font-weight:600;
                      padding:14px 32px;border-radius:10px;text-decoration:none;">
              ✅ Confirmar e-mail
            </a>
          </div>

          <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0;">
            Este link expira em <strong>24 horas</strong>.<br>
            Se não foi você, ignore este e-mail.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
            Vending Manager SaaS · Belém/PA · © 2026
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from:    this.from,
        to:      email,
        subject: '✅ Confirme seu e-mail — Vending Manager',
        html,
      });
      this.logger.log(`E-mail de confirmação enviado para ${email}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail para ${email}: ${err.message}`);
      // Não lança exceção — o cadastro já foi criado, e-mail pode ser reenviado
    }
  }

  // ── Alerta de boleto vencido ───────────────────────────────────
  async enviarAlertaBoleto(
    email: string,
    nomeCliente: string,
    valor: number,
    vencimento: string,
    diasAtraso: number,
  ): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#dc2626;padding:24px 40px;text-align:center;">
          <span style="color:#fff;font-size:20px;font-weight:700;">⚠️ Boleto em Atraso</span>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="font-size:15px;color:#374151;">
            O boleto de <strong>${nomeCliente}</strong> está em atraso há <strong>${diasAtraso} dia(s)</strong>.
          </p>
          <table style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;width:100%;">
            <tr>
              <td style="color:#6b7280;font-size:13px;">Valor</td>
              <td style="color:#111827;font-weight:600;text-align:right;">
                R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
            <tr>
              <td style="color:#6b7280;font-size:13px;padding-top:8px;">Vencimento</td>
              <td style="color:#dc2626;font-weight:600;text-align:right;padding-top:8px;">${vencimento}</td>
            </tr>
          </table>
          <p style="font-size:13px;color:#9ca3af;margin-top:24px;">
            Acesse o sistema para registrar o pagamento ou entrar em contato com o cliente.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from:    this.from,
        to:      email,
        subject: `⚠️ Boleto em atraso ${diasAtraso}d — ${nomeCliente}`,
        html,
      });
    } catch (err) {
      this.logger.error(`Falha ao enviar alerta de boleto: ${err.message}`);
    }
  }

  // ── Alerta de estoque mínimo ──────────────────────────────────
  async enviarAlertaEstoque(
    email: string,
    produto: string,
    saldoAtual: number,
    saldoMinimo: number,
    unidade: string,
  ): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#d97706;padding:24px 40px;text-align:center;">
          <span style="color:#fff;font-size:20px;font-weight:700;">📦 Estoque Baixo</span>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="font-size:15px;color:#374151;">
            O produto <strong>${produto}</strong> atingiu o estoque mínimo.
          </p>
          <table style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;width:100%;">
            <tr>
              <td style="color:#6b7280;font-size:13px;">Saldo atual</td>
              <td style="color:#d97706;font-weight:600;text-align:right;">${saldoAtual} ${unidade}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;font-size:13px;padding-top:8px;">Estoque mínimo</td>
              <td style="color:#374151;text-align:right;padding-top:8px;">${saldoMinimo} ${unidade}</td>
            </tr>
          </table>
          <p style="font-size:13px;color:#9ca3af;margin-top:24px;">
            Registre uma entrada no módulo de Estoque para repor o produto.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from:    this.from,
        to:      email,
        subject: `📦 Estoque baixo — ${produto}`,
        html,
      });
    } catch (err) {
      this.logger.error(`Falha ao enviar alerta de estoque: ${err.message}`);
    }
  }

  // ── Trial expirando ───────────────────────────────────────────
  async enviarAlertaTrial(
    email: string,
    razaoSocial: string,
    diasRestantes: number,
  ): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:24px 40px;text-align:center;">
          <span style="color:#fff;font-size:20px;font-weight:700;">☕ Vending Manager</span>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 12px;color:#111827;">Seu trial expira em ${diasRestantes} dia(s)</h2>
          <p style="font-size:15px;color:#374151;">
            Olá, <strong>${razaoSocial}</strong>!<br>
            Seu período de avaliação gratuita está chegando ao fim.
            Assine um plano para continuar usando o Vending Manager.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${this.appUrl}/planos"
               style="display:inline-block;background:#2563eb;color:#fff;font-size:16px;
                      font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">
              Ver planos e preços
            </a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from:    this.from,
        to:      email,
        subject: `⏰ Seu trial expira em ${diasRestantes} dia(s) — Vending Manager`,
        html,
      });
    } catch (err) {
      this.logger.error(`Falha ao enviar alerta de trial: ${err.message}`);
    }
  }

  // ── Convite de novo usuário ──────────────────────────────────
  async enviarConvite(
    emailConvidado: string,
    nomeAdmin: string,
    razaoSocial: string,
    linkConvite: string,
  ): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr><td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:32px 40px;text-align:center;">
          <span style="color:#fff;font-size:22px;font-weight:700;">☕ Vending Manager</span>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:22px;color:#111827;">Você foi convidado!</h1>
          <p style="color:#6b7280;font-size:15px;margin:0 0 24px;">
            <strong>${nomeAdmin}</strong> convidou você para acessar o sistema de gestão da
            <strong>${razaoSocial}</strong> no Vending Manager.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${linkConvite}"
               style="display:inline-block;background:#2563eb;color:#fff;font-size:16px;font-weight:600;
                      padding:14px 32px;border-radius:10px;text-decoration:none;">
              ✅ Criar minha conta
            </a>
          </div>
          <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0;">
            Este convite expira em <strong>48 horas</strong>.<br>
            Se não esperava este e-mail, ignore-o com segurança.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Vending Manager SaaS · Belém/PA · © 2026</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from:    this.from,
        to:      emailConvidado,
        subject: `✉️ Você foi convidado para ${razaoSocial} — Vending Manager`,
        html,
      });
      this.logger.log(`Convite enviado para ${emailConvidado}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar convite: ${err.message}`);
    }
  }

  // ── Alerta de vencimento (D-3) enviado ao cliente ─────────────
  async enviarAlertaVencimentoCliente(
    emailCliente: string,
    nomeCliente:  string,
    valor:        number,
    vencimento:   string,
    diasRestantes: number,
  ): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:24px 40px;text-align:center;">
          <span style="color:#fff;font-size:20px;font-weight:700;">☕ Vending Manager</span>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 12px;color:#111827;">Lembrete de vencimento</h2>
          <p style="font-size:15px;color:#374151;">
            Olá, <strong>${nomeCliente}</strong>!<br>
            Seu boleto vence em <strong>${diasRestantes} dia(s)</strong>. Fique atento para evitar juros.
          </p>
          <table style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;width:100%;margin:20px 0;">
            <tr>
              <td style="color:#6b7280;font-size:13px;">Valor</td>
              <td style="color:#1e40af;font-weight:700;text-align:right;font-size:18px;">
                R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
            <tr>
              <td style="color:#6b7280;font-size:13px;padding-top:8px;">Vencimento</td>
              <td style="color:#374151;font-weight:600;text-align:right;padding-top:8px;">${vencimento}</td>
            </tr>
          </table>
          <p style="font-size:13px;color:#9ca3af;margin-top:16px;">
            Em caso de dúvidas, entre em contato com nossa equipe.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Vending Manager SaaS · Belém/PA · © 2026</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from:    this.from,
        to:      emailCliente,
        subject: `📅 Boleto vence em ${diasRestantes} dia(s) — ${nomeCliente}`,
        html,
      });
    } catch (err) {
      this.logger.error(`Falha ao enviar lembrete de vencimento: ${err.message}`);
    }
  }

  // ── FIX #6: Alerta de máquina sem retorno ─────────────────────
  async enviarAlertaMaquina(
    email: string,
    patrimonio: string,
    destino: string,
    diasFora: number,
  ): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#ea580c;padding:24px 40px;text-align:center;">
          <span style="color:#fff;font-size:20px;font-weight:700;">🤖 Máquina Sem Retorno</span>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="font-size:15px;color:#374151;">
            A máquina <strong>${patrimonio}</strong> está fora da base há <strong>${diasFora} dia(s)</strong>.
          </p>
          <table style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;width:100%;">
            <tr>
              <td style="color:#6b7280;font-size:13px;">Patrimônio</td>
              <td style="color:#111827;font-weight:600;text-align:right;">${patrimonio}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;font-size:13px;padding-top:8px;">Localização atual</td>
              <td style="color:#374151;text-align:right;padding-top:8px;">${destino}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;font-size:13px;padding-top:8px;">Dias fora da base</td>
              <td style="color:#ea580c;font-weight:700;text-align:right;padding-top:8px;">${diasFora} dias</td>
            </tr>
          </table>
          <p style="font-size:13px;color:#9ca3af;margin-top:24px;">
            Acesse o módulo de Máquinas para registrar o retorno ou verificar a situação.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from:    this.from,
        to:      email,
        subject: `🤖 Máquina ${patrimonio} sem retorno há ${diasFora} dias — Vending Manager`,
        html,
      });
    } catch (err) {
      this.logger.error(`Falha ao enviar alerta de máquina: ${err.message}`);
    }
  }

  // ── Relatório Agendado (RF-R06 — Sprint 17) ───────────────────────
  /**
   * Envia relatório Excel como anexo para uma lista de destinatários.
   * Chamado pelo ReportSchedulerService (cron + disparo manual).
   */
  async enviarRelatorioAgendado(
    destinatarios: string[],
    assunto:       string,
    tipoRelatorio: string,
    frequencia:    string,
    buffer:        Buffer,
    filename:      string,
  ): Promise<void> {
    const labelTipo: Record<string, string> = {
      financeiro: 'Financeiro',
      contratos:  'Contratos',
      estoque:    'Estoque',
      maquinas:   'Movimentação de Máquinas',
    };
    const labelFreq: Record<string, string> = {
      diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal',
    };

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr><td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:28px 40px;text-align:center;">
          <span style="color:#fff;font-size:22px;font-weight:700;">&#9749; Vending Manager</span><br>
          <span style="color:#bfdbfe;font-size:13px;margin-top:4px;display:block;">Relatório Automático</span>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">
            Relatório ${labelTipo[tipoRelatorio] ?? tipoRelatorio}
          </h2>
          <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">
            Freqüência: <strong>${labelFreq[frequencia] ?? frequencia}</strong>
            &mdash; Gerado em <strong>${new Date().toLocaleDateString('pt-BR')}</strong>
          </p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;
                      padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;color:#1e40af;">
              &#128206; O relatório está anexado (.xlsx). Abra com Excel, Google Sheets ou LibreOffice.
            </p>
          </div>
          <p style="font-size:13px;color:#9ca3af;margin:0;">
            Para cancelar ou alterar destinatários, acesse
            <a href="${this.appUrl}/settings" style="color:#2563eb;">Configurações &rarr; Relatórios</a>.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
            Vending Manager SaaS &middot; Belém/PA &middot; &copy; ${new Date().getFullYear()}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from:        this.from,
        to:          destinatarios.join(', '),
        subject:     assunto,
        html,
        attachments: [{
          filename,
          content:     buffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }],
      });
      this.logger.log(`Relatório agendado enviado para ${destinatarios.length} destinatário(s)`);
    } catch (err) {
      this.logger.error(`Falha ao enviar relatório agendado: ${err.message}`);
      throw err;
    }
  }
}
