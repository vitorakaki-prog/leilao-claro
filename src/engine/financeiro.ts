// Módulo Financeiro (peso 35%).
// Responde: comprando por este lance, o lucro anual supera o retorno mínimo exigido
// (Selic + 10 p.p.)? Função pura: sem rede, sem banco, sem data atual.

import { PREMISSAS, meio, type Faixa, type Premissas } from './premissas';
import { brl, meses, pct } from './formatar';
import type {
  Aviso,
  Cenario,
  LinhaExplicada,
  Modalidade,
  Ocupacao,
  Origem,
  PadraoReforma,
  SimNaoVerificado,
} from './tipos';

export interface EntradaFinanceira {
  valorAvaliacao: number;
  valorMinimo: number;
  /** Lance pretendido. Padrão: o valor mínimo. */
  lance?: number;
  /** Selic ao ano, em fração (0.12 = 12%). */
  selic: number;
  modalidade: Modalidade;
  /** Padrão: não verificado. */
  temLeiloeiro?: SimNaoVerificado;
  valorVenalReferencia?: number;
  areaPrivativaM2: number;
  /** Padrão: econômico. */
  padraoReforma?: PadraoReforma;
  /** Padrão: não informado. */
  ocupacao?: Ocupacao;
  precisaAverbacao?: boolean;
  precisaRegularizacaoFiscal?: boolean;
  /** Condomínio atrasado total (R$). */
  dividaCondominio?: number;
  /** Padrão: comprador paga até 10% da avaliação (regra comum da Caixa). */
  condominioPagoPor?: 'comprador_ate_limite' | 'comprador_integral' | 'caixa';
  /** IPTU atrasado total (R$). */
  dividaIptu?: number;
  /** Padrão: comprador. */
  iptuPagoPor?: 'comprador' | 'caixa';
  /** Condomínio + IPTU por mês (R$). Padrão: estimado por m². */
  despesaMensal?: number;
  /** Substitui a avaliação como base do valor de venda. */
  valorVendaEsperado?: number;
  /** Fixa o tempo de venda (sem documentação, reforma e desocupação). */
  prazoVendaMeses?: number;
  isencaoIR?: boolean;
  /** Origem dos campos lidos da página ou da matrícula (o resto é "informado" ou "estimado"). */
  origens?: Partial<Record<keyof EntradaFinanceira, Origem>>;
}

export interface ResultadoCenario {
  cenario: Cenario;
  lance: number;
  meses: number;
  /** Custos exceto o lance, antes do multiplicador do cenário. */
  linhasCusto: LinhaExplicada[];
  subtotalCustos: number;
  multiplicadorCustos: number;
  custosAjustados: number;
  custoTotal: number;
  valorVenda: number;
  corretagem: number;
  ganhoTributavel: number;
  ir: number;
  lucro: number;
  roiPeriodo: number;
  roiAnual: number;
}

export interface ResultadoFinanceiro {
  versaoPremissas: string;
  lance: number;
  retornoExigido: number;
  cenarios: Record<Cenario, ResultadoCenario>;
  /** Maior lance com ROI anual realista >= retorno exigido. null: nem com lance zero. */
  lanceMaximo: number | null;
  /** Lance em que o lucro realista é zero. */
  lanceEquilibrio: number | null;
  score: number;
  explicacaoScore: string;
  minimoAcimaDoLanceMaximo: boolean;
  minimoAcimaDoEquilibrio: boolean;
  avisos: Aviso[];
}

const CENARIOS: Cenario[] = ['pessimista', 'realista', 'otimista'];

/** Pessimista usa o topo da faixa de prazo, realista o meio, otimista a base. */
function prazoDoCenario(f: Faixa, c: Cenario) {
  return c === 'pessimista' ? f.max : c === 'otimista' ? f.min : meio(f);
}

function origemDe(e: EntradaFinanceira, campo: keyof EntradaFinanceira): Origem {
  if (e.origens?.[campo]) return e.origens[campo]!;
  return e[campo] === undefined ? 'estimado' : 'informado';
}

function irProgressivo(ganho: number, p: Premissas) {
  let imposto = 0;
  let piso = 0;
  for (const f of p.irFaixas) {
    if (ganho <= piso) break;
    imposto += (Math.min(ganho, f.ate) - piso) * f.aliquota;
    piso = f.ate;
  }
  return imposto;
}

function mesesDoCenario(e: EntradaFinanceira, c: Cenario, p: Premissas) {
  const ocup = e.ocupacao ?? 'nao_informado';
  const desoc = prazoDoCenario(p.desocupacao[ocup].meses, c);
  const venda = e.prazoVendaMeses ?? prazoDoCenario(p.prazoVendaMeses, c);
  return { total: p.prazoDocumentacaoMeses + p.prazoReformaMeses + desoc + venda, desoc, venda };
}

