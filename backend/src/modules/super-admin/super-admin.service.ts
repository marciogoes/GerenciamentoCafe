import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DataSource }       from 'typeorm';
import { JwtService }       from '@nestjs/jwt';
import { ConfigService }    from '@nestjs/config';

import { TenantsService }   from '../tenants/tenants.service';
import { Tenant }           from '../tenants/entities/tenant.entity';
import { FiltrosTenantDto } from './dto/super-admin.dto';
import { PLANOS, mrrDoTenant, descontoVigente } from '../../common/planos';

@Injectable()
export class SuperAdminService {

  constructor(
    private tenantsService: TenantsService,
    private dataSource:     DataSource,
    private jwtService:     JwtService,
    private config:         ConfigService,
  ) {}

  // ══════════════════════════════════════════════════════════════
  //  DASHBOARD GLOBAL (GET /super-admin/dashboard)
  // ══════════════════════════════════════════════════════════════

  async dashboard() {
    const [metricas, recentes, crescimento] = await Promise.all([
      this.tenantsService.metricas(),
      this.recentesCadastros(),
      this.crescimentoMensal(),
    ]);

    return {
      resumo: metricas,
      recentes_cadastros: recentes,
      crescimento_mensal: crescimento,
      gerado_em: new Date().toISOString(),
    };
  }

  // ── Últimos 5 tenants cadastrados ─────────────────────────────
  private async recentesCadastros(): Promise<any[]> {
    const rows = await this.dataSource.query(`
      SELECT id, razao_social, slug, plano, status, criado_em
      FROM tenant
      ORDER BY criado_em DESC
      LIMIT 5
    `);
    return rows;
  }

  // ── Crescimento: cadastros por mês (últimos 6 meses) ──────────
  private async crescimentoMensal(): Promise<any[]> {
    const rows = await this.dataSource.query(`
      SELECT
        DATE_FORMAT(criado_em, '%Y-%m') AS mes,
        COUNT(*)                        AS total
      FROM tenant
      WHERE criado_em >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY mes
      ORDER BY mes ASC
    `);
    return rows.map(r => ({ mes: r.mes, total: Number(r.total) }));
  }

  // ══════════════════════════════════════════════════════════════
  //  LISTAGEM DE TENANTS (GET /super-admin/tenants)
  // ══════════════════════════════════════════════════════════════

  async listarTenants(filtros: FiltrosTenantDto): Promise<any[]> {
    const tenants = await this.tenantsService.listarTodos();

    let resultado = tenants;

    if (filtros.status) {
      resultado = resultado.filter(t => t.status === filtros.status);
    }
    if (filtros.plano) {
      resultado = resultado.filter(t => t.plano === filtros.plano);
    }
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      resultado = resultado.filter(t =>
        t.razao_social?.toLowerCase().includes(busca) ||
        t.cnpj?.includes(busca) ||
        t.slug?.toLowerCase().includes(busca) ||
        t.email_admin?.toLowerCase().includes(busca),
      );
    }

    // Enriquece com contagens de usuários e máquinas
    const enriquecidos = await Promise.all(
      resultado.map(t => this.enriquecerTenant(t)),
    );

