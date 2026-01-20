'use client'

import { useEffect, useMemo, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const root = document.documentElement
    const update = () => setIsDark(root.classList.contains('dark'))
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}

function normalizeLineSet(lines) {
  const set = new Set()
  for (const n of Array.isArray(lines) ? lines : []) {
    const v = Number(n)
    if (Number.isFinite(v) && v > 0) set.add(v)
  }
  return set
}

export function EditorCodeBlock({
  code,
  language = 'typescript',
  activeLine,
  breakpoints,
  showBreakpoints = false,
  maxHeight,
  dataTour,
  filename,
  cursor = 'text',
  className,
  scrollClassName
}) {
  const isDark = useIsDarkMode()
  const bp = useMemo(() => normalizeLineSet(breakpoints), [breakpoints])
  const active = Number.isFinite(Number(activeLine)) ? Number(activeLine) : null
  const scrollStyle = maxHeight !== undefined && maxHeight !== null ? { maxHeight } : undefined

  return (
    <div
      data-tour={dataTour}
      className={[
        'flex min-h-0 flex-col overflow-hidden rounded-xl',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center gap-2 bg-zinc-50/70 px-3 py-2 text-xs text-zinc-700 backdrop-blur dark:bg-[#21252b]/80 dark:text-[#d7dae0]">
        <span className="inline-flex items-center rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:bg-[#2c313c] dark:text-[#9da5b4]">
          {language === 'json' ? 'JSON' : 'TS'}
        </span>
        <span className="font-mono text-[11px] text-zinc-500 dark:text-[#9da5b4]">
          {filename ?? (language === 'json' ? 'result.json' : 'demo.ts')}
        </span>
      </div>

      <div
        className={['min-h-0 flex-1 overflow-auto', scrollClassName].filter(Boolean).join(' ')}
        style={scrollStyle}
      >
        <SyntaxHighlighter
          language={language}
          style={isDark ? oneDark : oneLight}
          showLineNumbers
          wrapLines
          customStyle={{
            height: '100%',
            margin: 0,
            padding: '12px 0',
            background: isDark ? '#282c34' : '#f8fafc',
            fontFamily: 'var(--font-mono)',
            cursor
          }}
          codeTagProps={{
            style: {
              fontFamily: 'var(--font-mono)',
              fontSize: 12.5,
              lineHeight: 1.6,
              fontWeight: 450
            }
          }}
          lineNumberStyle={(lineNumber) => {
            const isBp = bp.has(lineNumber)
            return {
              position: 'relative',
              minWidth: 54,
              paddingRight: 12,
              paddingLeft: 22,
              textAlign: 'right',
              userSelect: 'none',
              opacity: 0.85,
              color: isDark ? '#7f848e' : '#475569',
              fontSize: 12.5,
              ...(showBreakpoints && isBp
                ? {
                    backgroundImage: `radial-gradient(circle, ${isDark ? '#ff5f56' : '#dc2626'} 48%, transparent 49%)`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: '10px center',
                    backgroundSize: '14px 14px'
                  }
                : null)
            }
          }}
          lineProps={(lineNumber) => {
            const isActive = active !== null && lineNumber === active
            const isBp = bp.has(lineNumber)
            return {
              style: {
                display: 'block',
                paddingRight: 12,
                borderLeft: isActive ? '2px solid rgba(255, 255, 255, 0.5)' : '2px solid transparent',
                background: isActive
                  ? isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.05)'
                  : showBreakpoints && isBp
                    ? isDark
                      ? 'rgba(239, 68, 68, 0.06)'
                      : 'rgba(239, 68, 68, 0.06)'
                    : 'transparent'
              }
            }
          }}
        >
          {String(code ?? '')}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
