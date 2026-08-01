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

export function ProHomeScreen({ basePath, locale, device, busy = false }) {
  const i18n = useMemo(() => getProI18n(locale), [locale])
  const wallpaper = joinPath(basePath, '/hardware-pro/res/wallpaper-1.jpg')

  const title = device?.deviceName ?? device?.model ?? 'OneKey Pro'
  const subtitle = device?.bleName ?? ''

  return (
    <div
      className="absolute inset-0"
      style={{
        width: PRO_SCREEN.width,
        height: PRO_SCREEN.height,
        background: PRO_COLORS.BLACK,
        color: PRO_COLORS.WHITE,
        backgroundImage: `url(${wallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width: PRO_SCREEN.width,
          height: PRO_SCREEN.height,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.45) 100%)'
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
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: 0.2,
            lineHeight: '32px',
            color: 'rgba(255,255,255,0.9)'
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
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: 0.2,
              lineHeight: '26px',
              color: 'rgba(255,255,255,0.65)'
            }}
          >
            {subtitle}
          </div>
        ) : null}

        <div
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{
            bottom: 40,
            width: 420
          }}
        >
          {!busy ? (
            <img
              src={joinPath(basePath, '/hardware-pro/res/up-home.png')}
              alt=""
              draggable={false}
              style={{ width: 34, height: 34, marginBottom: 10, opacity: 0.75 }}
            />
          ) : null}

          <div
            style={{
              width: 360,
              textAlign: 'center',
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: 0.8,
              lineHeight: '24px',
              color: 'rgba(255,255,255,0.78)'
            }}
          >
            {busy ? i18n.processing : i18n.homeSwipeUpToShowApps}
          </div>
        </div>
      </div>
    </div>
  )
}
