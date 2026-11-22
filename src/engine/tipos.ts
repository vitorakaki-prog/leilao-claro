// Tipos compartilhados do motor de análise.

/** De onde veio um valor: lido do imóvel, digitado pelo usuário ou suposto pelo motor. */
export type Origem = 'confirmado' | 'informado' | 'estimado';

export type Modalidade =
  | 'leilao_sfi'
  | 'licitacao_aberta'
  | 'venda_online'
  | 'venda_direta_online'
  | 'direito_preferencia'
  | 'outra';

export type Ocupacao =
  | 'desocupado'
  | 'ocupado_devedor'
  | 'locatario'
  | 'terceiro_sem_contrato'
  | 'invadido'
  | 'ocupado_nao_informado'
  | 'nao_informado';

export type SimNaoVerificado = 'sim' | 'nao' | 'nao_verificado';

export type PadraoReforma = 'economico' | 'medio' | 'alto';

export type Cenario = 'pessimista' | 'realista' | 'otimista';

/** Um valor de entrada com a sua origem. */
export type Campo<T> = { valor: T; origem: Origem };

/** Uma linha explicada: o número, de onde saiu e por quê. */
export interface LinhaExplicada {
  id: string;
  rotulo: string;
  valor: number;
  /** Frase em português simples dizendo como o valor foi obtido. */
  explicacao: string;
  origem: Origem;
}

export type TipoAviso = 'eliminatoria' | 'atencao' | 'positiva';

export interface Aviso {
  id: string;
  tipo: TipoAviso;
  titulo: string;
  /** Por que o aviso apareceu. */
  motivo: string;
  /** O que o usuário deve fazer. */
  acao: string;
}
