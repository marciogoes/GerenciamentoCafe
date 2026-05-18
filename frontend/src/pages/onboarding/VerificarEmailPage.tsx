import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Mail, Loader2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { api, getErrorMessage } from '../../services/api';

type Estado = 'aguardando' | 'verificando' | 'sucesso' | 'erro';

export default function VerificarEmailPage() {
  const location  = useLocation();
  const navigate  = useNavigate();

  // Vem do CadastroPage via state
  const emailCadastro: string = (location.state as any)?.email || '';
  // Vem da URL quando o usuário clica no link do e-mail: /verificar-email?token=xxx
  const params    = new URLSearchParams(location.search);
  const tokenUrl  = params.get('token');

  const [estado,   setEstado]   = useState<Estado>(tokenUrl ? 'verificando' : 'aguardando');
  const [erro,     setErro]     = useState('');
  const [reenvio,  setReenvio]  = useState(false);
  const [msgReenv, setMsgReenv] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [emailConf, setEmailConf] = useState('');

  // Se há token na URL, valida automaticamente
  useEffect(() => {
    if (!tokenUrl) return;
    (async () => {
      try {
        const { data } = await api.get(`/tenants/verificar/${tokenUrl}`);
        setTenantId(data.tenantId);
        setEmailConf(data.email);
        setEstado('sucesso');
        // Redireciona para configuração após 2s
        setTimeout(() => navigate('/configurar-tenant', {
          state: { tenantId: data.tenantId, email: data.email },
        }), 2500);
      } catch (e) {
        setErro(getErrorMessage(e));
        setEstado('erro');
      }
    })();
  }, [tokenUrl]);

  const reenviarEmail = async () => {
    if (!emailCadastro) return;
    setReenvio(true);
    setMsgReenv('');
    try {
      await api.post('/tenants/reenviar-verificacao', { email: emailCadastro });
      setMsgReenv('E-mail reenviado! Verifique sua caixa de entrada.');
    } catch (e) {
      setMsgReenv(getErrorMessage(e));
    } finally {
      setReenvio(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">

          {/* Verificando... */}
          {estado === 'verificando' && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Verificando e-mail...</h2>
              <p className="text-gray-500 text-sm mt-2">Aguarde um momento.</p>
            </>
          )}

          {/* Aguardando clique no link */}
          {estado === 'aguardando' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mail className="w-10 h-10 text-blue-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifique seu e-mail</h2>
              <p className="text-gray-500 text-sm mb-1">Enviamos um link de confirmação para</p>
              {emailCadastro && (
                <p className="font-semibold text-gray-800 mb-4">{emailCadastro}</p>
              )}
              <p className="text-gray-400 text-xs mb-6">
                Clique no link do e-mail para ativar sua conta.<br />
                O link expira em <strong>24 horas</strong>.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 text-left space-y-1.5">
                <p className="font-semibold mb-1">Não recebeu o e-mail?</p>
                <p>• Verifique a pasta de spam ou lixo eletrônico</p>
                <p>• Aguarde alguns minutos e atualize a caixa</p>
                <p>• Certifique-se que o e-mail foi digitado corretamente</p>
              </div>

              {emailCadastro && (
                <button
                  onClick={reenviarEmail}
                  disabled={reenvio}
                  className="btn-secondary w-full mt-5"
                >
                  {reenvio
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Reenviando...</>
                    : <><RefreshCw className="w-4 h-4" /> Reenviar e-mail</>}
                </button>
              )}

              {msgReenv && (
                <p className={`mt-3 text-sm ${msgReenv.includes('reenviado') ? 'text-green-600' : 'text-red-600'}`}>
                  {msgReenv}
                </p>
              )}
            </>
          )}

          {/* Sucesso */}
          {estado === 'sucesso' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">E-mail confirmado!</h2>
              <p className="text-gray-500 text-sm mb-1">
                Ótimo, {emailConf}! Sua conta foi ativada.
              </p>
              <p className="text-gray-400 text-xs mt-4">
                Redirecionando para a configuração do sistema...
              </p>
              <div className="mt-4">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
              </div>
            </>
          )}

          {/* Erro */}
          {estado === 'erro' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Link inválido</h2>
              <p className="text-gray-500 text-sm mb-4">{erro}</p>
              <Link to="/cadastro" className="btn-primary w-full">
                Fazer novo cadastro
              </Link>
            </>
          )}

        </div>
        <p className="text-center text-blue-200 text-xs mt-6">
          Vending Manager SaaS © 2026
        </p>
      </div>
    </div>
  );
}
