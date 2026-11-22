// Extrator: texto copiado da página do imóvel da Caixa (Ctrl+A, Ctrl+C) -> campos.
// Campos encontrados são marcados como "confirmado"; o usuário revisa tudo na tela.
// Baseado no layout conhecido da página detalhe-imovel.asp; ajustar com anúncios reais.

import type { EntradaAnalise } from './analisar';
import { BAIRROS_SP, normalizarBairro } from './localizacao';
import type { Modalidade, Ocupacao, Origem } from './tipos';

export interface Extracao {
  campos: Partial<EntradaAnalise>;
  /** Informações exibidas na tela, sem entrar no cálculo. */
  info: {
    titulo?: string;
    endereco?: string;
    tipoImovel?: string;
    numeroImovel?: string;
    matricula?: string;
    inscricaoImobiliaria?: string;
    comarca?: string;
    valor1Leilao?: number;
    valor2Leilao?: number;
    trechoOcupacao?: string;
  };
  /** Nomes legíveis do que foi encontrado e do que faltou. */
  encontrados: string[];
  faltando: string[];
}

export function parseBRL(s?: string | null): number | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/);
  if (!m) return undefined;
  return Number(m[1].replace(/\./g, '') + '.' + (m[2] ?? '0'));
}

function parseArea(s?: string | null): number | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1].replace(',', '.')) : undefined;
}

/** Valor depois de "Rótulo:" ou "Rótulo =" na mesma linha (ou na seguinte, se a linha acabar no rótulo). */
function valorDoRotulo(texto: string, rotulo: RegExp): string | undefined {
  const re = new RegExp(rotulo.source + '\\s*[:=]\\s*([^\\n]*)(?:\\n([^\\n]*))?', 'i');
  const m = texto.match(re);
  if (!m) return undefined;
  const v = (m[1].trim() || m[2]?.trim() || '').trim();
  return v || undefined;
}

const MODALIDADES: { re: RegExp; valor: Modalidade }[] = [
  { re: /leil[aã]o\s+sfi/i, valor: 'leilao_sfi' },
  { re: /venda direta online|compra direta/i, valor: 'venda_direta_online' },
  { re: /licita[cç][aã]o aberta/i, valor: 'licitacao_aberta' },
  { re: /direito de prefer[eê]ncia/i, valor: 'direito_preferencia' },
  { re: /venda online/i, valor: 'venda_online' },
];

const OCUPACOES: { re: RegExp; valor: Ocupacao }[] = [
  { re: /invadid|invas[aã]o|esbulho/i, valor: 'invadido' },
  { re: /ocupado por terceiro|terceiros? ocupante/i, valor: 'terceiro_sem_contrato' },
  { re: /locat[aá]rio|contrato de loca[cç][aã]o/i, valor: 'locatario' },
  { re: /ocupado pelo (antigo )?(mutu[aá]rio|devedor|propriet[aá]rio|ex-?mutu[aá]rio)/i, valor: 'ocupado_devedor' },
  { re: /\bdesocupado\b|im[oó]vel vago/i, valor: 'desocupado' },
  { re: /\bocupado\b/i, valor: 'ocupado_nao_informado' },
];

function acharBairro(endereco: string | undefined, texto: string): string | undefined {
  const alvo = normalizarBairro(endereco ?? texto);
  // Nome mais longo primeiro, para "Alto de Pinheiros" ganhar de "Pinheiros".
  const nomes = Object.keys(BAIRROS_SP).sort((a, b) => b.length - a.length);
  for (const nome of nomes) {
    const n = normalizarBairro(nome);
    if (new RegExp(`(^|[^a-z])${n.replace(/ /g, '\\s+')}([^a-z]|$)`).test(alvo)) return nome;
  }
  // Formato "..., BAIRRO - CEP: ..."
  const m = endereco?.match(/,\s*([^,]+?)\s*-\s*CEP/i);
  if (m) return m[1].trim().toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  return undefined;
}

