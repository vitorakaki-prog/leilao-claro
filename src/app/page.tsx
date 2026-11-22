'use client';

import { useEffect, useMemo, useState } from 'react';
import { analisar, type EntradaAnalise, type Semaforo } from '@/engine/analisar';
import { brl } from '@/engine/formatar';
import { Formulario, type Rascunho } from '@/components/Formulario';
import { Resultado } from '@/components/Resultado';

const SELIC_PADRAO = 0.1375; // Copom, 4/11/2026
const CHAVE = 'leilaoclaro:historico:v1';

interface ItemHistorico {
  id: string;
  titulo: string;
  criadoEm: string;
  semaforo: Semaforo;
  score: number;
  rascunho: Rascunho;
}

const novo = (): Rascunho => ({ selic: SELIC_PADRAO });

function lerHistorico(): ItemHistorico[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '[]');
  } catch {
    return [];
  }
}

function gravarHistorico(itens: ItemHistorico[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {
    /* navegador sem armazenamento: o histórico só some */
  }
}

const OBRIGATORIOS: [keyof EntradaAnalise, string][] = [
  ['valorAvaliacao', 'valor de avaliação'],
  ['valorMinimo', 'valor mínimo'],
  ['modalidade', 'modalidade'],
  ['areaPrivativaM2', 'área privativa'],
  ['selic', 'Selic'],
];

const COR: Record<Semaforo, string> = { A: 'bg-green-700 text-white', B: 'bg-green-400', C: 'bg-yellow-400', D: 'bg-orange-400', E: 'bg-red-600 text-white' };

export default function Pagina() {
  const [rascunho, setRascunho] = useState<Rascunho>(novo);
  const [historico, setHistorico] = useState<ItemHistorico[]>([]);
  const [idAtual, setIdAtual] = useState<string | null>(null);
  const [chaveForm, setChaveForm] = useState(0);

  useEffect(() => setHistorico(lerHistorico()), []);

  const faltando = OBRIGATORIOS.filter(([c]) => rascunho[c] === undefined || rascunho[c] === null).map(([, n]) => n);
  const resultado = useMemo(() => {
    if (faltando.length) return null;
    try {
      return analisar(rascunho as EntradaAnalise);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rascunho, faltando.length]);

  function salvar() {
    if (!resultado) return;
    const titulo =
      rascunho.info?.endereco?.split(' - CEP')[0] ||
      [rascunho.bairro, rascunho.valorMinimo && brl(rascunho.valorMinimo)].filter(Boolean).join(' · ') ||
      'Imóvel sem nome';
    const id = idAtual ?? crypto.randomUUID();
    const item: ItemHistorico = { id, titulo, criadoEm: new Date().toISOString(), semaforo: resultado.semaforo, score: resultado.score, rascunho };
    const itens = [item, ...historico.filter((h) => h.id !== id)];
    setHistorico(itens);
    gravarHistorico(itens);
    setIdAtual(id);
  }

  function abrir(item: ItemHistorico) {
    setRascunho(item.rascunho);
    setIdAtual(item.id);
    setChaveForm((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function remover(id: string) {
    const itens = historico.filter((h) => h.id !== id);
    setHistorico(itens);
    gravarHistorico(itens);
    if (id === idAtual) setIdAtual(null);
  }

  function nova() {
    setRascunho(novo());
    setIdAtual(null);
    setChaveForm((k) => k + 1);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:pt-10 lg:pb-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LeilãoClaro</h1>
          <p className="text-sm text-slate-600">Cole o anúncio de um imóvel da Caixa e veja se vale a pena, com o porquê de cada número.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={nova} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Nova análise</button>
          <button onClick={salvar} disabled={!resultado} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40">
            {idAtual ? 'Atualizar análise salva' : 'Salvar análise'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-5">
          <Formulario key={chaveForm} valor={rascunho} onChange={setRascunho} />
        </section>
        <section id="resultado" className="scroll-mt-4 lg:col-span-7">
          <div className="lg:sticky lg:top-6">
            {resultado ? (
              <Resultado r={resultado} />
            ) : (
              <div className="cartao text-sm text-slate-600">
                <p className="font-semibold text-slate-900">O resultado aparece aqui.</p>
                <p className="mt-1">Falta preencher: {faltando.join(', ')}.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {resultado && (
        <a
          href="#resultado"
          className="fixed inset-x-4 bottom-4 z-10 flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-medium text-white shadow-lg lg:hidden"
        >
          <span className={`rounded-md px-2 py-0.5 font-bold ${COR[resultado.semaforo]}`}>{resultado.semaforo}</span>
          Ver resultado
        </a>
      )}

      {historico.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold">Análises salvas neste navegador</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {historico.map((h) => (
              <li key={h.id} className="cartao flex items-center gap-3 !p-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold ${COR[h.semaforo]}`}>{h.semaforo}</span>
                <button onClick={() => abrir(h)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{h.titulo}</p>
                  <p className="text-xs text-slate-500">{new Date(h.criadoEm).toLocaleDateString('pt-BR')} · score {Math.round(h.score)}</p>
                </button>
                <button onClick={() => remover(h.id)} className="text-xs text-slate-400 hover:text-red-600" aria-label={`Apagar ${h.titulo}`}>
                  Apagar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
