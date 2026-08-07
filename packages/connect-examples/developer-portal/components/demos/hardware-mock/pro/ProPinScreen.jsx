'use client'

import { useEffect, useMemo, useState } from 'react'
import { PRO_COLORS, PRO_LAYOUT, PRO_SCREEN } from './constants'
import { ProDeviceStatusBar } from './ProDeviceStatusBar'
import { getProI18n } from './i18n'

function createSeededRng(seed) {
  let state = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    state ^= seed.charCodeAt(i)
    state = Math.imul(state, 16777619)
  }
  return () => {
    state = Math.imul(1664525, state) + 1013904223
    return ((state >>> 0) % 1_000_000) / 1_000_000
  }
}

function seededShuffle(items, seed) {
  const rng = createSeededRng(seed)
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function ProPinScreen({
  basePath,
  locale,
  ui,
  randomPinMap = false,
  disabled = false,
  onSubmit,
  onCancel
}) {
  const i18n = useMemo(() => getProI18n(locale), [locale])
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue('')
  }, [ui?.requestId])

  const numbers = useMemo(() => {
    const nums = Array.from({ length: 10 }, (_, i) => i)
    if (!randomPinMap) return nums
    return seededShuffle(nums, String(ui?.requestId ?? 'pin'))
  }, [randomPinMap, ui?.requestId])

  const canSubmit = value.length >= 4 && !disabled

  const keyLayout = useMemo(
    () => [
      numbers[1],
      numbers[2],
      numbers[3],
      numbers[4],
      numbers[5],
      numbers[6],
      numbers[7],
      numbers[8],
      numbers[9],
      value ? 'backspace' : 'close',
      numbers[0],
      'ok'
    ],
    [numbers, value]
  )

  const handleKeyPress = (key) => {
    if (disabled) return

    if (key === 'close') {
      setValue('')
      onCancel?.()
      return
    }
    if (key === 'backspace') {
      setValue((prev) => prev.slice(0, -1))
      return
    }
    if (key === 'ok') {
      if (!canSubmit) return
      onSubmit?.(value)
      return
    }
    if (typeof key === 'number') {
      setValue((prev) => {
        if (prev.length >= 4) return prev
        return `${prev}${key}`
      })
    }
  }

  return (
    <div
      className="absolute inset-0"
      style={{
        width: PRO_SCREEN.width,
        height: PRO_SCREEN.height,
        background: PRO_COLORS.BLACK,
        color: PRO_COLORS.WHITE
      }}
    >
      <ProDeviceStatusBar basePath={basePath} ble="enabled" battery={60} />

      <div
        className="absolute left-0 top-0"
        style={{ width: PRO_SCREEN.width, height: PRO_SCREEN.height }}
      >
        <div
          className="absolute left-0"
          style={{
            top: 68,
            width: PRO_SCREEN.width,
            textAlign: 'center',
            fontSize: 48,
            fontWeight: 600,
            letterSpacing: 0,
            lineHeight: '56px'
          }}
        >
          {i18n.enterPin}
        </div>

        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 188,
            maxWidth: 432,
            fontSize: 48,
            fontWeight: 600,
            letterSpacing: 6,
            lineHeight: '56px',
            textAlign: 'center'
          }}
        >
          {value ? '•'.repeat(value.length) : ''}
        </div>

        <div
          className="absolute left-0"
          style={{
            bottom: 4,
            width: PRO_SCREEN.width,
            height: 472,
            padding: 4,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridAutoRows: '1fr',
            gap: 4
          }}
        >
          {keyLayout.map((key) => {
            const isActionKey = key === 'close' || key === 'backspace' || key === 'ok'
            const isCloseKey = key === 'close' || key === 'backspace'
            const isOkKey = key === 'ok'

            const bg = isCloseKey
              ? PRO_COLORS.ONEKEY_RED_1
              : isOkKey
                ? canSubmit
                  ? PRO_COLORS.ONEKEY_GREEN
                  : PRO_COLORS.ONEKEY_BLACK_1
                : PRO_COLORS.ONEKEY_BLACK

            const fg = isOkKey
              ? canSubmit
                ? PRO_COLORS.BLACK
                : PRO_COLORS.ONEKEY_GRAY_1
              : PRO_COLORS.WHITE

            const label =
              key === 'close'
                ? '×'
                : key === 'backspace'
                  ? '⌫'
                  : key === 'ok'
                    ? 'OK'
                    : String(key)

            return (
              <button
                key={`${key}`}
                type="button"
                onClick={() => handleKeyPress(key)}
                disabled={disabled || (isOkKey && !canSubmit)}
                className="select-none active:opacity-90 disabled:opacity-100"
                style={{
                  border: 0,
                  borderRadius: 40,
                  background: bg,
                  color: fg,
                  fontSize: isActionKey ? 40 : 48,
                  fontWeight: 600,
                  letterSpacing: 0,
                  lineHeight: '56px'
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
