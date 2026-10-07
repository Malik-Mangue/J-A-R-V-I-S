/**
 * Minimal PWA manifest (docs/ARCHITECTURE.md #40).
 *
 * Only the installable shell is provided for now. Offline capture queueing is
 * explicitly NOT promised yet (docs/ARCHITECTURE.md #41).
 */
export default function manifest() {
  return {
    name: 'Personal Second Brain',
    short_name: 'Brain',
    description: 'Sistema pessoal de captura, organização e acompanhamento por voz e texto.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f1115',
    theme_color: '#0f1115',
    lang: 'pt',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}