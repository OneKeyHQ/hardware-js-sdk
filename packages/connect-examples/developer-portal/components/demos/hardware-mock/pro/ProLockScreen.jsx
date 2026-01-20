'use client'

import { useMemo } from 'react'
import { PRO_COLORS, PRO_SCREEN } from './constants'
import { getProI18n } from './i18n'
import { ProDeviceStatusBar } from './ProDeviceStatusBar'

function joinPath(basePath, pathname) {
  const base = (basePath ?? '').trim()
  if (!base) return pathname
  if (pathname.startsWith('/')) return `${base}${pathname}`
  return `${base}/${pathname}`
}

export function ProLockScreen({ basePath, locale, device, disabled = false, onTap }) {
  const i18n = useMemo(() => getProI18n(locale), [locale])
  const wallpaper = joinPath(basePath, '/hardware-pro/res/wallpaper-1.jpg')

  const title = device?.deviceName ?? device?.model ?? 'OneKey Pro'
  const subtitle = device?.bleName ?? ''

  return (
    <div
      className="absolute inset-0"
      onClick={() => {
        if (disabled) return
        onTap?.()
      }}
      style={{
        width: PRO_SCREEN.width,
        height: PRO_SCREEN.height,
        background: PRO_COLORS.BLACK,
        color: PRO_COLORS.WHITE,
        cursor: disabled ? 'default' : 'pointer'
      }}
    >
      <img
        src={wallpaper}
        alt=""
        draggable={false}
        className="absolute left-0 top-0"
        style={{
          width: PRO_SCREEN.width,
          height: PRO_SCREEN.height,
          objectFit: 'cover',
          opacity: 0.55
        }}
      />
      <div
        className="absolute left-0 top-0"
        style={{
          width: PRO_SCREEN.width,
          height: PRO_SCREEN.height,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.55) 100%)'
        }}
      />

      <ProDeviceStatusBar basePath={basePath} ble="enabled" battery={60} />

      <div
        className="absolute left-0 top-0"
        style={{ width: PRO_SCREEN.width, height: PRO_SCREEN.height }}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 108,
            width: 420,
            textAlign: 'center',
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: 0.2,
            lineHeight: '32px',
            color: 'rgba(255,255,255,0.85)'
          }}
        >
          {title}
        </div>

        {subtitle ? (
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: 146,
              width: 420,
              textAlign: 'center',
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: 0.2,
              lineHeight: '28px',
              color: 'rgba(255,255,255,0.68)'
            }}
          >
            {subtitle}
          </div>
        ) : null}

        <div
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{
            bottom: 48,
            width: 420
          }}
        >
          <img
            src={joinPath(basePath, '/hardware-pro/res/lock.png')}
            alt=""
            draggable={false}
            style={{ width: 32, height: 32, marginBottom: 14, opacity: 0.75 }}
          />
          <div
            style={{
              position: 'relative',
              width: 360,
              height: 46,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.22)',
              background: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.8)',
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: 1
            }}
          >
            {i18n.lockTapToUnlock}
          </div>
        </div>
      </div>
    </div>
  )
}
