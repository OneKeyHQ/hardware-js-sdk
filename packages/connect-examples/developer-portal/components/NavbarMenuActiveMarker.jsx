'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

export function NavbarMenuActiveMarker({ lang }) {
  const pathname = usePathname()

  // Calculate active sections based on pathname
  const activeSection = useMemo(() => {
    if (
      pathname === `/${lang}/agent-wallet` ||
      pathname.startsWith(`/${lang}/agent-wallet/`)
    ) {
      return 'agent-wallet'
    }
    if (
      pathname === `/${lang}/hardware-sdk` ||
      pathname.startsWith(`/${lang}/hardware-sdk/`)
    ) {
      return 'hardware-integration'
    }
    if (
      pathname === `/${lang}/air-gap` ||
      pathname.startsWith(`/${lang}/air-gap/`)
    ) {
      return 'offline-signing'
    }
    if (
      pathname === `/${lang}/connect-to-software` ||
      pathname.startsWith(`/${lang}/connect-to-software/`)
    ) {
      return 'dapp-integration'
    }
    return null
  }, [lang, pathname])

  // Use CSS to style active menu buttons instead of DOM manipulation
  // This avoids useEffect and DOM queries on every route change
  return (
    <style>{`
      ${activeSection === 'hardware-integration' ? `
        #onekey-navbar-hardware-sdk {
          font-weight: 500;
          color: var(--tw-prose-links, currentColor);
        }
      ` : ''}
      ${activeSection === 'agent-wallet' ? `
        #onekey-navbar-agent-wallet {
          font-weight: 500;
          color: var(--tw-prose-links, currentColor);
        }
      ` : ''}
      ${activeSection === 'offline-signing' ? `
        #onekey-navbar-air-gap {
          font-weight: 500;
          color: var(--tw-prose-links, currentColor);
        }
      ` : ''}
      ${activeSection === 'dapp-integration' ? `
        #onekey-navbar-connect-to-software {
          font-weight: 500;
          color: var(--tw-prose-links, currentColor);
        }
      ` : ''}
    `}</style>
  )
}
