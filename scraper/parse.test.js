const test = require('node:test');
const assert = require('node:assert');
const { parseBRL, parseArea, parsePaginasImoveis, parseCidades, detectarOcupacao } = require('./parse');

test('parseBRL', () => {
  assert.strictEqual(parseBRL('R$ 1.234.567,89'), 1234567.89);
  assert.strictEqual(parseBRL('R$ 150.000,00 ( desconto de 40%)'), 150000);
  assert.strictEqual(parseBRL(null), null);
});

test('parseArea', () => {
  assert.strictEqual(parseArea('45,50m2'), 45.5);
  assert.strictEqual(parseArea('= 120.00 m²'), 120);
});

test('parseCidades ignora "Selecione"', () => {
  const html = "<option value=''>Selecione</option><option value='9859'>SAO PAULO</option>";
  assert.deepStrictEqual(parseCidades(html), [{ id: '9859', nome: 'SAO PAULO' }]);
});

test('parsePaginasImoveis junta ids das páginas', () => {
  const html = `<input type="hidden" id="hdnImov1" value="1444400001||1444400002">
                <input type="hidden" id="hdnImov2" value="1444400003">
                <input type="hidden" id="hdnQtdRegistros" value="3">`;
  const r = parsePaginasImoveis(html);
  assert.deepStrictEqual(r.ids, ['1444400001', '1444400002', '1444400003']);
  assert.strictEqual(r.qtdRegistros, 3);
});

test('detectarOcupacao', () => {
  assert.strictEqual(detectarOcupacao('Imóvel ocupado.').situacao, 'ocupado_nao_especificado');
  assert.strictEqual(detectarOcupacao('Imóvel desocupado').situacao, 'desocupado');
  assert.strictEqual(detectarOcupacao('Apartamento com 2 quartos').situacao, 'omissa');
});
