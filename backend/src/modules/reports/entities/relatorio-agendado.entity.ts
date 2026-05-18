import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type TipoRelatorio      = 'financeiro' | 'contratos' | 'estoque' | 'maquinas';
export type FrequenciaRelatorio = 'diario' | 'semanal' | 'mensal';

/**
 * ERR-21 CORRIGIDO: Entidade ausente no modelo de dados.
 * Suporta RF-R06 — agendamento de relatórios automáticos por e-mail.
 * Sem esta entidade não havia como persistir agendamentos nem disparar os jobs.
 */
@Entity('relatorio_agendado')
export class RelatorioAgendado {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({
    type: 'enum',
    enum: ['financeiro', 'contratos', 'estoque', 'maquinas'],
  })
  tipo: TipoRelatorio;

  @Column({
    type: 'enum',
    enum: ['diario', 'semanal', 'mensal'],
  })
  frequencia: FrequenciaRelatorio;

  /** JSON array de e-mails destinatários, ex.: ["a@b.com","c@d.com"] */
  @Column({ type: 'json' })
  destinatarios: string[];

  /** Próxima data/hora de envio */
  @Column({ name: 'proximo_envio', type: 'datetime' })
  proximo_envio: Date;

  /** Última vez que o relatório foi enviado */
  @Column({ name: 'ultimo_envio', type: 'datetime', nullable: true })
  ultimo_envio: Date | null;

  @Column({ default: true })
  ativo: boolean;

  /** FK para usuario.id — quem criou o agendamento */
  @Column({ name: 'criado_por', type: 'char', length: 36 })
  criado_por: string;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