function comissaoAplicada(e: EntradaFinanceira) {
  const tem = e.temLeiloeiro ?? 'nao_verificado';
  if (tem === 'nao') return { aplica: false, motivo: 'Você conferiu no edital: não há leiloeiro.', origem: 'informado' as Origem };
  if (tem === 'sim') return { aplica: true, motivo: 'Você conferiu no edital: há leiloeiro.', origem: 'informado' as Origem };
  if (e.modalidade === 'leilao_sfi')
    return { aplica: true, motivo: 'Leilão SFI é conduzido por leiloeiro.', origem: 'confirmado' as Origem };
  return {
    aplica: true,
    motivo: 'Não foi confirmado se há leiloeiro; por segurança, a comissão foi incluída.',
    origem: 'estimado' as Origem,
  };
}

/** Custos exceto o lance, antes do multiplicador do cenário. */
function linhasDeCusto(e: EntradaFinanceira, lance: number, c: Cenario, p: Premissas): LinhaExplicada[] {
  const linhas: LinhaExplicada[] = [];
  const add = (l: LinhaExplicada) => linhas.push(l);

  // Bloco 1: aquisição
  const com = comissaoAplicada(e);
  add({
    id: 'comissao',
    rotulo: 'Comissão do leiloeiro',
    valor: com.aplica ? lance * p.comissaoLeiloeiro : 0,
    explicacao: com.aplica ? `${pct(p.comissaoLeiloeiro)} sobre o lance de ${brl(lance)}. ${com.motivo}` : com.motivo,
    origem: com.origem,
  });

  const arrematacao = e.modalidade === 'leilao_sfi';
  const vvr = e.valorVenalReferencia;
  const baseItbi = arrematacao ? lance : Math.max(lance, vvr ?? 0);
  add({
    id: 'itbi',
    rotulo: 'ITBI',
    valor: baseItbi * p.itbiAliquota,
    explicacao: arrematacao
      ? `${pct(p.itbiAliquota)} sobre o valor arrematado (${brl(lance)}), regra da Prefeitura para leilão.`
      : vvr === undefined
        ? `${pct(p.itbiAliquota)} sobre o lance (${brl(lance)}). O valor venal de referência não foi informado; se for maior que o lance, a Prefeitura cobra sobre ele.`
        : `${pct(p.itbiAliquota)} sobre ${brl(baseItbi)}, o maior entre o lance e o valor venal de referência (${brl(vvr)}).`,
    origem: arrematacao ? 'confirmado' : origemDe(e, 'valorVenalReferencia'),
  });

  add({
    id: 'registro',
    rotulo: 'Registro em cartório',
    valor: meio(p.registro),
    explicacao: `Meio da faixa estimada de ${brl(p.registro.min)} a ${brl(p.registro.max)}.`,
    origem: 'estimado',
  });

  // Bloco 2: documentação
  add({
    id: 'documentacao',
    rotulo: 'Certidões e advogado',
    valor: meio(p.certidoes) + meio(p.advogado),
    explicacao: `Certidões (${brl(meio(p.certidoes))}) e advogado (${brl(meio(p.advogado))}), meio das faixas estimadas.`,
    origem: 'estimado',
  });

  // Bloco 3: desocupação
  const ocup = e.ocupacao ?? 'nao_informado';
  const desoc = p.desocupacao[ocup];
  add({
    id: 'desocupacao',
    rotulo: 'Desocupação',
    valor: meio(desoc.custo),
    explicacao:
      ocup === 'desocupado'
        ? 'Imóvel desocupado: sem custo de desocupação.'
        : ocup === 'ocupado_nao_informado' || ocup === 'nao_informado'
          ? `Não se sabe quem ocupa: meio da faixa completa (${brl(desoc.custo.min)} a ${brl(desoc.custo.max)}).`
          : `Meio da faixa estimada para esta ocupação (${brl(desoc.custo.min)} a ${brl(desoc.custo.max)}).`,
    origem: ocup === 'desocupado' ? origemDe(e, 'ocupacao') : 'estimado',
  });

  // Bloco 4: regularização
  if (e.precisaAverbacao)
    add({ id: 'averbacao', rotulo: 'Averbação de construção', valor: meio(p.averbacao), explicacao: `Há área a averbar: meio da faixa de ${brl(p.averbacao.min)} a ${brl(p.averbacao.max)}.`, origem: 'estimado' });
  if (e.precisaRegularizacaoFiscal)
    add({ id: 'regularizacao_fiscal', rotulo: 'Regularização fiscal', valor: meio(p.regularizacaoFiscal), explicacao: `Meio da faixa de ${brl(p.regularizacaoFiscal.min)} a ${brl(p.regularizacaoFiscal.max)}.`, origem: 'estimado' });

  // Bloco 5: reforma
  const padrao = e.padraoReforma ?? 'economico';
  const porM2 = p.reformaPorM2[padrao];
  add({
    id: 'reforma',
    rotulo: 'Reforma',
    valor: e.areaPrivativaM2 * porM2,
    explicacao: `${e.areaPrivativaM2} m² × ${brl(porM2)}/m² (padrão ${padrao === 'economico' ? 'econômico' : padrao === 'medio' ? 'médio' : 'alto'}).`,
    origem: e.padraoReforma ? 'informado' : 'estimado',
  });

  // Bloco 6: dívidas assumidas
  const regraCond = e.condominioPagoPor ?? 'comprador_ate_limite';
  if (e.dividaCondominio && regraCond !== 'caixa') {
    const limite = e.valorAvaliacao * p.limiteCondominioCompradorSobreAvaliacao;
    const valor = regraCond === 'comprador_integral' ? e.dividaCondominio : Math.min(e.dividaCondominio, limite);
    add({
      id: 'divida_condominio',
      rotulo: 'Condomínio atrasado',
      valor,
      explicacao:
        regraCond === 'comprador_integral'
          ? `Dívida de ${brl(e.dividaCondominio)}, toda por conta do comprador.`
          : `Dívida de ${brl(e.dividaCondominio)}; o comprador paga até ${pct(p.limiteCondominioCompradorSobreAvaliacao)} da avaliação (${brl(limite)}) e a Caixa o excedente.`,
      origem: origemDe(e, 'dividaCondominio'),
    });
  }
  if (e.dividaIptu && (e.iptuPagoPor ?? 'comprador') === 'comprador')
    add({ id: 'divida_iptu', rotulo: 'IPTU atrasado', valor: e.dividaIptu, explicacao: `Dívida de IPTU por conta do comprador.`, origem: origemDe(e, 'dividaIptu') });

  // Bloco 7: manutenção até vender
  const m = mesesDoCenario(e, c, p);
  const mensal = e.despesaMensal ?? e.areaPrivativaM2 * p.despesaMensalPorM2;
  add({
    id: 'manutencao',
    rotulo: 'Condomínio e IPTU até vender',
    valor: mensal * m.total,
    explicacao: `${brl(mensal)}/mês × ${meses(m.total)}${e.despesaMensal === undefined ? ` (estimado em ${brl(p.despesaMensalPorM2)}/m²)` : ''}.`,
    origem: origemDe(e, 'despesaMensal'),
  });

  return linhas;
}

