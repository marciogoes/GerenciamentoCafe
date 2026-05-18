import {
  Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type CategoriaGasto =
  | 'aluguel' | 'energia' | 'agua' | 'contabilidade'
  | 'folha' | 'impostos' | 'combustivel' | 'manutencao'
  | 'fornecedor' | 'telefone' | 'software' | 'outros';

export type SituacaoGasto = 'pendente' | 'pago' | 'cancelado';

@Entity('gasto')
export class Gasto {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  tenant_id: string;

  @Column({
    type: 'enum',
    enum: ['aluguel','energia','agua','contabilidade','folha','impostos',
           'combustivel','manutencao','fornecedor','telefone','software','outros'],
    default: 'outros',
  })
  categoria: CategoriaGasto;

  @Column({ type: 'varchar', length: 200 })
  descricao: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  fornecedor: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  valor: number;

  @Column({ type: 'date' })
  competencia: string;

  @Column({ type: 'date', nullable: true })
  data_vencimento: string | null;

  @Column({ type: 'date', nullable: true })
  data_pagamento: string | null;

  @Column({
    type: 'enum',
    enum: ['pendente', 'pago', 'cancelado'],
    default: 'pendente',
  })
  situacao: SituacaoGasto;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nota_fiscal: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  observacao: string | null;

  @Column({ type: 'tinyint', default: 0 })
  recorrente: boolean;

  @Column({ type: 'char', length: 36, nullable: true })
  usuario_id: string | null;

  @CreateDateColumn()
  criado_em: Date;

  @UpdateDateColumn()
  atualizado_em: Date;
}
