import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type SituacaoLancamento = 'pendente' | 'pago' | 'vencido' | 'cancelado';
export type OrigemLancamento   = 'automatico' | 'manual';
export type TipoReceita        = 'locacao' | 'doses' | 'servico' | 'insumos' | 'evento';

@Entity('lancamento_mensal')
export class LancamentoMensal {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({ name: 'contrato_id', type: 'char', length: 36 })
  contrato_id: string;

  /** Primeiro dia do mês de referência: ex. 2026-03-01 */
  @Column({ name: 'competencia', type: 'date' })
  competencia: string;

  /** Sprint 14 — Categoria da receita para breakdown no dashboard */
  @Column({
    name: 'tipo_receita',
    type: 'enum',
    enum: ['locacao', 'doses', 'servico', 'insumos', 'evento'],
    default: 'locacao',
  })
  tipo_receita: TipoReceita;

  /** Sprint 14 — Breakdown detalhado opcional (JSON) */
  @Column({ name: 'valor_breakdown', type: 'json', nullable: true })
  valor_breakdown: Record<string, number> | null;

  @Column({ name: 'valor', type: 'decimal', precision: 12, scale: 2 })
  valor: number;

  @Column({ name: 'data_emissao', type: 'date' })
  data_emissao: string;

  @Column({ name: 'data_vencimento', type: 'date' })
  data_vencimento: string;

  @Column({ name: 'nf_locacao', length: 50, nullable: true })
  nf_locacao: string | null;

  @Column({ name: 'nf_insumos', length: 50, nullable: true })
  nf_insumos: string | null;

  @Column({ name: 'boleto_codigo', length: 200, nullable: true })
  boleto_codigo: string | null;

  @Column({ name: 'valor_pago', type: 'decimal', precision: 12, scale: 2, nullable: true })
  valor_pago: number | null;

  @Column({ name: 'data_pagamento', type: 'date', nullable: true })
  data_pagamento: string | null;

  @Column({ name: 'data_credito', type: 'date', nullable: true })
  data_credito: string | null;

  @Column({
    type: 'enum',
    enum: ['pendente', 'pago', 'vencido', 'cancelado'],
    default: 'pendente',
  })
  situacao: SituacaoLancamento;

  @Column({
    type: 'enum',
    enum: ['automatico', 'manual'],
    default: 'manual',
  })
  origem: OrigemLancamento;

  @Column({ type: 'text', nullable: true })
  observacao: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