export function extrair(texto: string): Extracao {
  const t = texto.replace(/\r/g, '').replace(/[ \t ]+/g, ' ');
  const campos: Partial<EntradaAnalise> = {};
  const origens: Partial<Record<keyof EntradaAnalise, Origem>> = {};
  const info: Extracao['info'] = {};
  const encontrados: string[] = [];
  const faltando: string[] = [];
  const marca = <K extends keyof EntradaAnalise>(campo: K, valor: EntradaAnalise[K] | undefined, nome: string) => {
    if (valor === undefined) return faltando.push(nome);
    campos[campo] = valor;
    origens[campo] = 'confirmado';
    encontrados.push(nome);
  };

  marca('valorAvaliacao', parseBRL(valorDoRotulo(t, /Valor de avalia[cç][aã]o/)), 'Valor de avaliação');

  info.valor1Leilao = parseBRL(valorDoRotulo(t, /Valor m[ií]nimo de venda 1[ºo°]?\s*Leil[aã]o/));
  info.valor2Leilao = parseBRL(valorDoRotulo(t, /Valor m[ií]nimo de venda 2[ºo°]?\s*Leil[aã]o/));
  const minimoSimples = parseBRL(valorDoRotulo(t, /Valor m[ií]nimo de venda(?!\s*\d)/));
  marca('valorMinimo', info.valor2Leilao ?? minimoSimples ?? info.valor1Leilao, 'Valor mínimo de venda');

  const modalidade = MODALIDADES.find((m) => m.re.test(t))?.valor;
  marca('modalidade', modalidade, 'Modalidade');
  if (/leiloeir[oa]\s*(\(a\))?\s*:/i.test(t)) {
    campos.temLeiloeiro = 'sim';
    origens.temLeiloeiro = 'confirmado';
    encontrados.push('Leiloeiro');
  }

  const areaPriv = parseArea(valorDoRotulo(t, /[AÁ]rea privativa/));
  const areaUtil = parseArea(valorDoRotulo(t, /[AÁ]rea [uú]til/));
  marca('areaPrivativaM2', areaPriv ?? areaUtil, 'Área privativa');

  const endMatch = t.match(/Endere[cç]o\s*:?\s*\n?([^\n]+)/i);
  info.endereco = endMatch?.[1].trim();
  marca('bairro', acharBairro(info.endereco, info.endereco ? '' : t), 'Bairro');

  const ocup = OCUPACOES.map((o) => ({ o, m: o.re.exec(t) })).find((x) => x.m);
  if (ocup) {
    marca('ocupacao', ocup.o.valor, 'Ocupação');
    info.trechoOcupacao = t.slice(Math.max(0, ocup.m!.index - 60), ocup.m!.index + 100).replace(/\s+/g, ' ').trim();
  } else faltando.push('Ocupação');

  info.matricula = valorDoRotulo(t, /Matr[ií]cula\(?s?\)?/);
  campos.matriculaDisponivel = !!info.matricula || /matr[ií]cula/i.test(t);
  info.inscricaoImobiliaria = valorDoRotulo(t, /Inscri[cç][aã]o imobili[aá]ria/);
  info.comarca = valorDoRotulo(t, /Comarca/);
  info.tipoImovel = valorDoRotulo(t, /Tipo de im[oó]vel/);
  info.numeroImovel = valorDoRotulo(t, /N[uú]mero do im[oó]vel/);

  const cond = t.match(/Condom[ií]nio\s*:\s*Sob responsabilidade d[oa]\s+(comprador|CAIXA)([^\n]*)/i);
  if (cond) {
    campos.condominioPagoPor = /caixa/i.test(cond[1]) ? 'caixa' : /limite/i.test(cond[2]) ? 'comprador_ate_limite' : 'comprador_integral';
    origens.condominioPagoPor = 'confirmado';
    encontrados.push('Regra do condomínio atrasado');
  }
  const trib = t.match(/Tributos\s*:\s*Sob responsabilidade d[oa]\s+(comprador|CAIXA)/i);
  if (trib) {
    campos.iptuPagoPor = /caixa/i.test(trib[1]) ? 'caixa' : 'comprador';
    origens.iptuPagoPor = 'confirmado';
    encontrados.push('Regra do IPTU atrasado');
  }

  campos.texto = texto;
  campos.origens = origens;
  return { campos, info, encontrados, faltando };
}
