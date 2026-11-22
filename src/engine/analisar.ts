// Consolidação: junta os quatro módulos num veredito explicado.
// Score = 0,30 Jurídico + 0,35 Financeiro + 0,20 Ocupação + 0,15 Localização.
// Eliminatória zera tudo (E); travas limitam o semáforo quando o preço não fecha.

import { analisarFinanceiro, type EntradaFinanceira, type ResultadoFinanceiro } from './financeiro';
import { analisarJuridico, type ChecklistJuridico, type ResultadoJuridico } from './juridico';
import { analisarLocalizacao, type FaixaBairro, type ResultadoLocalizacao } from './localizacao';
import { analisarOcupacao, type ResultadoOcupacao } from './ocupacao';
import { PREMISSAS, type Premissas } from './premissas';
import { brl, pct } from './formatar';
import type { Aviso } from './tipos';

export type Semaforo = 'A' | 'B' | 'C' | 'D' | 'E';

export const PESOS = { juridico: 0.3, financeiro: 0.35, ocupacao: 0.2, localizacao: 0.15 } as const;

export const FAIXAS_SEMAFORO: { letra: Semaforo; minimo: number; rotulo: string }[] = [
  { letra: 'A', minimo: 80, rotulo: 'Oportunidade forte' },
  { letra: 'B', minimo: 65, rotulo: 'Boa, com pontos a conferir' },
  { letra: 'C', minimo: 50, rotulo: 'Só com desconto maior ou riscos resolvidos' },
  { letra: 'D', minimo: 35, rotulo: 'Risco alto para o retorno' },
  { letra: 'E', minimo: 0, rotulo: 'Não recomendado' },
];

const ORDEM: Semaforo[] = ['A', 'B', 'C', 'D', 'E'];
const pior = (a: Semaforo, b: Semaforo) => (ORDEM.indexOf(a) >= ORDEM.indexOf(b) ? a : b);
export const rotuloSemaforo = (s: Semaforo) => FAIXAS_SEMAFORO.find((f) => f.letra === s)!.rotulo;

export function semaforoDoScore(score: number): Semaforo {
  return FAIXAS_SEMAFORO.find((f) => score >= f.minimo)!.letra;
}

export interface EntradaAnalise extends EntradaFinanceira {
  bairro?: string;
  faixaBairro?: FaixaBairro;
  checklist?: ChecklistJuridico;
  matriculaDisponivel?: boolean;
  /** Texto colado do anúncio, para procurar termos de risco. */
  texto?: string;
}

export type ModuloId = 'juridico' | 'financeiro' | 'ocupacao' | 'localizacao';

export interface ResumoModulo {
  id: ModuloId;
  nome: string;
  peso: number;
  score: number;
  /** Uma frase com o que mais pesou neste módulo. */
  resumo: string;
}

export type Confianca = 'alta' | 'media' | 'baixa';

export interface ResultadoAnalise {
  versaoPremissas: string;
  scoreMedia: number;
  score: number;
  semaforo: Semaforo;
  rotulo: string;
  veredito: string;
  travaAplicada: string | null;
  eliminatorias: string[];
  confianca: Confianca;
  explicacaoConfianca: string;
  desconto: number;
  modulos: ResumoModulo[];
  avisos: Aviso[];
  financeiro: ResultadoFinanceiro;
  juridico: ResultadoJuridico;
  ocupacao: ResultadoOcupacao;
  localizacao: ResultadoLocalizacao;
}

function avaliarConfianca(e: EntradaAnalise): { confianca: Confianca; explicacao: string } {
  const itens: [string, boolean][] = [
    ['quem ocupa', !!e.ocupacao && e.ocupacao !== 'nao_informado' && e.ocupacao !== 'ocupado_nao_informado'],
    ['matrícula conferida', e.checklist?.matriculaConferida === 'sim'],
    ['dívidas atrasadas', e.dividaCondominio !== undefined || e.condominioPagoPor === 'caixa'],
    ['leiloeiro', e.modalidade === 'leilao_sfi' || (e.temLeiloeiro ?? 'nao_verificado') !== 'nao_verificado'],
  ];
  const conhecidos = itens.filter(([, ok]) => ok).length;
  const faltam = itens.filter(([, ok]) => !ok).map(([n]) => n);
  const confianca: Confianca = conhecidos === 4 ? 'alta' : conhecidos >= 2 ? 'media' : 'baixa';
  const explicacao = faltam.length
    ? `Ainda não confirmado: ${faltam.join(', ')}. Esses itens são os que mais mudam o resultado.`
    : 'Os itens que mais mudam o resultado estão confirmados.';
  return { confianca, explicacao };
}

