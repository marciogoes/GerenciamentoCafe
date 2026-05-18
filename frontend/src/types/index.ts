// ── Perfis de acesso ──────────────────────────────────────────
export type Perfil = 'super_admin' | 'admin' | 'financeiro' | 'operacional' | 'consulta';

// ── Planos e status do tenant ─────────────────────────────────
export type PlanoTenant  = 'starter' | 'pro' | 'enterprise';
export type StatusTenant = 'trial' | 'ativo' | 'suspenso' | 'cancelado';

// ── Usuário autenticado ───────────────────────────────────────
export interface Usuario {
  id:       string;
  nome:     string;
  email:    string;
  perfil:   Perfil;
  tenantId: string;
  dois_fa:  boolean;
}

// ── Tenant (empresa) ──────────────────────────────────────────
export interface Tenant {
  id:               string;
  slug:             string;
  razao_social:     string;
  nome_exibicao:    string | null;
  cnpj:             string;
  email_admin:      string;
  telefone:         string | null;
  plano:            PlanoTenant;
  status:           StatusTenant;
  trial_ate:        string | null;
  logo_url:         string | null;
  fuso_horario:     string;
  email_verificado: boolean;
  wizard_status:    Record<string, boolean> | null;
  wizard_concluido: boolean;
  max_usuarios:     number;
  max_maquinas:     number;
  max_contratos:    number;
  criado_em:        string;
  atualizado_em:    string;
}

// ── Auth ──────────────────────────────────────────────────────
export interface LoginResponse {
  requer2FA:      boolean;
  tokenTemp?:     string;
  access_token?:  string;
  refresh_token?: string;
  usuario?:       Usuario;
  mensagem?:      string;
}

// ── Dashboard ─────────────────────────────────────────────────
export interface KpiMaquinas {
  total:         number;
  aptas:         number;
  em_locacao:    number;
  em_manutencao: number;
  em_evento:     number;
}

export interface KpiReceita {
  recebido:    number;
  faturado:    number;
  lancamentos: number;
  ticket_medio: number;
}

export interface KpiInadimplencia {
  valor_total: number;
  qtd_boletos: number;
}

export interface KpiEstoque {
  total_produtos:  number;
  valor_total:     number;
  produtos_alerta: number;
}

export interface KpiContratos {
  total:      number;
  ativos:     number;
  encerrados: number;
  suspensos:  number;
}

export interface DashboardKpis {
  periodo:       { dataInicio: string; dataFim: string; label: string };
  maquinas:      KpiMaquinas;
  receita:       KpiReceita;
  inadimplencia: KpiInadimplencia;
  estoque:       KpiEstoque;
  doses:         { total: number };
  contratos:     KpiContratos;
}

export interface GraficoPonto {
  mes:           string;
  mes_label:     string;
  receita?:      number;
  faturado?:     number;
  qtd_contratos?:number;
  em_locacao?:   number;
  disponivel?:   number;
}

export interface AlertaBoleto {
  id:               string;
  cliente:          string;
  valor:            number;
  data_vencimento:  string;
  dias_atraso:      number;
}

export interface AlertaEstoque {
  id:             string;
  descricao:      string;
  categoria:      string;
  saldo_atual:    number;
  estoque_minimo: number;
  unidade:        string;
}

export interface AlertaMaquina {
  id:         string;
  patrimonio: string;
  destino:    string;
  dias_fora:  number;
}

export interface DashboardAlertas {
  total:                 number;
  boletos_vencidos:      AlertaBoleto[];
  estoque_baixo:         AlertaEstoque[];
  maquinas_sem_retorno:  AlertaMaquina[];
}

// ── Catálogo de Modelos ───────────────────────────────────────
export type CategoriaModelo = 'bebidas' | 'snacks' | 'combinado' | 'outros';

