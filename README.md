# LeilãoClaro

Vitrine de imóveis em leilão já pré-analisados (semáforo A–E, score 0–100, lance máximo recomendado e flags de risco), começando pelos imóveis da Caixa em São Paulo.

## Motor de análise

Especificação aprovada: documento "LeilãoClaro — Especificação do motor de análise (v1)".

O motor fica em `src/engine/`, em TypeScript puro (sem tela, banco ou rede):

- `premissas.ts` — todos os valores que não vêm do imóvel, com versão
- `financeiro.ts` — módulo Financeiro: 7 blocos de custo, 3 cenários, ROI anualizado, lance máximo, lance de equilíbrio, score e avisos, cada número com explicação e origem
- `financeiro.test.ts` — o exemplo calculado da especificação, linha a linha, mais as regras

```bash
npm run test:engine   # testes do motor
npm run typecheck
```

## Sprint 1 · item 3 — Scraper da Caixa

```bash
npm install
npm run scrape                         # 10 apartamentos em São Paulo (capital)
npm run scrape -- --tipo ambos         # apartamentos + casas
npm run scrape -- --cidade CAMPINAS --limite 20 --salvar-html
npm test                               # testes dos parsers
```

Saída: `data/caixa-sp-<tipo>-<data>.json`. Com `--salvar-html`, o HTML bruto de cada imóvel vai para `data/html/<id>.html` (fica fora do git) para conferir e ajustar o parser.

### Como funciona

O formulário `busca-imovel.asp` é um assistente em etapas que chama endpoints AJAX. O script chama os mesmos endpoints, na mesma ordem, usando o cliente HTTP do Playwright:

1. `GET busca-imovel.asp` — cookies de sessão
2. `POST carregaListaCidades.asp` — descobre o id da cidade (a Caixa exige escolher uma cidade)
3. `POST carregaPesquisaImoveis.asp` — devolve `hdnImov1..N` com os números dos imóveis por página
4. `POST detalhe-imovel.asp` (`hdnimovel=<id>`) — página de detalhe, interpretada por `scraper/parse.js`

Códigos dos filtros: tipo `1` = Casa, `2` = Apartamento. Modalidades: `14` Leilão SFI, `21` Licitação Aberta, `33` Venda Online, `34` Venda Direta Online, `30` Direito de Preferência.

Campos extraídos por imóvel: endereço, tipo, quartos, vagas, áreas, valor de avaliação, valor mínimo (e 1º/2º leilão quando houver), desconto calculado (e o desconto declarado pela Caixa), modalidade, descrição, link do edital, link e número da matrícula, comarca/ofício, ocupação (classificada + trecho de origem), regras de despesas, formas de pagamento, fotos e `texto_bruto` (para a engine de score procurar termos como penhora, usucapião etc.).

### ⚠️ Proteção anti-bot

O portal usa o Radware Bot Manager. IPs de nuvem/datacenter costumam ser redirecionados para um captcha (`validate.perfdrive.com`). O script **não tenta contornar isso**: ao detectar o desafio, ele para e avisa. Rode a partir de uma conexão comum (sua máquina). O script espaça as requisições (`--delay`, padrão 2,5 s) e se identifica com um user-agent próprio.

Para a coleta diária (Sprint 3), uma alternativa a avaliar é a lista CSV oficial que a Caixa publica por UF (`/listaweb/Lista_imoveis_SP.csv`) para a parte da listagem, deixando só os detalhes por imóvel para o scraper.
