import 'nextra-theme-docs/style.css'
import '@assistant-ui/react-ui/styles/index.css'
import '@assistant-ui/react-ui/styles/modal.css'
import '@assistant-ui/react-ui/styles/markdown.css'
import '../styles/globals.css'

export const metadata = {
  title: {
    default: 'OneKey Developers',
    template: '%s - OneKey Developers'
  },
  description: 'Official developer documentation for OneKey hardware and software integration.',
  icons: {
    icon: '/icons/onekey.png',
    apple: '/icons/onekey.png',
  },
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
