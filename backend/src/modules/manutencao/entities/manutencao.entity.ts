import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type TipoManutencao      = 'preventiva' | 'corretiva' | 'instalacao' | 'limpeza' | 'outros';
export type SituacaoManutencao  = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada';
export type PrioridadeManutencao = 'baixa' | 'media' | 'alta' | 'urgente';

@Entity('manutencao')
export class Manutencao {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({ name: 'maquina_id', type: 'char', length: 36 })
  maquina_id: string;

  @Column({ length: 200 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descricao: string | null;

  @Column({
    type: 'enum',
    enum: ['preventiva', 'corretiva', 'instalacao', 'limpeza', 'outros'],
    default: 'corretiva',
  })
  tipo: TipoManutencao;

  @Column({
    type: 'enum',
    enum: ['aberta', 'em_andamento', 'concluida', 'cancelada'],
    default: 'aberta',
  })
  situacao: SituacaoManutencao;

  @Column({
    type: 'enum',
    enum: ['baixa', 'media', 'alta', 'urgente'],
    default: 'media',
  })
  prioridade: PrioridadeManutencao;

  @Column({ name: 'data_abertura', type: 'date' })
  data_abertura: string;

  @Column({ name: 'data_inicio', type: 'date', nullable: true })
  data_inicio: string | null;

  @Column({ name: 'data_conclusao', type: 'date', nullable: true })
  data_conclusao: string | null;

  @Column({ length: 150, nullable: true })
  tecnico: string | null;

  @Column({ length: 200, nullable: true })
  fornecedor: string | null;

  @Column({ name: 'custo_pecas', type: 'decimal', precision: 12, scale: 2, default: 0 })
  custo_pecas: number;

  @Column({ name: 'custo_mao_obra', type: 'decimal', precision: 12, scale: 2, default: 0 })
  custo_mao_obra: number;

  @Column({ name: 'nota_fiscal', length: 50, nullable: true })
  nota_fiscal: string | null;

  @Column({ type: 'text', nullable: true })
  observacao: string | null;

  @Column({ name: 'usuario_id', type: 'char', length: 36, nullable: true })
  usuario_id: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
