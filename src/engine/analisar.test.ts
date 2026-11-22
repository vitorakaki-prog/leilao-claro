import { describe, expect, it } from 'vitest';
import { analisar, semaforoDoScore, type EntradaAnalise } from './analisar';
import { analisarJuridico, procurarTermos } from './juridico';
import { analisarLocalizacao, buscarBairro, BAIRROS_SP } from './localizacao';
import { analisarOcupacao } from './ocupacao';

// Exemplo da especificação: bairro intermediário (nota 60), matrícula conferida.
const vazio: EntradaAnalise = {
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
  bairro: 'Liberdade',
  checklist: { matriculaConferida: 'sim', penhoraTrabalhista: 'nao', bemDeFamilia: 'nao', fraudeExecucao: 'nao', usucapiao: 'nao' },
};

describe('consolidação — exemplo da especificação', () => {
  it('vazio: média B (74,1), travado em C', () => {
    const r = analisar(vazio);
    expect(r.scoreMedia).toBeCloseTo(74.1, 1);
    expect(r.semaforo).toBe('C');
    expect(r.travaAplicada).toContain('limitado a C');
    expect(r.veredito).toMatch(/^C — .*R\$ 211\.23\d.*R\$ 240\.000/);
    expect(r.avisos.map((a) => a.id)).toEqual(expect.arrayContaining(['minimo_acima_lance_maximo', 'venda_direta']));
  });

  it('ocupado pelo devedor: 55,4, C', () => {
    const r = analisar({ ...vazio, ocupacao: 'ocupado_devedor' });
    expect(r.scoreMedia).toBeCloseTo(55.4, 1);
    expect(r.semaforo).toBe('C');
    expect(r.modulos.find((m) => m.id === 'ocupacao')!.score).toBe(55);
    expect(r.veredito).toContain('financeiro');
  });
});

describe('regras de consolidação', () => {
  it('faixas do semáforo', () => {
    expect([80, 79.9, 65, 50, 49.9, 35, 34.9].map(semaforoDoScore)).toEqual(['A', 'B', 'B', 'C', 'D', 'D', 'E']);
  });

  it('eliminatória zera o score e dá E, mesmo com o resto ótimo', () => {
    const r = analisar({ ...vazio, valorMinimo: 120_000, checklist: { ...vazio.checklist, usucapiao: 'sim' } });
    expect(r.semaforo).toBe('E');
    expect(r.score).toBe(0);
    expect(r.veredito).toContain('usucapião');
    expect(r.avisos[0].tipo).toBe('eliminatoria');
  });

  it('preço bom não sofre trava', () => {
    const r = analisar({ ...vazio, valorMinimo: 180_000, bairro: 'Pinheiros' });
    expect(r.travaAplicada).toBeNull();
    expect(r.veredito).toContain('vale a pena com lance até');
  });

  it('mínimo acima do equilíbrio limita a D', () => {
    const r = analisar({ ...vazio, valorMinimo: 330_000, bairro: 'Pinheiros' });
    expect(r.financeiro.minimoAcimaDoEquilibrio).toBe(true);
    expect(['D', 'E']).toContain(r.semaforo);
  });

  it('desconto acima de 50% gera aviso', () => {
    expect(analisar({ ...vazio, valorMinimo: 190_000 }).avisos.map((a) => a.id)).toContain('desconto_alto');
    expect(analisar(vazio).avisos.map((a) => a.id)).not.toContain('desconto_alto');
  });

  it('confiança cai quando faltam os itens principais', () => {
    expect(analisar({ ...vazio, dividaCondominio: 0 }).confianca).toBe('alta');
    expect(analisar(vazio).confianca).toBe('media');
    expect(analisar({ ...vazio, ocupacao: undefined, checklist: {}, temLeiloeiro: undefined }).confianca).toBe('baixa');
  });
});

describe('jurídico', () => {
  it('base 80, matrícula conferida +20, descontos', () => {
    expect(analisarJuridico({ checklist: {} }).score).toBe(80);
    expect(analisarJuridico({ checklist: { matriculaConferida: 'sim' } }).score).toBe(100);
    const r = analisarJuridico({ checklist: { leilaoJudicial: 'sim', hipotecaOuPenhoraTerceiro: 'sim' }, compradorAssumeCondominio: true, compradorAssumeIptu: true });
    expect(r.score).toBe(80 - 15 - 10 - 10 - 5);
  });

  it('cada eliminatória marcada aparece', () => {
    const r = analisarJuridico({ checklist: { bemDeFamilia: 'sim', fraudeExecucao: 'sim' } });
    expect(r.eliminatorias).toHaveLength(2);
  });

  it('termos de risco no texto viram aviso, sem mudar o score', () => {
    const texto = 'Apartamento com 2 quartos. Consta penhora na matrícula R.5 em favor de terceiro.';
    expect(procurarTermos(texto).map((t) => t.termo)).toEqual(['penhora']);
    const r = analisarJuridico({ checklist: {}, texto });
    expect(r.score).toBe(80);
    expect(r.avisos.some((a) => a.id === 'termo_penhora' && a.motivo.includes('matrícula R.5'))).toBe(true);
  });

  it('itens não verificados são listados', () => {
    expect(analisarJuridico({ checklist: {} }).itensNaoVerificados).toHaveLength(5);
  });
});

describe('ocupação e localização', () => {
  it('scores de ocupação', () => {
    expect(analisarOcupacao('desocupado').score).toBe(100);
    expect(analisarOcupacao('invadido').score).toBe(5);
    expect(analisarOcupacao().avisos[0].id).toBe('ocupante_nao_informado');
  });

  it('bairro com acento e caixa diferente é encontrado', () => {
    expect(buscarBairro('VILA MARIANA')?.nota).toBe(84);
    expect(buscarBairro('tatuapé')?.nota).toBe(70);
    expect(buscarBairro('Freguesia do Ó')?.nota).toBe(54);
  });

  it('tabela tem pelo menos 50 bairros, todos dentro da faixa', () => {
    const lista = Object.values(BAIRROS_SP);
    expect(lista.length).toBeGreaterThanOrEqual(50);
    for (const b of lista) {
      const [min, max] = b.faixa === 'premium' ? [80, 90] : b.faixa === 'intermediario' ? [50, 70] : [20, 45];
      expect(b.nota).toBeGreaterThanOrEqual(min);
      expect(b.nota).toBeLessThanOrEqual(max);
    }
  });

  it('bairro fora da tabela: faixa informada ou estimativa com aviso', () => {
    expect(analisarLocalizacao('Bairro Inventado', 'premium')).toMatchObject({ score: 85, origem: 'informado' });
    const r = analisarLocalizacao('Bairro Inventado');
    expect(r.score).toBe(60);
    expect(r.avisos[0].id).toBe('bairro_fora_da_tabela');
  });
});
