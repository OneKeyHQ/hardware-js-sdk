'use client'

import { useEffect, useMemo, useRef } from 'react'

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

function drawFinderPattern(ctx, x, y, moduleSize) {
  const drawRect = (rx, ry, w, h, color) => {
    ctx.fillStyle = color
    ctx.fillRect(
      x + rx * moduleSize,
      y + ry * moduleSize,
      w * moduleSize,
      h * moduleSize
    )
  }
  // 7x7 black, 5x5 white, 3x3 black
  drawRect(0, 0, 7, 7, '#000000')
  drawRect(1, 1, 5, 5, '#FFFFFF')
  drawRect(2, 2, 3, 3, '#000000')
}

function isInFinder(x, y, count) {
  const inTopLeft = x < 8 && y < 8
  const inTopRight = x >= count - 8 && y < 8
  const inBottomLeft = x < 8 && y >= count - 8
  return inTopLeft || inTopRight || inBottomLeft
}

export function ProQrCode({
  data,
  iconSrc,
  size = 380,
  borderWidth = 38,
  radius = 64
}) {
  const canvasRef = useRef(null)

  const innerSize = useMemo(() => Math.max(1, size - 2 * borderWidth), [size, borderWidth])
  const moduleCount = 29

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = innerSize
    canvas.height = innerSize

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, innerSize, innerSize)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, innerSize, innerSize)

    const moduleSize = innerSize / moduleCount
    const rng = createSeededRng(String(data ?? ''))

    // finder patterns
    drawFinderPattern(ctx, 0, 0, moduleSize)
    drawFinderPattern(ctx, moduleCount - 7, 0, moduleSize)
    drawFinderPattern(ctx, 0, moduleCount - 7, moduleSize)

    ctx.fillStyle = '#000000'
    for (let y = 0; y < moduleCount; y += 1) {
      for (let x = 0; x < moduleCount; x += 1) {
        if (isInFinder(x, y, moduleCount)) continue
        // keep it visually closer to QR (more white)
        if (rng() < 0.33) {
          ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize)
        }
      }
    }
  }, [data, innerSize])

  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
        padding: borderWidth,
        borderRadius: radius,
        background: '#FFFFFF'
      }}
    >
      <canvas ref={canvasRef} className="block" style={{ width: innerSize, height: innerSize }} />
      {iconSrc ? (
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: 96,
            height: 96,
            transform: 'translate(-50%, -50%)',
            borderRadius: 24,
            background: '#FFFFFF',
            display: 'grid',
            placeItems: 'center'
          }}
        >
          <img
            src={iconSrc}
            alt=""
            draggable={false}
            style={{ width: 80, height: 80 }}
          />
        </div>
      ) : null}
    </div>
  )
}

