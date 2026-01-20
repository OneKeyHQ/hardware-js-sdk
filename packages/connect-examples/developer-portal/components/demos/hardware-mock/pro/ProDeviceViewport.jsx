'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PRO_DEVICE, PRO_SCREEN } from './constants'

function getScaleForWidth(width) {
  if (!Number.isFinite(width) || width <= 0) return 1
  return Math.min(1, width / PRO_DEVICE.width)
}

export function ProDeviceViewport({ children, overlay, maxWidth = 250 }) {
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [measured, setMeasured] = useState(false)

  const wrapStyle = useMemo(
    () => ({
      aspectRatio: `${PRO_DEVICE.width} / ${PRO_DEVICE.height}`,
      maxWidth
    }),
    [maxWidth]
  )

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined

    const update = () => {
      const width = el.getBoundingClientRect().width
      if (!Number.isFinite(width) || width <= 0) return
      setScale(getScaleForWidth(width))
      setMeasured(true)
    }

    update()

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const width = entry.contentRect.width
      if (!Number.isFinite(width) || width <= 0) return
      setScale(getScaleForWidth(width))
      setMeasured(true)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const screenLeft = PRO_DEVICE.framePadding.x
  const screenTop = PRO_DEVICE.framePadding.top
  const screenWidth = PRO_SCREEN.width
  const screenHeight = PRO_SCREEN.height

  return (
    <div className="relative mx-auto w-full" style={wrapStyle} ref={wrapRef}>
      <div
        className="absolute left-0 top-0"
        style={{
          width: PRO_DEVICE.width,
          height: PRO_DEVICE.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          opacity: measured ? 1 : 0,
          willChange: 'transform'
        }}
      >
        <div
          className="relative h-full w-full"
          style={{
            borderRadius: PRO_DEVICE.frameRadius,
            background:
              'linear-gradient(180deg, #fdfdfd 0%, #f2f2f2 55%, #e7e7e7 100%)',
            boxShadow:
              '0 16px 34px rgba(24, 24, 24, 0.18), inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -2px 6px rgba(120, 120, 120, 0.2)',
            border: '1px solid rgba(210, 210, 210, 0.7)'
          }}
        >
          <div
            className="absolute"
            style={{
              inset: 8,
              borderRadius: PRO_DEVICE.innerRadius,
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(245,245,245,0.7) 55%, rgba(225,225,225,0.6) 100%)',
              boxShadow:
                'inset 0 0 0 1px rgba(255,255,255,0.7), inset 0 -2px 5px rgba(110,110,110,0.2)'
            }}
          />

          <div
            className="absolute"
            style={{
              left: screenLeft - 5,
              top: screenTop - 5,
              width: screenWidth + 10,
              height: screenHeight + 10,
              borderRadius: PRO_DEVICE.screenRadius + 5,
              background: 'rgba(18, 18, 18, 0.94)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)'
            }}
          />

          <div
            className="absolute"
            style={{
              left: screenLeft,
              top: screenTop,
              width: screenWidth,
              height: screenHeight,
              borderRadius: PRO_DEVICE.screenRadius,
              overflow: 'hidden',
              background: '#050608',
              boxShadow:
                '0 10px 20px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.05)'
            }}
          >
            <div className="relative h-full w-full">
              {children}
              {overlay}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(120deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 22%, rgba(255,255,255,0) 40%)',
                  mixBlendMode: 'screen'
                }}
              />
            </div>
          </div>

          <div
            className="absolute left-1/2 -translate-x-1/2 text-center font-semibold uppercase tracking-[0.3em]"
            style={{
              bottom: 32,
              fontSize: 15,
              color: 'rgba(120,120,120,0.7)',
              textShadow: '0 1px 1px rgba(0,0,0,0.12)'
            }}
          >
            OneKey
          </div>
        </div>
      </div>
    </div>
  )
}
