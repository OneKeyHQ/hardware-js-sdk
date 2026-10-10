import 'nextra-theme-docs/style.css'
import '../styles/globals.css'
import '../styles/portal-design.css'
import localFont from 'next/font/local'

const roobert = localFont({
  src: [
    { path: '../public/fonts/Roobert/Roobert-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/Roobert/Roobert-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/Roobert/Roobert-SemiBold.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-roobert',
  display: 'swap',
  adjustFontFallback: false,
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
})

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '')

export const metadata = {
  title: {
    default: 'OneKey Developers',
    template: '%s - OneKey Developers'
  },
  description: 'Official developer documentation for OneKey hardware and software integration. Build secure Web3 experiences with OneKey hardware wallets.',
  icons: {
    icon: { url: `${basePath}/brand/logo_green.svg`, type: 'image/svg+xml' },
    apple: `${basePath}/icons/onekey.png`,
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
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fafbf8',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" className={roobert.variable} suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  )
}
