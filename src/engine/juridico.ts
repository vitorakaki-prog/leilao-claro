// Módulo Jurídico (peso 30%).
// Começa em 80 e vai a 100 só com a matrícula conferida sem ônus impeditivo.
// Cada item do checklist: sim, não ou não verificado. Não verificado não tira ponto,
// mas vira ponto de atenção e reduz a confiança da análise.

import type { Aviso, LinhaExplicada, SimNaoVerificado } from './tipos';

export interface ChecklistJuridico {
  /** Você leu a matrícula e não achou ônus impeditivo. */
  matriculaConferida?: SimNaoVerificado;
  leilaoJudicial?: SimNaoVerificado;
  hipotecaOuPenhoraTerceiro?: SimNaoVerificado;
  penhoraTrabalhista?: SimNaoVerificado;
  bemDeFamilia?: SimNaoVerificado;
  fraudeExecucao?: SimNaoVerificado;
  usucapiao?: SimNaoVerificado;
}

export interface EntradaJuridica {
  checklist: ChecklistJuridico;
  /** A Caixa disponibiliza número ou PDF da matrícula. */
  matriculaDisponivel?: boolean;
  /** Comprador assume condomínio atrasado (vem do Financeiro). */
  compradorAssumeCondominio?: boolean;
  /** Comprador assume IPTU atrasado (vem do Financeiro). */
  compradorAssumeIptu?: boolean;
  /** Texto colado do anúncio/edital, para procurar termos de risco. */
  texto?: string;
}

export interface TermoEncontrado {
  termo: string;
  trecho: string;
}

export interface ResultadoJuridico {
  score: number;
  linhas: LinhaExplicada[];
  eliminatorias: string[];
  termosEncontrados: TermoEncontrado[];
  itensNaoVerificados: string[];
  avisos: Aviso[];
}

const BASE = 80;

const ELIMINATORIAS: { campo: keyof ChecklistJuridico; rotulo: string }[] = [
  { campo: 'penhoraTrabalhista', rotulo: 'Penhora trabalhista sem solução' },
  { campo: 'bemDeFamilia', rotulo: 'Bem de família declarado' },
  { campo: 'fraudeExecucao', rotulo: 'Fraude à execução mencionada' },
  { campo: 'usucapiao', rotulo: 'Usucapião em andamento' },
];

const TERMOS_DE_RISCO: { termo: string; re: RegExp }[] = [
  { termo: 'penhora', re: /penhor(a|ado|ada)/i },
  { termo: 'usucapião', re: /usucapi[aã]o/i },
  { termo: 'bem de família', re: /bem de fam[ií]lia/i },
  { termo: 'fraude à execução', re: /fraude [àa] execu[cç][aã]o/i },
  { termo: 'ação judicial', re: /a[cç][aã]o judicial|processo judicial|demanda judicial/i },
  { termo: 'indisponibilidade', re: /indisponibilidade/i },
  { termo: 'arrolamento', re: /arrolamento/i },
  { termo: 'hipoteca', re: /hipoteca/i },
];

function trecho(texto: string, index: number) {
  const ini = Math.max(0, index - 80);
  const fim = Math.min(texto.length, index + 120);
  return (ini > 0 ? '…' : '') + texto.slice(ini, fim).replace(/\s+/g, ' ').trim() + (fim < texto.length ? '…' : '');
}

export function procurarTermos(texto: string): TermoEncontrado[] {
  const achados: TermoEncontrado[] = [];
  for (const t of TERMOS_DE_RISCO) {
    const m = t.re.exec(texto);
    if (m) achados.push({ termo: t.termo, trecho: trecho(texto, m.index) });
  }
  return achados;
}

export function analisarJuridico(e: EntradaJuridica): ResultadoJuridico {
  const c = e.checklist;
  const linhas: LinhaExplicada[] = [];
  const avisos: Aviso[] = [];
  let score = BASE;

  linhas.push({ id: 'base', rotulo: 'Ponto de partida', valor: BASE, explicacao: 'Todo imóvel começa em 80; chega a 100 só com a matrícula conferida.', origem: 'estimado' });

  if (c.matriculaConferida === 'sim') {
    score += 20;
    linhas.push({ id: 'matricula', rotulo: 'Matrícula conferida', valor: 20, explicacao: 'Você leu a matrícula e não achou ônus que impeça a compra.', origem: 'informado' });
  }

  const desconto = (id: string, rotulo: string, pontos: number, explicacao: string) => {
    score -= pontos;
    linhas.push({ id, rotulo, valor: -pontos, explicacao, origem: 'informado' });
  };
  if (c.leilaoJudicial === 'sim') desconto('judicial', 'Leilão judicial', 15, 'Leilão judicial tem mais chance de contestação que a venda direta da Caixa.');
  if (e.compradorAssumeCondominio) desconto('condominio', 'Condomínio atrasado por sua conta', 10, 'A dívida também entra como custo no Financeiro.');
  if (e.compradorAssumeIptu) desconto('iptu', 'IPTU atrasado por sua conta', 5, 'A dívida também entra como custo no Financeiro.');
  if (c.hipotecaOuPenhoraTerceiro === 'sim')
    desconto('onus_terceiro', 'Hipoteca ou penhora a favor de terceiro', 10, 'Garantia a favor de outro credor precisa ser baixada; a da própria Caixa sai na venda e não conta.');

  score = Math.max(0, Math.min(100, score));

  const eliminatorias = ELIMINATORIAS.filter((x) => c[x.campo] === 'sim').map((x) => x.rotulo);
  if (score < 20) eliminatorias.push('Score jurídico abaixo de 20');

  const itensNaoVerificados = [
    ...(c.matriculaConferida !== 'sim' ? ['Matrícula'] : []),
    ...ELIMINATORIAS.filter((x) => (c[x.campo] ?? 'nao_verificado') === 'nao_verificado').map((x) => x.rotulo),
  ];

  if (e.matriculaDisponivel === false)
    avisos.push({ id: 'matricula_indisponivel', tipo: 'atencao', titulo: 'Matrícula não disponível no anúncio', motivo: 'Sem a matrícula não dá para conferir dívidas, penhoras e outros ônus.', acao: 'Peça a matrícula atualizada no cartório de registro de imóveis da região.' });
  else if (c.matriculaConferida !== 'sim')
    avisos.push({ id: 'matricula_nao_conferida', tipo: 'atencao', titulo: 'Matrícula não conferida', motivo: 'O score jurídico fica em no máximo 80 até a matrícula ser lida.', acao: 'Baixe a matrícula no anúncio da Caixa e preencha o checklist jurídico.' });

  const termosEncontrados = e.texto ? procurarTermos(e.texto) : [];
  for (const t of termosEncontrados)
    avisos.push({ id: `termo_${t.termo}`, tipo: 'atencao', titulo: `Termo de risco no texto: "${t.termo}"`, motivo: `Aparece em: ${t.trecho}`, acao: 'Leia o trecho e marque o item correspondente no checklist.' });

  for (const el of eliminatorias)
    avisos.push({ id: `eliminatoria_${el}`, tipo: 'eliminatoria', titulo: el, motivo: 'Este problema pode fazer você perder o imóvel ou o dinheiro investido.', acao: 'Não dê lance.' });

  return { score, linhas, eliminatorias, termosEncontrados, itensNaoVerificados, avisos };
}
