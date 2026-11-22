// Módulo Ocupação (peso 20%). O custo e o prazo de desocupação vão para o Financeiro.

import type { Aviso, Ocupacao } from './tipos';

export const SCORE_OCUPACAO: Record<Ocupacao, number> = {
  desocupado: 100,
  ocupado_devedor: 55,
  locatario: 40,
  ocupado_nao_informado: 35,
  nao_informado: 30,
  terceiro_sem_contrato: 20,
  invadido: 5,
};

export const ROTULO_OCUPACAO: Record<Ocupacao, string> = {
  desocupado: 'Desocupado',
  ocupado_devedor: 'Ocupado pelo antigo dono',
  locatario: 'Ocupado por inquilino com contrato',
  ocupado_nao_informado: 'Ocupado — ocupante não informado',
  nao_informado: 'Ocupação não informada',
  terceiro_sem_contrato: 'Ocupado por terceiro sem contrato',
  invadido: 'Invadido',
};

const EXPLICACAO: Record<Ocupacao, string> = {
  desocupado: 'Sem ninguém para tirar: menor risco e menor prazo.',
  ocupado_devedor: 'O antigo dono precisa sair; costuma levar de 6 a 12 meses.',
  locatario: 'Inquilino com contrato tem mais proteção legal; a saída demora mais.',
  ocupado_nao_informado: 'O anúncio diz que está ocupado, mas não por quem. Custo e prazo usam a faixa completa.',
  nao_informado: 'O anúncio não diz se o imóvel está ocupado. Custo e prazo usam a faixa completa.',
  terceiro_sem_contrato: 'Ocupante sem vínculo exige ação na Justiça e pode demorar.',
  invadido: 'Invasão costuma exigir processo longo e caro.',
};

export interface ResultadoOcupacao {
  score: number;
  situacao: Ocupacao;
  rotulo: string;
  explicacao: string;
  avisos: Aviso[];
}

export function analisarOcupacao(situacao: Ocupacao = 'nao_informado'): ResultadoOcupacao {
  const avisos: Aviso[] = [];
  if (situacao === 'ocupado_nao_informado' || situacao === 'nao_informado')
    avisos.push({
      id: 'ocupante_nao_informado', tipo: 'atencao',
      titulo: situacao === 'nao_informado' ? 'Ocupação não informada' : 'Ocupante não informado',
      motivo: 'Quem ocupa muda bastante o custo e o prazo de desocupação.',
      acao: 'Visite o endereço e converse com portaria ou vizinhos; depois informe a situação aqui.',
    });
  return { score: SCORE_OCUPACAO[situacao], situacao, rotulo: ROTULO_OCUPACAO[situacao], explicacao: EXPLICACAO[situacao], avisos };
}
