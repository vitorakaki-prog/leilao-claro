// Módulo Localização (peso 15%).
// v1: tabela fixa de bairros de São Paulo, PROPOSTA para revisão.
// Premium 80–90, intermediário 50–70, periférico 20–45.

import type { Aviso, Origem } from './tipos';

export type FaixaBairro = 'premium' | 'intermediario' | 'periferico';

export const NOTA_FAIXA: Record<FaixaBairro, number> = { premium: 85, intermediario: 60, periferico: 33 };

export const BAIRROS_SP: Record<string, { nota: number; faixa: FaixaBairro }> = {
  // Premium
  'Jardim Paulista': { nota: 90, faixa: 'premium' },
  'Jardim América': { nota: 90, faixa: 'premium' },
  'Jardim Europa': { nota: 90, faixa: 'premium' },
  'Itaim Bibi': { nota: 90, faixa: 'premium' },
  'Vila Nova Conceição': { nota: 90, faixa: 'premium' },
  'Pinheiros': { nota: 88, faixa: 'premium' },
  'Moema': { nota: 88, faixa: 'premium' },
  'Vila Olímpia': { nota: 87, faixa: 'premium' },
  'Higienópolis': { nota: 86, faixa: 'premium' },
  'Alto de Pinheiros': { nota: 86, faixa: 'premium' },
  'Cerqueira César': { nota: 86, faixa: 'premium' },
  'Vila Madalena': { nota: 85, faixa: 'premium' },
  'Paraíso': { nota: 85, faixa: 'premium' },
  'Perdizes': { nota: 84, faixa: 'premium' },
  'Vila Mariana': { nota: 84, faixa: 'premium' },
  'Brooklin': { nota: 82, faixa: 'premium' },
  'Campo Belo': { nota: 82, faixa: 'premium' },
  'Consolação': { nota: 80, faixa: 'premium' },
  'Morumbi': { nota: 80, faixa: 'premium' },
  'Pompeia': { nota: 80, faixa: 'premium' },
  'Aclimação': { nota: 80, faixa: 'premium' },
  // Intermediário
  'Tatuapé': { nota: 70, faixa: 'intermediario' },
  'Saúde': { nota: 70, faixa: 'intermediario' },
  'Santana': { nota: 68, faixa: 'intermediario' },
  'Lapa': { nota: 68, faixa: 'intermediario' },
  'Vila Leopoldina': { nota: 68, faixa: 'intermediario' },
  'Mooca': { nota: 66, faixa: 'intermediario' },
  'Butantã': { nota: 64, faixa: 'intermediario' },
  'Barra Funda': { nota: 64, faixa: 'intermediario' },
  'Água Branca': { nota: 64, faixa: 'intermediario' },
  'Ipiranga': { nota: 62, faixa: 'intermediario' },
  'Bela Vista': { nota: 62, faixa: 'intermediario' },
  'Santo Amaro': { nota: 62, faixa: 'intermediario' },
  'Liberdade': { nota: 60, faixa: 'intermediario' },
  'Vila Prudente': { nota: 58, faixa: 'intermediario' },
  'Vila Sônia': { nota: 58, faixa: 'intermediario' },
  'Cambuci': { nota: 56, faixa: 'intermediario' },
  'Jabaquara': { nota: 56, faixa: 'intermediario' },
  'Casa Verde': { nota: 56, faixa: 'intermediario' },
  'Belém': { nota: 56, faixa: 'intermediario' },
  'Vila Guilherme': { nota: 55, faixa: 'intermediario' },
  'Penha': { nota: 55, faixa: 'intermediario' },
  'Freguesia do Ó': { nota: 54, faixa: 'intermediario' },
  'República': { nota: 52, faixa: 'intermediario' },
  'Jaguaré': { nota: 52, faixa: 'intermediario' },
  // Periférico
  'Pirituba': { nota: 45, faixa: 'periferico' },
  'Itaquera': { nota: 42, faixa: 'periferico' },
  'Cangaíba': { nota: 42, faixa: 'periferico' },
  'Campo Limpo': { nota: 40, faixa: 'periferico' },
  'Ermelino Matarazzo': { nota: 40, faixa: 'periferico' },
  'Cidade Ademar': { nota: 38, faixa: 'periferico' },
  'Jaraguá': { nota: 38, faixa: 'periferico' },
  'São Mateus': { nota: 35, faixa: 'periferico' },
  'Sapopemba': { nota: 35, faixa: 'periferico' },
  'Jardim São Luís': { nota: 32, faixa: 'periferico' },
  'Vila Curuçá': { nota: 32, faixa: 'periferico' },
  'Capão Redondo': { nota: 30, faixa: 'periferico' },
  'Brasilândia': { nota: 30, faixa: 'periferico' },
  'Perus': { nota: 30, faixa: 'periferico' },
  'Itaim Paulista': { nota: 30, faixa: 'periferico' },
  'Guaianases': { nota: 28, faixa: 'periferico' },
  'Grajaú': { nota: 25, faixa: 'periferico' },
  'Jardim Ângela': { nota: 25, faixa: 'periferico' },
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
