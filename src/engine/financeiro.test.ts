import { describe, expect, it } from 'vitest';
import { analisarFinanceiro, calcularCenario, scoreFinanceiro, type EntradaFinanceira } from './financeiro';

// Exemplo da seção "Exemplo calculado" da especificação.
const base: EntradaFinanceira = {
  valorAvaliacao: 400_000,
  valorMinimo: 240_000,
  selic: 0.12,
  modalidade: 'venda_direta_online',
  temLeiloeiro: 'nao',
  valorVenalReferencia: 200_000,
  areaPrivativaM2: 60,
  padraoReforma: 'economico',
  ocupacao: 'desocupado',
  despesaMensal: 700,
};
const ocupado: EntradaFinanceira = { ...base, ocupacao: 'ocupado_devedor' };

const reais = (v: number) => Math.round(v);
const linha = (r: ReturnType<typeof calcularCenario>, id: string) => r.linhasCusto.find((l) => l.id === id)?.valor;

describe('exemplo da especificação — imóvel vazio', () => {
  const r = analisarFinanceiro(base);
  const real = r.cenarios.realista;

  it('custos linha a linha no cenário realista', () => {
    expect(linha(real, 'itbi')).toBe(7_200);
    expect(linha(real, 'registro')).toBe(3_500);
    expect(linha(real, 'documentacao')).toBe(6_750);
    expect(linha(real, 'desocupacao')).toBe(0);
    expect(linha(real, 'reforma')).toBe(30_000);
    expect(linha(real, 'manutencao')).toBe(9_800);
    expect(linha(real, 'comissao')).toBe(0);
    expect(real.meses).toBe(14);
    expect(reais(real.custosAjustados)).toBe(62_975);
    expect(reais(real.custoTotal)).toBe(302_975);
  });

  it('venda, imposto e lucro', () => {
    expect(real.valorVenda).toBe(380_000);
    expect(real.corretagem).toBe(22_800);
    expect(reais(real.ir)).toBe(8_134);
    expect(reais(real.lucro)).toBe(46_091);
    expect(real.roiPeriodo).toBeCloseTo(0.152, 3);
    expect(real.roiAnual).toBeCloseTo(0.129, 3);
  });

  it('cenários, lance máximo, equilíbrio e score', () => {
    expect(r.cenarios.pessimista.roiAnual).toBeCloseTo(0.005, 3);
    expect(r.cenarios.otimista.roiAnual).toBeCloseTo(0.317, 3);
    expect(r.cenarios.pessimista.meses).toBe(17);
    expect(r.cenarios.otimista.meses).toBe(11);
    expect(Math.abs(r.lanceMaximo! - 211_232)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.lanceEquilibrio! - 292_493)).toBeLessThanOrEqual(1);
    expect(r.score).toBeCloseTo(43.2, 1);
    expect(r.minimoAcimaDoLanceMaximo).toBe(true);
    expect(r.minimoAcimaDoEquilibrio).toBe(false);
    expect(r.avisos.map((a) => a.id)).toEqual(['minimo_acima_lance_maximo']);
  });
});

describe('exemplo da especificação — ocupado pelo devedor', () => {
  const r = analisarFinanceiro(ocupado);
  const real = r.cenarios.realista;

  it('números do cenário realista', () => {
    expect(linha(real, 'desocupacao')).toBe(11_500);
    expect(linha(real, 'manutencao')).toBe(16_100);
    expect(real.meses).toBe(23);
    expect(reais(real.custoTotal)).toBe(322_555);
    expect(reais(real.ir)).toBe(5_197);
    expect(reais(real.lucro)).toBe(29_448);
    expect(real.roiAnual).toBeCloseTo(0.047, 3);
  });

  it('resultado', () => {
    expect(r.cenarios.pessimista.meses).toBe(29);
    expect(r.cenarios.otimista.meses).toBe(17);
    expect(r.cenarios.pessimista.roiAnual).toBeCloseTo(-0.029, 3);
    // Perto de R$ 150 mil o valor venal (R$ 200 mil) passa o lance e vira a base do ITBI.
    expect(Math.abs(r.lanceMaximo! - 149_841)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.lanceEquilibrio! - 273_538)).toBeLessThanOrEqual(1);
    expect(r.score).toBeCloseTo(15.5, 1);
    expect(r.avisos.map((a) => a.id)).toContain('prejuizo_pessimista');
  });
});

