'use client'

import { useEffect, useMemo, useState } from 'react'
import { CLASSIC1S_DEVICE } from './classic1sConstants'
import { Classic1sDeviceViewport } from './Classic1sDeviceViewport'

function getI18n(locale) {
  const isEn = locale === 'en'
  return {
    lockTitle: isEn ? 'Locked' : '已锁定',
    lockHint: isEn ? 'Press Power to unlock' : '按电源键解锁',
    pinTitle: isEn ? 'Enter PIN' : '输入 PIN',
    pinModeApp: isEn ? 'In app' : '在页面输入',
    pinModeDevice: isEn ? 'On device' : '在设备输入',
    pinPlaceholder: isEn ? 'PIN (any 4 digits)' : 'PIN（任意 4 位）',
    pinSubmit: isEn ? 'Submit' : '提交',
    pinSubmitOnDevice: isEn ? "I've entered on device" : '我已在设备输入',
    confirmTitle: isEn ? 'Confirm' : '确认',
    confirmHint: isEn ? 'Confirm on device' : '请在设备上确认',
    approve: isEn ? 'Approve' : '同意',
    reject: isEn ? 'Reject' : '拒绝'
  }
}

function IconLock({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 11V8a5 5 0 0 1 10 0v3" />
      <rect x="5" y="11" width="14" height="10" rx="2" />
    </svg>
  )
}

function IconBattery({ className }) {
  return (
    <svg viewBox="0 0 28 14" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="1" y="2" width="22" height="10" rx="2" />
      <path d="M25 5v4" />
      <rect x="3" y="4" width="14" height="6" rx="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconBluetooth({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 7l10 10-5 5V2l5 5L7 17" />
    </svg>
  )
}

function IconPower({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v10" />
      <path d="M6.3 5.8a8 8 0 1 0 11.4 0" />
    </svg>
  )
}

function IconUp({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 14l6-6 6 6" />
    </svg>
  )
}

function IconDown({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 10l6 6 6-6" />
    </svg>
  )
}

function IconEnter({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 17l5-5-5-5" />
      <path d="M4 12h11" />
      <path d="M20 4v16" opacity="0.3" />
    </svg>
  )
}

