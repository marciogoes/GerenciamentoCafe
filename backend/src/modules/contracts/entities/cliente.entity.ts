import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('cliente')
export class Cliente {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({ name: 'razao_social', length: 200 })
  razao_social: string;

  @Column({ type: 'char', length: 14 })
  cnpj: string;

  @Column({ length: 500, nullable: true })
  endereco: string | null;

  @Column({ length: 100, nullable: true })
  segmento: string | null;

  @Column({ name: 'contato_nome', length: 150, nullable: true })
  contato_nome: string | null;

  @Column({ name: 'contato_email', length: 255, nullable: true })
  contato_email: string | null;

  @Column({ name: 'contato_telefone', length: 20, nullable: true })
  contato_telefone: string | null;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
