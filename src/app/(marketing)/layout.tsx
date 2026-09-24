import { IBM_Plex_Mono, Press_Start_2P } from 'next/font/google'

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-mono',
})

const pressStart2P = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-press-start-2p',
})

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${ibmPlexMono.variable} ${pressStart2P.variable}`}>
      {children}
    </div>
  )
}
