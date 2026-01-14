'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function NavbarMenuActiveMarker({ lang }) {
  const pathname = usePathname()

  useEffect(() => {
    const isHardwareSection =
      pathname === `/${lang}/hardware-sdk` ||
      pathname.startsWith(`/${lang}/hardware-sdk/`) ||
      pathname === `/${lang}/air-gap` ||
      pathname.startsWith(`/${lang}/air-gap/`)

    const targetTitle = lang === 'zh' ? '连接硬件' : 'Connect to hardware'

    const header = document.querySelector('header.nextra-navbar')
    if (!header) return

    const buttons = header.querySelectorAll('button[aria-haspopup="menu"]')
    for (const button of buttons) {
      const title = button.textContent?.trim() || ''
      if (title === targetTitle) {
        if (isHardwareSection) {
          button.dataset.onekeyNavActive = 'true'
          button.setAttribute('aria-current', 'page')
        } else {
          delete button.dataset.onekeyNavActive
          button.removeAttribute('aria-current')
        }
      }
    }
  }, [lang, pathname])

  return null
}

