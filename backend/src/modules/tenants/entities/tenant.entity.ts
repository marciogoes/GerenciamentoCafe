import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type PlanoTenant  = 'starter' | 'pro' | 'enterprise';
export type StatusTenant = 'trial' | 'ativo' | 'suspenso' | 'cancelado';

@Entity('tenant')
export class Tenant {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  // ── Identidade ────────────────────────────────────────────────
  @Column({ length: 60, unique: true })
  slug: string;

  @Column({ name: 'razao_social', length: 200 })
  razao_social: string;

  @Column({ type: 'char', length: 14, unique: true })
  cnpj: string;

  @Column({ name: 'email_admin', length: 255, unique: true })
  email_admin: string;

  @Column({ name: 'telefone', length: 20, nullable: true })
  telefone: string;

  // ── Plano e status ────────────────────────────────────────────
  @Column({ type: 'enum', enum: ['starter', 'pro', 'enterprise'], default: 'pro' })
  plano: PlanoTenant;

  @Column({ type: 'enum', enum: ['trial', 'ativo', 'suspenso', 'cancelado'], default: 'trial' })
  status: StatusTenant;

  @Column({ name: 'trial_ate', type: 'date', nullable: true })
  trial_ate: string;

  // ── Configuração visual ───────────────────────────────────────
  @Column({ name: 'nome_exibicao', length: 200, nullable: true })
  nome_exibicao: string;

  @Column({ name: 'logo_url', length: 500, nullable: true })
  logo_url: string;

  @Column({ name: 'dominio_proprio', length: 255, nullable: true })
  dominio_proprio: string;

  @Column({ name: 'fuso_horario', length: 60, default: 'America/Belem' })
  fuso_horario: string;

  // ── Verificação de e-mail ─────────────────────────────────────
  @Column({ name: 'email_verificado', default: false })
  email_verificado: boolean;

  @Column({ name: 'token_verificacao', length: 100, nullable: true, select: false })
  token_verificacao: string;

  @Column({ name: 'token_expira_em', type: 'datetime', nullable: true, select: false })
  token_expira_em: Date;

  // ── Onboarding wizard ─────────────────────────────────────────
  @Column({ name: 'wizard_status', type: 'json', nullable: true })
  wizard_status: Record<string, boolean>;

  @Column({ name: 'wizard_concluido', default: false })
  wizard_concluido: boolean;

  // ── Limites por plano ─────────────────────────────────────────
  @Column({ name: 'max_usuarios',  type: 'int', default: 20 })
  max_usuarios: number;

  @Column({ name: 'max_maquinas',  type: 'int', default: 200 })
  max_maquinas: number;

  @Column({ name: 'max_contratos', type: 'int', default: 0 })   // 0 = ilimitado
  max_contratos: number;

  // ── Configurações operacionais (Sprint 11) ────────────────────
  /** Dias sem retorno para disparar alerta de máquina (padrão: 30) */
  @Column({ name: 'dias_alerta_maquina', type: 'int', default: 30 })
  dias_alerta_maquina: number;

  /** Minutos de inatividade antes do logout automático (padrão: 60) */
  @Column({ name: 'tempo_inatividade_min', type: 'int', default: 60 })
  tempo_inatividade_min: number;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;

  // ── Desconto comercial (super admin / Sprint 17) ─────────────
  @Column({ name: 'desconto_percentual', type: 'decimal', precision: 5, scale: 2, nullable: true })
  desconto_percentual: number | null;

  @Column({ name: 'desconto_expira_em', type: 'date', nullable: true })
  desconto_expira_em: string | null;

  // ── Suspensão / aviso de exclusão (ERR-05) ────────────────
  @Column({ name: 'dias_alerta_suspenso', type: 'int', default: 30 })
  dias_alerta_suspenso: number;
}
