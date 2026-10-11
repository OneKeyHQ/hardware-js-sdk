'use client'

import { localeFromPath, publishedLocaleCodes } from '../i18n/locales.mjs'

import { ui } from '../i18n/ui.mjs'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '') || ''
const supportedLocales = publishedLocaleCodes
const defaultLocale = 'en'

export default function NotFound() {
  const pathname = usePathname()
  const locale = localeFromPath(pathname || '/', basePath)

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
          {ui(locale, 'Page not found')}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">
          {ui(locale, 'This page may have moved or no longer exists.')}
        </p>
        <a
          href={`${basePath}/${locale}/`}
          className="text-[#00B812] hover:underline"
        >
          {ui(locale, 'Back to documentation')}
        </a>
      </main>
    </div>
  )
}

