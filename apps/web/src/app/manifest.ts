import type { MetadataRoute } from 'next'

/**
 * Makes Audio Mind appear in Android's "compartilhar" sheet for an audio file.
 * The POST lands in the SERVICE WORKER (see public/sw.js), which stashes the
 * file and redirects to the composer — no server round trip, and the upload
 * flow that already exists takes it from there.
 *
 * Cast because Next's manifest type models `params` as a list of name/value
 * pairs, which is not what the Web Share Target spec says: there, `params` is an
 * object naming which form field carries the title, the text and the FILES.
 * Following the type instead of the spec would produce a manifest Android
 * ignores, so the spec wins and the cast carries the reason.
 */
const SHARE_TARGET = {
  action: '/share-target',
  method: 'post',
  enctype: 'multipart/form-data',
  params: {
    title: 'title',
    text: 'text',
    files: [{ name: 'audio', accept: ['audio/*'] }],
  },
} as unknown as MetadataRoute.Manifest['share_target']

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
    share_target: SHARE_TARGET,
    icons: [
      { src: '/icons/icon-192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
