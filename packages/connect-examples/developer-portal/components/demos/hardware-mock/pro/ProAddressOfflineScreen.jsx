'use client'

import { useMemo, useState } from 'react'
import { PRO_COLORS, PRO_LAYOUT, PRO_SCREEN } from './constants'
import { ProDeviceStatusBar } from './ProDeviceStatusBar'
import { ProQrCode } from './ProQrCode'
import { getProI18n } from './i18n'

function joinPath(basePath, pathname) {
  const base = (basePath ?? '').trim()
  if (!base) return pathname
  if (pathname.startsWith('/')) return `${base}${pathname}`
  return `${base}/${pathname}`
}

export function ProAddressOfflineScreen({
  basePath,
  locale,
  details,
  disabled = false,
  onDone
}) {
  const i18n = useMemo(() => getProI18n(locale), [locale])
  const [view, setView] = useState(details?.qrFirst ? 'qrcode' : 'address')

  const network = details?.network ?? 'Bitcoin'
  const primaryColor = details?.primaryColor ?? PRO_COLORS.ONEKEY_GREEN
  const iconSrc = details?.icon ? joinPath(basePath, details.icon) : null
  const title = i18n.addressTitle(network)

  const showDerive = ['Bitcoin', 'Ethereum', 'Solana', 'Litecoin'].includes(network) && Boolean(details?.addrType)

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
            color: primaryColor
          }}
        >
          {title}
        </div>

        {view === 'address' ? (
          <div style={{ marginTop: 40 }}>
            {showDerive ? (
              <button
                type="button"
                disabled
                className="relative flex items-center"
                style={{
                  width: PRO_LAYOUT.cardWidth,
                  minHeight: 94,
                  padding: '28px 24px',
                  borderRadius: PRO_LAYOUT.cardRadius,
                  background: PRO_COLORS.ONEKEY_GRAY_3,
                  color: PRO_COLORS.WHITE,
                  fontSize: 30,
                  fontWeight: 600,
                  letterSpacing: -1,
                  textAlign: 'left'
                }}
              >
                <img
                  src={joinPath(basePath, '/hardware-pro/res/branches.png')}
                  alt=""
                  draggable={false}
                  style={{ width: 32, height: 32 }}
                />
                <div style={{ marginLeft: 16, flex: 1 }}>{details?.addrType}</div>
                <img
                  src={joinPath(basePath, '/hardware-pro/res/arrow-right.png')}
                  alt=""
                  draggable={false}
                  style={{ width: 32, height: 32 }}
                />
              </button>
            ) : null}

            <div
              style={{
                width: PRO_LAYOUT.cardWidth,
                marginTop: showDerive ? 8 : 0,
                borderRadius: PRO_LAYOUT.cardRadius,
                overflow: 'hidden',
                background: PRO_COLORS.ONEKEY_GRAY_3
              }}
            >
              <div
                style={{
                  height: 63,
                  padding: '16px 24px 0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8
                }}
              >
                <img
                  src={joinPath(basePath, '/hardware-pro/res/group-icon-wallet.png')}
                  alt=""
                  draggable={false}
                  style={{ width: 32, height: 32 }}
                />
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 600,
                    letterSpacing: -1,
                    lineHeight: '32px'
                  }}
                >
                  {i18n.myAddress}
                </div>
              </div>
              <div
                style={{
                  height: 1,
                  width: 408,
                  marginLeft: 24,
                  marginTop: 14,
                  background: PRO_COLORS.ONEKEY_GRAY_2
                }}
              />
              <div
                style={{
                  padding: '12px 24px',
                  minHeight: 82
                }}
              >
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 600,
                    letterSpacing: -1,
                    lineHeight: '56px',
                    color: PRO_COLORS.WHITE,
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {details?.address ?? ''}
                </div>
              </div>
              <div style={{ height: 12, background: PRO_COLORS.ONEKEY_GRAY_3 }} />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 30 }}>
            <ProQrCode data={details?.address ?? ''} iconSrc={iconSrc} />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setView((prev) => (prev === 'address' ? 'qrcode' : 'address'))}
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
        {view === 'address' ? i18n.qrCode : i18n.address}
      </button>

      <button
        type="button"
        onClick={() => onDone?.()}
        disabled={disabled}
        className="absolute select-none active:opacity-90 disabled:opacity-60"
        style={{
          right: PRO_LAYOUT.bottomButtonGapX,
          bottom: PRO_LAYOUT.bottomButtonOffsetY,
          width: PRO_LAYOUT.buttonHalfWidth,
          height: PRO_LAYOUT.buttonHeight,
          borderRadius: PRO_LAYOUT.buttonRadius,
          background: primaryColor,
          border: 0,
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: -1,
          color: PRO_COLORS.BLACK
        }}
      >
        {i18n.done}
      </button>
    </div>
  )
}
