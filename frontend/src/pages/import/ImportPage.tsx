import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Download, CheckCircle2, XCircle,
  AlertTriangle, FileSpreadsheet, ChevronRight,
  Loader2, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { importApi, getErrorMessage } from '../../services/api';

// ── Tipos ─────────────────────────────────────────────────────
type TipoImportacao = 'clientes' | 'maquinas' | 'estoque';

interface Erro { linha: number; campos: string; erro: string; }
interface ValidacaoResultado {
  tipo:          TipoImportacao;
  total_lido:    number;
  validos:       number;
  com_erro:      number;
  preview_dados: any[];
  erros:         Erro[];
}

// ── Configuração por tipo ─────────────────────────────────────
const CONFIG: Record<TipoImportacao, {
  label: string; cor: string; icon: string;
  descricao: string; campos: string[];
}> = {
  clientes: {
    label: 'Clientes',
    cor:   'blue',
    icon:  '🏢',
    descricao: 'Importa clientes corporativos com CNPJ, endereço e contatos.',
    campos: ['Razão Social *', 'CNPJ *', 'Endereço', 'Segmento', 'Contato Nome', 'Contato E-mail', 'Contato Telefone'],
  },
  maquinas: {
    label: 'Máquinas',
    cor:   'purple',
    icon:  '⚙️',
    descricao: 'Importa máquinas da frota com dados patrimoniais (situação inicial: Apta).',
    campos: ['Patrimônio *', 'Nº de Série', 'Fornecedor', 'Valor Aquisição', 'Data Registro', 'Nota Fiscal'],
  },
  estoque: {
    label: 'Estoque',
    cor:   'green',
    icon:  '📦',
    descricao: 'Importa produtos e lança o estoque inicial como entrada.',
    campos: ['Código *', 'Descrição *', 'Marca', 'Categoria *', 'Unidade *', 'Valor Unit. *', 'Qtd. Inicial', 'Estoque Mínimo'],
  },
};

const ETAPAS = ['Escolher tipo', 'Baixar template', 'Enviar arquivo', 'Revisar e confirmar', 'Concluído'];

