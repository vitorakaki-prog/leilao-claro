'use client';

import { useState } from 'react';
import type { EntradaAnalise } from '@/engine/analisar';
import { extrair, type Extracao } from '@/engine/extrator';
import type { ChecklistJuridico } from '@/engine/juridico';
import { BAIRROS_SP, buscarBairro } from '@/engine/localizacao';
import type { Modalidade, Ocupacao, Origem, SimNaoVerificado } from '@/engine/tipos';
import { CampoCheck, CampoNumero, CampoSelect, Secao } from './campos';

export type Rascunho = Partial<EntradaAnalise> & { info?: Extracao['info'] };

const MODALIDADES: { valor: Modalidade; rotulo: string }[] = [
  { valor: 'venda_direta_online', rotulo: 'Venda Direta Online / Compra Direta' },
  { valor: 'venda_online', rotulo: 'Venda Online' },
  { valor: 'licitacao_aberta', rotulo: 'Licitação Aberta' },
  { valor: 'leilao_sfi', rotulo: 'Leilão SFI' },
  { valor: 'direito_preferencia', rotulo: 'Exercício de Direito de Preferência' },
  { valor: 'outra', rotulo: 'Outra' },
];

const OCUPACOES: { valor: Ocupacao; rotulo: string }[] = [
  { valor: 'desocupado', rotulo: 'Desocupado' },
  { valor: 'ocupado_devedor', rotulo: 'Ocupado pelo antigo dono' },
  { valor: 'locatario', rotulo: 'Inquilino com contrato' },
  { valor: 'terceiro_sem_contrato', rotulo: 'Terceiro sem contrato' },
  { valor: 'invadido', rotulo: 'Invadido' },
  { valor: 'ocupado_nao_informado', rotulo: 'Ocupado — ocupante não informado' },
];

const SNV: { valor: SimNaoVerificado; rotulo: string }[] = [
  { valor: 'nao_verificado', rotulo: 'Não verificado' },
  { valor: 'nao', rotulo: 'Não' },
  { valor: 'sim', rotulo: 'Sim' },
];

const CHECKLIST: { campo: keyof ChecklistJuridico; rotulo: string; dica?: string }[] = [
  { campo: 'matriculaConferida', rotulo: 'Li a matrícula e não achei ônus que impeça a compra', dica: '"Sim" sobe o jurídico de 80 para 100.' },
  { campo: 'leilaoJudicial', rotulo: 'É leilão judicial?' },
  { campo: 'hipotecaOuPenhoraTerceiro', rotulo: 'Hipoteca ou penhora a favor de terceiro?', dica: 'Garantia a favor da própria Caixa não conta.' },
  { campo: 'penhoraTrabalhista', rotulo: 'Penhora trabalhista sem solução?', dica: 'Eliminatória.' },
  { campo: 'bemDeFamilia', rotulo: 'Bem de família declarado?', dica: 'Eliminatória.' },
  { campo: 'fraudeExecucao', rotulo: 'Fraude à execução mencionada?', dica: 'Eliminatória.' },
  { campo: 'usucapiao', rotulo: 'Usucapião em andamento?', dica: 'Eliminatória.' },
];

