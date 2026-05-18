import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type SituacaoExecucao = 'pendente' | 'realizado' | 'nao_aplicavel';

@Entity('atividade_execucao')
export class AtividadeExecucao {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({ name: 'atividade_id', type: 'char', length: 36 })
  atividade_id: string;

  /** Sempre o primeiro dia do mês: 2026-03-01 */
  @Column({ name: 'competencia', type: 'date' })
  competencia: string;

  @Column({
    type: 'enum',
    enum: ['pendente', 'realizado', 'nao_aplicavel'],
    default: 'pendente',
  })
  situacao: SituacaoExecucao;

  @Column({ name: 'data_realizacao', type: 'date', nullable: true })
  data_realizacao: string | null;

  @Column({ name: 'valor_realizado', type: 'decimal', precision: 12, scale: 2, nullable: true })
  valor_realizado: number | null;

  @Column({ length: 500, nullable: true })
  observacao: string | null;

  @Column({ name: 'usuario_id', type: 'char', length: 36, nullable: true })
  usuario_id: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
