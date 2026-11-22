// Premissas do motor de análise.
// Todo número que não vem do imóvel fica aqui, com versão e data.
// Cada análise guarda a versão usada, para poder ser reproduzida depois.
// Referência: documento "LeilãoClaro — Especificação do motor de análise (v1)".

export type Faixa = { min: number; max: number };

export const meio = (f: Faixa) => (f.min + f.max) / 2;

export const PREMISSAS = {
  versao: '2026-11-22.1',

  // Retorno mínimo exigido = Selic + 10 pontos percentuais ao ano.
  premioSobreSelic: 0.10,

  // ITBI São Paulo capital: 3% (site da Prefeitura). Base = maior entre o lance e o
  // valor venal de referência; em leilão (arrematação), base = valor arrematado.
  itbiAliquota: 0.03,

  comissaoLeiloeiro: 0.05,

  // Custos em faixa: o motor usa o meio nos três cenários; os multiplicadores fazem a variação.
  registro: { min: 2000, max: 5000 } as Faixa,
  certidoes: { min: 500, max: 2000 } as Faixa,
  advogado: { min: 3000, max: 8000 } as Faixa,
  averbacao: { min: 2000, max: 5000 } as Faixa,
  regularizacaoFiscal: { min: 1000, max: 3000 } as Faixa,

  reformaPorM2: { economico: 500, medio: 1000, alto: 1500 },

  // Desocupação: custo (R$) e prazo (meses) por situação.
  desocupacao: {
    desocupado: { custo: { min: 0, max: 0 }, meses: { min: 0, max: 0 } },
    ocupado_devedor: { custo: { min: 8000, max: 15000 }, meses: { min: 6, max: 12 } },
    locatario: { custo: { min: 15000, max: 30000 }, meses: { min: 12, max: 18 } },
    terceiro_sem_contrato: { custo: { min: 15000, max: 30000 }, meses: { min: 12, max: 18 } },
    invadido: { custo: { min: 20000, max: 40000 }, meses: { min: 18, max: 36 } },
    // Sem saber quem ocupa: faixa completa, do devedor ao terceiro sem contrato (estimativa).
    ocupado_nao_informado: { custo: { min: 8000, max: 30000 }, meses: { min: 6, max: 18 } },
    nao_informado: { custo: { min: 8000, max: 30000 }, meses: { min: 6, max: 18 } },
  } as Record<string, { custo: Faixa; meses: Faixa }>,

  // Prazo até vender, sem contar desocupação.
  prazoDocumentacaoMeses: 2,
  prazoReformaMeses: 3,
  prazoVendaMeses: { min: 6, max: 12 } as Faixa,

  // Condomínio + IPTU mensais quando não informados.
  despesaMensalPorM2: 10,

  corretagemVenda: 0.06,

  // IR sobre ganho de capital, alíquotas por parcela do ganho (progressivo).
  irFaixas: [
    { ate: 5_000_000, aliquota: 0.15 },
    { ate: 10_000_000, aliquota: 0.175 },
    { ate: 30_000_000, aliquota: 0.2 },
    { ate: Infinity, aliquota: 0.225 },
  ],

  // Regra comum da Caixa: comprador paga condomínio atrasado até 10% da avaliação.
  limiteCondominioCompradorSobreAvaliacao: 0.10,

  cenarios: {
    pessimista: { fatorVenda: 0.85, multiplicadorCustos: 1.3 },
    realista: { fatorVenda: 0.95, multiplicadorCustos: 1.1 },
    otimista: { fatorVenda: 1.05, multiplicadorCustos: 1.0 },
  },

  // Score financeiro: ROI anual realista interpolado entre estes pontos.
  // "selic + x" é expresso como deslocamento sobre a Selic.
  scoreFinanceiroPontos: [
    { roiSobreSelic: null as number | null, roiAbsoluto: 0, score: 0 },
    { roiSobreSelic: 0, roiAbsoluto: null as number | null, score: 40 },
    { roiSobreSelic: 0.10, roiAbsoluto: null, score: 75 },
    { roiSobreSelic: 0.25, roiAbsoluto: null, score: 100 },
  ],
  tetoScoreFinanceiroComPrejuizoPessimista: 60,
} as const;

export type Premissas = typeof PREMISSAS;
