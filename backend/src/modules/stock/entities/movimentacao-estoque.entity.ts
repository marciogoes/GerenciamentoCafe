import {
  Entity, PrimaryColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('movimentacao_estoque')
export class MovimentacaoEstoque {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({ name: 'produto_id', type: 'char', length: 36 })
  produto_id: string;

  @Column({ type: 'date' })
  data: string;

  @Column({ type: 'enum', enum: ['entrada', 'saida'] })
  tipo: 'entrada' | 'saida';

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantidade: number;

  @Column({ length: 200, nullable: true })
  origem: string;

  @Column({ name: 'nota_fiscal', length: 50, nullable: true })
  nota_fiscal: string;

  @Column({ name: 'usuario_id', type: 'char', length: 36 })
  usuario_id: string;

  @Column({ type: 'text', nullable: true })
  observacao: string;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;
}
