#!/usr/bin/env node
// Scraper do portal de imóveis da Caixa (venda-imoveis.caixa.gov.br).
//
// Reproduz o fluxo da página busca-imovel.asp chamando os mesmos endpoints AJAX
// que ela usa (Estado -> Cidade -> Pesquisa -> Lista -> Detalhe), via cliente
// HTTP do Playwright. Não usa navegador nem tenta contornar a proteção anti-bot
// do site: identifica-se com um user-agent próprio e espaça as requisições.
//
// Uso:
//   node scraper/caixa.js [--estado SP] [--cidade "SAO PAULO"] [--tipo apartamento|casa|ambos]
//                         [--limite 10] [--delay 2500] [--out data/arquivo.json]

const fs = require('fs');
const path = require('path');
const { request } = require('playwright');
const { parseCidades, parsePaginasImoveis, parseDetalhe } = require('./parse');

const BASE = 'https://venda-imoveis.caixa.gov.br/sistema';
const TIPOS = { casa: '1', apartamento: '2' };

function args() {
  const a = process.argv.slice(2);
  const get = (k, d) => {
    const i = a.indexOf('--' + k);
    return i >= 0 && a[i + 1] ? a[i + 1] : d;
  };
  return {
    estado: get('estado', 'SP'),
    cidade: get('cidade', 'SAO PAULO'),
    tipo: get('tipo', 'apartamento'),
    limite: Number(get('limite', 10)),
    delay: Number(get('delay', 2500)),
    timeout: Number(get('timeout', 90000)),
    out: get('out', null),
    salvarHtml: a.includes('--salvar-html'),
  };
}

class AntiBotError extends Error {
  constructor(url) {
    super(
      `O site da Caixa respondeu ${url} com o desafio anti-bot (Radware/perfdrive). ` +
        'Isso costuma acontecer com IPs de datacenter/nuvem. Rode o script a partir de uma ' +
        'conexão comum (ex.: sua máquina) ou aguarde algumas horas antes de tentar de novo.',
    );
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...m) => console.error(`[${new Date().toISOString().slice(11, 19)}]`, ...m);

// O site serve ISO-8859-1.
const decode = (buf) => new TextDecoder('latin1').decode(buf);

async function main() {
  const opt = args();
  const tipos = opt.tipo === 'ambos' ? ['apartamento', 'casa'] : [opt.tipo];

  const ctx = await request.newContext({
    baseURL: BASE + '/',
    userAgent: 'LeilaoClaro-Scraper/0.1 (+pesquisa de mercado; contato via site)',
    extraHTTPHeaders: { 'Accept-Language': 'pt-BR,pt;q=0.9' },
    timeout: opt.timeout,
    // O APIRequestContext do Playwright não lê HTTPS_PROXY sozinho.
    ...(process.env.HTTPS_PROXY || process.env.https_proxy
      ? { proxy: { server: process.env.HTTPS_PROXY || process.env.https_proxy } }
      : {}),
  });

  let last = 0;
  async function call(method, url, form, tentativas = 4) {
    for (let t = 1; t <= tentativas; t++) {
      const wait = last + opt.delay - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      try {
        const res = await ctx.fetch(url, {
          method,
          form,
          maxRedirects: 0,
          headers: form ? { 'X-Requested-With': 'XMLHttpRequest', Referer: BASE + '/busca-imovel.asp' } : {},
        });
        const loc = res.headers()['location'] || '';
        const body = decode(await res.body());
        // Radware Bot Manager: redireciona para validate.perfdrive.com (captcha).
        // Não tentamos contornar — paramos e avisamos.
        if (/perfdrive|captcha/i.test(loc + body.slice(0, 2000))) throw new AntiBotError(url);
        if (res.ok()) return body;
        log(`${url}: HTTP ${res.status()} — tentativa ${t}/${tentativas}`);
      } catch (e) {
        if (e instanceof AntiBotError) throw e;
        log(`${url}: ${e.message.split('\n')[0]} — tentativa ${t}/${tentativas}`);
      }
      await sleep(opt.delay * 2 ** t);
    }
    throw new Error(`Falha ao acessar ${url} após ${tentativas} tentativas`);
  }

  const filtrosVazios = {
    cmb_tp_venda: '', cmb_area_util: '', cmb_faixa_vlr: '', cmb_quartos: '', cmb_vg_garagem: '',
    strValorSimulador: '', strAceitaFGTS: '', strAceitaFinanciamento: '',
  };

  log('Abrindo busca-imovel.asp (cookies de sessão)…');
  await call('GET', 'busca-imovel.asp');

  log(`Carregando cidades de ${opt.estado}…`);
  const cidades = parseCidades(
    await call('POST', 'carregaListaCidades.asp', { ...filtrosVazios, cmb_estado: opt.estado, cmb_cidade: '', cmb_tp_imovel: TIPOS[tipos[0]] }),
  );
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  const cidade = cidades.find((c) => norm(c.nome) === norm(opt.cidade));
  if (!cidade) throw new Error(`Cidade "${opt.cidade}" não encontrada. Disponíveis: ${cidades.slice(0, 20).map((c) => c.nome).join(', ')}…`);
  log(`Cidade: ${cidade.nome} (id ${cidade.id})`);

  const imoveis = [];
  const erros = [];
  const porTipo = Math.ceil(opt.limite / tipos.length);

  for (const tipo of tipos) {
    log(`Pesquisando ${tipo}…`);
    const pesquisa = parsePaginasImoveis(
      await call('POST', 'carregaPesquisaImoveis.asp', {
        hdn_estado: opt.estado, hdn_cidade: cidade.id, hdn_bairro: '', hdn_tp_venda: 'Selecione',
        hdn_tp_imovel: TIPOS[tipo], hdn_area_util: 'Selecione', hdn_faixa_vlr: 'Selecione',
        hdn_quartos: 'Selecione', hdn_vg_garagem: 'Selecione', strValorSimulador: '',
        strAceitaFGTS: '', strAceitaFinanciamento: '', hdn_pagamento_despesas: 'Selecione',
      }),
    );
    log(`${pesquisa.ids.length} imóveis encontrados (${pesquisa.paginas.length} páginas).`);

    for (const id of pesquisa.ids.slice(0, porTipo)) {
      log(`Detalhe ${id}…`);
      try {
        const html = await call('POST', 'detalhe-imovel.asp', { hdnimovel: id, hdnorigem: 'buscaimovel', hdn_estado: opt.estado, hdn_cidade: cidade.id });
        if (opt.salvarHtml) {
          fs.mkdirSync('data/html', { recursive: true });
          fs.writeFileSync(`data/html/${id}.html`, html);
        }
        const d = parseDetalhe(html, id);
        imoveis.push({ ...d, tipo_busca: tipo, uf: opt.estado, cidade: cidade.nome });
      } catch (e) {
        erros.push({ id, erro: e.message });
        log(`  erro: ${e.message}`);
      }
    }
  }

  await ctx.dispose();

  const out = opt.out || `data/caixa-${opt.estado.toLowerCase()}-${opt.tipo}-${new Date().toISOString().slice(0, 10)}.json`;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    JSON.stringify({ fonte: BASE, coletado_em: new Date().toISOString(), filtros: { ...opt, cidade: cidade.nome }, total: imoveis.length, erros, imoveis }, null, 2),
  );
  log(`✔ ${imoveis.length} imóveis salvos em ${out}${erros.length ? ` (${erros.length} erros)` : ''}`);
}

main().catch((e) => {
  log('✖', e.message);
  process.exit(1);
});
