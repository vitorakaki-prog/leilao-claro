// Parsers puros (sem rede) para o HTML do portal de imóveis da Caixa.
// Mantidos separados do scraper para poderem ser testados com fixtures salvas.
const cheerio = require('cheerio');

const BASE = 'https://venda-imoveis.caixa.gov.br';

/** "R$ 1.234.567,89" -> 1234567.89 */
function parseBRL(str) {
  if (!str) return null;
  const m = String(str).match(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?/);
  if (!m) return null;
  return Number(m[1].replace(/\./g, '') + '.' + (m[2] || '0'));
}

/** "45,50m2" / "45.50 m²" -> 45.5 */
function parseArea(str) {
  if (!str) return null;
  const m = String(str).match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1].replace(',', '.')) : null;
}

const clean = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim() || null);

/** Opções <option value="ID">NOME</option> da lista de cidades. */
function parseCidades(html) {
  const $ = cheerio.load(html);
  return $('option')
    .map((_, el) => ({ id: clean($(el).attr('value')), nome: clean($(el).text()) }))
    .get()
    .filter((o) => o.id && o.nome && !/selecione/i.test(o.nome));
}

/**
 * Resposta de carregaPesquisaImoveis.asp: inputs ocultos hdnImov1..N, cada um com
 * os números dos imóveis daquela página separados por "||".
 */
function parsePaginasImoveis(html) {
  const $ = cheerio.load(html);
  const paginas = [];
  $('input[id^="hdnImov"]').each((_, el) => {
    const n = Number(($(el).attr('id') || '').replace('hdnImov', ''));
    const val = $(el).attr('value') || '';
    if (n) paginas[n - 1] = val;
  });
  const ids = paginas
    .filter(Boolean)
    .flatMap((v) => v.split(/\|\||,|;/))
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));
  return {
    paginas: paginas.filter(Boolean),
    ids: [...new Set(ids)],
    qtdRegistros: Number($('#hdnQtdRegistros').attr('value')) || ids.length,
  };
}

/** Extrai "Rótulo: valor" do texto corrido da página de detalhe. */
function labelValue(text, labelRegex) {
  const re = new RegExp(labelRegex.source + '\\s*[:=]?\\s*([^\\n]+)', 'i');
  const m = text.match(re);
  return m ? clean(m[1]) : null;
}

const OCUPACAO_PATTERNS = [
  { re: /invadid|invas[aã]o|esbulho/i, valor: 'invadido' },
  { re: /ocupado por terceiro|terceiros? ocupante/i, valor: 'ocupado_terceiro' },
  { re: /locat[aá]rio|locado|contrato de loca[cç][aã]o/i, valor: 'ocupado_locatario' },
  { re: /ocupado pelo (antigo )?(mutu[aá]rio|devedor|propriet[aá]rio|ex-?mutu[aá]rio)/i, valor: 'ocupado_devedor' },
  { re: /im[oó]vel (encontra-se )?desocupado|im[oó]vel vago|\bdesocupado\b/i, valor: 'desocupado' },
  { re: /im[oó]vel ocupado|\bocupado\b/i, valor: 'ocupado_nao_especificado' },
];

function detectarOcupacao(text) {
  for (const p of OCUPACAO_PATTERNS) {
    const m = text.match(p.re);
    if (m) {
      const i = Math.max(0, m.index - 80);
      return { situacao: p.valor, trecho: clean(text.slice(i, m.index + 160)) };
    }
  }
  return { situacao: 'omissa', trecho: null };
}

