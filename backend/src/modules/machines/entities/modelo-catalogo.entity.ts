import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type CategoriaModelo = 'bebidas' | 'snacks' | 'combinado' | 'outros';

@Entity('modelo_catalogo')
export class ModeloCatalogo {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({ length: 150 })
  nome: string;

  @Column({
    type:    'enum',
    enum:    ['bebidas', 'snacks', 'combinado', 'outros'],
    default: 'bebidas',
  })
  categoria: CategoriaModelo;

  /** Lista de bebidas/produtos separados por vírgula */
  @Column({ type: 'text', nullable: true })
  bebidas: string;

  /** Especificações técnicas livres (potência, capacidade, tensão, etc.) */
  @Column({ name: 'especificacoes', type: 'text', nullable: true })
  especificacoes: string;

  @Column({ name: 'foto_url', length: 500, nullable: true })
  foto_url: string;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