export interface ModeloCatalogo {
  id:             string;
  tenant_id:      string;
  nome:           string;
  categoria:      CategoriaModelo;
  bebidas:        string | null;
  especificacoes: string | null;
  foto_url:       string | null;
  ativo:          boolean;
  criado_em:      string;
  atualizado_em:  string;
}

// ── Máquinas ──────────────────────────────────────────────────
export type SituacaoMaquina =
  | 'apta'
  | 'em_locacao'
  | 'manutencao'
  | 'evento'
  | 'nao_localizada'
  | 'desativada';

export const SITUACAO_LABEL: Record<SituacaoMaquina, string> = {
  apta:           'Apta',
  em_locacao:     'Em Locação',
  manutencao:     'Em Manutenção',
  evento:         'Em Evento',
  nao_localizada: 'Não Localizada',
  desativada:     'Desativada',
};

export const SITUACAO_COLOR: Record<SituacaoMaquina, string> = {
  apta:           'bg-green-100 text-green-800',
  em_locacao:     'bg-blue-100 text-blue-800',
  manutencao:     'bg-yellow-100 text-yellow-800',
  evento:         'bg-purple-100 text-purple-800',
  nao_localizada: 'bg-red-100 text-red-800',
  desativada:     'bg-gray-100 text-gray-500',
};

export interface Maquina {
  id:                string;
  tenant_id:         string;
  patrimonio:        string;
  modelo_id:         string | null;
  modelo_nome?:      string | null;
  modelo_categoria?: CategoriaModelo | null;
  modelo_foto?:      string | null;
  numero_serie:      string | null;
  nota_fiscal:       string | null;
  fornecedor:        string | null;
  valor_aquisicao:   number | null;
  data_registro:     string | null;
  situacao:          SituacaoMaquina;
  localizacao_atual: string | null;
  // ERR-04: contrato_ativo_id removido — causava referência circular
  // O contrato ativo é derivado via query e não armazenado na entidade
  observacao:        string | null;
  criado_em:         string;
  atualizado_em:     string;
}

export interface MovimentacaoMaquina {
  id:                  string;
  tenant_id:           string;
  maquina_id:          string;
  data_saida:          string;
  hora_saida:          string | null;
  cliente_id:          string | null;
  local:               string | null;
  // ERR-11: contrato_os dividido em dois campos
  contrato_id:         string | null;   // FK para contrato.id
  os_referencia:       string | null;   // número de OS externa (texto livre)
  responsavel_id:      string | null;
  ocorrencia:          string | null;
  data_retorno:        string | null;
  hora_retorno:        string | null;
  periodo_dias:        number | null;
  ocorrencia_retorno:  string | null;
  criado_em:           string;
}

export interface MaquinaCompleta extends Maquina {
  modelo:              ModeloCatalogo | null;
  movimentacao_aberta: MovimentacaoMaquina | null;
  historico:           MovimentacaoMaquina[];
}

export interface MaquinaForaDaBase {
  movimentacao_id: string;
  maquina_id:      string;
  patrimonio:      string;
  situacao:        SituacaoMaquina;
  localizacao:     string | null;
  cliente_id:      string | null;
  data_saida:      string;
  // ERR-11: contrato_os dividido em dois campos
  contrato_id:     string | null;   // FK para contrato.id
  os_referencia:   string | null;   // número de OS externa
  dias_fora:       number;
  alerta:          boolean;
}

// ── Clientes ─────────────────────────────────────────────────
export interface Cliente {
  id:               string;
  tenant_id:        string;
  razao_social:     string;
  cnpj:             string;
  endereco:         string | null;
  segmento:         string | null;
  contato_nome:     string | null;
  contato_email:    string | null;
  contato_telefone: string | null;
  ativo:            boolean;
  criado_em:        string;
  atualizado_em:    string;
  // Enriquecido pela API
  contratos?:           Contrato[];
  lancamentos_abertos?: LancamentoMensal[];
}

