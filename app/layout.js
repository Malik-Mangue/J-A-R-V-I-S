import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'Personal Second Brain',
  description: 'Sistema pessoal de captura, organização e acompanhamento por voz e texto.',
  manifest: '/manifest.webmanifest',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f1115',
};

/**
 * Root layout. Mobile-first shell with a persistent capture action
 * (docs/ARCHITECTURE.md #39).
 */
export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <h1>Personal Brain</h1>
            <span className="date">{new Date().toLocaleDateString('pt-PT', { dateStyle: 'full' })}</span>
          </header>
          <nav className="tabbar" aria-label="Navegação principal">
            <Link href="/">Hoje</Link>
            <Link href="/capture">Capturar</Link>
            <Link href="/tasks">Tarefas</Link>
            <Link href="/inbox">Inbox</Link>
            <Link href="/ideas">Ideias</Link>
            <Link href="/projects">Projetos</Link>
            <Link href="/finance">Finanças</Link>
            <Link href="/settings">Definições</Link>
          </nav>
          <main>{children}</main>
        </div>
        {/* docs/ARCHITECTURE.md #39: the primary action is always accessible. */}
        <Link className="capture-fab" href="/capture" aria-label="Capturar nova informação">
          🎙
        </Link>
      </body>
    </html>
  );
}