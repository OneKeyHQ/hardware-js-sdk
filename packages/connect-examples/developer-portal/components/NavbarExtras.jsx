'use client'

import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import { Sun, Moon, Monitor, Globe, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
        <Monitor className="w-4 h-4 text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors" />
      </button>
    )
  }

  const cycleTheme = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('light')
    }
  }

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-lg bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
      title={theme === 'dark' ? 'Switch to light mode' : theme === 'light' ? 'Switch to dark mode' : 'Switch theme'}
    >
      {resolvedTheme === 'dark' ? (
        <Moon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
      ) : (
        <Sun className="w-4 h-4 text-zinc-500 group-hover:text-zinc-700 transition-colors" />
      )}
    </button>
  )
}

export function LanguageToggle({ locale }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '简体中文' }
  ]

  const currentLang = languages.find(l => l.code === locale) || languages[0]

  const switchLanguage = (langCode) => {
    const newPath = pathname.replace(`/${locale}`, `/${langCode}`)
    router.push(newPath)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm group"
      >
        <Globe className="w-4 h-4 text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors" />
        <span className="text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{currentLang.code.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-[140px]">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => switchLanguage(lang.code)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                  lang.code === locale ? 'text-zinc-900 dark:text-white font-medium' : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function NavbarExtras({ locale }) {
  return (
    <div className="flex items-center gap-2">
      {/* Separator */}
      <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
      <ThemeToggle />
      <LanguageToggle locale={locale} />
    </div>
  )
}