export function calcularCenario(e: EntradaFinanceira, lance: number, c: Cenario, p: Premissas = PREMISSAS): ResultadoCenario {
  const cfg = p.cenarios[c];
  const linhasCusto = linhasDeCusto(e, lance, c, p);
  const subtotalCustos = linhasCusto.reduce((s, l) => s + l.valor, 0);
  const custosAjustados = subtotalCustos * cfg.multiplicadorCustos;
  const custoTotal = lance + custosAjustados;
  const valorVenda = (e.valorVendaEsperado ?? e.valorAvaliacao) * cfg.fatorVenda;
  const corretagem = valorVenda * p.corretagemVenda;
  const ganhoTributavel = Math.max(0, valorVenda - corretagem - custoTotal);
  const ir = e.isencaoIR ? 0 : irProgressivo(ganhoTributavel, p);
  const lucro = valorVenda - corretagem - ir - custoTotal;
  const roiPeriodo = lucro / custoTotal;
  const n = mesesDoCenario(e, c, p).total;
  const roiAnual = roiPeriodo <= -1 ? -1 : Math.pow(1 + roiPeriodo, 12 / n) - 1;
  return {
    cenario: c, lance, meses: n, linhasCusto, subtotalCustos, multiplicadorCustos: cfg.multiplicadorCustos,
    custosAjustados, custoTotal, valorVenda, corretagem, ganhoTributavel, ir, lucro, roiPeriodo, roiAnual,
  };
}

/** Maior lance (em reais inteiros) que ainda satisfaz a condição, que piora com o lance. */
function maiorLance(ok: (lance: number) => boolean, teto: number): number | null {
  if (!ok(0)) return null;
  let lo = 0;
  let hi = teto;
  if (ok(hi)) return hi;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

export function scoreFinanceiro(roiAnualRealista: number, selic: number, p: Premissas = PREMISSAS) {
  const pts = p.scoreFinanceiroPontos.map((pt) => ({
    x: pt.roiAbsoluto ?? selic + (pt.roiSobreSelic as number),
    y: pt.score,
  }));
  if (roiAnualRealista <= pts[0].x) return pts[0].y;
  const ultimo = pts.at(-1)!;
  if (roiAnualRealista >= ultimo.x) return ultimo.y;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (roiAnualRealista <= b.x) return a.y + ((roiAnualRealista - a.x) / (b.x - a.x)) * (b.y - a.y);
  }
  return ultimo.y;
}

