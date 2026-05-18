import {
  Entity, PrimaryColumn, Column, CreateDateColumn,
} from 'typeorm';

// ERR-14 CORRIGIDO: ENUM fixo removido — era específico de café e incompatível
// com o propósito generalista do SaaS. Substituiu por VARCHAR dinâmico via
// categoria_id (FK para tabela categoria_insumo, gerenciada por cada tenant).

@Entity('produto')
export class Produto {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({ length: 10 })
  codigo: string;

  @Column({ length: 200 })
  descricao: string;

  @Column({ length: 100, nullable: true })
  marca: string;

  // ERR-14: categoria_id substitui o ENUM fixo. FK para categoria_insumo.
  @Column({ name: 'categoria_id', type: 'char', length: 36, nullable: true })
  categoria_id: string | null;

  /** Fallback legado — preenchido apenas em registros antigos migrados do ENUM */
  @Column({ name: 'categoria_legado', length: 50, nullable: true })
  categoria_legado: string | null;

  @Column({ length: 10 })
  unidade: string;

  @Column({ name: 'valor_unitario', type: 'decimal', precision: 12, scale: 4 })
  valor_unitario: number;

  @Column({ type: 'date', nullable: true })
  validade: string;

  @Column({ name: 'estoque_minimo', type: 'decimal', precision: 10, scale: 3, nullable: true })
  estoque_minimo: number;

  @Column({ name: 'alerta_enviado_em', type: 'date', nullable: true })
  alerta_enviado_em: string;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;
}
