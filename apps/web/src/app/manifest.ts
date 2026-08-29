import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Audio Mind',
    short_name: 'Audio Mind',
    description: 'Grave ou envie um áudio e receba a transcrição, o resumo e o PDF.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0e15',
    theme_color: '#0a0e15',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