function absUrl(path) {
  if (!path) return null;
  if (/^https?:/i.test(path)) return path;
  return BASE + (path.startsWith('/') ? '' : '/') + path.replace(/^\.\.\//, '');
}

/** Página detalhe-imovel.asp -> objeto normalizado. */
function parseDetalhe(html, id) {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();

  // Texto com quebras de linha preservadas entre blocos, para regex por rótulo.
  $('br').replaceWith('\n');
  $('p, div, li, span, h1, h2, h3, h4, h5, h6, tr').each((_, el) => {
    $(el).append('\n');
  });
  const content = $('.content-wrapper, .content, #conteudo, main, body').first();
  const text = content
    .text()
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

  const rawHtml = cheerio.load(html);
  const docs = [];
  rawHtml('[onclick*="ExibeDoc"], a[href*="ExibeDoc"]').each((_, el) => {
    const attr = rawHtml(el).attr('onclick') || rawHtml(el).attr('href') || '';
    const m = attr.match(/ExibeDoc\(\s*['"]([^'"]+)['"]/);
    if (m) docs.push({ label: clean(rawHtml(el).text()), url: absUrl(m[1]) });
  });
  const edital = docs.find((d) => /edital|\/editais\/(?!matricula)/i.test((d.label || '') + d.url)) || null;
  const matriculaDoc = docs.find((d) => /matr[ií]cula/i.test((d.label || '') + d.url)) || null;

  const titulo = clean(rawHtml('h5').first().text());

  const avaliacao = parseBRL(labelValue(text, /Valor de avalia[cç][aã]o/));
  const leilao1 = parseBRL(labelValue(text, /Valor m[ií]nimo de venda 1[ºo°]? Leil[aã]o/));
  const leilao2 = parseBRL(labelValue(text, /Valor m[ií]nimo de venda 2[ºo°]? Leil[aã]o/));
  const minimoTxt = labelValue(text, /Valor m[ií]nimo de venda(?! \d)/);
  const minimo = parseBRL(minimoTxt);
  const descontoDeclarado = (minimoTxt || text).match(/desconto de\s*([\d.,]+)\s*%/i);

  const valorMinimo = leilao2 || minimo || leilao1;
  const desconto =
    avaliacao && valorMinimo ? Math.round((1 - valorMinimo / avaliacao) * 10000) / 100 : null;

  const enderecoMatch = text.match(/Endere[cç]o\s*:?\s*\n?([^\n]+(?:\n[^\n:]+CEP[^\n]*)?)/i);
  const descricaoMatch = text.match(/Descri[cç][aã]o\s*:?\s*\n?([^\n]+)/i);

  const modalidade =
    labelValue(text, /Modalidade de venda/) ||
    (text.match(/(Venda Direta Online|Compra Direta|Venda Online|Licita[cç][aã]o Aberta|Leil[aã]o SFI[^\n]*|Exerc[ií]cio de Direito de Prefer[eê]ncia)/i) || [])[1] ||
    null;

  const matricula = labelValue(text, /Matr[ií]cula\(?s?\)?/);

  return {
    id,
    url_detalhe: `${BASE}/sistema/detalhe-imovel.asp?hdnimovel=${id}`,
    titulo,
    endereco: enderecoMatch ? clean(enderecoMatch[1]) : null,
    tipo_imovel: labelValue(text, /Tipo de im[oó]vel/),
    quartos: Number(labelValue(text, /Quartos/)) || null,
    vagas_garagem: Number(labelValue(text, /Garagem/)) || null,
    area_total_m2: parseArea(labelValue(text, /[AÁ]rea total/)),
    area_privativa_m2: parseArea(labelValue(text, /[AÁ]rea privativa/)),
    area_terreno_m2: parseArea(labelValue(text, /[AÁ]rea do terreno/)),
    valor_avaliacao: avaliacao,
    valor_minimo_venda: minimo,
    valor_minimo_1_leilao: leilao1,
    valor_minimo_2_leilao: leilao2,
    desconto_percentual: desconto,
    desconto_declarado_caixa: descontoDeclarado ? Number(descontoDeclarado[1].replace(',', '.')) : null,
    modalidade: clean(modalidade),
    descricao: descricaoMatch ? clean(descricaoMatch[1]) : null,
    link_edital: edital ? edital.url : null,
    link_matricula: matriculaDoc ? matriculaDoc.url : null,
    numero_matricula: matricula,
    comarca: labelValue(text, /Comarca/),
    oficio: labelValue(text, /Of[ií]cio/),
    inscricao_imobiliaria: labelValue(text, /Inscri[cç][aã]o imobili[aá]ria/),
    ocupacao: detectarOcupacao(text),
    regras_despesas: labelValue(text, /Regras para pagamento das despesas[^\n]*/),
    formas_pagamento: labelValue(text, /Formas? de pagamento aceitas?/),
    fotos: rawHtml('img[src*="/fotos/"]')
      .map((_, el) => absUrl(rawHtml(el).attr('src')))
      .get(),
    documentos: docs,
    texto_bruto: text,
  };
}

module.exports = { parseBRL, parseArea, parseCidades, parsePaginasImoveis, parseDetalhe, detectarOcupacao };
