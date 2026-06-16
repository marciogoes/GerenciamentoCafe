import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
  CalendarClock, Plus, Play, Pause, Trash2, Send, X, ChevronLeft, Mail,
} from 'lucide-react';
import { reportSchedulesApi, getErrorMessage } from '../../services/api';

// ── Labels ────────────────────────────────────────────────────
const TIPO_LABEL: Record<string, string> = {
  financeiro: 'Financeiro',
  contratos:  'Contratos',
  estoque:    'Estoque',
  maquinas:   'Máquinas',
};
const FREQ_LABEL: Record<string, string> = {
  diario:  'Diário',
  semanal: 'Semanal',
  mensal:  'Mensal',
};

interface Agendamento {
  id: string;
  tipo: string;
  frequencia: string;
  destinatarios: string[];
  proximo_envio: string | null;
  ultimo_envio: string | null;
  ativo: boolean;
  criado_em: string;
}

function fmtDataHora(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Modal de novo agendamento ─────────────────────────────────
function ModalNovo({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [tipo, setTipo]             = useState('financeiro');
  const [frequencia, setFrequencia] = useState('mensal');
  const [emailsText, setEmailsText] = useState('');

  const mut = useMutation(
    (payload: any) => reportSchedulesApi.criar(payload),
    {
      onSuccess: () => { toast.success('Agendamento criado!'); onCreated(); onClose(); },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  function salvar() {
    const destinatarios = emailsText
      .split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (destinatarios.length === 0) { toast.error('Informe ao menos 1 e-mail.'); return; }
    mut.mutate({ tipo, frequencia, destinatarios });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-800">Novo agendamento</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Relatório</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="financeiro">Financeiro</option>
                <option value="contratos">Contratos</option>
                <option value="estoque">Estoque</option>
                <option value="maquinas">Máquinas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Frequência</label>
              <select value={frequencia} onChange={e => setFrequencia(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="diario">Diário</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Destinatários (e-mails)
            </label>
            <textarea
              value={emailsText}
              onChange={e => setEmailsText(e.target.value)}
              rows={3}
              placeholder="gestor@empresa.com, financeiro@empresa.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Separe por vírgula, ponto-e-vírgula ou quebra de linha. Mínimo 1.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            O relatório é gerado em Excel e enviado por e-mail na frequência escolhida.
            Diário às 07h, semanal toda segunda 07h, mensal no dia 1º às 07h.
          </div>
        </div>

        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose}
            className="border border-gray-300 text-gray-700 text-sm px-5 py-2 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={salvar} disabled={mut.isLoading}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50">
            {mut.isLoading ? 'Criando…' : 'Criar agendamento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function AgendamentosPage() {
  const qc = useQueryClient();
  const [modalNovo, setModalNovo] = useState(false);

  const { data: agendamentos = [], isLoading } = useQuery(
    ['report-schedules'],
    () => reportSchedulesApi.listar().then(r => r.data),
  );

  const invalidar = () => qc.invalidateQueries(['report-schedules']);

  const mutToggle = useMutation(
    ({ id, ativo }: { id: string; ativo: boolean }) => reportSchedulesApi.atualizar(id, { ativo }),
    {
      onSuccess: (_d, vars) => { toast.success(vars.ativo ? 'Agendamento reativado.' : 'Agendamento pausado.'); invalidar(); },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  const mutExecutar = useMutation(
    (id: string) => reportSchedulesApi.executar(id).then(r => r.data),
    {
      onSuccess: (res: any) => { toast.success(res?.mensagem ?? 'Relatório enviado.'); invalidar(); },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  const mutRemover = useMutation(
    (id: string) => reportSchedulesApi.remover(id),
    {
      onSuccess: () => { toast.success('Agendamento removido.'); invalidar(); },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  const lista = agendamentos as Agendamento[];
  const ativos = lista.filter(a => a.ativo).length;
  const ocupado = mutToggle.isLoading || mutExecutar.isLoading || mutRemover.isLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div>
        <Link to="/reports" className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-1 w-fit">
          <ChevronLeft className="w-4 h-4" /> Relatórios
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarClock className="w-7 h-7 text-amber-600" />
              Agendamento de Relatórios
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Envio automático por e-mail · {ativos}/10 ativos
            </p>
          </div>
          <button
            onClick={() => setModalNovo(true)}
            disabled={ativos >= 10}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
            title={ativos >= 10 ? 'Limite de 10 agendamentos ativos atingido' : undefined}
          >
            <Plus className="w-4 h-4" /> Novo agendamento
          </button>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando…</div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl">
          <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum agendamento criado</p>
          <p className="text-sm mt-1">Clique em "Novo agendamento" para programar um envio automático.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Relatório</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Frequência</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Destinatários</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Próximo envio</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Último envio</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lista.map(a => (
                  <tr key={a.id} className={`hover:bg-gray-50 ${!a.ativo ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{TIPO_LABEL[a.tipo] ?? a.tipo}</td>
                    <td className="px-4 py-3 text-gray-600">{FREQ_LABEL[a.frequencia] ?? a.frequencia}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[220px]" title={(a.destinatarios ?? []).join(', ')}>
                          {(a.destinatarios ?? []).join(', ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.ativo ? fmtDataHora(a.proximo_envio) : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDataHora(a.ultimo_envio)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {a.ativo ? 'Ativo' : 'Pausado'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Enviar agora"
                          disabled={ocupado}
                          onClick={() => mutExecutar.mutate(a.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-40"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          title={a.ativo ? 'Pausar' : 'Reativar'}
                          disabled={ocupado}
                          onClick={() => mutToggle.mutate({ id: a.id, ativo: !a.ativo })}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-40"
                        >
                          {a.ativo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          title="Remover"
                          disabled={ocupado}
                          onClick={() => { if (confirm('Remover este agendamento?')) mutRemover.mutate(a.id); }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalNovo && (
        <ModalNovo onClose={() => setModalNovo(false)} onCreated={invalidar} />
      )}
    </div>
  );
}