// ── Contratos ─────────────────────────────────────────────────
export type TipoContrato     = 'locacao' | 'comodato' | 'evento';
export type SituacaoContrato = 'ativo' | 'encerrado' | 'suspenso';

export const TIPO_CONTRATO_LABEL: Record<TipoContrato, string> = {
  locacao:  'Locação',
  comodato: 'Comodato',
  evento:   'Evento',
};

export const SITUACAO_CONTRATO_LABEL: Record<SituacaoContrato, string> = {
  ativo:     'Ativo',
  encerrado: 'Encerrado',
  suspenso:  'Suspenso',
};

export const SITUACAO_CONTRATO_COLOR: Record<SituacaoContrato, string> = {
  ativo:     'bg-green-100 text-green-800',
  encerrado: 'bg-gray-100 text-gray-500',
  suspenso:  'bg-yellow-100 text-yellow-800',
};

export interface Contrato {
  id:                  string;
  tenant_id:           string;
  cliente_id:          string;
  cliente_nome?:       string;
  cliente_cnpj?:       string;
  maquina_id:          string | null;
  maquina_patrimonio?: string | null;
  tipo:                TipoContrato;
  valor_mensal:        number;
  data_assinatura:     string;
  data_inicio:         string;
  data_fim:            string | null;
  situacao:            SituacaoContrato;
  dia_vencimento:      number;
  ultimo_reajuste_em:  string | null;
  indice_reajuste:     string | null;
  observacao:          string | null;
  criado_em:           string;
  // Enriquecido:
  reajustes?:          ReajusteContratual[];
  lancamentos?:        LancamentoMensal[];
}

// ── Lançamentos Mensais ───────────────────────────────────────
export type SituacaoLancamento = 'pendente' | 'pago' | 'vencido' | 'cancelado';

// Sprint 14 — tipo de receita para breakdown
export type TipoReceita = 'locacao' | 'doses' | 'servico' | 'insumos' | 'evento';

export const TIPO_RECEITA_LABEL: Record<TipoReceita, string> = {
  locacao: 'Locação',
  doses:   'Doses',
  servico: 'Serviço',
  insumos: 'Insumos',
  evento:  'Evento',
};

export const TIPO_RECEITA_COLOR: Record<TipoReceita, string> = {
  locacao: 'bg-blue-100 text-blue-700',
  doses:   'bg-green-100 text-green-700',
  servico: 'bg-amber-100 text-amber-700',
  insumos: 'bg-orange-100 text-orange-700',
  evento:  'bg-purple-100 text-purple-700',
};

export const SITUACAO_LANCAMENTO_LABEL: Record<SituacaoLancamento, string> = {
  pendente:  'Pendente',
  pago:      'Pago',
  vencido:   'Vencido',
  cancelado: 'Cancelado',
};

export const SITUACAO_LANCAMENTO_COLOR: Record<SituacaoLancamento, string> = {
  pendente:  'bg-yellow-100 text-yellow-800',
  pago:      'bg-green-100 text-green-800',
  vencido:   'bg-red-100 text-red-800',
  cancelado: 'bg-gray-100 text-gray-400',
};

export interface LancamentoMensal {
  id:               string;
  tenant_id:        string;
  contrato_id:      string;
  competencia:      string;
  valor:            number;
  data_emissao:     string;
  data_vencimento:  string;
  nf_locacao:       string | null;
  nf_insumos:       string | null;
  boleto_codigo:    string | null;
  valor_pago:       number | null;
  data_pagamento:   string | null;
  data_credito:     string | null;
  situacao:         SituacaoLancamento;
  origem:           'automatico' | 'manual';
  observacao:       string | null;
  criado_em:        string;
  // Enriquecido:
  cliente_id?:          string;
  cliente_nome?:        string;
  cliente_email?:       string;
  maquina_patrimonio?:  string | null;
  tipo_contrato?:       TipoContrato;
  tipo_receita?:        TipoReceita;
  dias_atraso?:         number;
  alerta_vermelho?:     boolean;
}

