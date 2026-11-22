import { describe, expect, it } from 'vitest';
import { extrair } from './extrator';

// Texto montado a partir do layout conhecido da página da Caixa (não é um anúncio real).
const anuncio = `CONDOMINIO RESIDENCIAL EXEMPLO - APTO 12
Valor de avaliação: R$ 400.000,00
Valor mínimo de venda: R$ 240.000,00 ( desconto de 40,00%)
Tipo de imóvel: Apartamento
Quartos: 2
Garagem: 1
Número do imóvel: 1444400123456
Matrícula(s): 123456
Comarca: SAO PAULO-SP
Inscrição imobiliária: 039.123.0456-7
Área total = 89,43m2
Área privativa = 60,00m2
Endereço:
RUA EXEMPLO, N. 100, APTO 12, VILA MARIANA - CEP: 04000-000, SAO PAULO - SAO PAULO
Descrição:
Apartamento, Ocupado. 2 dormitórios, sala, cozinha.
Regras para pagamento das despesas (caso existam):
Condomínio: Sob responsabilidade do comprador, até o limite de 10% em relação ao valor de avaliação do imóvel.
Tributos: Sob responsabilidade do comprador.
Venda Direta Online`;

describe('extrator', () => {
  it('lê os campos principais', () => {
    const r = extrair(anuncio);
    expect(r.campos).toMatchObject({
      valorAvaliacao: 400_000,
      valorMinimo: 240_000,
      modalidade: 'venda_direta_online',
      areaPrivativaM2: 60,
      bairro: 'Vila Mariana',
      ocupacao: 'ocupado_nao_informado',
      condominioPagoPor: 'comprador_ate_limite',
      iptuPagoPor: 'comprador',
      matriculaDisponivel: true,
    });
    expect(r.campos.origens?.valorAvaliacao).toBe('confirmado');
    expect(r.info.inscricaoImobiliaria).toBe('039.123.0456-7');
    expect(r.faltando).toEqual([]);
  });

  it('leilão com 1º e 2º: usa o 2º como mínimo e detecta leiloeiro', () => {
    const r = extrair(`Leilão SFI - Edital Único
Valor de avaliação: R$ 500.000,00
Valor mínimo de venda 1º Leilão: R$ 520.000,00
Valor mínimo de venda 2º Leilão: R$ 300.000,00
Leiloeiro(a): FULANO DE TAL
Imóvel desocupado`);
    expect(r.campos.valorMinimo).toBe(300_000);
    expect(r.info.valor1Leilao).toBe(520_000);
    expect(r.campos.modalidade).toBe('leilao_sfi');
    expect(r.campos.temLeiloeiro).toBe('sim');
    expect(r.campos.ocupacao).toBe('desocupado');
  });

  it('bairro fora da tabela sai do formato do endereço', () => {
    const r = extrair('Endereço: RUA X, N. 1, JARDIM INEXISTENTE - CEP: 08000-000, SAO PAULO - SAO PAULO');
    expect(r.campos.bairro).toBe('Jardim Inexistente');
  });

  it('o que não encontra vai para a lista de faltando', () => {
    const r = extrair('texto qualquer sem dados');
    expect(r.faltando).toEqual(expect.arrayContaining(['Valor de avaliação', 'Valor mínimo de venda', 'Modalidade', 'Ocupação']));
  });
});
