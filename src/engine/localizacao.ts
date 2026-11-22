// Módulo Localização (peso 15%).
// v1: tabela fixa de bairros de São Paulo, PROPOSTA para revisão.
// Premium 80–90, intermediário 50–70, periférico 20–45.

import type { Aviso, Origem } from './tipos';

export type FaixaBairro = 'premium' | 'intermediario' | 'periferico';

export const NOTA_FAIXA: Record<FaixaBairro, number> = { premium: 85, intermediario: 60, periferico: 33 };

export const BAIRROS_SP: Record<string, { nota: number; faixa: FaixaBairro }> = {
  // Premium
  'Jardim Paulista': { nota: 90, faixa: 'premium' },
  'Jardim America': { nota: 90, faixa: 'premium' },
  'Jardim Europa': { nota: 90, faixa: 'premium' },
  'Itaim Bibi': { nota: 90, faixa: 'premium' },
  'Vila Nova Conceicao': { nota: 90, faixa: 'premium' },
  'Pinheiros': { nota: 88, faixa: 'premium' },
  'Moema': { nota: 88, faixa: 'premium' },
  'Vila Olimpia': { nota: 87, faixa: 'premium' },
  'Higienopolis': { nota: 86, faixa: 'premium' },
  'Alto de Pinheiros': { nota: 86, faixa: 'premium' },
  'Cerqueira Cesar': { nota: 86, faixa: 'premium' },
  'Vila Madalena': { nota: 85, faixa: 'premium' },
  'Paraiso': { nota: 85, faixa: 'premium' },
  'Perdizes': { nota: 84, faixa: 'premium' },
  'Vila Mariana': { nota: 84, faixa: 'premium' },
  'Brooklin': { nota: 82, faixa: 'premium' },
  'Campo Belo': { nota: 82, faixa: 'premium' },
  'Consolacao': { nota: 80, faixa: 'premium' },
  'Morumbi': { nota: 80, faixa: 'premium' },
  'Pompeia': { nota: 80, faixa: 'premium' },
  'Aclimacao': { nota: 80, faixa: 'premium' },
  // Intermediário
  'Tatuape': { nota: 70, faixa: 'intermediario' },
  'Saude': { nota: 70, faixa: 'intermediario' },
  'Santana': { nota: 68, faixa: 'intermediario' },
  'Lapa': { nota: 68, faixa: 'intermediario' },
  'Vila Leopoldina': { nota: 68, faixa: 'intermediario' },
  'Mooca': { nota: 66, faixa: 'intermediario' },
  'Butanta': { nota: 64, faixa: 'intermediario' },
  'Barra Funda': { nota: 64, faixa: 'intermediario' },
  'Agua Branca': { nota: 64, faixa: 'intermediario' },
  'Ipiranga': { nota: 62, faixa: 'intermediario' },
  'Bela Vista': { nota: 62, faixa: 'intermediario' },
  'Santo Amaro': { nota: 62, faixa: 'intermediario' },
  'Liberdade': { nota: 60, faixa: 'intermediario' },
  'Vila Prudente': { nota: 58, faixa: 'intermediario' },
  'Vila Sonia': { nota: 58, faixa: 'intermediario' },
  'Cambuci': { nota: 56, faixa: 'intermediario' },
  'Jabaquara': { nota: 56, faixa: 'intermediario' },
  'Casa Verde': { nota: 56, faixa: 'intermediario' },
  'Belem': { nota: 56, faixa: 'intermediario' },
  'Vila Guilherme': { nota: 55, faixa: 'intermediario' },
  'Penha': { nota: 55, faixa: 'intermediario' },
  'Freguesia do O': { nota: 54, faixa: 'intermediario' },
  'Republica': { nota: 52, faixa: 'intermediario' },
  'Jaguare': { nota: 52, faixa: 'intermediario' },
  // Periférico
  'Pirituba': { nota: 45, faixa: 'periferico' },
  'Itaquera': { nota: 42, faixa: 'periferico' },
  'Cangaiba': { nota: 42, faixa: 'periferico' },
  'Campo Limpo': { nota: 40, faixa: 'periferico' },
  'Ermelino Matarazzo': { nota: 40, faixa: 'periferico' },
  'Cidade Ademar': { nota: 38, faixa: 'periferico' },
  'Jaragua': { nota: 38, faixa: 'periferico' },
  'Sao Mateus': { nota: 35, faixa: 'periferico' },
  'Sapopemba': { nota: 35, faixa: 'periferico' },
  'Jardim Sao Luis': { nota: 32, faixa: 'periferico' },
  'Vila Curuca': { nota: 32, faixa: 'periferico' },
  'Capao Redondo': { nota: 30, faixa: 'periferico' },
  'Brasilandia': { nota: 30, faixa: 'periferico' },
  'Perus': { nota: 30, faixa: 'periferico' },
  'Itaim Paulista': { nota: 30, faixa: 'periferico' },
  'Guaianases': { nota: 28, faixa: 'periferico' },
  'Grajau': { nota: 25, faixa: 'periferico' },
  'Jardim Angela': { nota: 25, faixa: 'periferico' },
  'Cidade Tiradentes': { nota: 22, faixa: 'periferico' },
  'Parelheiros': { nota: 20, faixa: 'periferico' },
};

export const normalizarBairro = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

const INDICE = new Map(Object.entries(BAIRROS_SP).map(([nome, v]) => [normalizarBairro(nome), { nome, ...v }]));

export function buscarBairro(bairro: string) {
  return INDICE.get(normalizarBairro(bairro)) ?? null;
}

const ROTULO_FAIXA: Record<FaixaBairro, string> = { premium: 'premium', intermediario: 'intermediário', periferico: 'periférico' };

export interface ResultadoLocalizacao {
  score: number;
  origem: Origem;
  explicacao: string;
  avisos: Aviso[];
}

export function analisarLocalizacao(bairro?: string, faixaInformada?: FaixaBairro): ResultadoLocalizacao {
  const achado = bairro ? buscarBairro(bairro) : null;
  if (achado)
    return { score: achado.nota, origem: 'estimado', explicacao: `${achado.nome}: bairro ${ROTULO_FAIXA[achado.faixa]}, nota ${achado.nota} na tabela do LeilãoClaro.`, avisos: [] };
  if (faixaInformada)
    return { score: NOTA_FAIXA[faixaInformada], origem: 'informado', explicacao: `${bairro ? `${bairro} não está na tabela; ` : ''}você classificou como ${ROTULO_FAIXA[faixaInformada]} (nota ${NOTA_FAIXA[faixaInformada]}, meio da faixa).`, avisos: [] };
  return {
    score: NOTA_FAIXA.intermediario,
    origem: 'estimado',
    explicacao: `${bairro ? `${bairro} não está na tabela` : 'Bairro não informado'}; usada a nota média de bairro intermediário (${NOTA_FAIXA.intermediario}).`,
    avisos: [{ id: 'bairro_fora_da_tabela', tipo: 'atencao', titulo: 'Bairro sem nota', motivo: 'A nota de localização foi estimada como intermediária.', acao: 'Escolha se o bairro é premium, intermediário ou periférico.' }],
  };
}
