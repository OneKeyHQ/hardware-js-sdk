'use client'

import { useEffect } from 'react'

export default function DocumentLanguage({ locale }) {
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}
