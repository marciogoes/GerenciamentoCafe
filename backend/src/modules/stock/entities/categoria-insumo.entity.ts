import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * ERR-14 CORRIGIDO: Tabela de categorias de insumo configurável por tenant.
 * Substitui o ENUM fixo (cappuccino, chocolate...) da entidade Produto,
 * tornando o sistema compatível com qualquer nicho de vending (RF-E10).
 */
@Entity('categoria_insumo')
export class CategoriaInsumo {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  /** Nome da categoria, ex.: 'Café', 'Snack', 'Bebida Fria', 'Descartável' */
  @Column({ length: 100 })
  nome: string;

  /** Ordem de exibição na interface */
  @Column({ name: 'ordem', type: 'int', default: 0 })
  ordem: number;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
