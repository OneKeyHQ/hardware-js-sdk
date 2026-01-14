import 'nextra-theme-docs/style.css'
import '../styles/globals.css'
import Script from 'next/script'

export const metadata = {
  title: {
    default: 'OneKey Developers',
    template: '%s - OneKey Developers'
  },
  description: 'Official developer documentation for OneKey hardware and software integration.',
}

const WIDGET_SRC = 'https://exwxyzi.cn/widget/widget.js'
const ENABLE_CSP_META = false

function getWidgetConfig() {
  const src = WIDGET_SRC?.trim()
  if (!src) return { src: null, origin: null }
  try {
    const url = new URL(src)
    return { src, origin: url.origin }
  } catch {
    return { src, origin: null }
  }
}

function buildCspMeta({ widgetOrigin }) {
  if (!ENABLE_CSP_META) return null

  const scriptSrc = ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
  const connectSrc = ["'self'"]
  const frameSrc = ["'self'"]
  if (widgetOrigin) {
    scriptSrc.push(widgetOrigin)
    connectSrc.push(widgetOrigin)
    frameSrc.push(widgetOrigin)
  }

  return [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `img-src 'self' data: https:`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `script-src ${scriptSrc.join(' ')}`,
    `connect-src ${connectSrc.join(' ')}`,
    `frame-src ${frameSrc.join(' ')}`,
  ].join('; ')
}

export default function RootLayout({ children }) {
  const widget = getWidgetConfig()
  const csp = buildCspMeta({ widgetOrigin: widget.origin })

  return (
    <html lang="en" dir="ltr" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />
        {csp ? <meta httpEquiv="Content-Security-Policy" content={csp} /> : null}
      </head>
      <body>
        {children}
        {widget.src ? <Script src={widget.src} strategy="afterInteractive" /> : null}
      </body>
    </html>
  )
}