    return enriquecidos;
  }

  // ══════════════════════════════════════════════════════════════
  //  DETALHE DE TENANT (GET /super-admin/tenants/:id)
  // ══════════════════════════════════════════════════════════════

  async detalharTenant(id: string): Promise<any> {
    const tenant = await this.tenantsService.buscarPorId(id);
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');

    const [
      usuarios,
      maquinas,
      contratos,
      logs,
    ] = await Promise.all([
      this.contarRegistros('usuario',   id),
      this.contarRegistros('maquina',   id),
      this.contarRegistros('contrato',  id),
      this.ultimosLogs(id),
    ]);

    return {
      ...tenant,
      _metricas: {
        usuarios_ativos: usuarios,
        maquinas:        maquinas,
        contratos:       contratos,
        // mrrDoTenant aplica o desconto comercial vigente; antes o valor cheio
        // do plano era reportado mesmo para tenants com desconto ativo.
        mrr:              mrrDoTenant(tenant),
        preco_cheio:      PLANOS[tenant.plano]?.preco_mensal ?? 0,
        desconto_vigente: descontoVigente(tenant),
        dias_trial_restantes: tenant.status === 'trial' && tenant.trial_ate
          ? Math.max(0, Math.ceil(
              (new Date(tenant.trial_ate).getTime() - Date.now()) / 86400000,
            ))
          : null,
      },
      _logs_recentes: logs,
    };
  }

  // ══════════════════════════════════════════════════════════════
  //  ALTERAR STATUS (PATCH /super-admin/tenants/:id/status)
  // ══════════════════════════════════════════════════════════════

  async alterarStatus(
    id: string,
    status: 'ativo' | 'suspenso' | 'cancelado',
    adminId: string,
  ): Promise<Tenant> {
    const tenant = await this.tenantsService.atualizarStatus(id, status);

    // Registra no log de auditoria
    await this.dataSource.query(
      `INSERT INTO log_atividade (id, tenant_id, usuario_id, acao, modulo, descricao, criado_em)
       VALUES (UUID(), ?, ?, 'SUPER_ADMIN_STATUS', 'super-admin', ?, NOW())`,
      [id, adminId, `Status alterado para "${status}" pelo super admin`],
    ).catch(() => { /* log não bloqueia a operação */ });

    return tenant;
  }

  // ══════════════════════════════════════════════════════════════
  //  ALTERAR PLANO (PATCH /super-admin/tenants/:id/plano)
  // ══════════════════════════════════════════════════════════════

  async alterarPlano(
    id: string,
    plano: 'starter' | 'pro' | 'enterprise',
    adminId: string,
  ): Promise<Tenant> {
    const tenant = await this.tenantsService.atualizarPlano(id, plano);

    await this.dataSource.query(
      `INSERT INTO log_atividade (id, tenant_id, usuario_id, acao, modulo, descricao, criado_em)
       VALUES (UUID(), ?, ?, 'SUPER_ADMIN_PLANO', 'super-admin', ?, NOW())`,
      [id, adminId, `Plano alterado para "${plano}" pelo super admin`],
    ).catch(() => { /* log não bloqueia */ });

    return tenant;
  }

  // ══════════════════════════════════════════════════════════════
  //  LISTAR PLANOS (GET /super-admin/planos)
  // ══════════════════════════════════════════════════════════════

  async listarPlanos(): Promise<any[]> {
    const tenants = await this.tenantsService.listarTodos();

    // Antes: os precos e os limites estavam escritos a mao aqui, e o MRR era
    // "qtd de ativos x preco cheio" — ignorando o desconto de cada tenant.
    // Agora vem de common/planos e o MRR e somado tenant a tenant.
    return Object.values(PLANOS).map(def => {
      const doPlano = tenants.filter(t => t.plano === def.plano);
      return {
        plano:        def.plano,
        preco_mensal: def.preco_mensal,
        max_usuarios: def.max_usuarios,
        max_maquinas: def.max_maquinas,
        tenants:      doPlano.length,
        ativos:       doPlano.filter(t => t.status === 'ativo').length,
        mrr:          Math.round(doPlano.reduce((s, t) => s + mrrDoTenant(t), 0) * 100) / 100,
      };
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  LOGS GLOBAIS (GET /super-admin/logs)
  // ══════════════════════════════════════════════════════════════

  async logsGlobais(limite = 50): Promise<any[]> {
    const rows = await this.dataSource.query(`
      SELECT
        la.id, la.tenant_id, t.razao_social AS tenant_nome,
        la.usuario_id, la.acao, la.modulo, la.descricao, la.criado_em
      FROM log_atividade la
      LEFT JOIN tenant t ON t.id = la.tenant_id
      WHERE la.modulo = 'super-admin'
      ORDER BY la.criado_em DESC
      LIMIT ?
    `, [limite]);
    return rows;
  }

  // ══════════════════════════════════════════════════════════════
  //  ESTENDER TRIAL (PATCH /super-admin/tenants/:id/trial)
  // ══════════════════════════════════════════════════════════════

  async estenderTrial(id: string, trial_ate: string, adminId: string): Promise<Tenant> {
    const tenant = await this.tenantsService.buscarPorId(id);
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');

    await this.dataSource.query(
      `UPDATE tenant SET trial_ate = ?, status = 'trial' WHERE id = ?`,
      [trial_ate, id],
    );
    await this.dataSource.query(
      `INSERT INTO log_atividade (id, tenant_id, usuario_id, acao, modulo, descricao, criado_em)
       VALUES (UUID(), ?, ?, 'SUPER_ADMIN_TRIAL', 'super-admin', ?, NOW())`,
      [id, adminId, `Trial estendido até ${trial_ate}`],
    ).catch(() => {});

    return this.tenantsService.buscarPorId(id);
  }

  // ══════════════════════════════════════════════════════════════
  //  MODO SUPORTE ASSISTIDO — IMPERSONATE (Sprint 17)
  // ══════════════════════════════════════════════════════════════

  /**
   * POST /super-admin/impersonate/:tenantId
   * Gera um JWT especial com duração de 2h que autentica o super admin
   * como se fosse o admin do tenant-alvo. O token carrega:
   *   - impersonated: true
   *   - originalAdminId: UUID do super admin
   * A sessão de suporte é registrada em log_atividade.
   */
  async impersonate(
    tenantId: string,
    superAdminId: string,
    superAdminEmail: string,
    motivo?: string,
  ): Promise<{ access_token: string; expira_em: string; tenant: Partial<Tenant> }> {
    const tenant = await this.tenantsService.buscarPorId(tenantId);
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');

    // Busca o admin ativo deste tenant para usar no payload
    const adminRows = await this.dataSource.query(
      `SELECT id, nome, email FROM usuario
       WHERE tenant_id = ? AND perfil = 'admin' AND ativo = 1
       ORDER BY criado_em ASC LIMIT 1`,
      [tenantId],
    );
    const adminTenant = adminRows[0];
    if (!adminTenant) {
      throw new NotFoundException('Nenhum admin ativo encontrado para este tenant.');
    }

    const expiraEm = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas

    const payload = {
      sub:              adminTenant.id,
      email:            adminTenant.email,
      tenantId,
      perfil:           'admin',
      // Flags de suporte — identificadas pelo ImpersonationGuard
      impersonated:     true,
      originalAdminId:  superAdminId,
      originalEmail:    superAdminEmail,
    };

    const access_token = this.jwtService.sign(payload, {
      secret:    this.config.get<string>('JWT_SECRET'),
      expiresIn: '2h',
    });

    // Registra a sessão de suporte
    await this.dataSource.query(
      `INSERT INTO log_atividade
         (id, tenant_id, usuario_id, acao, modulo, descricao, criado_em)
       VALUES (UUID(), ?, ?, 'SUPER_ADMIN_IMPERSONATE', 'super-admin', ?, NOW())`,
      [
        tenantId,
        superAdminId,
        `Suporte assistido iniciado por ${superAdminEmail} — tenant: ${tenant.razao_social}` +
          (motivo ? ` — motivo: ${motivo}` : ''),
      ],
    ).catch(() => {});

    return {
      access_token,
      expira_em:  expiraEm.toISOString(),
      tenant: {
        id:           tenant.id,
        razao_social: tenant.razao_social,
        slug:         tenant.slug,
        plano:        tenant.plano,
        status:       tenant.status,
      },
    };
  }

  /**
   * GET /super-admin/impersonations
   * Histórico das sessões de suporte assistido.
   */
  async historicoImpersonations(limite = 50): Promise<any[]> {
    const rows = await this.dataSource.query(`
      SELECT
        la.id, la.tenant_id, t.razao_social AS tenant_nome,
        la.usuario_id AS super_admin_id,
        la.descricao, la.criado_em
      FROM log_atividade la
      LEFT JOIN tenant t ON t.id = la.tenant_id
      WHERE la.acao = 'SUPER_ADMIN_IMPERSONATE'
      ORDER BY la.criado_em DESC
      LIMIT ?
    `, [limite]);
    return rows;
  }

  // ══════════════════════════════════════════════════════════════
  //  DESCONTO POR TENANT (Sprint 17)
  // ══════════════════════════════════════════════════════════════

  /**
   * POST /super-admin/tenants/:id/desconto
   * Aplica desconto comercial ao tenant. Persiste em log_atividade
   * e nas colunas desconto_percentual / desconto_expira_em do tenant
   * (criadas pela migration sprint17).
   */
  async aplicarDesconto(
    tenantId:   string,
    percentual: number,
    expira_em?: string,
    motivo?:    string,
    adminId?:   string,
  ): Promise<{ mensagem: string; tenant_id: string; percentual: number; expira_em: string | null }> {
    const tenant = await this.tenantsService.buscarPorId(tenantId);
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');

    // As colunas ja existem no schema. Se este UPDATE falhar, o desconto nao foi
    // aplicado e o super admin precisa saber — antes o erro era engolido por um
    // .catch(() => {}) e a tela dizia "desconto aplicado" sem ter aplicado nada.
    await this.dataSource.query(
      `UPDATE tenant
         SET desconto_percentual = ?, desconto_expira_em = ?
       WHERE id = ?`,
      [percentual, expira_em ?? null, tenantId],
    );

    // Log sempre gravado
    const descricao = [
      `Desconto de ${percentual}% aplicado`,
      expira_em ? `válido até ${expira_em}` : null,
      motivo    ? `motivo: ${motivo}`        : null,
    ].filter(Boolean).join(' — ');

    await this.dataSource.query(
      `INSERT INTO log_atividade
         (id, tenant_id, usuario_id, acao, modulo, descricao, criado_em)
       VALUES (UUID(), ?, ?, 'SUPER_ADMIN_DESCONTO', 'super-admin', ?, NOW())`,
      [tenantId, adminId ?? null, descricao],
    ).catch(() => {});

    return {
      mensagem:   `Desconto de ${percentual}% aplicado ao tenant ${tenant.razao_social}.`,
      tenant_id:  tenantId,
      percentual,
      expira_em:  expira_em ?? null,
    };
  }

  // ══════════════════════════════════════════════════════════════
  //  HELPERS PRIVADOS
  // ══════════════════════════════════════════════════════════════

  private async enriquecerTenant(tenant: Tenant): Promise<any> {
    const [usuarios, maquinas] = await Promise.all([
      this.contarRegistros('usuario',  tenant.id),
      this.contarRegistros('maquina',  tenant.id),
    ]);
    return {
      ...tenant,
      _usuarios: usuarios,
      _maquinas: maquinas,
      _mrr:      mrrDoTenant(tenant),   // aplica desconto vigente
    };
  }

  private async contarRegistros(tabela: string, tenantId: string): Promise<number> {
    try {
      const rows = await this.dataSource.query(
        `SELECT COUNT(*) AS total FROM \`${tabela}\` WHERE tenant_id = ?`,
        [tenantId],
      );
      return Number(rows[0]?.total ?? 0);
    } catch {
      return 0;
    }
  }

  private async ultimosLogs(tenantId: string): Promise<any[]> {
    try {
      const rows = await this.dataSource.query(`
        SELECT acao, modulo, descricao, criado_em
        FROM log_atividade
        WHERE tenant_id = ?
        ORDER BY criado_em DESC
        LIMIT 10
      `, [tenantId]);
      return rows;
    } catch {
      return [];
    }
  }
}
