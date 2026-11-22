'use client';

import { useState } from 'react';
import type { ResultadoAnalise, Semaforo } from '@/engine/analisar';
import { brl, pct } from '@/engine/formatar';
import type { Aviso, Cenario, Origem } from '@/engine/tipos';

const COR: Record<Semaforo, string> = {
  A: 'bg-green-700 text-white',
  B: 'bg-green-400 text-green-950',
  C: 'bg-yellow-400 text-yellow-950',
  D: 'bg-orange-400 text-orange-950',
  E: 'bg-red-600 text-white',
};

const corBarra = (score: number) => (score >= 80 ? 'bg-green-600' : score >= 65 ? 'bg-green-400' : score >= 50 ? 'bg-yellow-400' : score >= 35 ? 'bg-orange-400' : 'bg-red-500');

const ORIGEM: Record<Origem, { texto: string; classe: string }> = {
  confirmado: { texto: 'confirmado', classe: 'bg-emerald-50 text-emerald-700' },
  informado: { texto: 'informado', classe: 'bg-sky-50 text-sky-700' },
  estimado: { texto: 'estimado', classe: 'bg-slate-100 text-slate-600' },
};

function Origem({ origem }: { origem: Origem }) {
  const o = ORIGEM[origem];
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${o.classe}`}>{o.texto}</span>;
}

/** O título já mostra letra e rótulo; o texto começa no que importa. */
const semPrefixo = (v: string) => {
  const t = v.replace(/^[A-E] — [^:]+: /, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const ICONE: Record<Aviso['tipo'], string> = { eliminatoria: '🚫', atencao: '⚠️', positiva: '✅' };

export function Resultado({ r }: { r: ResultadoAnalise }) {
  const [cenario, setCenario] = useState<Cenario>('realista');
  const [feitos, setFeitos] = useState<Record<string, boolean>>({});
  const f = r.financeiro;
  const c = f.cenarios[cenario];

  return (
    <div className="space-y-4">
      {/* Semáforo e veredito */}
      <div className="cartao">
        <div className="flex items-start gap-4">
          <div className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl ${COR[r.semaforo]}`}>
            <span className="text-4xl font-bold leading-none">{r.semaforo}</span>
            <span className="mt-1 text-xs font-medium">{Math.round(r.score)}/100</span>
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold">{r.rotulo}</p>
            <p className="mt-1 text-sm text-slate-700">{semPrefixo(r.veredito)}</p>
            {r.travaAplicada && (
              <p className="mt-2 text-xs text-slate-500">
                Pela média dos scores seria {Math.round(r.scoreMedia)}. {r.travaAplicada}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs">
          <span className="font-semibold">Confiança da análise: {r.confianca === 'alta' ? 'alta' : r.confianca === 'media' ? 'média' : 'baixa'}.</span>{' '}
          <span className="text-slate-600">{r.explicacaoConfianca}</span>
        </div>
      </div>

      {/* Números-chave */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Lance analisado', brl(f.lance)],
          ['Lance máximo recomendado', f.lanceMaximo === null ? 'nenhum' : brl(f.lanceMaximo)],
          ['Acima disso, prejuízo', f.lanceEquilibrio === null ? '—' : brl(f.lanceEquilibrio)],
          ['Retorno exigido', `${pct(f.retornoExigido)} ao ano`],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="cartao !p-3">
            <p className="text-[11px] text-slate-500">{rotulo}</p>
            <p className="text-base font-semibold">{valor}</p>
          </div>
        ))}
      </div>

      {/* Barras dos módulos */}
      <div className="cartao space-y-4">
        <h3 className="text-sm font-semibold">Por que esse resultado</h3>
        {r.modulos.map((m) => (
          <div key={m.id}>
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {m.nome} <span className="text-xs font-normal text-slate-500">(peso {Math.round(m.peso * 100)}%)</span>
              </span>
              <span className="font-semibold">{Math.round(m.score)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100">
              <div className={`h-2 rounded-full ${corBarra(m.score)}`} style={{ width: `${Math.max(2, m.score)}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-600">{m.resumo}</p>
          </div>
        ))}
      </div>

      {/* Avisos */}
      {r.avisos.length > 0 && (
        <div className="cartao">
          <h3 className="text-sm font-semibold">Pontos de atenção</h3>
          <ul className="mt-3 space-y-3">
            {r.avisos.map((a) => (
              <li key={a.id} className="flex gap-2 text-sm">
                <span aria-hidden>{ICONE[a.tipo]}</span>
                <div>
                  <p className="font-medium">{a.titulo}</p>
                  <p className="text-xs text-slate-600">{a.motivo}</p>
                  <p className="text-xs text-slate-800">
                    <span className="font-medium">O que fazer:</span> {a.acao}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cenários */}
      <div className="cartao">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Conta linha a linha</h3>
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs">
            {(['pessimista', 'realista', 'otimista'] as Cenario[]).map((k) => (
              <button key={k} onClick={() => setCenario(k)} className={`rounded-md px-3 py-1 capitalize ${cenario === k ? 'bg-white font-semibold shadow-sm' : 'text-slate-600'}`}>
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          {(['pessimista', 'realista', 'otimista'] as Cenario[]).map((k) => (
            <div key={k} className={`rounded-lg p-2 ${k === cenario ? 'bg-slate-900 text-white' : 'bg-slate-50'}`}>
              <p className="capitalize">{k}</p>
              <p className="text-sm font-semibold">{pct(f.cenarios[k].roiAnual)} a.a.</p>
              <p>{brl(f.cenarios[k].lucro)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {cenario === 'pessimista' && 'Venda por 85% da avaliação, custos 30% acima do previsto, prazo mais longo.'}
          {cenario === 'realista' && 'Venda por 95% da avaliação, custos 10% acima do previsto, prazo médio.'}
          {cenario === 'otimista' && 'Venda por 105% da avaliação, custos como previsto, prazo mais curto.'}
        </p>
        <table className="mt-3 w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            <tr><td className="py-2">Lance</td><td className="whitespace-nowrap py-2 pl-2 text-right font-medium">{brl(c.lance)}</td></tr>
            {c.linhasCusto.map((l) => (
              <tr key={l.id}>
                <td className="py-2 pr-2">
                  <span className="mr-1">{l.rotulo}</span>
                  <Origem origem={l.origem} />
                  <span className="block text-xs text-slate-500">{l.explicacao}</span>
                </td>
                <td className="whitespace-nowrap py-2 pl-2 text-right align-top">{brl(l.valor)}</td>
              </tr>
            ))}
            <tr>
              <td className="py-2 text-slate-600">Margem do cenário (custos × {String(c.multiplicadorCustos).replace('.', ',')})</td>
              <td className="whitespace-nowrap py-2 pl-2 text-right text-slate-600">+ {brl(c.custosAjustados - c.subtotalCustos)}</td>
            </tr>
            <tr className="font-semibold"><td className="py-2">Custo total</td><td className="whitespace-nowrap py-2 pl-2 text-right">{brl(c.custoTotal)}</td></tr>
            <tr><td className="py-2">Venda</td><td className="whitespace-nowrap py-2 pl-2 text-right">{brl(c.valorVenda)}</td></tr>
            <tr><td className="py-2">Corretagem (6%)</td><td className="whitespace-nowrap py-2 pl-2 text-right">− {brl(c.corretagem)}</td></tr>
            <tr>
              <td className="py-2">
                Imposto de renda <span className="block text-xs text-slate-500">Estimativa: na prática só entram custos com comprovante.</span>
              </td>
              <td className="whitespace-nowrap py-2 pl-2 text-right align-top">− {brl(c.ir)}</td>
            </tr>
            <tr className="font-semibold"><td className="py-2">Lucro</td><td className="whitespace-nowrap py-2 pl-2 text-right">{brl(c.lucro)}</td></tr>
            <tr><td className="py-2">Retorno em {c.meses} meses</td><td className="whitespace-nowrap py-2 pl-2 text-right">{pct(c.roiPeriodo)}</td></tr>
            <tr className="font-semibold"><td className="py-2">Retorno ao ano</td><td className="whitespace-nowrap py-2 pl-2 text-right">{pct(c.roiAnual)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Jurídico */}
      <div className="cartao">
        <h3 className="text-sm font-semibold">Jurídico: {r.juridico.score}/100</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {r.juridico.linhas.map((l) => (
            <li key={l.id} className="flex justify-between gap-3">
              <span>
                {l.rotulo} <span className="block text-xs text-slate-500">{l.explicacao}</span>
              </span>
              <span className="font-medium">{l.valor > 0 && l.id !== 'base' ? '+' : ''}{l.valor}</span>
            </li>
          ))}
        </ul>
        {r.juridico.itensNaoVerificados.length > 0 && (
          <p className="mt-3 text-xs text-amber-700">Não verificado ainda: {r.juridico.itensNaoVerificados.join(', ')}.</p>
        )}
      </div>

      {/* Checklist de due diligence */}
      <div className="cartao">
        <h3 className="text-sm font-semibold">Antes de dar o lance</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {[
            ...r.avisos.filter((a) => a.tipo === 'atencao').map((a) => a.acao),
            'Leia o edital inteiro, principalmente as regras de pagamento e de despesas.',
            'Confirme o valor de condomínio e IPTU atrasados com a administradora e a Prefeitura.',
            'Visite o endereço e veja o estado do prédio e da rua.',
          ]
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .map((item) => (
              <li key={item}>
                <label className="flex gap-2">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={!!feitos[item]} onChange={(e) => setFeitos({ ...feitos, [item]: e.target.checked })} />
                  <span className={feitos[item] ? 'text-slate-400 line-through' : ''}>{item}</span>
                </label>
              </li>
            ))}
        </ul>
      </div>

      <p className="px-1 text-[11px] text-slate-400">
        Análise automática com premissas versão {r.versaoPremissas}. Não substitui a leitura do edital e da matrícula nem a orientação de um advogado.
      </p>
    </div>
  );
}