// ═════════════════════════════════════════════════════════════════
export default function ImportPage() {
  const navigate = useNavigate();

  const [etapa, setEtapa]       = useState(0);
  const [tipo, setTipo]         = useState<TipoImportacao | null>(null);
  const [arquivo, setArquivo]   = useState<File | null>(null);
  const [validacao, setValidacao] = useState<ValidacaoResultado | null>(null);
  const [resultado, setResultado] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [mostrarErros, setMostrarErros] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Handlers ────────────────────────────────────────────────

  const baixarTemplate = async () => {
    if (!tipo) return;
    try {
      const blob = await importApi.template(tipo);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `template-importacao-${tipo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Template baixado com sucesso!');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      toast.error('Apenas arquivos .xlsx são aceitos.');
      return;
    }
    setArquivo(f);
  };

  const validarArquivo = async () => {
    if (!arquivo || !tipo) return;
    setCarregando(true);
    try {
      const res = await importApi.validar(tipo, arquivo);
      setValidacao(res);
      setEtapa(3);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  };

  const confirmarImportacao = async () => {
    if (!validacao || !tipo) return;
    setCarregando(true);
    try {
      const res = await importApi.confirmar(tipo, validacao.preview_dados);
      setResultado(res);
      setEtapa(4);
      toast.success(res.mensagem);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  };

  const reiniciar = () => {
    setEtapa(0);
    setTipo(null);
    setArquivo(null);
    setValidacao(null);
    setResultado(null);
    setMostrarErros(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <div>
        <button onClick={() => navigate('/')} className="text-sm text-blue-600 hover:underline mb-1 block">
          ← Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Importação de Dados</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Migre seus dados de planilhas legadas para o sistema em poucos cliques.
        </p>
      </div>

      {/* Barra de progresso */}
      <div className="flex items-center gap-0">
        {ETAPAS.map((nome, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                i < etapa  ? 'bg-green-500 border-green-500 text-white'
              : i === etapa ? 'bg-blue-600 border-blue-600 text-white'
              :               'bg-white border-gray-300 text-gray-400'
              }`}>
                {i < etapa ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 hidden sm:block ${i === etapa ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                {nome}
              </span>
            </div>
            {i < ETAPAS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < etapa ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Etapa 0: Escolher tipo ─────────────────────────── */}
      {etapa === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">O que deseja importar?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.entries(CONFIG) as [TipoImportacao, typeof CONFIG['clientes']][]).map(([t, cfg]) => (
              <button
                key={t}
                onClick={() => { setTipo(t); setEtapa(1); }}
                className="text-left bg-white border-2 border-gray-200 hover:border-blue-400 rounded-2xl p-5 transition-all hover:shadow-md group"
              >
                <div className="text-3xl mb-3">{cfg.icon}</div>
                <div className="font-semibold text-gray-800 group-hover:text-blue-700">{cfg.label}</div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">{cfg.descricao}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Etapa 1: Baixar template ───────────────────────── */}
      {etapa === 1 && tipo && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{CONFIG[tipo].icon}</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Importar {CONFIG[tipo].label}</h2>
              <p className="text-sm text-gray-500">Passo 1 de 3 — Baixe o modelo de planilha</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-blue-800">📋 Colunas do template:</p>
            <div className="flex flex-wrap gap-2">
              {CONFIG[tipo].campos.map(c => (
                <span key={c} className={`text-xs px-2 py-0.5 rounded-full border ${
                  c.endsWith('*')
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}>{c}</span>
              ))}
            </div>
            <p className="text-xs text-blue-600 mt-1">* Campos obrigatórios</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Importante:</strong> Preencha os dados a partir da linha 2 do arquivo.
              A linha 1 é o cabeçalho e não deve ser alterada. Registros já cadastrados (por CNPJ/Patrimônio/Código)
              serão automaticamente ignorados.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={baixarTemplate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-3 text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Baixar Template Excel
            </button>
            <button
              onClick={() => setEtapa(2)}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl px-5 py-3 text-sm transition-colors"
            >
              Já tenho o arquivo preenchido
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Etapa 2: Upload do arquivo ─────────────────────── */}
      {etapa === 2 && tipo && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Enviar arquivo preenchido</h2>
            <p className="text-sm text-gray-500">Passo 2 de 3 — Selecione o arquivo .xlsx com os dados</p>
          </div>

          {/* Área de drop */}
          <label
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-10 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700">
              {arquivo ? arquivo.name : 'Clique para selecionar o arquivo'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {arquivo ? `${(arquivo.size / 1024).toFixed(1)} KB` : 'Apenas .xlsx — máximo 5 MB'}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleArquivo}
            />
          </label>

          {arquivo && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">{arquivo.name} selecionado</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setEtapa(1)}
              className="border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl px-5 py-2.5 text-sm transition-colors"
            >
              ← Voltar
            </button>
            <button
              onClick={validarArquivo}
              disabled={!arquivo || carregando}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-6 py-2.5 text-sm font-medium transition-colors"
            >
              {carregando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Validando…</>
                : <><Upload className="w-4 h-4" /> Validar arquivo</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Etapa 3: Revisar e confirmar ──────────────────── */}
      {etapa === 3 && validacao && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Revisar dados antes de importar</h2>
            <p className="text-sm text-gray-500">Passo 3 de 3 — Confirme as informações abaixo</p>
          </div>

          {/* Cards de resumo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-700">{validacao.total_lido}</div>
              <div className="text-xs text-gray-500 mt-0.5">Linhas lidas</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{validacao.validos}</div>
              <div className="text-xs text-green-600 mt-0.5">Válidos para importar</div>
            </div>
            <div className={`border rounded-xl p-4 text-center ${
              validacao.com_erro > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className={`text-2xl font-bold ${validacao.com_erro > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                {validacao.com_erro}
              </div>
              <div className={`text-xs mt-0.5 ${validacao.com_erro > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                Com erros
              </div>
            </div>
          </div>

          {/* Erros encontrados */}
          {validacao.com_erro > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setMostrarErros(!mostrarErros)}
                className="w-full flex items-center justify-between p-4 text-sm font-medium text-red-800 hover:bg-red-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  {validacao.com_erro} linha(s) com erro — clique para ver detalhes
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${mostrarErros ? 'rotate-90' : ''}`} />
              </button>
              {mostrarErros && (
                <div className="border-t border-red-200 divide-y divide-red-100 max-h-48 overflow-y-auto">
                  {validacao.erros.map((err, i) => (
                    <div key={i} className="px-4 py-2.5 flex gap-4 text-xs">
                      <span className="text-red-500 font-mono whitespace-nowrap">Linha {err.linha}</span>
                      <span className="text-red-700">{err.erro}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview dos dados válidos */}
          {validacao.validos > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">
                  Preview — {Math.min(validacao.validos, 5)} de {validacao.validos} registro(s) válido(s)
                </p>
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(validacao.preview_dados[0] ?? {}).slice(0, 5).map(k => (
                        <th key={k} className="text-left px-3 py-2 text-gray-500 font-medium whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {validacao.preview_dados.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {Object.values(row).slice(0, 5).map((v: any, j) => (
                          <td key={j} className="px-3 py-2 text-gray-700 max-w-32 truncate">
                            {v ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {validacao.validos === 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Nenhum registro válido encontrado. Corrija os erros no arquivo e envie novamente.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setEtapa(2); setValidacao(null); }}
              className="border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl px-5 py-2.5 text-sm transition-colors"
            >
              ← Novo arquivo
            </button>
            <button
              onClick={confirmarImportacao}
              disabled={validacao.validos === 0 || carregando}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl px-6 py-2.5 text-sm font-medium transition-colors"
            >
              {carregando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando…</>
                : <><CheckCircle2 className="w-4 h-4" /> Confirmar importação de {validacao.validos} registro(s)</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Etapa 4: Concluído ─────────────────────────────── */}
      {etapa === 4 && resultado && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800">Importação concluída!</h2>
            <p className="text-sm text-gray-500 mt-1">{resultado.mensagem}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-700">{resultado.importados}</div>
              <div className="text-xs text-green-600">Importados</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-500">{resultado.ignorados}</div>
              <div className="text-xs text-gray-400">Já existiam</div>
            </div>
          </div>

          {resultado.detalhes?.length > 0 && (
            <div className="text-left bg-amber-50 border border-amber-200 rounded-xl p-4 max-h-40 overflow-y-auto">
              {resultado.detalhes.map((d: string, i: number) => (
                <p key={i} className="text-xs text-amber-700">{d}</p>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={reiniciar}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl px-5 py-2.5 text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Nova importação
            </button>
            <button
              onClick={() => navigate(
                tipo === 'clientes' ? '/clients'
                : tipo === 'maquinas' ? '/machines'
                : '/stock'
              )}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
            >
              Ver dados importados →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