export interface GerarLancamentosResult {
  gerados:     number;
  competencia: string;
  valor_total: number;
}

// ── Reajuste Contratual ───────────────────────────────────────
export interface ReajusteContratual {
  id:             string;
  tenant_id:      string;
  contrato_id:    string;
  indice:         string;
  percentual:     number;
  valor_anterior: number;
  valor_novo:     number;
  data_vigencia:  string;
  usuario_id:     string;
  criado_em:      string;
}

export interface PreviewReajuste {
  valor_anterior: number;
  valor_novo:     number;
  diferenca:      number;
  percentual:     number;
  data_vigencia:  string;
  historico_id:   string;
}

// ── Inadimplência ─────────────────────────────────────────────
export interface ItemInadimplencia {
  cliente_id:             string;
  cliente_nome:           string;
  cliente_email:          string | null;
  cliente_telefone:       string | null;
  qtd_boletos:            number;
  valor_total:            number;
  vencimento_mais_antigo: string;
  maior_atraso_dias:      number;
  aging:                  '0-30' | '31-60' | '60+';
}

// ── Estoque ──────────────────────────────────────────────────
export type CategoriaProduto =
  | 'cappuccino' | 'chocolate' | 'cafe_graos'
  | 'cafe_leite' | 'descartavel' | 'outros';

export type SituacaoProduto = 'normal' | 'baixo' | 'zerado';

export interface Produto {
  id:               string;
  tenant_id:        string;
  codigo:           string;
  descricao:        string;
  marca:            string | null;
  categoria:        CategoriaProduto;
  unidade:          string;
  valor_unitario:   number;
  validade:         string | null;
  estoque_minimo:   number | null;
  ativo:            boolean;
  criado_em:        string;
  saldo_atual:      number;
  valor_em_estoque: number;
  situacao:         SituacaoProduto;
}

export interface MovimentacaoEstoque {
  id:           string;
  tenant_id:    string;
  produto_id:   string;
  produto_desc: string;
  produto_cod:  string;
  unidade:      string;
  categoria:    CategoriaProduto;
  data:         string;
  tipo:         'entrada' | 'saida';
  quantidade:   number;
  origem:       string | null;
  nota_fiscal:  string | null;
  usuario_id:   string;
  observacao:   string | null;
  criado_em:    string;
}

export interface ResumoEstoque {
  valor_total:  number;
  qtd_produtos: number;
  em_alerta:    number;
  zerados:      number;
}

export interface RelatorioEstoque {
  data_inicio:  string | null;
  data_fim:     string | null;
  total_valor:  number;
  qtd_produtos: number;
  em_alerta:    number;
  itens: (Produto & { entradas_periodo: number; saidas_periodo: number })[];
}

// ── Usuários (Sprint 9) ───────────────────────────────────────────
export const PERFIL_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin:       'Administrador',
  financeiro:  'Financeiro',
  operacional: 'Operacional',
  consulta:    'Consulta',
};

export const PERFIL_COLOR: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-800',
  admin:       'bg-purple-100 text-purple-800',
  financeiro:  'bg-blue-100 text-blue-800',
  operacional: 'bg-green-100 text-green-800',
  consulta:    'bg-gray-100 text-gray-600',
};

export interface UsuarioItem {
  id:              string;
  nome:            string;
  email:           string;
  perfil:          Perfil;
  ativo:           boolean;
  dois_fa_ativo:   boolean;
  ultimo_login:    string | null;
  criado_em:       string;
  token_convite:   string | null;   // null = convite já aceito
  token_expira_em: string | null;
  pendente:        boolean;         // convite enviado, não aceito
}

// ── Audit Log (Sprint 9) ───────────────────────────────────────
export interface LogAuditoria {
  id:           string;
  tenant_id:    string;
  usuario_id:   string | null;
  usuario_nome: string | null;
  acao:         string;
  modulo:       string;
  entidade_id:  string | null;
  descricao:    string | null;
  ip:           string | null;
  criado_em:    string;
}

