import {
  Entity, PrimaryColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('log_auditoria')
@Index('idx_la_tenant_criado', ['tenant_id', 'criado_em'])
export class LogAuditoria {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  /** NULL = ação do sistema (cron job) */
  @Column({ name: 'usuario_id', type: 'char', length: 36, nullable: true })
  usuario_id: string | null;

  @Column({ name: 'usuario_nome', length: 150, nullable: true })
  usuario_nome: string | null;

  /** Ex: LOGIN, USUARIO_CONVIDADO, BOLETO_PAGO, MAQUINA_SAIDA */
  @Column({ length: 100 })
  acao: string;

  /** Módulo origem: auth | users | machines | contracts | stock | system */
  @Column({ length: 50 })
  modulo: string;

  /** UUID ou código da entidade afetada (opcional) */
  @Column({ name: 'entidade_id', length: 100, nullable: true })
  entidade_id: string | null;

  /** Descrição livre em texto */
  @Column({ type: 'text', nullable: true })
  descricao: string | null;

  /** IP do cliente (IPv4 ou IPv6) */
  @Column({ length: 45, nullable: true })
  ip: string | null;

  @CreateDateColumn({ name: 'criado_em', type: 'datetime', precision: 3 })
  criado_em: Date;
}
