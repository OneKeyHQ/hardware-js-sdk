import 'nextra-theme-docs/style.css'
import '../styles/globals.css'

export const metadata = {
  title: {
    default: 'OneKey Developers',
    template: '%s - OneKey Developers'
  },
  description: 'Official developer documentation for OneKey hardware and software integration. Build secure Web3 experiences with OneKey hardware wallets.',
  icons: {
    icon: '/icons/onekey.png',
    apple: '/icons/onekey.png',
  },
  openGraph: {
    title: 'OneKey Developers',
    description: 'Official developer documentation for OneKey hardware and software integration. Build secure Web3 experiences with OneKey hardware wallets.',
    siteName: 'OneKey Developers',
    type: 'website',
    images: [{ url: '/og.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OneKey Developers',
    description: 'Official developer documentation for OneKey hardware and software integration.',
    creator: '@OneKeyHQ',
    site: '@OneKeyHQ',
    images: ['/og.jpg'],
  },
  metadataBase: new URL('https://developer.onekey.so'),
}

export const viewport = {
  themeColor: '#000000',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
