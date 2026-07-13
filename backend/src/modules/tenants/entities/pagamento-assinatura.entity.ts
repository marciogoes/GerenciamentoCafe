import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * ERR-24: cobranca do SaaS ao tenant, mes a mes.
 *
 * NAO confundir com lancamento_mensal — aquela e o tenant cobrando os clientes
 * dele. Esta e o Vending Manager cobrando o tenant.
 *
 * A assinatura (assinatura_tenant) diz quanto e quando. Esta tabela diz o que
 * foi efetivamente cobrado e o que foi pago. Sem ela nao existe inadimplencia:
 * so da para saber quem esta devendo se houver registro do que foi cobrado.
 */
@Entity('pagamento_assinatura')
export class PagamentoAssinatura {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({ name: 'assinatura_id', type: 'char', length: 36 })
  assinatura_id: string;

  /** Mes de referencia — sempre o dia 01 */
  @Column({ type: 'date' })
  competencia: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  valor: number;

  @Column({ name: 'data_vencimento', type: 'date' })
  data_vencimento: string;

  /** null = ainda em aberto */
  @Column({ name: 'data_pagamento', type: 'date', nullable: true })
  data_pagamento: string | null;

  /** pix, boleto, transferencia, dinheiro */
  @Column({ name: 'forma_pagamento', length: 30, nullable: true })
  forma_pagamento: string | null;

  @Column({ length: 500, nullable: true })
  observacao: string | null;

  /** Super admin que deu baixa no pagamento */
  @Column({ name: 'registrado_por', type: 'char', length: 36, nullable: true })
  registrado_por: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