export function analisarFinanceiro(e: EntradaFinanceira, p: Premissas = PREMISSAS): ResultadoFinanceiro {
  const lance = e.lance ?? e.valorMinimo;
  const retornoExigido = e.selic + p.premioSobreSelic;
  const cenarios = Object.fromEntries(CENARIOS.map((c) => [c, calcularCenario(e, lance, c, p)])) as Record<Cenario, ResultadoCenario>;
  const real = cenarios.realista;
  const pess = cenarios.pessimista;

  const teto = Math.ceil((e.valorVendaEsperado ?? e.valorAvaliacao) * 2);
  const lanceMaximo = maiorLance((l) => calcularCenario(e, l, 'realista', p).roiAnual >= retornoExigido, teto);
  const lanceEquilibrio = maiorLance((l) => calcularCenario(e, l, 'realista', p).lucro >= 0, teto);

  let score = scoreFinanceiro(real.roiAnual, e.selic, p);
  let explicacaoScore =
    `Retorno anual realista de ${pct(real.roiAnual)}, contra Selic de ${pct(e.selic)} e mínimo exigido de ${pct(retornoExigido)}.`;
  if (pess.lucro < 0 && score > p.tetoScoreFinanceiroComPrejuizoPessimista) {
    score = p.tetoScoreFinanceiroComPrejuizoPessimista;
    explicacaoScore += ` Limitado a ${score} porque o cenário pessimista dá prejuízo.`;
  }

  const minimoAcimaDoLanceMaximo = lanceMaximo === null || e.valorMinimo > lanceMaximo;
  const minimoAcimaDoEquilibrio = lanceEquilibrio === null || e.valorMinimo > lanceEquilibrio;

  const avisos: Aviso[] = [];
  const com = comissaoAplicada(e);
  if (com.origem === 'estimado')
    avisos.push({
      id: 'leiloeiro_nao_verificado', tipo: 'atencao', titulo: 'Leiloeiro não confirmado',
      motivo: `A comissão de ${pct(p.comissaoLeiloeiro)} foi incluída no custo por segurança (${brl(lance * p.comissaoLeiloeiro)} neste lance).`,
      acao: 'Abra o edital, procure "leiloeiro" ou "comissão" e marque se há leiloeiro.',
    });
  if (e.modalidade !== 'leilao_sfi' && e.valorVenalReferencia === undefined)
    avisos.push({
      id: 'vvr_nao_informado', tipo: 'atencao', titulo: 'Valor venal de referência não informado',
      motivo: 'O ITBI foi calculado sobre o lance. Se o valor venal de referência da Prefeitura for maior, o imposto sobe.',
      acao: 'Consulte o valor no serviço de ITBI da Prefeitura, com o número do IPTU do imóvel, e informe aqui.',
    });
  if (pess.lucro < 0)
    avisos.push({
      id: 'prejuizo_pessimista', tipo: 'atencao', titulo: 'Prejuízo no cenário pessimista',
      motivo: `Se a venda sair por ${brl(pess.valorVenda)} e os custos ficarem 30% acima do previsto, o prejuízo é de ${brl(-pess.lucro)}.`,
      acao: 'Reveja o lance ou o valor de venda esperado.',
    });
  if (minimoAcimaDoLanceMaximo)
    avisos.push({
      id: 'minimo_acima_lance_maximo', tipo: 'atencao', titulo: 'Preço mínimo acima do lance máximo',
      motivo: lanceMaximo === null
        ? 'Nem com lance zero o retorno realista alcança o mínimo exigido.'
        : `O retorno exigido só é alcançado com lance até ${brl(lanceMaximo)}; o mínimo é ${brl(e.valorMinimo)}.`,
      acao: 'Espere uma próxima rodada com preço menor, ou desista.',
    });
  if (e.condominioPagoPor === 'caixa' || e.iptuPagoPor === 'caixa')
    avisos.push({
      id: 'caixa_paga_dividas', tipo: 'positiva', titulo: 'Caixa paga dívidas atrasadas',
      motivo: 'Condomínio e/ou IPTU atrasados ficam por conta da Caixa.',
      acao: 'Nada a fazer: o custo já foi tirado do cálculo.',
    });

  return {
    versaoPremissas: p.versao, lance, retornoExigido, cenarios, lanceMaximo, lanceEquilibrio,
    score, explicacaoScore, minimoAcimaDoLanceMaximo, minimoAcimaDoEquilibrio, avisos,
  };
}
