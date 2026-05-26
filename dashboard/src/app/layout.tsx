import type { Metadata } from 'next'
import { IBM_Plex_Mono, Syne } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'LedgerForge Bazaar — Agent Services on Mantle',
  description:
    'Discover, pay for, and rate AI agent services with on-chain reputation that compounds automatically on every execution.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${ibmPlexMono.variable} ${syne.variable}`}>
      <body className="bg-lf-bg text-lf-ink min-h-screen">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  )
}
