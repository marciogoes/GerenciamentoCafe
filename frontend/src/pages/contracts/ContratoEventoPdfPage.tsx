import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { contratoEventoApi } from '../../services/api';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import { fmtDate } from '../../utils/format';

function fmtCnpj(cnpj: string) {
  return cnpj?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') ?? cnpj;
}
function fmtMoeda(v: number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ContratoEventoPdfPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQuery(
    ['contrato-evento-pdf', id],
    () => contratoEventoApi.dados(id!),
    { enabled: !!id },
  );

  const handlePrint = () => window.print();

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (isError || !data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-500">
      <p>Contrato não encontrado ou não é do tipo Evento.</p>
      <button onClick={() => navigate('/contracts')} className="text-blue-600 hover:underline text-sm">
        Voltar para Contratos
      </button>
    </div>
  );

  const { contrato, locadora, locatario, maquina } = data;

  return (
    <>
      {/* Barra de ações — não aparece na impressão */}
      <div className="print:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 mb-6">
        <button
          onClick={() => navigate('/contracts')}
          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
        >
          <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* Conteúdo imprimível */}
      <div
        ref={printRef}
        className="max-w-3xl mx-auto bg-white p-10 shadow-sm border border-gray-200 print:shadow-none print:border-0 print:p-8 text-gray-900"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px', lineHeight: '1.6' }}
      >
        {/* Cabeçalho */}
        <div className="text-center mb-8 pb-6 border-b-2 border-blue-800">
          <h1 className="text-2xl font-bold text-blue-900 uppercase tracking-wide">
            Contrato de Locação de Máquina para Evento
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Nº {contrato.id.split('-')[0].toUpperCase()} &nbsp;|&nbsp;
            Emitido em {fmtDate(contrato.data_assinatura || new Date().toISOString().split('T')[0])}
          </p>
        </div>

        {/* CLÁUSULA I — LOCADORA */}
        <section className="mb-6">
          <h2 className="font-bold text-blue-900 uppercase text-sm border-b border-blue-200 pb-1 mb-3">
            I — Locadora
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div><span className="font-semibold">Razão Social:</span> {locadora.razao_social}</div>
            <div><span className="font-semibold">CNPJ:</span> {fmtCnpj(locadora.cnpj)}</div>
          </div>
        </section>

        {/* CLÁUSULA II — LOCATÁRIO */}
        <section className="mb-6">
          <h2 className="font-bold text-blue-900 uppercase text-sm border-b border-blue-200 pb-1 mb-3">
            II — Locatário
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div><span className="font-semibold">Razão Social:</span> {locatario.razao_social}</div>
            <div><span className="font-semibold">CNPJ:</span> {fmtCnpj(locatario.cnpj)}</div>
            {locatario.endereco && (
              <div className="col-span-2"><span className="font-semibold">Endereço:</span> {locatario.endereco}</div>
            )}
            {locatario.contato_nome && (
              <div><span className="font-semibold">Responsável:</span> {locatario.contato_nome}</div>
            )}
            {locatario.contato_telefone && (
              <div><span className="font-semibold">Telefone:</span> {locatario.contato_telefone}</div>
            )}
            {locatario.contato_email && (
              <div className="col-span-2"><span className="font-semibold">E-mail:</span> {locatario.contato_email}</div>
            )}
          </div>
        </section>

        {/* CLÁUSULA III — EVENTO */}
        <section className="mb-6">
          <h2 className="font-bold text-blue-900 uppercase text-sm border-b border-blue-200 pb-1 mb-3">
            III — Dados do Evento
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            {contrato.nome_evento && (
              <div className="col-span-2"><span className="font-semibold">Nome do Evento:</span> {contrato.nome_evento}</div>
            )}
            {contrato.local_evento && (
              <div className="col-span-2"><span className="font-semibold">Local:</span> {contrato.local_evento}</div>
            )}
            <div>
              <span className="font-semibold">Data de Início:</span>{' '}
              {fmtDate(contrato.data_inicio)}
            </div>
            <div>
              <span className="font-semibold">Data de Término:</span>{' '}
              {contrato.data_fim ? fmtDate(contrato.data_fim) : 'A definir'}
            </div>
            {maquina && (
              <>
                <div>
                  <span className="font-semibold">Máquina (Patrimônio):</span>{' '}
                  {maquina.patrimonio}
                </div>
                {maquina.modelo_nome && (
                  <div>
                    <span className="font-semibold">Modelo:</span> {maquina.modelo_nome}
                  </div>
                )}
                {maquina.numero_serie && (
                  <div>
                    <span className="font-semibold">Nº de Série:</span> {maquina.numero_serie}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* CLÁUSULA IV — CONDIÇÕES COMERCIAIS */}
        <section className="mb-6">
          <h2 className="font-bold text-blue-900 uppercase text-sm border-b border-blue-200 pb-1 mb-3">
            IV — Condições Comerciais
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-3">
            <div>
              <span className="font-semibold">Valor do Contrato:</span>{' '}
              <strong>{fmtMoeda(contrato.valor_mensal)}</strong>
            </div>
            <div>
              <span className="font-semibold">Data de Assinatura:</span>{' '}
              {fmtDate(contrato.data_assinatura)}
            </div>
          </div>
          {contrato.condicoes_comerciais ? (
            <p className="text-sm whitespace-pre-line border border-gray-200 rounded p-3 bg-gray-50">
              {contrato.condicoes_comerciais}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">
              A locação se dá nos termos acordados entre as partes, incluindo fornecimento da máquina,
              insumos e suporte técnico durante o período do evento. Condições adicionais conforme
              proposta comercial em anexo.
            </p>
          )}
          {contrato.observacao && (
            <div className="mt-3">
              <span className="font-semibold text-sm">Observações:</span>
              <p className="text-sm mt-1 text-gray-700 whitespace-pre-line">{contrato.observacao}</p>
            </div>
          )}
        </section>

        {/* CLÁUSULA V — DECLARAÇÃO */}
        <section className="mb-8">
          <h2 className="font-bold text-blue-900 uppercase text-sm border-b border-blue-200 pb-1 mb-3">
            V — Declaração e Assinaturas
          </h2>
          <p className="text-sm text-gray-600 mb-8">
            As partes acima identificadas declaram ter lido e concordado com todas as condições
            estabelecidas neste contrato, comprometendo-se ao fiel cumprimento de todas as cláusulas
            aqui dispostas.
          </p>

          {/* Linha de assinatura */}
          <div className="grid grid-cols-2 gap-16 mt-10">
            <div className="text-center">
              <div className="border-t border-gray-700 pt-2">
                <p className="font-semibold text-sm">{locadora.razao_social}</p>
                <p className="text-xs text-gray-500">LOCADORA</p>
                <p className="text-xs text-gray-400 mt-1">Data: _____ / _____ / _____</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-700 pt-2">
                <p className="font-semibold text-sm">{locatario.razao_social}</p>
                <p className="text-xs text-gray-500">LOCATÁRIO</p>
                <p className="text-xs text-gray-400 mt-1">Data: _____ / _____ / _____</p>
              </div>
            </div>
          </div>

          {/* Testemunhas */}
          <div className="grid grid-cols-2 gap-16 mt-12">
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2">
                <p className="text-xs text-gray-500">Testemunha 1 — Nome / CPF</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2">
                <p className="text-xs text-gray-500">Testemunha 2 — Nome / CPF</p>
              </div>
            </div>
          </div>
        </section>

        {/* Rodapé */}
        <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          Documento gerado por Vending Manager — {new Date().toLocaleDateString('pt-BR')}
        </div>
      </div>

      {/* CSS de impressão */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print\\:shadow-none, .print\\:shadow-none * { visibility: visible !important; }
          .print\\:shadow-none { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </>
  );
}
