import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/providers'
import { Toaster } from '@/components/toaster'
import { PwaRegister } from '@/components/pwa-register'

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Audio Mind',
  description: 'Grave ou envie um áudio e receba a transcrição, o resumo e o PDF.',
  // app/manifest.ts wires the <link rel="manifest"> automatically; these two
  // point at the icon routes in app/icons/ (custom routes, not the reserved
  // icon.tsx/apple-icon.tsx filenames, so the exact URL stays ours to control
  // and match against the manifest's icon list).
  icons: {
    icon: '/icons/favicon',
    apple: '/icons/apple-touch-icon',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Audio Mind',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0e15',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={sans.variable}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster />
        <PwaRegister />
      </body>
    </html>
  )
}
