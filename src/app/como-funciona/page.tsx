import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Como funciona — LeilãoClaro',
  description: 'Como comprar um imóvel da Caixa, passo a passo, em linguagem simples.',
};

const ETAPAS: { titulo: string; texto: string; ajuda: string }[] = [
  {
    titulo: 'Escolher o imóvel',
    texto:
      'No site da Caixa, cada anúncio mostra o valor de avaliação (quanto o banco acha que o imóvel vale), o valor mínimo de venda (o menor preço aceito), o desconto, se está ocupado e os documentos.',
    ajuda: 'Cole o anúncio no LeilãoClaro: ele lê esses dados e diz em segundos se o preço faz sentido.',
  },
  {
    titulo: 'Ler o edital e a matrícula',
    texto:
      'O edital traz as regras da venda: como pagar, prazos e quem paga dívidas atrasadas. A matrícula é o registro do imóvel no cartório: mostra o histórico de donos e se há penhora, hipoteca ou processo.',
    ajuda: 'O checklist jurídico guia o que procurar na matrícula. Alguns problemas, como usucapião em andamento, eliminam o imóvel na hora.',
  },
  {
    titulo: 'Fazer a proposta',
    texto:
      'Depende da modalidade. Na Venda Direta, quem oferece primeiro o preço mínimo leva. Na Venda Online e na Licitação Aberta, há disputa entre propostas. No Leilão, há lances, conduzidos por um leiloeiro que cobra comissão.',
    ajuda: 'O LeilãoClaro calcula o lance máximo: o maior valor em que o negócio ainda rende o retorno mínimo que você exige.',
  },
  {
    titulo: 'Pagar',
    texto: 'À vista ou, quando o anúncio permite, com financiamento ou FGTS. As condições estão no anúncio e no edital.',
    ajuda: 'A análise considera pagamento à vista. Financiamento muda a conta e ainda não está no cálculo.',
  },
  {
    titulo: 'Passar o imóvel para o seu nome',
    texto:
      'Pague o ITBI na Prefeitura (em São Paulo, 3%) e registre a compra no cartório de registro de imóveis. Só depois do registro o imóvel é seu de fato.',
    ajuda: 'ITBI, cartório, certidões e advogado entram como custo na conta linha a linha.',
  },
  {
    titulo: 'Desocupar, se tiver alguém morando',
    texto:
      'É a etapa mais demorada e arriscada. Às vezes há acordo com o ocupante; às vezes é preciso entrar na Justiça. Pode levar de meses a mais de dois anos.',
    ajuda: 'A ocupação pesa duas vezes: na nota de risco e no custo e no prazo da conta. Quando não se sabe quem ocupa, a análise usa a faixa mais ampla.',
  },
  {
    titulo: 'Reformar e vender',
    texto:
      'Se a ideia é revender, conte com reforma, condomínio e IPTU enquanto o imóvel não vende, corretagem e Imposto de Renda sobre o lucro.',
    ajuda: 'O resultado mostra três cenários (pessimista, realista e otimista) e o retorno por ano, para comparar com a renda fixa.',
  },
];

const GLOSSARIO: [string, string][] = [
  ['Valor de avaliação', 'Quanto a Caixa estima que o imóvel vale no mercado.'],
  ['Valor mínimo de venda', 'O menor preço que a Caixa aceita naquela rodada.'],
  ['Edital', 'Documento com as regras da venda.'],
  ['Matrícula', 'Registro oficial do imóvel no cartório, com donos, dívidas e processos.'],
  ['Ônus', 'Qualquer peso sobre o imóvel: penhora, hipoteca, processo.'],
  ['ITBI', 'Imposto municipal pago na compra. Em São Paulo, 3%.'],
  ['Averbação', 'Registrar na matrícula uma mudança, como uma construção nova.'],
  ['Desocupação', 'Tirar quem mora no imóvel, por acordo ou na Justiça.'],
  ['Selic', 'Taxa básica de juros. Serve de comparação: um imóvel precisa render bem mais que a renda fixa para compensar o risco.'],
  ['Retorno ao ano', 'Quanto o dinheiro investido rende por ano, já descontados todos os custos.'],
];

const SEMAFORO: [string, string, string][] = [
  ['A', 'bg-green-700 text-white', 'Oportunidade forte'],
  ['B', 'bg-green-400', 'Boa, com pontos a conferir'],
  ['C', 'bg-yellow-400', 'Só com desconto maior ou riscos resolvidos'],
  ['D', 'bg-orange-400', 'Risco alto para o retorno'],
  ['E', 'bg-red-600 text-white', 'Não recomendado'],
];

export default function ComoFunciona() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <Link href="/" className="text-sm text-slate-600">← Voltar ao analisador</Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Como funciona comprar um imóvel da Caixa</h1>
      <p className="mt-2 text-sm text-slate-600">
        Sete etapas, do anúncio à venda. Em cada uma, o que acontece e como o LeilãoClaro ajuda.
      </p>

      <ol className="mt-6 space-y-3">
        {ETAPAS.map((e, i) => (
          <li key={e.titulo} className="cartao flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">{i + 1}</span>
            <div>
              <h2 className="font-semibold">{e.titulo}</h2>
              <p className="mt-1 text-sm text-slate-700">{e.texto}</p>
              <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900">
                <span className="font-semibold">No LeilãoClaro:</span> {e.ajuda}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <section className="cartao mt-6">
        <h2 className="font-semibold">O que o semáforo quer dizer</h2>
        <ul className="mt-3 space-y-2">
          {SEMAFORO.map(([letra, cor, texto]) => (
            <li key={letra} className="flex items-center gap-3 text-sm">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold ${cor}`}>{letra}</span>
              {texto}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-600">
          A nota junta quatro partes: jurídico (30%), financeiro (35%), ocupação (20%) e localização (15%). Um problema eliminatório na matrícula dá E na hora, mesmo que o resto seja bom.
        </p>
      </section>

      <section className="cartao mt-6">
        <h2 className="font-semibold">Palavras que aparecem no caminho</h2>
        <dl className="mt-3 space-y-2 text-sm">
          {GLOSSARIO.map(([termo, def]) => (
            <div key={termo}>
              <dt className="font-medium">{termo}</dt>
              <dd className="text-slate-600">{def}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-6 text-xs text-slate-500">
        Este guia é uma visão geral. As regras de cada imóvel estão no edital, e a primeira compra deve ser acompanhada por um advogado.
      </p>
      <Link href="/" className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">Analisar um imóvel</Link>
    </main>
  );
}