export interface PaginacaoAuditoria {
  itens:        LogAuditoria[];
  total:        number;
  pagina:       number;
  porPagina:    number;
  totalPaginas: number;
}

export const MODULO_LABEL: Record<string, string> = {
  auth:      'Autenticação',
  users:     'Usuários',
  machines:  'Máquinas',
  contracts: 'Contratos',
  stock:     'Estoque',
  system:    'Sistema',
  reports:   'Relatórios',
};

export const MODULO_COLOR: Record<string, string> = {
  auth:      'bg-slate-100 text-slate-700',
  users:     'bg-violet-100 text-violet-700',
  machines:  'bg-orange-100 text-orange-700',
  contracts: 'bg-blue-100 text-blue-700',
  stock:     'bg-green-100 text-green-700',
  system:    'bg-gray-100 text-gray-700',
  reports:   'bg-indigo-100 text-indigo-700',
};

// ── Doses (Sprint 13) ───────────────────────────────────────
export interface LeituraDoses {
  id:                   string;
  tenant_id:            string;
  contrato_id:          string;
  maquina_id:           string | null;
  cliente_id:           string;
  competencia:          string;
  dose_inicial:         number;
  dose_final:           number;
  total_doses:          number;
  enviado_contratante:  boolean;
  data_envio:           string | null;
  observacao:           string | null;
  criado_em:            string;
  // enriquecidos
  cliente_nome?:        string;
  contrato_tipo?:       TipoContrato;
  contrato_valor?:      number;
  maquina_patrimonio?:  string | null;
}

// ── Gastos (Sprint 13) ───────────────────────────────────────
export type CategoriaGasto =
  | 'aluguel' | 'energia' | 'agua' | 'contabilidade'
  | 'folha' | 'impostos' | 'combustivel' | 'manutencao'
  | 'fornecedor' | 'telefone' | 'software' | 'outros';

export type SituacaoGasto = 'pendente' | 'pago' | 'cancelado';

export const CATEGORIA_GASTO_LABEL: Record<CategoriaGasto, string> = {
  aluguel:       'Aluguel',
  energia:       'Energia Elétrica',
  agua:          'Água',
  contabilidade: 'Contabilidade',
  folha:         'Folha de Pagamento',
  impostos:      'Impostos / Taxas',
  combustivel:   'Combustível',
  manutencao:    'Manutenção',
  fornecedor:    'Fornecedor',
  telefone:      'Telefone / Internet',
  software:      'Software / Assinatura',
  outros:        'Outros',
};

export const CATEGORIA_GASTO_COLOR: Record<CategoriaGasto, string> = {
  aluguel:       'bg-blue-100 text-blue-800',
  energia:       'bg-yellow-100 text-yellow-800',
  agua:          'bg-cyan-100 text-cyan-800',
  contabilidade: 'bg-purple-100 text-purple-800',
  folha:         'bg-green-100 text-green-800',
  impostos:      'bg-red-100 text-red-800',
  combustivel:   'bg-orange-100 text-orange-800',
  manutencao:    'bg-amber-100 text-amber-800',
  fornecedor:    'bg-indigo-100 text-indigo-800',
  telefone:      'bg-teal-100 text-teal-800',
  software:      'bg-violet-100 text-violet-800',
  outros:        'bg-gray-100 text-gray-700',
};

export const SITUACAO_GASTO_LABEL: Record<SituacaoGasto, string> = {
  pendente:  'Pendente',
  pago:      'Pago',
  cancelado: 'Cancelado',
};

export const SITUACAO_GASTO_COLOR: Record<SituacaoGasto, string> = {
  pendente:  'bg-yellow-100 text-yellow-800',
  pago:      'bg-green-100 text-green-800',
  cancelado: 'bg-gray-100 text-gray-400',
};

