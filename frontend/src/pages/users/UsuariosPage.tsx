import { useState }             from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm }              from 'react-hook-form';
import { zodResolver }          from '@hookform/resolvers/zod';
import { z }                    from 'zod';
import toast                    from 'react-hot-toast';
import {
  Users, UserPlus, Mail, Shield, ToggleLeft, ToggleRight,
  RefreshCw, ChevronDown, Check, X, Clock, AlertCircle,
} from 'lucide-react';
import clsx                     from 'clsx';
import { usersApi, getErrorMessage } from '../../services/api';
import { useAuth }              from '../../contexts/AuthContext';
import type { UsuarioItem }     from '../../types';
import { PERFIL_LABEL, PERFIL_COLOR } from '../../types';

// ── Schema de convite ─────────────────────────────────────────
const inviteSchema = z.object({
  email:  z.string().email('Informe um e-mail válido.'),
  perfil: z.enum(['admin', 'financeiro', 'operacional', 'consulta'], {
    errorMap: () => ({ message: 'Selecione um perfil.' }),
  }),
});
type InviteForm = z.infer<typeof inviteSchema>;

// ── Schema de edição de perfil ────────────────────────────────
const editSchema = z.object({
  nome:   z.string().min(3, 'Mínimo 3 caracteres.').optional(),
  perfil: z.enum(['admin', 'financeiro', 'operacional', 'consulta']).optional(),
});
type EditForm = z.infer<typeof editSchema>;