export function Formulario({ valor, onChange, onExemplo }: { valor: Rascunho; onChange: (r: Rascunho) => void; onExemplo?: () => void }) {
  const [texto, setTexto] = useState(valor.texto ?? '');
  const [leitura, setLeitura] = useState<Pick<Extracao, 'encontrados' | 'faltando'> | null>(null);

  const o = (campo: keyof EntradaAnalise): Origem | undefined => valor.origens?.[campo as keyof typeof valor.origens];

  /** Atualiza um campo; se veio do anúncio e foi editado, deixa de ser "confirmado". */
  function set<K extends keyof EntradaAnalise>(campo: K, v: EntradaAnalise[K] | undefined) {
    const origens = { ...valor.origens };
    delete origens[campo as keyof typeof origens];
    onChange({ ...valor, [campo]: v, origens });
  }
  const setCheck = (campo: keyof ChecklistJuridico, v: SimNaoVerificado | undefined) =>
    onChange({ ...valor, checklist: { ...valor.checklist, [campo]: v } });

  function lerAnuncio() {
    const r = extrair(texto);
    setLeitura({ encontrados: r.encontrados, faltando: r.faltando });
    onChange({ ...valor, ...r.campos, info: r.info, origens: { ...valor.origens, ...r.campos.origens } });
  }

  const bairroNaTabela = valor.bairro ? !!buscarBairro(valor.bairro) : false;

  return (
    <div className="space-y-4">
      <div className="cartao">
        <h2 className="text-sm font-semibold">1. Cole o anúncio da Caixa</h2>
        <p className="mt-1 text-xs text-slate-500">
          Na página do imóvel no site da Caixa, selecione tudo (Ctrl+A ou Cmd+A), copie e cole aqui. Os campos são preenchidos sozinhos; confira cada um abaixo.
        </p>
        <textarea className="campo mt-3 h-28 font-mono text-xs" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cole aqui o texto da página do imóvel…" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button onClick={lerAnuncio} disabled={!texto.trim()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
            Ler anúncio
          </button>
          {onExemplo && (
            <button onClick={onExemplo} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm">
              Ver exemplo
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">Não tem o anúncio? Preencha os campos abaixo à mão: só valor de avaliação, valor mínimo, modalidade e área são obrigatórios.</p>
        {leitura && (
          <div className="mt-3 space-y-1 text-xs">
            {leitura.encontrados.length > 0 && <p className="text-emerald-700">Encontrado: {leitura.encontrados.join(', ')}.</p>}
            {leitura.faltando.length > 0 && <p className="text-amber-700">Não encontrado (preencha abaixo): {leitura.faltando.join(', ')}.</p>}
          </div>
        )}
        {valor.info?.endereco && (
          <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-2">
            <div className="sm:col-span-2"><dt className="inline text-slate-500">Endereço: </dt><dd className="inline">{valor.info.endereco}</dd></div>
            {valor.info.matricula && <div><dt className="inline text-slate-500">Matrícula: </dt><dd className="inline">{valor.info.matricula}</dd></div>}
            {valor.info.inscricaoImobiliaria && (
              <div><dt className="inline text-slate-500">Nº do IPTU: </dt><dd className="inline">{valor.info.inscricaoImobiliaria}</dd></div>
            )}
            {valor.info.valor1Leilao && (
              <div className="sm:col-span-2 text-amber-700">Há 1º e 2º leilão: usamos o valor do 2º como mínimo. Para disputar no 1º, troque o valor mínimo.</div>
            )}
          </dl>
        )}
      </div>

      <Secao titulo="2. Preço">
        <CampoNumero rotulo="Valor de avaliação" prefixo="R$" valor={valor.valorAvaliacao} onChange={(v) => set('valorAvaliacao', v)} origem={o('valorAvaliacao')} obrigatorio />
        <CampoNumero rotulo="Valor mínimo de venda" prefixo="R$" valor={valor.valorMinimo} onChange={(v) => set('valorMinimo', v)} origem={o('valorMinimo')} obrigatorio />
        <CampoNumero rotulo="Seu lance (opcional)" prefixo="R$" valor={valor.lance} onChange={(v) => set('lance', v)} dica="Vazio = valor mínimo." />
        <CampoSelect rotulo="Modalidade" valor={valor.modalidade} opcoes={MODALIDADES} onChange={(v) => set('modalidade', v)} vazio="Selecione" origem={o('modalidade')} obrigatorio />
        <CampoSelect
          rotulo="Tem leiloeiro?"
          valor={valor.temLeiloeiro}
          opcoes={SNV}
          onChange={(v) => set('temLeiloeiro', v)}
          origem={o('temLeiloeiro')}
          dica='Procure "leiloeiro" ou "comissão" no edital. Na dúvida, contamos 5% de comissão.'
        />
        <CampoNumero
          rotulo="Valor venal de referência (opcional)"
          prefixo="R$"
          valor={valor.valorVenalReferencia}
          onChange={(v) => set('valorVenalReferencia', v)}
          dica="Consulte no serviço de ITBI da Prefeitura com o nº do IPTU. Se for maior que o lance, o ITBI é cobrado sobre ele."
        />
      </Secao>

      <Secao titulo="3. Imóvel">
        <label className="block">
          <span className="rotulo">Bairro {o('bairro') === 'confirmado' && <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">do anúncio</span>}</span>
          <input className="campo" list="bairros" value={valor.bairro ?? ''} onChange={(e) => set('bairro', e.target.value || undefined)} />
          <datalist id="bairros">{Object.keys(BAIRROS_SP).map((b) => <option key={b} value={b} />)}</datalist>
        </label>
        {!bairroNaTabela && (
          <CampoSelect
            rotulo="Bairro fora da tabela: qual a faixa?"
            valor={valor.faixaBairro}
            opcoes={[{ valor: 'premium', rotulo: 'Premium' }, { valor: 'intermediario', rotulo: 'Intermediário' }, { valor: 'periferico', rotulo: 'Periférico' }]}
            onChange={(v) => set('faixaBairro', v)}
            vazio="Não sei"
          />
        )}
        <CampoNumero rotulo="Área privativa" sufixo="m²" valor={valor.areaPrivativaM2} onChange={(v) => set('areaPrivativaM2', v)} origem={o('areaPrivativaM2')} obrigatorio />
        <CampoSelect
          rotulo="Ocupação"
          valor={valor.ocupacao}
          opcoes={OCUPACOES}
          onChange={(v) => set('ocupacao', v)}
          vazio="Não informada"
          origem={o('ocupacao')}
          dica={valor.info?.trechoOcupacao ? `No anúncio: "${valor.info.trechoOcupacao}"` : undefined}
        />
        <CampoSelect
          rotulo="Padrão de reforma"
          valor={valor.padraoReforma}
          opcoes={[{ valor: 'economico', rotulo: 'Econômico (R$ 500/m²)' }, { valor: 'medio', rotulo: 'Médio (R$ 1.000/m²)' }, { valor: 'alto', rotulo: 'Alto (R$ 1.500/m²)' }]}
          onChange={(v) => set('padraoReforma', v)}
          vazio="Econômico (padrão)"
        />
      </Secao>

      <Secao titulo="4. Dívidas e custos mensais" aberta={false}>
        <CampoNumero rotulo="Condomínio atrasado (total)" prefixo="R$" valor={valor.dividaCondominio} onChange={(v) => set('dividaCondominio', v)} dica="Pergunte ao síndico ou à administradora. 0 se não houver." />
        <CampoSelect
          rotulo="Quem paga o condomínio atrasado"
          valor={valor.condominioPagoPor}
          opcoes={[{ valor: 'comprador_ate_limite', rotulo: 'Comprador, até 10% da avaliação' }, { valor: 'comprador_integral', rotulo: 'Comprador, integral' }, { valor: 'caixa', rotulo: 'Caixa' }]}
          onChange={(v) => set('condominioPagoPor', v)}
          origem={o('condominioPagoPor')}
        />
        <CampoNumero rotulo="IPTU atrasado (total)" prefixo="R$" valor={valor.dividaIptu} onChange={(v) => set('dividaIptu', v)} />
        <CampoSelect
          rotulo="Quem paga o IPTU atrasado"
          valor={valor.iptuPagoPor}
          opcoes={[{ valor: 'comprador', rotulo: 'Comprador' }, { valor: 'caixa', rotulo: 'Caixa' }]}
          onChange={(v) => set('iptuPagoPor', v)}
          origem={o('iptuPagoPor')}
        />
        <CampoNumero rotulo="Condomínio + IPTU por mês" prefixo="R$" valor={valor.despesaMensal} onChange={(v) => set('despesaMensal', v)} dica="Vazio = estimado em R$ 10/m²." />
        <div className="space-y-2 pt-5">
          <CampoCheck rotulo="Precisa averbar construção" valor={valor.precisaAverbacao} onChange={(v) => set('precisaAverbacao', v)} />
          <CampoCheck rotulo="Precisa de regularização fiscal" valor={valor.precisaRegularizacaoFiscal} onChange={(v) => set('precisaRegularizacaoFiscal', v)} />
        </div>
      </Secao>

      <Secao titulo="5. Venda" aberta={false}>
        <CampoNumero rotulo="Valor de venda esperado" prefixo="R$" valor={valor.valorVendaEsperado} onChange={(v) => set('valorVendaEsperado', v)} dica="Vazio = valor de avaliação." />
        <CampoNumero rotulo="Tempo para vender" sufixo="meses" valor={valor.prazoVendaMeses} onChange={(v) => set('prazoVendaMeses', v)} dica="Vazio = 6 a 12 meses, conforme o cenário." />
        <div className="pt-1 sm:col-span-2">
          <CampoCheck rotulo="Tenho isenção de IR (único imóvel, venda até R$ 440 mil, sem outra venda em 5 anos)" valor={valor.isencaoIR} onChange={(v) => set('isencaoIR', v)} />
        </div>
      </Secao>

      <Secao titulo="6. Checklist jurídico (lendo a matrícula)" aberta={false}>
        <div className="sm:col-span-2">
          <CampoCheck rotulo="O anúncio traz a matrícula" valor={valor.matriculaDisponivel ?? true} onChange={(v) => set('matriculaDisponivel', v)} />
        </div>
        {CHECKLIST.map((c) => (
          <CampoSelect key={c.campo} rotulo={c.rotulo} valor={valor.checklist?.[c.campo]} opcoes={SNV} onChange={(v) => setCheck(c.campo, v)} dica={c.dica} />
        ))}
      </Secao>

      <Secao titulo="7. Premissa de mercado" aberta={false}>
        <CampoNumero
          rotulo="Selic ao ano"
          sufixo="%"
          valor={valor.selic === undefined ? undefined : Math.round(valor.selic * 10000) / 100}
          onChange={(v) => set('selic', v === undefined ? undefined : v / 100)}
          dica="13,75% desde a reunião do Copom de 4/11/2026. O retorno mínimo exigido é a Selic + 10 pontos."
        />
      </Secao>
    </div>
  );
}