export interface Gasto {
  id:              string;
  tenant_id:       string;
  categoria:       CategoriaGasto;
  descricao:       string;
  fornecedor:      string | null;
  valor:           number;
  competencia:     string;
  data_vencimento: string | null;
  data_pagamento:  string | null;
  situacao:        SituacaoGasto;
  nota_fiscal:     string | null;
  observacao:      string | null;
  recorrente:      boolean;
  criado_em:       string;
}

export interface KpiGastos {
  competencia:     string;
  total_geral:     number;
  total_pago:      number;
  total_pendente:  number;
  por_categoria:   { categoria: CategoriaGasto; total: number; pago: number; pendente: number; qtd: number }[];
}

export interface EvolucaoGasto {
  mes:       string;
  mes_label: string;
  total:     number;
  pago:      number;
}

// ── Manutenção (Sprint 15) ──────────────────────────────────
export type TipoManutencao      = 'preventiva' | 'corretiva' | 'instalacao' | 'limpeza' | 'outros';
export type SituacaoManutencao  = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada';
export type PrioridadeManutencao = 'baixa' | 'media' | 'alta' | 'urgente';

export interface Manutencao {
  id:                 string;
  tenant_id:          string;
  maquina_id:         string;
  maquina_patrimonio: string | null;
  maquina_situacao:   string | null;
  titulo:             string;
  descricao:          string | null;
  tipo:               TipoManutencao;
  situacao:           SituacaoManutencao;
  prioridade:         PrioridadeManutencao;
  data_abertura:      string;
  data_inicio:        string | null;
  data_conclusao:     string | null;
  tecnico:            string | null;
  fornecedor:         string | null;
  custo_pecas:        number;
  custo_mao_obra:     number;
  custo_total:        number;
  nota_fiscal:        string | null;
  observacao:         string | null;
  usuario_id:         string | null;
  criado_em:          string;
}

export interface KpiManutencao {
  total:               number;
  abertas:             number;
  em_andamento:        number;
  concluidas:          number;
  canceladas:          number;
  custo_total:         number;
  custo_concluidas:    number;
  maquinas_envolvidas: number;
  por_tipo:            { tipo: TipoManutencao; qtd: number; custo: number }[];
  evolucao_mensal:     { mes: string; mes_label: string; chamados: number; custo: number }[];
}

export const TIPO_MANUTENCAO_LABEL: Record<TipoManutencao, string> = {
  preventiva:  'Preventiva',
  corretiva:   'Corretiva',
  instalacao:  'Instalação',
  limpeza:     'Limpeza',
  outros:      'Outros',
};

export const SITUACAO_MANUTENCAO_LABEL: Record<SituacaoManutencao, string> = {
  aberta:       'Aberta',
  em_andamento: 'Em Andamento',
  concluida:    'Concluída',
  cancelada:    'Cancelada',
};

export const SITUACAO_MANUTENCAO_COLOR: Record<SituacaoManutencao, string> = {
  aberta:       'bg-blue-100 text-blue-800',
  em_andamento: 'bg-yellow-100 text-yellow-800',
  concluida:    'bg-green-100 text-green-800',
  cancelada:    'bg-gray-100 text-gray-500',
};

export const PRIORIDADE_MANUTENCAO_LABEL: Record<PrioridadeManutencao, string> = {
  baixa:   'Baixa',
  media:   'Média',
  alta:    'Alta',
  urgente: 'Urgente',
};

export const PRIORIDADE_MANUTENCAO_COLOR: Record<PrioridadeManutencao, string> = {
  baixa:   'bg-gray-100 text-gray-600',
  media:   'bg-blue-100 text-blue-700',
  alta:    'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700',
};

export interface ResumoFrota {
  apta:           number;
  em_locacao:     number;
  manutencao:     number;
  evento:         number;
  nao_localizada: number;
  desativada:     number;
}
