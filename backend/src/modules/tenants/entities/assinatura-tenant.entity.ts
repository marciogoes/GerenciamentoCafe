import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type PlanoAssinatura   = 'starter' | 'pro' | 'enterprise';
export type StatusAssinatura  = 'ativo' | 'inadimplente' | 'cancelado';

/**
 * ERR-24 CORRIGIDO: Entidade ausente no modelo de dados.
 * Registra o histórico de cobranças de assinatura do tenant ao SaaS (UC-12).
 * Diferente das cobranças dos clientes do tenant — esta é a cobrança
 * do próprio Vending Manager ao tenant.
 */
@Entity('assinatura_tenant')
export class AssinaturaTenant {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  /** FK para tenant.id */
  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({
    type: 'enum',
    enum: ['starter', 'pro', 'enterprise'],
  })
  plano: PlanoAssinatura;

  @Column({
    type: 'enum',
    enum: ['ativo', 'inadimplente', 'cancelado'],
    default: 'ativo',
  })
  status: StatusAssinatura;

  /** Nome do gateway de pagamento (stripe, asaas, pagarme) */
  @Column({ length: 50 })
  gateway: string;

  /** ID da assinatura no gateway externo */
  @Column({ name: 'gateway_subscription_id', length: 200, nullable: true })
  gateway_subscription_id: string | null;

  @Column({ name: 'valor_mensal', type: 'decimal', precision: 12, scale: 2 })
  valor_mensal: number;

  @Column({ name: 'data_inicio', type: 'date' })
  data_inicio: string;

  @Column({ name: 'proximo_vencimento', type: 'date' })
  proximo_vencimento: string;

  /** Preenchido quando o tenant cancela a assinatura */
  @Column({ name: 'cancelado_em', type: 'date', nullable: true })
  cancelado_em: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
