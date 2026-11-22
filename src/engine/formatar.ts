// Formatação em português para os textos de explicação.

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** 1234.5 -> "R$ 1.235" (espaço normal, não o espaço fino do Intl). */
export const brl = (v: number) => brlFmt.format(Math.round(v)).replace(/ /g, ' ');

/** 0.129 -> "12,9%" */
export const pct = (v: number) => `${numFmt.format(v * 100)}%`;

export const num = (v: number) => numFmt.format(v);

export const meses = (n: number) => `${num(n)} ${n === 1 ? 'mês' : 'meses'}`;