function Classic1sFrame({ children, overlay, disabled = false, onPressButton }) {
  const { buttons } = CLASSIC1S_DEVICE
  return (
    <div
      className="relative overflow-hidden rounded-[18px]"
      style={{
        width: CLASSIC1S_DEVICE.width,
        height: CLASSIC1S_DEVICE.height,
        background: 'linear-gradient(180deg, #1e1f21 0%, #141516 55%, #101112 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -2px 6px rgba(0,0,0,0.6), 0 18px 36px rgba(0,0,0,0.28)',
        border: '1px solid rgba(255,255,255,0.05)'
      }}
    >
      <div
        className="absolute"
        style={{
          left: CLASSIC1S_DEVICE.screen.x,
          top: CLASSIC1S_DEVICE.screen.y,
          width: CLASSIC1S_DEVICE.screen.width,
          height: CLASSIC1S_DEVICE.screen.height,
          borderRadius: 8,
          background: 'linear-gradient(180deg, #0c0d10 0%, #090b0e 100%)',
          boxShadow:
            'inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 8px 16px rgba(0,0,0,0.45), 0 8px 18px rgba(0,0,0,0.32)'
        }}
      >
        <div className="relative h-full w-full">
          {children}
          {overlay}
        </div>
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: buttons.y,
          width: CLASSIC1S_DEVICE.screen.width,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: buttons.gap
        }}
      >
        {[
          { key: 'power', icon: IconPower },
          { key: 'up', icon: IconUp },
          { key: 'down', icon: IconDown },
          { key: 'enter', icon: IconEnter }
        ].map((item) => {
          const Ico = item.icon
          return (
            <button
              key={item.key}
              type="button"
              disabled={disabled || !onPressButton}
              onClick={() => onPressButton?.(item.key)}
              className="grid place-items-center rounded-full ring-1 ring-white/10 disabled:opacity-60"
              style={{
                width: buttons.size,
                height: buttons.size,
                background: 'linear-gradient(180deg, #202226 0%, #17181b 100%)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 2px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              <Ico className="h-4 w-4 text-white/70" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ScreenContainer({ children }) {
  return (
    <div className="h-full w-full">{children}</div>
  )
}

function LockScreen({ locale }) {
  const i18n = useMemo(() => getI18n(locale), [locale])
  return (
    <div className="h-full w-full">
      <ScreenContainer>
        <div className="relative flex h-full flex-col px-3 py-2 text-[#9fe3ff]">
          <ScreenStatus locale={locale} />
          <div className="text-[12px] font-semibold">OneKey Classic</div>
          <div className="mt-4 flex flex-1 flex-col items-center justify-center">
            <IconLock className="h-7 w-7 text-white/85" />
          </div>
          <div className="text-center text-[10px] text-white/60">{i18n.lockHint}</div>
        </div>
      </ScreenContainer>
    </div>
  )
}

function ScreenStatus({ locale }) {
  return (
    <div className="absolute right-2 top-1.5 flex items-center gap-1 text-white/80">
      <IconBluetooth className="h-3.5 w-3.5" />
      <IconBattery className="h-3.5 w-[30px]" />
    </div>
  )
}

function PinMatrixLayoutScreen({ locale, matrix }) {
  const safe = Array.isArray(matrix) && matrix.length === 10 ? matrix : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  return (
    <ScreenContainer>
      <div className="relative h-full w-full px-1 py-1 text-[#9fe3ff]">
        <div className="text-center text-[9px] font-semibold leading-none">
          {locale === 'en' ? 'Enter PIN' : '输入 PIN 码'}
        </div>

        <div className="mt-1">
          <div className="grid grid-cols-3 gap-[3px]">
            {safe.slice(0, 9).map((n, idx) => (
              <div
                key={`${n}-${idx}`}
                className="grid place-items-center rounded bg-[#8ecfff]/90 text-[13px] font-bold leading-none text-black shadow-[0_1px_0_rgba(0,0,0,0.35)]"
                style={{ height: 16 }}
              >
                {String(n)}
              </div>
            ))}
          </div>

          <div className="mt-[3px] grid grid-cols-3 gap-[3px]">
            <div aria-hidden />
            <div
              className="grid place-items-center rounded bg-[#8ecfff]/90 text-[13px] font-bold leading-none text-black shadow-[0_1px_0_rgba(0,0,0,0.35)]"
              style={{ height: 16 }}
            >
              {String(safe[9])}
            </div>
            <div aria-hidden />
          </div>
        </div>
      </div>
    </ScreenContainer>
  )
}

function SubmittingPinScreen({ locale }) {
  return (
    <ScreenContainer>
      <div className="relative flex h-full w-full flex-col items-center justify-center px-3 py-2 text-[#9fe3ff]">
        <div className="text-center text-[11px] font-semibold text-white/90">
          {locale === 'en' ? 'Verifying PIN…' : '校验 PIN 中…'}
        </div>
      </div>
    </ScreenContainer>
  )
}

function PinOnDeviceScreen({ locale, inputDigit, inputMask }) {
  const mask = String(inputMask ?? '').slice(0, 4)
  const slots = useMemo(() => {
    return Array.from({ length: 4 }).map((_, idx) => (idx < mask.length ? '•' : '—'))
  }, [mask.length])
  return (
    <ScreenContainer>
      <div className="relative h-full w-full overflow-hidden px-2 py-1 text-[#9fe3ff]">
        <div className="rounded-[4px] bg-[#8ecfff] py-[2px] text-center text-[10px] font-semibold leading-none text-black">
          {locale === 'en' ? 'Enter PIN' : '输入 PIN 码'}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex w-[44px] flex-col items-center justify-center gap-1 text-[#8ecfff]">
            <div className="text-[10px] font-bold leading-none">▲</div>
            <div
              className="grid place-items-center rounded-md bg-black/25 ring-1 ring-white/10"
              style={{ width: 30, height: 30 }}
            >
              <div className="font-mono text-[20px] font-semibold leading-none text-white/95">{String(inputDigit ?? 0)}</div>
            </div>
            <div className="text-[10px] font-bold leading-none">▼</div>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="font-mono text-[13px] leading-none tracking-[0.45em] text-[#8ecfff]">
              {slots.join('')}
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-1 left-2 grid place-items-center rounded-[3px] bg-[#8ecfff] text-[14px] font-bold leading-none text-black"
          style={{ width: 18, height: 18 }}
        >
          ×
        </div>
        <div
          className="absolute bottom-1 right-2 grid place-items-center rounded-[3px] bg-[#8ecfff] text-[14px] font-bold leading-none text-black"
          style={{ width: 18, height: 18 }}
        >
          →
        </div>
      </div>
    </ScreenContainer>
  )
}

function AddressConfirmScreen({ locale, details }) {
  const address = details?.address ?? ''
  const network = String(details?.network ?? '')
  const title =
    locale === 'en'
      ? 'Address'
      : network === 'Ethereum'
        ? 'EVM 地址'
        : network === 'Solana'
          ? 'SOL 地址'
          : network === 'Bitcoin'
            ? 'BTC 地址'
            : '地址'
  const raw = String(address ?? '')
  const maxChars = 22
  const firstLine = raw.slice(0, maxChars)
  const rest = raw.slice(maxChars)
  let secondLine = rest.slice(0, maxChars)
  if (rest.length > maxChars) {
    const safeLen = Math.max(0, maxChars - 1)
    secondLine = `${secondLine.slice(0, safeLen)}…`
  }
  return (
    <ScreenContainer>
      <div className="relative h-full w-full overflow-hidden px-2 py-1 text-[#9fe3ff]">
        <div className="rounded-[4px] bg-[#8ecfff] py-[2px] text-center text-[10px] font-semibold leading-none text-black">
          {locale === 'en' ? `${title}:` : `${title}:`}
        </div>

        <div className="mt-1 text-[10px] font-semibold leading-none text-white/90">
          {locale === 'en' ? 'Address:' : '地址:'}
        </div>

        <div className="mt-[2px] pr-7 font-mono text-[10px] leading-tight text-white/90">
          <div>{firstLine || '--'}</div>
          <div>{secondLine || (raw.length > maxChars ? '' : '--')}</div>
        </div>

        <div
          className="absolute bottom-1 left-2 grid place-items-center rounded-[3px] bg-[#8ecfff] text-[14px] font-bold leading-none text-black"
          style={{ width: 18, height: 18 }}
        >
          ×
        </div>
        <div
          className="absolute bottom-1 right-2 grid place-items-center rounded-[3px] bg-[#8ecfff] text-[14px] font-bold leading-none text-black"
          style={{ width: 18, height: 18 }}
        >
          →
        </div>
      </div>
    </ScreenContainer>
  )
}

function ConfirmScreen({ locale, disabled, ui, onApprove, onReject }) {
  const i18n = useMemo(() => getI18n(locale), [locale])
  const title =
    ui?.action === 'btcGetAddress'
      ? locale === 'en'
        ? 'Confirm address'
        : '确认地址'
      : ui?.action === 'btcSignMessage'
        ? locale === 'en'
          ? 'Confirm signing'
          : '确认签名'
        : i18n.confirmTitle

  return (
    <ScreenContainer>
      <div className="relative flex h-full flex-col px-3 py-2 text-[#9fe3ff]">
        <div className="mt-2 text-[11px] font-semibold text-white/90">{title}</div>
        <div className="mt-1 text-[10px] text-white/65">{i18n.confirmHint}</div>

        <div className="mt-2 flex-1 overflow-hidden rounded bg-black/35 p-2 text-[10px] text-white/80 ring-1 ring-white/10">
          <div className="text-white/85">{locale === 'en' ? 'Use device buttons:' : '使用设备按键：'}</div>
          <div className="mt-1 text-white/70">
            {locale === 'en' ? 'Enter = Approve · Power = Reject' : 'Enter = 同意 · Power = 拒绝'}
          </div>
          <div className="mt-2 text-white/60">
            {locale === 'en' ? 'Waiting for confirmation…' : '等待设备确认…'}
          </div>
        </div>
      </div>
    </ScreenContainer>
  )
}

export function Classic1sDeviceScreen({
  locale,
  busy,
  device,
  ui,
  overlay,
  allowPinInput = true,
  allowConfirmInput = true,
  allowUnlock = true,
  pinEntryOnDevice = false,
  pinMatrix,
  onTapToUnlock,
  onSubmitPin,
  onConfirm,
  onReject
}) {
  const deviceUnlocked = Boolean(device?.unlocked)
  const [pinInput, setPinInput] = useState('')
  const [pinCurrentDigit, setPinCurrentDigit] = useState(0)

  useEffect(() => {
    if (ui?.type !== 'pin' || !pinEntryOnDevice) return
    setPinInput('')
    setPinCurrentDigit(0)
  }, [pinEntryOnDevice, ui?.requestId, ui?.type])

  const handlePressButton = (key) => {
    if (busy) return

    // Classic 1s：设备侧仅支持四按键操作。锁屏时用 Power 键触发解锁流程。
    if (!deviceUnlocked && !ui?.type) {
      if (!allowUnlock) return
      if (key === 'power') onTapToUnlock?.()
      return
    }

    if (ui?.type === 'confirm') {
      if (!allowConfirmInput) return
      if (key === 'enter') onConfirm?.()
      if (key === 'power') onReject?.()
      return
    }

    if (ui?.type !== 'pin' || !pinEntryOnDevice) return
    if (!allowPinInput) return

    if (key === 'power') {
      setPinInput((prev) => prev.slice(0, -1))
      return
    }
    if (key === 'up') {
      setPinCurrentDigit((d) => (d + 1) % 10)
      return
    }
    if (key === 'down') {
      setPinCurrentDigit((d) => (d + 9) % 10)
      return
    }
    if (key === 'enter') {
      setPinInput((prev) => {
        if (prev.length >= 4) return prev
        const next = `${prev}${String(pinCurrentDigit)}`
        if (next.length === 4) {
          onSubmitPin?.(next)
          return next
        }
        return next
      })
    }
  }

  const frameDisabled = Boolean(
    busy ||
      (!ui?.type && !deviceUnlocked && !allowUnlock) ||
      (ui?.type === 'pin' && !allowPinInput) ||
      (ui?.type === 'confirm' && !allowConfirmInput)
  )

  return (
    <Classic1sDeviceViewport>
      <Classic1sFrame disabled={frameDisabled} onPressButton={handlePressButton} overlay={overlay}>
        {ui?.type === 'pin' ? (
          busy ? (
            <SubmittingPinScreen locale={locale} />
          ) : pinEntryOnDevice ? (
              <PinOnDeviceScreen locale={locale} inputDigit={pinCurrentDigit} inputMask={pinInput} />
            ) : (
              <PinMatrixLayoutScreen locale={locale} matrix={pinMatrix} />
            )
        ) : ui?.type === 'confirm' ? (
          ui?.action === 'btcGetAddress' ? (
            <AddressConfirmScreen locale={locale} details={ui?.details} />
          ) : (
            <ConfirmScreen locale={locale} disabled={busy} ui={ui} onApprove={onConfirm} onReject={onReject} />
          )
        ) : deviceUnlocked ? (
          <ScreenContainer>
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/80">
              <div className="text-[12px] font-semibold">{locale === 'en' ? 'Ready' : '就绪'}</div>
              <div className="text-[10px] text-white/65">{locale === 'en' ? 'Send a command.' : '发送命令。'}</div>
            </div>
          </ScreenContainer>
        ) : (
          <LockScreen locale={locale} />
        )}
      </Classic1sFrame>
    </Classic1sDeviceViewport>
  )
}