export function analisar(e: EntradaAnalise, p: Premissas = PREMISSAS): ResultadoAnalise {
  const financeiro = analisarFinanceiro(e, p);
  const juridico = analisarJuridico({
    checklist: e.checklist ?? {},
    matriculaDisponivel: e.matriculaDisponivel,
    compradorAssumeCondominio: !!e.dividaCondominio && e.condominioPagoPor !== 'caixa',
    compradorAssumeIptu: !!e.dividaIptu && e.iptuPagoPor !== 'caixa',
    texto: e.texto,
  });
  const ocupacao = analisarOcupacao(e.ocupacao);
  const localizacao = analisarLocalizacao(e.bairro, e.faixaBairro);

  const real = financeiro.cenarios.realista;
  const modulos: ResumoModulo[] = [
    {
      id: 'juridico', nome: 'Jurídico', peso: PESOS.juridico, score: juridico.score,
      resumo: juridico.eliminatorias.length
        ? `Problema eliminatório: ${juridico.eliminatorias.join('; ')}.`
        : juridico.score === 100
          ? 'Matrícula conferida e sem problemas marcados.'
          : `Matrícula ${e.checklist?.matriculaConferida === 'sim' ? 'conferida' : 'ainda não conferida'}${juridico.linhas.some((l) => l.valor < 0) ? '; há pontos descontados no checklist' : ''}.`,
    },
    {
      id: 'financeiro', nome: 'Financeiro', peso: PESOS.financeiro, score: financeiro.score,
      resumo: `Retorno anual realista de ${pct(real.roiAnual)}, contra ${pct(financeiro.retornoExigido)} exigidos.`,
    },
    { id: 'ocupacao', nome: 'Ocupação', peso: PESOS.ocupacao, score: ocupacao.score, resumo: `${ocupacao.rotulo}. ${ocupacao.explicacao}` },
    { id: 'localizacao', nome: 'Localização', peso: PESOS.localizacao, score: localizacao.score, resumo: localizacao.explicacao },
  ];

  const scoreMedia = modulos.reduce((s, m) => s + m.peso * m.score, 0);
  const eliminatorias = juridico.eliminatorias;

  let semaforo = semaforoDoScore(scoreMedia);
  let score = scoreMedia;
  let travaAplicada: string | null = null;

  if (eliminatorias.length) {
    semaforo = 'E';
    score = 0;
  } else {
    if (financeiro.minimoAcimaDoEquilibrio && pior(semaforo, 'D') !== semaforo) {
      semaforo = 'D';
      travaAplicada = 'No preço mínimo, o cenário realista dá prejuízo: semáforo limitado a D.';
    } else if (financeiro.minimoAcimaDoLanceMaximo && pior(semaforo, 'C') !== semaforo) {
      semaforo = 'C';
      travaAplicada = 'No preço mínimo, o retorno fica abaixo do exigido: semáforo limitado a C.';
    }
  }

  // Veredito: semáforo + o que o preço permite + o módulo que mais puxa para baixo.
  let veredito: string;
  if (eliminatorias.length) {
    veredito = `E — Não recomendado: ${eliminatorias.join('; ').toLowerCase()}.`;
  } else {
    const lm = financeiro.lanceMaximo;
    const preco =
      lm === null
        ? 'nem com lance zero o retorno chega ao exigido'
        : e.valorMinimo > lm
          ? `o retorno só chega ao exigido com lance até ${brl(lm)}, e o mínimo da Caixa é ${brl(e.valorMinimo)}`
          : `vale a pena com lance até ${brl(lm)} (o mínimo é ${brl(e.valorMinimo)})`;
    const maisPesa = [...modulos].sort((a, b) => b.peso * (100 - b.score) - a.peso * (100 - a.score))[0];
    veredito = `${semaforo} — ${rotuloSemaforo(semaforo)}: ${preco}. O que mais pesa contra: ${maisPesa.nome.toLowerCase()} (${Math.round(maisPesa.score)}/100).`;
  }

  const desconto = 1 - e.valorMinimo / e.valorAvaliacao;
  const avisos: Aviso[] = [...juridico.avisos.filter((a) => a.tipo === 'eliminatoria')];
  if (desconto > 0.5)
    avisos.push({ id: 'desconto_alto', tipo: 'atencao', titulo: `Desconto de ${pct(desconto)}`, motivo: 'Desconto acima de 50% pode indicar problema sério no imóvel.', acao: 'Procure o motivo no edital e na matrícula.' });
  avisos.push(...juridico.avisos.filter((a) => a.tipo !== 'eliminatoria'), ...ocupacao.avisos, ...financeiro.avisos, ...localizacao.avisos);
  if (e.modalidade === 'venda_direta_online' || e.modalidade === 'venda_online')
    avisos.push({ id: 'venda_direta', tipo: 'positiva', titulo: 'Venda direta da Caixa', motivo: 'O imóvel já passou por leilão sem comprador.', acao: 'Compra sem disputa de lances.' });

  const { confianca, explicacao } = avaliarConfianca(e);

  return {
    versaoPremissas: p.versao, scoreMedia, score, semaforo, rotulo: rotuloSemaforo(semaforo), veredito, travaAplicada,
    eliminatorias, confianca, explicacaoConfianca: explicacao, desconto, modulos, avisos,
    financeiro, juridico, ocupacao, localizacao,
  };
}
