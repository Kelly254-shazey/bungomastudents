import { Poppins, Playfair_Display } from 'next/font/google'
import { Navigation } from '@/components/Navigation'
import { Chatbot } from '@/components/Chatbot'
import './globals.css'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'BUCCUSA - Bungoma County College and University Students Association',
  description: 'Rooted in Bungoma. Rising Beyond. A youth-led association promoting leadership, mentorship, and community development.',
  keywords: 'BUCCUSA, Bungoma, students, leadership, mentorship, community',
  authors: [{ name: 'BUCCUSA' }],
  openGraph: {
    title: 'BUCCUSA - Rooted in Bungoma. Rising Beyond.',
    description: 'A youth-led institution promoting leadership, mentorship, and community development.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} ${playfair.variable} font-body bg-gray-50 text-text overflow-x-hidden w-full`}>
        <Navigation />
        {children}
        <Chatbot />
      </body>
    </html>
  )
}
