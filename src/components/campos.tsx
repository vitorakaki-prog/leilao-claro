'use client';

import { useEffect, useState } from 'react';

const fmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

/** "400.000,50" / "400000" / "13,75" -> número. */
export function lerNumero(s: string): number | undefined {
  const limpo = s.replace(/[R$\s%]/g, '');
  if (!limpo) return undefined;
  const normal = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(limpo) ? limpo.replace(/\./g, '') : limpo;
  const n = Number(normal);
  return Number.isFinite(n) ? n : undefined;
}

export function Etiqueta({ origem }: { origem?: 'confirmado' | 'informado' | 'estimado' }) {
  if (origem !== 'confirmado') return null;
  return <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">do anúncio</span>;
}

export function CampoNumero(props: {
  rotulo: string;
  valor?: number;
  onChange: (v: number | undefined) => void;
  prefixo?: string;
  sufixo?: string;
  dica?: string;
  origem?: 'confirmado' | 'informado' | 'estimado';
  obrigatorio?: boolean;
}) {
  const [texto, setTexto] = useState(props.valor === undefined ? '' : fmt.format(props.valor));
  useEffect(() => {
    if (lerNumero(texto) !== props.valor) setTexto(props.valor === undefined ? '' : fmt.format(props.valor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.valor]);
  return (
    <label className="block">
      <span className="rotulo">
        {props.rotulo}
        {props.obrigatorio && <span className="text-red-500"> *</span>}
        <Etiqueta origem={props.origem} />
      </span>
      <div className="flex items-center gap-1">
        {props.prefixo && <span className="text-sm text-slate-500">{props.prefixo}</span>}
        <input
          className="campo"
          inputMode="decimal"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            props.onChange(lerNumero(e.target.value));
          }}
          onBlur={() => props.valor !== undefined && setTexto(fmt.format(props.valor))}
        />
        {props.sufixo && <span className="text-sm text-slate-500">{props.sufixo}</span>}
      </div>
      {props.dica && <span className="mt-1 block text-[11px] text-slate-500">{props.dica}</span>}
    </label>
  );
}

export function CampoSelect<T extends string>(props: {
  rotulo: string;
  valor?: T;
  opcoes: { valor: T; rotulo: string }[];
  onChange: (v: T | undefined) => void;
  vazio?: string;
  origem?: 'confirmado' | 'informado' | 'estimado';
  obrigatorio?: boolean;
  dica?: string;
}) {
  return (
    <label className="block">
      <span className="rotulo">
        {props.rotulo}
        {props.obrigatorio && <span className="text-red-500"> *</span>}
        <Etiqueta origem={props.origem} />
      </span>
      <select className="campo" value={props.valor ?? ''} onChange={(e) => props.onChange((e.target.value || undefined) as T | undefined)}>
        {props.vazio !== undefined && <option value="">{props.vazio}</option>}
        {props.opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {props.dica && <span className="mt-1 block text-[11px] text-slate-500">{props.dica}</span>}
    </label>
  );
}

export function CampoCheck(props: { rotulo: string; valor?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="h-4 w-4" checked={!!props.valor} onChange={(e) => props.onChange(e.target.checked)} />
      {props.rotulo}
    </label>
  );
}

export function Secao({ titulo, children, aberta = true }: { titulo: string; children: React.ReactNode; aberta?: boolean }) {
  return (
    <details className="cartao" open={aberta}>
      <summary className="cursor-pointer select-none text-sm font-semibold">{titulo}</summary>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </details>
  );
}
