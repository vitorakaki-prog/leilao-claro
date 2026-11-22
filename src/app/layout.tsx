import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LeilãoClaro — Analisador de imóveis da Caixa',
  description: 'Cole o anúncio de um imóvel da Caixa e veja o semáforo de risco, o lance máximo e o porquê de cada número.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
