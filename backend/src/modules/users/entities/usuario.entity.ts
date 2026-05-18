import {
  Entity, PrimaryColumn, Column, CreateDateColumn,
} from 'typeorm';

export type Perfil = 'super_admin' | 'admin' | 'financeiro' | 'operacional' | 'consulta';

@Entity('usuario')
export class Usuario {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({ length: 150 })
  nome: string;

  @Column({ length: 255 })
  email: string;

  /** select: false — não retorna em queries comuns */
  @Column({ name: 'senha_hash', length: 255, select: false })
  senha_hash: string;

  @Column({
    type: 'enum',
    enum: ['super_admin', 'admin', 'financeiro', 'operacional', 'consulta'],
    default: 'operacional',
  })
  perfil: Perfil;

  @Column({ default: true })
  ativo: boolean;

  @Column({ name: '2fa_ativo', default: false })
  dois_fa_ativo: boolean;

  @Column({ name: '2fa_secret', length: 100, nullable: true, select: false })
  dois_fa_secret: string | null;

  @Column({ name: 'tentativas_login', type: 'int', default: 0 })
  tentativas_login: number;

  @Column({ name: 'bloqueado_ate', type: 'datetime', nullable: true })
  bloqueado_ate: Date | null;

  /** Sprint 9: token de convite (UUID gerado ao convidar, null após aceitar) */
  @Column({ name: 'token_convite', length: 100, nullable: true })
  token_convite: string | null;

  /** Sprint 9: expiração do convite (RN-U01: 48h) */
  @Column({ name: 'token_expira_em', type: 'datetime', nullable: true })
  token_expira_em: Date | null;

  @Column({ name: 'ultimo_login', type: 'datetime', nullable: true })
  ultimo_login: Date | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;
}
