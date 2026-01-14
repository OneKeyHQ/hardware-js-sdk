'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '') || ''
const supportedLocales = ['en', 'zh']
const defaultLocale = 'en'

export default function NotFound() {
  const pathname = usePathname()

  useEffect(() => {
    let path = pathname || '/'

    if (basePath && path.startsWith(basePath)) {
      path = path.slice(basePath.length) || '/'
    }

    if (!path.startsWith('/')) {
      path = '/' + path
    }

    const segments = path.split('/').filter(Boolean)
    const locale = segments[0]

    if (!locale || !supportedLocales.includes(locale)) {
      const targetPath = `${basePath}/${defaultLocale}${path}`.replace(/\/\/+/g, '/')
      window.location.replace(targetPath)
    }
  }, [pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <main className="text-center p-8 max-w-lg">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4">
          Page not found
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          If you are not redirected automatically, please go to{' '}
          <a
            href={`${basePath}/en/`}
            className="text-[#00B812] hover:underline"
          >
            the English documentation
          </a>.
        </p>
      </main>
    </div>
  )
}

