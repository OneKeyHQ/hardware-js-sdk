'use client'

import { useMemo } from 'react'
import { PRO_COLORS, PRO_LAYOUT, PRO_SCREEN } from './constants'
import { ProDeviceStatusBar } from './ProDeviceStatusBar'
import { getProI18n } from './i18n'

export function ProTxConfirmScreen({
  basePath,
  locale,
  details,
  disabled = false,
  onReject,
  onApprove
}) {
  const i18n = useMemo(() => getProI18n(locale), [locale])
  const rows = useMemo(() => {
    if (typeof details?.messageHex === 'string') {
      return [
        { label: 'path', value: details?.path ?? '-' },
        { label: 'messageHex', value: details?.messageHex ?? '-' }
      ]
    }

    return [
      { label: 'asset', value: details?.asset ?? '-' },
      { label: 'to', value: details?.to ?? '-' },
      { label: 'amount', value: details?.amount ?? '-' }
    ]
  }, [details, locale])

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
        className="absolute left-0"
        style={{
          top: PRO_SCREEN.statusBarHeight,
          width: PRO_SCREEN.width,
          height: 646,
          overflowY: 'auto',
          padding: `12px ${PRO_LAYOUT.screenPaddingX}px 24px`
        }}
      >
        <div
          style={{
            width: PRO_LAYOUT.cardWidth,
            fontSize: 64,
            fontWeight: 600,
            letterSpacing: -3,
            lineHeight: '56px',
            color: PRO_COLORS.WHITE
          }}
        >
          {locale === 'en' ? 'Confirm' : '确认'}
        </div>

        <div style={{ marginTop: 40 }}>
          <div
            style={{
              width: PRO_LAYOUT.cardWidth,
              borderRadius: PRO_LAYOUT.cardRadius,
              overflow: 'hidden',
              background: PRO_COLORS.ONEKEY_GRAY_3
            }}
          >
            {rows.map((row) => (
              <div key={row.label} style={{ padding: '12px 24px' }}>
                <div
                  style={{
                    fontSize: 26,
                    color: PRO_COLORS.ONEKEY_GRAY_4,
                    letterSpacing: -1
                  }}
                >
                  {row.label}
                </div>
                <div
                  style={{
                    fontSize: 30,
                    letterSpacing: -1,
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {String(row.value ?? '-')}
                </div>
              </div>
            ))}

            <div style={{ height: 12, background: PRO_COLORS.ONEKEY_GRAY_3 }} />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onReject?.()}
        disabled={disabled}
        className="absolute select-none active:opacity-90 disabled:opacity-60"
        style={{
          left: PRO_LAYOUT.bottomButtonGapX,
          bottom: PRO_LAYOUT.bottomButtonOffsetY,
          width: PRO_LAYOUT.buttonHalfWidth,
          height: PRO_LAYOUT.buttonHeight,
          borderRadius: PRO_LAYOUT.buttonRadius,
          background: PRO_COLORS.ONEKEY_GRAY_3,
          border: 0,
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: -1,
          color: PRO_COLORS.WHITE
        }}
      >
        {i18n.cancel ?? (locale === 'en' ? 'Cancel' : '取消')}
      </button>

      <button
        type="button"
        onClick={() => onApprove?.()}
        disabled={disabled}
        className="absolute select-none active:opacity-90 disabled:opacity-60"
        style={{
          right: PRO_LAYOUT.bottomButtonGapX,
          bottom: PRO_LAYOUT.bottomButtonOffsetY,
          width: PRO_LAYOUT.buttonHalfWidth,
          height: PRO_LAYOUT.buttonHeight,
          borderRadius: PRO_LAYOUT.buttonRadius,
          background: PRO_COLORS.ONEKEY_GREEN,
          border: 0,
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: -1,
          color: PRO_COLORS.BLACK
        }}
      >
        {i18n.confirm ?? (locale === 'en' ? 'Confirm' : '确认')}
      </button>
    </div>
  )
}
