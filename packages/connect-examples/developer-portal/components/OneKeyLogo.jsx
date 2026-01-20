'use client'

import Image from 'next/image'

export function OneKeyLogo({ size = 32, className = '' }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH
    ? process.env.NEXT_PUBLIC_BASE_PATH.replace(/\/$/, '')
    : ''
  const iconSrc = `${basePath}/icons/onekey.png`

  return (
    <Image
      src={iconSrc}
      alt="OneKey"
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
      unoptimized
    />
  )
}

export function OneKeyWordmark({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <OneKeyLogo size={32} />
      <span className="font-bold text-xl tracking-tight flex items-baseline">
        {/* Force colors with inline styles to override any theme styling */}
        <span
          className="onekey-logo-text"
          style={{
            color: 'var(--onekey-logo-color, #18181b)',
            WebkitBackgroundClip: 'unset',
            backgroundClip: 'unset',
            WebkitTextFillColor: 'unset'
          }}
        >
          OneKey
        </span>
        <span
          className="onekey-logo-subtitle ml-1.5 font-normal"
          style={{
            color: 'var(--onekey-logo-subtitle, #71717a)',
            WebkitBackgroundClip: 'unset',
            backgroundClip: 'unset',
            WebkitTextFillColor: 'unset'
          }}
        >
          Developers
        </span>
      </span>
    </div>
  )
}
