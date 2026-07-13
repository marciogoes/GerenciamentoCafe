import {
  Injectable, ConflictException, BadRequestException, NotFoundException,
  Inject, forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { v4 as uuidv4 }     from 'uuid';
import * as crypto          from 'crypto';

import { Tenant }           from './entities/tenant.entity';
import { mrrTotal }         from '../../common/planos';
import { CadastroTenantDto, ConfigurarTenantDto, WizardPassoDto } from './dto/tenant.dto';
import { UsersService }     from '../users/users.service';
import { MailService }      from '../mail/mail.service';

const LIMITES_PLANO = {
  starter:    { max_usuarios: 5,  max_maquinas: 50,  max_contratos: 30 },
  pro:        { max_usuarios: 20, max_maquinas: 200, max_contratos: 0  },
  enterprise: { max_usuarios: 0,  max_maquinas: 0,   max_contratos: 0  },
};

@Injectable()
export class TenantsService {

  constructor(
    @InjectRepository(Tenant)
    private repo: Repository<Tenant>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private mailService:  MailService,
  ) {}

  // ── AUTO-CADASTRO PÚBLICO ─────────────────────────────────────
  async cadastrar(dto: CadastroTenantDto): Promise<{ mensagem: string; tenantId: string }> {
    dto.cnpj = dto.cnpj.replace(/\D/g, '');
    if (!this.validarCnpj(dto.cnpj)) {
      throw new BadRequestException('CNPJ inválido. Verifique os dígitos verificadores.');
    }
    if (await this.repo.findOne({ where: { cnpj: dto.cnpj } })) {
      throw new ConflictException('Este CNPJ já possui uma conta. Faça login.');
    }
    if (await this.repo.findOne({ where: { email_admin: dto.email_admin } })) {
      throw new ConflictException('Este e-mail já está associado a uma conta.');
    }

    const limites      = LIMITES_PLANO[dto.plano];
    const trialAte     = new Date();
    trialAte.setDate(trialAte.getDate() + 14);
    const token        = crypto.randomBytes(32).toString('hex');
    const tokenExpira  = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const tenant = this.repo.create({
      id:                uuidv4(),
      slug:              `tenant-${dto.cnpj.slice(-8)}`,
      razao_social:      dto.razao_social,
      cnpj:              dto.cnpj,
      email_admin:       dto.email_admin,
      telefone:          dto.telefone,
      plano:             dto.plano,
      status:            'trial',
      trial_ate:         trialAte.toISOString().split('T')[0],
      email_verificado:  false,
      token_verificacao: token,
      token_expira_em:   tokenExpira,
      wizard_status:     { passo1: false, passo2: false, passo3: false, passo4: false, passo5: false },
      wizard_concluido:  false,
      dias_alerta_maquina:   30,
      tempo_inatividade_min: 60,
      ...limites,
    });

    const tenantSalvo = await this.repo.save(tenant);

    await this.usersService.criar(tenantSalvo.id, {
      nome: `Admin ${dto.razao_social}`, email: dto.email_admin,
      senha: dto.senha, perfil: 'admin',
    });

    await this.mailService.enviarConfirmacaoEmail(dto.email_admin, dto.razao_social, token);

    return { mensagem: 'Cadastro realizado! Verifique seu e-mail para ativar a conta.', tenantId: tenantSalvo.id };
  }

  // ── VERIFICAR E-MAIL ──────────────────────────────────────────
  async verificarEmail(token: string): Promise<{ mensagem: string; tenantId: string; email: string }> {
    const tenant = await this.repo.createQueryBuilder('t')
      .addSelect('t.token_verificacao').addSelect('t.token_expira_em')
      .where('t.token_verificacao = :token', { token }).getOne();

    if (!tenant) throw new BadRequestException('Token inválido ou já utilizado.');
    if (new Date() > new Date(tenant.token_expira_em)) {
      throw new BadRequestException('Token expirado. Solicite um novo e-mail.');
    }
    await this.repo.update(tenant.id, { email_verificado: true, token_verificacao: null, token_expira_em: null });
    return { mensagem: 'E-mail confirmado! Configure seu tenant.', tenantId: tenant.id, email: tenant.email_admin };
  }

  // ── REENVIAR VERIFICAÇÃO ──────────────────────────────────────
  async reenviarVerificacao(email: string): Promise<{ mensagem: string }> {
    const tenant = await this.repo.findOne({ where: { email_admin: email } });
    if (!tenant) throw new NotFoundException('E-mail não encontrado.');
    if (tenant.email_verificado) throw new BadRequestException('E-mail já verificado.');
    const token       = crypto.randomBytes(32).toString('hex');
    const tokenExpira = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.repo.update(tenant.id, { token_verificacao: token, token_expira_em: tokenExpira });
    await this.mailService.enviarConfirmacaoEmail(email, tenant.razao_social, token);
    return { mensagem: 'E-mail de verificação reenviado.' };
  }

  // ── CONFIGURAR TENANT (pós-verificação) ───────────────────────
  async configurar(tenantId: string, dto: ConfigurarTenantDto): Promise<Tenant> {
    const tenant = await this.repo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');
    if (!tenant.email_verificado) throw new BadRequestException('Confirme o e-mail antes de configurar.');

    const slugExiste = await this.repo.findOne({ where: { slug: dto.slug } });
    if (slugExiste && slugExiste.id !== tenantId) {
      throw new ConflictException(`O identificador "${dto.slug}" já está em uso.`);
    }
    await this.repo.update(tenantId, {
      slug: dto.slug, nome_exibicao: dto.nome_exibicao,
      fuso_horario: dto.fuso_horario || 'America/Belem', logo_url: dto.logo_url,
    });
    return this.repo.findOne({ where: { id: tenantId } });
  }

  // ── BUSCAR TENANT ─────────────────────────────────────────────
  async buscarPorId(id: string): Promise<Tenant> {
    const tenant = await this.repo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');
    return tenant;
  }

  async buscarPorSlug(slug: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { slug } });
  }

  // ── VERIFICAR SLUG ────────────────────────────────────────────
  async verificarSlug(slug: string): Promise<{ disponivel: boolean; sugestoes: string[] }> {
    const existe = await this.repo.findOne({ where: { slug } });
    if (!existe) return { disponivel: true, sugestoes: [] };
    return {
      disponivel: false,
      sugestoes:  [`${slug}1`, `${slug}2`, `${slug}-br`, `${slug}-app`],
    };
  }

  // ── WIZARD ────────────────────────────────────────────────────
  async atualizarWizard(tenantId: string, dto: WizardPassoDto): Promise<Tenant> {
    const tenant = await this.repo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');
    const status = tenant.wizard_status || {};
    status[`passo${dto.passo}`] = dto.concluido;
    const todosConcluidos = [1, 2, 3, 4, 5].every(n => status[`passo${n}`] === true);
    await this.repo.update(tenantId, { wizard_status: status, wizard_concluido: todosConcluidos });
    return this.repo.findOne({ where: { id: tenantId } });
  }

  // ── ATUALIZAR CONFIGURAÇÕES OPERACIONAIS (Sprint 11) ──────────
  async atualizarConfiguracoes(tenantId: string, dto: {
    nome_exibicao?:        string;
    fuso_horario?:         string;
    logo_url?:             string;
    dias_alerta_maquina?:  number;
    tempo_inatividade_min?: number;
  }): Promise<Tenant> {
    const tenant = await this.repo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');
    // Valida slug apenas se vier no dto
    await this.repo.update(tenantId, dto as any);
    return this.repo.findOne({ where: { id: tenantId } });
  }

  // ── SUPER ADMIN: listar todos ─────────────────────────────────
  async listarTodos(): Promise<Tenant[]> {
    return this.repo.find({ order: { criado_em: 'DESC' } });
  }

  // ── SUPER ADMIN: métricas globais ─────────────────────────────
  async metricas(): Promise<{
    total: number; ativos: number; trials: number; suspensos: number; cancelados: number;
    mrr_estimado: number; por_plano: Record<string, number>;
  }> {
    const tenants   = await this.repo.find();
    const ativos    = tenants.filter(t => t.status === 'ativo').length;
    const trials    = tenants.filter(t => t.status === 'trial').length;
    const suspensos = tenants.filter(t => t.status === 'suspenso').length;
    const cancelados= tenants.filter(t => t.status === 'cancelado').length;
    // Antes: somava o preco cheio da tabela e ignorava desconto_percentual,
    // o que inflava o MRR de todo tenant com desconto comercial.
    const mrr       = mrrTotal(tenants);

    return {
      total: tenants.length, ativos, trials, suspensos, cancelados,
      mrr_estimado: mrr,
      por_plano: {
        starter:    tenants.filter(t => t.plano === 'starter').length,
        pro:        tenants.filter(t => t.plano === 'pro').length,
        enterprise: tenants.filter(t => t.plano === 'enterprise').length,
      },
    };
  }

  // ── SUPER ADMIN: alterar status ───────────────────────────────
  async atualizarStatus(id: string, status: 'ativo' | 'suspenso' | 'cancelado'): Promise<Tenant> {
    await this.repo.findOne({ where: { id } }).then(t => {
      if (!t) throw new NotFoundException('Tenant não encontrado.');
    });
    await this.repo.update(id, { status });
    return this.repo.findOne({ where: { id } });
  }

  // ── SUPER ADMIN: alterar plano ────────────────────────────────
  async atualizarPlano(id: string, plano: 'starter' | 'pro' | 'enterprise'): Promise<Tenant> {
    await this.repo.findOne({ where: { id } }).then(t => {
      if (!t) throw new NotFoundException('Tenant não encontrado.');
    });
    const limites = LIMITES_PLANO[plano];
    await this.repo.update(id, { plano, ...limites });
    return this.repo.findOne({ where: { id } });
  }

  // ── VALIDAÇÃO CNPJ (módulo 11) ────────────────────────────────
  private validarCnpj(cnpj: string): boolean {
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    const calc = (s: string, n: number) => {
      let soma = 0; let pos = n - 7;
      for (let i = n; i >= 1; i--) { soma += parseInt(s[n - i]) * pos--; if (pos < 2) pos = 9; }
      return soma % 11 < 2 ? 0 : 11 - (soma % 11);
    };
    return calc(cnpj, 12) === parseInt(cnpj[12]) && calc(cnpj, 13) === parseInt(cnpj[13]);
  }
}