describe('regras', () => {
  it('lance padrão é o valor mínimo', () => {
    expect(analisarFinanceiro(base).lance).toBe(240_000);
    expect(analisarFinanceiro({ ...base, lance: 250_000 }).lance).toBe(250_000);
  });

  it('comissão: leiloeiro não verificado entra no custo com aviso', () => {
    const r = analisarFinanceiro({ ...base, temLeiloeiro: undefined });
    expect(linha(r.cenarios.realista, 'comissao')).toBe(12_000);
    expect(r.avisos.map((a) => a.id)).toContain('leiloeiro_nao_verificado');
  });

  it('comissão: Leilão SFI cobra sem aviso; "não" zera', () => {
    const sfi = analisarFinanceiro({ ...base, modalidade: 'leilao_sfi', temLeiloeiro: undefined });
    expect(linha(sfi.cenarios.realista, 'comissao')).toBe(12_000);
    expect(sfi.avisos.map((a) => a.id)).not.toContain('leiloeiro_nao_verificado');
    expect(linha(analisarFinanceiro(base).cenarios.realista, 'comissao')).toBe(0);
  });

  it('ITBI: maior entre lance e valor venal; em leilão, só o lance', () => {
    const vvrAlto = { ...base, valorVenalReferencia: 300_000 };
    expect(linha(calcularCenario(vvrAlto, 240_000, 'realista'), 'itbi')).toBe(9_000);
    expect(linha(calcularCenario({ ...vvrAlto, modalidade: 'leilao_sfi' }, 240_000, 'realista'), 'itbi')).toBe(7_200);
  });

  it('ITBI: sem valor venal, calcula sobre o lance e avisa', () => {
    const r = analisarFinanceiro({ ...base, valorVenalReferencia: undefined });
    expect(linha(r.cenarios.realista, 'itbi')).toBe(7_200);
    expect(r.avisos.map((a) => a.id)).toContain('vvr_nao_informado');
  });

  it('ocupante não informado usa a faixa completa', () => {
    const r = calcularCenario({ ...base, ocupacao: 'ocupado_nao_informado' }, 240_000, 'realista');
    expect(linha(r, 'desocupacao')).toBe(19_000);
    expect(r.meses).toBe(2 + 3 + 12 + 9);
  });

  it('condomínio atrasado: comprador paga até 10% da avaliação', () => {
    const r = calcularCenario({ ...base, dividaCondominio: 60_000 }, 240_000, 'realista');
    expect(linha(r, 'divida_condominio')).toBe(40_000);
    const caixa = calcularCenario({ ...base, dividaCondominio: 60_000, condominioPagoPor: 'caixa' }, 240_000, 'realista');
    expect(linha(caixa, 'divida_condominio')).toBeUndefined();
  });

  it('multiplicador não se aplica ao lance', () => {
    const r = calcularCenario(base, 240_000, 'pessimista');
    expect(r.custoTotal - 240_000).toBeCloseTo(r.subtotalCustos * 1.3, 6);
  });

  it('isenção de IR zera o imposto', () => {
    expect(calcularCenario({ ...base, isencaoIR: true }, 240_000, 'realista').ir).toBe(0);
  });

  it('IR é progressivo por parcela do ganho', () => {
    const r = calcularCenario(
      { ...base, valorAvaliacao: 20_000_000, valorMinimo: 1_000_000, areaPrivativaM2: 0, despesaMensal: 0 },
      1_000_000,
      'otimista',
    );
    const g = r.ganhoTributavel;
    const esperado = 5e6 * 0.15 + 5e6 * 0.175 + (g - 10e6) * 0.2;
    expect(r.ir).toBeCloseTo(esperado, 2);
  });

  it('lance maior nunca aumenta o retorno', () => {
    let anterior = Infinity;
    for (let l = 100_000; l <= 400_000; l += 10_000) {
      const roi = calcularCenario(base, l, 'realista').roiAnual;
      expect(roi).toBeLessThanOrEqual(anterior);
      anterior = roi;
    }
  });

  it('teto de 60 quando o pessimista dá prejuízo', () => {
    // Imóvel grande, Selic baixa: realista rende bem, pessimista dá prejuízo.
    const e = { ...base, valorMinimo: 140_000, selic: 0.02, areaPrivativaM2: 250, valorVenalReferencia: 0 };
    const r = analisarFinanceiro(e);
    expect(r.cenarios.pessimista.lucro).toBeLessThan(0);
    expect(scoreFinanceiro(r.cenarios.realista.roiAnual, 0.02)).toBeGreaterThan(60);
    expect(r.score).toBe(60);
    expect(r.explicacaoScore).toContain('pessimista');
  });

  it('pontos da curva de score', () => {
    expect(scoreFinanceiro(-0.05, 0.12)).toBe(0);
    expect(scoreFinanceiro(0.12, 0.12)).toBe(40);
    expect(scoreFinanceiro(0.22, 0.12)).toBe(75);
    expect(scoreFinanceiro(0.5, 0.12)).toBe(100);
  });

  it('toda linha de custo tem explicação e origem', () => {
    for (const l of calcularCenario({ ...base, temLeiloeiro: undefined }, 240_000, 'realista').linhasCusto) {
      expect(l.explicacao.length).toBeGreaterThan(10);
      expect(['confirmado', 'informado', 'estimado']).toContain(l.origem);
    }
  });
});
