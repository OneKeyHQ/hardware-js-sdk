'use client'

import { ui } from '../i18n/ui.mjs'

import { useEffect, useRef, useState } from 'react'
import { Copy, Check, ChevronDown, ArrowUpRight } from 'lucide-react'
import { useConfig } from 'nextra-theme-docs'

export default function DocPageTools({ sourceCode, locale, toc = [] }) {

  const { normalizePagesResult: { activeThemeContext } } = useConfig()
  const toolsRef = useRef(null)
  const [copyState, setCopyState] = useState('idle')
  const resetTimer = useRef()
  useEffect(() => () => clearTimeout(resetTimer.current), [])
  useEffect(() => {
    const close = event => {
      if (event.type === 'keydown' && event.key !== 'Escape') return
      if (event.type === 'pointerdown' && toolsRef.current?.contains(event.target)) return
      toolsRef.current?.querySelectorAll('details[open]').forEach(details => {
        details.open = false
        if (event.type === 'keydown') details.querySelector('summary')?.focus()
      })
    }
    document.addEventListener('keydown', close)
    document.addEventListener('pointerdown', close)
    return () => {
      document.removeEventListener('keydown', close)
      document.removeEventListener('pointerdown', close)
    }
  }, [])

  async function copyPage() {
    clearTimeout(resetTimer.current)
    try {
      await navigator.clipboard.writeText(sourceCode)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
    resetTimer.current = setTimeout(() => setCopyState('idle'), 2500)
  }

  function openAssistant(service) {
    const prompt = `Read from ${window.location.href} so I can ask questions about it.`
    const base = service === 'chatgpt'
      ? 'https://chatgpt.com/?hints=search&prompt='
      : 'https://claude.ai/new?q='
    window.open(base + encodeURIComponent(prompt), '_blank', 'noopener,noreferrer')
    toolsRef.current?.querySelectorAll('details[open]').forEach(details => { details.open = false })
  }

  const copyLabel = copyState === 'copied'
    ? (ui(locale, 'Copied', '已复制'))
    : copyState === 'failed'
      ? (ui(locale, 'Copy failed. Try again', '复制失败，请重试'))
      : (ui(locale, 'Copy page', '复制页面'))

  return (
    <div ref={toolsRef} className="doc-page-tools" data-pagefind-ignore>
      {activeThemeContext.toc && toc.length > 0 && (
        <details className="doc-mobile-toc">
          <summary>{ui(locale, 'On this page', '本页目录')}<ChevronDown size={14} aria-hidden="true" /></summary>
          <nav aria-label={ui(locale, 'On this page', '本页目录')}>
            {toc.map(item => (
              <a key={item.id} href={`#${item.id}`} data-depth={item.depth}
                onClick={event => { event.currentTarget.closest('details').open = false }}>
                {item.value}
              </a>
            ))}
          </nav>
        </details>
      )}
      {activeThemeContext.copyPage && sourceCode && (
        <div className="doc-copy-actions">
          <button type="button" onClick={copyPage} aria-live="polite">
            {copyState === 'copied' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            {copyLabel}
          </button>
          <details className="doc-assistant-links">
            <summary aria-label={ui(locale, 'More page actions', '更多页面操作')}><ChevronDown size={14} aria-hidden="true" /></summary>
            <div>
              <button type="button" onClick={() => openAssistant('chatgpt')}>{ui(locale, 'Open in ChatGPT', '在 ChatGPT 中打开')}<ArrowUpRight size={13} aria-hidden="true" /></button>
              <button type="button" onClick={() => openAssistant('claude')}>{ui(locale, 'Open in Claude', '在 Claude 中打开')}<ArrowUpRight size={13} aria-hidden="true" /></button>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
