import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn,
} from 'typeorm';

export type TipoAtividade = 'conta_fixa' | 'leitura_comodato' | 'atividade_interna';

@Entity('atividade_modelo')
export class AtividadeModelo {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({
    type: 'enum',
    enum: ['conta_fixa', 'leitura_comodato', 'atividade_interna'],
    default: 'conta_fixa',
  })
  tipo: TipoAtividade;

  @Column({ length: 200 })
  descricao: string;

  @Column({ name: 'dia_vencimento', type: 'smallint', unsigned: true, nullable: true })
  dia_vencimento: number | null;

  @Column({ name: 'valor_referencia', type: 'decimal', precision: 12, scale: 2, nullable: true })
  valor_referencia: number | null;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  recorrente: boolean;

  @Column({ type: 'smallint', unsigned: true, default: 0 })
  ordem: number;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  ativo: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;
}