// ─────────────────────────────────────────────────────────────
export function UsuariosPage() {
  const { user: me, hasRole } = useAuth();
  const queryClient           = useQueryClient();
  const isAdmin               = hasRole('admin', 'super_admin');

  const [showConvite, setShowConvite] = useState(false);
  const [editando,    setEditando]    = useState<UsuarioItem | null>(null);

  // ── Fetch usuários ────────────────────────────────────────────
  const { data: usuarios = [], isLoading } = useQuery<UsuarioItem[]>(
    'users',
    async () => {
      const { data } = await usersApi.listar();
      return (data as any[]).map(u => ({
        ...u,
        pendente: !!u.token_convite && !u.ativo,
      }));
    },
    { refetchInterval: 30_000 },
  );

  // ── Mutations ────────────────────────────────────────────────
  const convidarMutation = useMutation(
    (dto: InviteForm) => usersApi.convidar(dto),
    {
      onSuccess: (_, dto) => {
        toast.success(`Convite enviado para ${dto.email}!`);
        queryClient.invalidateQueries('users');
        setShowConvite(false);
        inviteForm.reset();
      },
      onError: (err) => { toast.error(getErrorMessage(err)); },
    },
  );

  const toggleMutation = useMutation(
    ({ id, ativo }: { id: string; ativo: boolean }) =>
      usersApi.toggleAtivo(id, ativo),
    {
      onSuccess: (res: any) => {
        toast.success(res.data?.mensagem || 'Usuário atualizado.');
        queryClient.invalidateQueries('users');
      },
      onError: (err) => { toast.error(getErrorMessage(err)); },
    },
  );

  const reenviarMutation = useMutation(
    (id: string) => usersApi.reenviarConvite(id),
    {
      onSuccess: () => {
        toast.success('Convite reenviado com sucesso!');
        queryClient.invalidateQueries('users');
      },
      onError: (err) => { toast.error(getErrorMessage(err)); },
    },
  );

  const editarMutation = useMutation(
    ({ id, dto }: { id: string; dto: EditForm }) => usersApi.atualizar(id, dto),
    {
      onSuccess: () => {
        toast.success('Usuário atualizado!');
        queryClient.invalidateQueries('users');
        setEditando(null);
      },
      onError: (err) => { toast.error(getErrorMessage(err)); },
    },
  );

  // ── Forms ─────────────────────────────────────────────────────
  const inviteForm = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) });
  const editForm   = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values:   editando ? { nome: editando.nome, perfil: editando.perfil as any } : undefined,
  });

  // ── Helpers ───────────────────────────────────────────────────
  const ativos   = usuarios.filter(u => u.ativo);
  const pendentes = usuarios.filter(u => u.pendente);
  const inativos  = usuarios.filter(u => !u.ativo && !u.pendente);

  const formatLogin = (dt: string | null) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" /> Usuários
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gerencie o acesso da equipe ao sistema.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowConvite(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Convidar Usuário
          </button>
        )}
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Ativos</p>
          <p className="text-2xl font-bold text-gray-900">{ativos.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Pendentes</p>
          <p className="text-2xl font-bold text-amber-600">{pendentes.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Inativos</p>
          <p className="text-2xl font-bold text-gray-400">{inativos.length}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Todos os usuários</h2>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Carregando...</div>
        ) : usuarios.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Nenhum usuário cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perfil</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">2FA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último acesso</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Situação</th>
                  {isAdmin && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usuarios.map(u => (
                  <tr key={u.id} className={clsx('hover:bg-gray-50/50', !u.ativo && !u.pendente && 'opacity-50')}>

                    {/* Nome + email */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-700">
                            {u.nome?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 flex items-center gap-1">
                            {u.nome}
                            {u.id === me?.id && (
                              <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Você</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Perfil */}
                    <td className="px-4 py-3">
                      <span className={clsx('badge', PERFIL_COLOR[u.perfil])}>
                        {PERFIL_LABEL[u.perfil] ?? u.perfil}
                      </span>
                    </td>

                    {/* 2FA */}
                    <td className="px-4 py-3">
                      {u.dois_fa_ativo
                        ? <span className="text-green-600 text-xs font-medium flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Ativo</span>
                        : <span className="text-gray-400 text-xs">—</span>
                      }
                    </td>

                    {/* Último login */}
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatLogin(u.ultimo_login)}</td>

                    {/* Situação */}
                    <td className="px-4 py-3">
                      {u.pendente ? (
                        <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5" /> Convite pendente
                        </span>
                      ) : u.ativo ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                          <Check className="w-3.5 h-3.5" /> Ativo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <X className="w-3.5 h-3.5" /> Inativo
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">

                          {/* Reenviar convite (apenas pendentes) */}
                          {u.pendente && (
                            <button
                              title="Reenviar convite"
                              onClick={() => reenviarMutation.mutate(u.id)}
                              disabled={reenviarMutation.isLoading}
                              className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Editar perfil (apenas ativos, exceto si mesmo se quiser rebaixar) */}
                          {u.ativo && u.perfil !== 'super_admin' && (
                            <button
                              title="Editar perfil"
                              onClick={() => { setEditando(u); editForm.reset({ nome: u.nome, perfil: u.perfil as any }); }}
                              className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          )}

                          {/* Toggle ativo/inativo (não pode se auto-desativar) */}
                          {u.id !== me?.id && u.perfil !== 'super_admin' && !u.pendente && (
                            <button
                              title={u.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                              onClick={() => toggleMutation.mutate({ id: u.id, ativo: !u.ativo })}
                              disabled={toggleMutation.isLoading}
                              className={clsx(
                                'p-1.5 rounded-lg transition-colors',
                                u.ativo
                                  ? 'text-red-400 hover:bg-red-50'
                                  : 'text-green-500 hover:bg-green-50',
                              )}
                            >
                              {u.ativo ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aviso sobre convites pendentes */}
      {pendentes.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            {pendentes.length} convite{pendentes.length > 1 ? 's' : ''} aguardando aceite.
            Os links expiram em 48h. Use o botão <RefreshCw className="w-3.5 h-3.5 inline" /> para reenviar.
          </p>
        </div>
      )}

      {/* ── Modal: Convidar Usuário ─────────────────────────────── */}
      {showConvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" /> Convidar Usuário
              </h2>
              <button onClick={() => setShowConvite(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={inviteForm.handleSubmit(d => convidarMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="nome@empresa.com"
                  className="input w-full"
                  {...inviteForm.register('email')}
                />
                {inviteForm.formState.errors.email && (
                  <p className="text-xs text-red-500 mt-1">{inviteForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de acesso</label>
                <select className="input w-full" {...inviteForm.register('perfil')}>
                  <option value="">Selecione...</option>
                  <option value="admin">Administrador</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="operacional">Operacional</option>
                  <option value="consulta">Consulta</option>
                </select>
                {inviteForm.formState.errors.perfil && (
                  <p className="text-xs text-red-500 mt-1">{inviteForm.formState.errors.perfil.message}</p>
                )}
              </div>

              <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700">
                <Mail className="w-4 h-4 inline mr-1" />
                Um e-mail será enviado com um link de convite válido por 48 horas.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConvite(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={convidarMutation.isLoading}
                  className="btn btn-primary flex-1"
                >
                  {convidarMutation.isLoading ? 'Enviando...' : 'Enviar convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Usuário ───────────────────────────────── */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Editar usuário</h2>
              <button onClick={() => setEditando(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form
              onSubmit={editForm.handleSubmit(dto =>
                editarMutation.mutate({ id: editando.id, dto })
              )}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" className="input w-full" {...editForm.register('nome')} />
                {editForm.formState.errors.nome && (
                  <p className="text-xs text-red-500 mt-1">{editForm.formState.errors.nome.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                <select className="input w-full" {...editForm.register('perfil')}>
                  <option value="admin">Administrador</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="operacional">Operacional</option>
                  <option value="consulta">Consulta</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editarMutation.isLoading}
                  className="btn btn-primary flex-1"
                >
                  {editarMutation.isLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default UsuariosPage;
