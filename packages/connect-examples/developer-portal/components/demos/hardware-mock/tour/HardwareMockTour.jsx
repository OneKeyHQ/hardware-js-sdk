'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Lottie from 'lottie-react'
import { Tour, TourContext, useTour } from '@reactour/tour'
import { hardwareMockTourBus } from './hardwareMockTourBus'
import { createClassic1sInteractiveSteps } from './steps/classic1sSteps'
import { createProInteractiveSteps } from './steps/proSteps'
import { eventStep, hintStep, normalizeDeviceType } from './steps/stepHelpers'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

// Cache for loaded Lottie animations
const lottieCache = new Map()

function LottieAnimation({ src }) {
  const [animationData, setAnimationData] = useState(() => lottieCache.get(src) ?? null)

  useEffect(() => {
    if (!src) return
    if (lottieCache.has(src)) {
      setAnimationData(lottieCache.get(src))
      return
    }

    let cancelled = false
    fetch(src)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        lottieCache.set(src, data)
        setAnimationData(data)
      })
      .catch(() => {
        // Silently fail - animation won't show
      })

    return () => {
      cancelled = true
    }
  }, [src])

  if (!animationData) return null

  return (
    <Lottie
      animationData={animationData}
      loop
      autoplay
      style={{ width: '100%', height: '100%' }}
    />
  )
}

function PortalTourProvider({ children, defaultOpen = false, startAt = 0, steps: defaultSteps, ...props }) {
  // @reactour/tour 的 TourProvider 默认不使用 portal，容易被页面布局/stacking context 遮挡。
  // 这里用 createPortal 把 Tour 渲染到 document.body，确保气泡覆盖层始终可见。
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [currentStep, setCurrentStep] = useState(startAt)
  const [steps, setSteps] = useState(defaultSteps)
  const [meta, setMeta] = useState('')
  const [disabledActions, setDisabledActions] = useState(false)
  // Delay visibility to prevent flash at (0,0) before position is calculated
  const [popoverVisible, setPopoverVisible] = useState(false)

  // When isOpen changes, delay popover visibility
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setPopoverVisible(true), 100)
      return () => clearTimeout(timer)
    }
    setPopoverVisible(false)
  }, [isOpen])

  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      currentStep,
      setCurrentStep,
      steps,
      setSteps,
      meta,
      setMeta,
      disabledActions,
      setDisabledActions,
      ...props
    }),
    [currentStep, disabledActions, isOpen, meta, props, steps]
  )

  return (
    <TourContext.Provider value={value}>
      {children}
      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              style={{
                position: 'relative',
                zIndex: 10001,
                opacity: popoverVisible ? 1 : 0,
                transition: 'opacity 150ms ease-out'
              }}
            >
              <Tour {...value} />
            </div>,
            document.body
          )
        : null}
    </TourContext.Provider>
  )
}

function getDict(locale) {
  const isEn = locale === 'en'
  return {
    tourTitle: isEn ? 'Hardware Mock' : '硬件 Mock',
    justTriggered: isEn ? 'Triggered' : '已触发',
    guide: isEn ? 'Guide' : '操作指引',
    close: isEn ? 'Close' : '关闭导览'
  }
}

function InlineCode({ children }) {
  return (
    <code
      className="rounded-md px-1 py-0.5 font-mono text-[11px] leading-[1.2]"
      style={{
        fontFamily: 'var(--font-mono)',
        background: 'color-mix(in srgb, var(--ok-tour-bg) 88%, var(--ok-tour-text) 12%)',
        border: '1px solid color-mix(in srgb, var(--ok-tour-border) 80%, var(--ok-tour-text) 20%)',
        color: 'var(--ok-tour-text)',
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word'
      }}
    >
      {children}
    </code>
  )
}

function InlineQuote({ children }) {
  return (
    <span
      className="rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-[1.2]"
      style={{
        background: 'color-mix(in srgb, var(--ok-tour-bg) 92%, var(--ok-tour-accent) 8%)',
        border: '1px solid color-mix(in srgb, var(--ok-tour-border) 70%, var(--ok-tour-accent) 30%)',
        color: 'var(--ok-tour-text)',
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word'
      }}
    >
      {children}
    </span>
  )
}

function renderTourText(value) {
  if (value == null) return null
  if (typeof value !== 'string') return value

  const text = value
  // 轻量高亮：函数调用 / 常量 / key=value / 常见 UI 文案引用（“Send”、「下一步」等）
  const tokenRe =
    /(`[^`]+`|「[^」]+」|“[^”]+”|"[^"]+"|\b[A-Za-z_$][\w$]*\(\)|\b[A-Z][A-Z0-9_]{2,}\b|\b[A-Za-z_$][\w$]*=[^ \n，。；,.;)]+)/g

  const parts = []
  let lastIndex = 0
  let match
  while ((match = tokenRe.exec(text)) !== null) {
    const start = match.index
    const end = start + match[0].length
    if (start > lastIndex) parts.push(text.slice(lastIndex, start))
    const token = match[0]

    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(<InlineCode key={`code-${start}`}>{token.slice(1, -1)}</InlineCode>)
    } else if (token.startsWith('「') && token.endsWith('」')) {
      parts.push(<InlineQuote key={`quote-${start}`}>{token.slice(1, -1)}</InlineQuote>)
    } else if (token.startsWith('“') && token.endsWith('”')) {
      parts.push(<InlineQuote key={`quote-${start}`}>{token.slice(1, -1)}</InlineQuote>)
    } else if (token.startsWith('"') && token.endsWith('"')) {
      parts.push(<InlineQuote key={`quote-${start}`}>{token.slice(1, -1)}</InlineQuote>)
    } else {
      parts.push(<InlineCode key={`code-${start}`}>{token}</InlineCode>)
    }
    lastIndex = end
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))

  const out = []
  parts.forEach((p, idx) => {
    if (typeof p === 'string' && p.includes('\n')) {
      const lines = p.split('\n')
      lines.forEach((line, lineIdx) => {
        if (line) out.push(line)
        if (lineIdx < lines.length - 1) out.push(<br key={`br-${idx}-${lineIdx}`} />)
      })
      return
    }
    out.push(p)
  })
  return out
}

function safeExpect(expect, evt) {
  if (typeof expect !== 'function') return false
  try {
    return Boolean(expect(evt))
  } catch {
    return false
  }
}

function isEventStep(step) {
  return step?.mode === 'event'
}


function createWaitingModelSteps(locale) {
  const isEn = locale === 'en'
  return [
    eventStep({
      id: 'waiting-start',
      selector: '[data-tour="send-button"]',
      placement: 'bottom',
      tips: isEn ? 'Ready to Start' : '准备开始',
      desc: isEn ? 'Select a command and click Send to begin the interactive tour.' : '选择命令并点击发送，开始交互式导览。',
      expect: (evt) => evt?.type === 'command.sent'
    })
  ]
}

function createSearchDevicesSteps(locale) {
  const isEn = locale === 'en'
  return [
    hintStep({
      id: 'example-code',
      selector: '[data-tour="example-code"]',
      placement: 'left',
      tips: isEn ? 'Searching Devices' : '搜索设备',
      desc: isEn ? 'SDK is scanning for connected OneKey hardware devices.' : 'SDK 正在扫描已连接的 OneKey 硬件设备。'
    }),
    eventStep({
      id: 'wait-result',
      selector: '[data-tour="result-panel"]',
      placement: 'left',
      tips: isEn ? 'Waiting for Result' : '等待结果',
      desc: isEn ? 'Device list will appear here once scanning completes.' : '扫描完成后，设备列表将显示在这里。',
      expect: (evt) => evt?.type === 'command.result'
    }),
    hintStep({
      id: 'result',
      selector: '[data-tour="result-panel"]',
      placement: 'left',
      tips: isEn ? 'Devices Found' : '设备已找到',
      desc: isEn ? 'Device list is ready. Try `btcGetAddress` or `btcSignMessage` next.' : '设备列表已就绪。接下来可以尝试 `btcGetAddress` 或 `btcSignMessage`。'
    })
  ]
}

function createCallbackAndResultSteps(locale) {
  const isEn = locale === 'en'
  return [
    hintStep({
      id: 'result',
      selector: '[data-tour="result-panel"]',
      placement: 'left',
      tips: isEn ? 'Result Ready' : '结果已返回',
      desc: isEn ? 'The SDK response payload is shown here.' : 'SDK 返回的 payload 显示在这里。'
    }),
    hintStep({
      id: 'callback-code',
      selector: '[data-tour="callback-code"]',
      placement: 'left',
      tips: isEn ? 'Event Callbacks' : '事件回调',
      desc: isEn ? 'This template shows how to handle `UI_EVENT` in your app.' : '这个模板展示如何在应用中处理 `UI_EVENT`。'
    })
  ]
}

function createFlowSteps(locale, startEvent) {
  const isEn = locale === 'en'
  const command = startEvent?.command ?? null
  const params = startEvent?.params ?? null
  const deviceType = normalizeDeviceType(startEvent?.deviceType)
  const showOnOneKey = Boolean(params?.showOnOneKey)
  if (command === 'searchDevices') return createSearchDevicesSteps(locale)

  if (command === 'btcGetAddress' || command === 'btcSignMessage') {
    if (deviceType === 'classic1s') return createClassic1sInteractiveSteps(locale, { command, showOnOneKey })
    return createProInteractiveSteps(locale, { command, showOnOneKey })
  }

  return [
    hintStep({
      id: 'example-code',
      selector: '[data-tour="example-code"]',
      placement: 'left',
      tips: isEn ? `Command: ${command ?? '-'}` : `命令：${command ?? '-'}`,
      desc: isEn ? 'Try `btcGetAddress` or `btcSignMessage` for the full interactive experience.' : '尝试 `btcGetAddress` 或 `btcSignMessage` 获得完整的交互体验。'
    }),
    ...createCallbackAndResultSteps(locale)
  ]
}


function focusTabForSelector(selector) {
  if (selector === '[data-tour="example-code"]') return 'example'
  if (selector === '[data-tour="callback-code"]') return 'callback'
  if (selector === '[data-tour="result-panel"]') return 'result'
  return null
}

function sidePlacementForSelector(selector) {
  const token = String(selector ?? '')
  if (token.includes('result-panel') || token.includes('example-code') || token.includes('callback-code')) return 'left'
  return 'right'
}

function renderTourContent(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    if (value.length === 1) return renderTourText(value[0])
    return (
      <ul className="mt-0.5 space-y-1.5">
        {value.map((item, idx) => (
          <li key={`li-${idx}`} className="flex items-start gap-2">
            <span
              className="mt-[6px] inline-flex h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: 'color-mix(in srgb, var(--ok-tour-text) 55%, var(--ok-tour-muted) 45%)' }}
            />
            <span className="min-w-0">{renderTourText(item)}</span>
          </li>
        ))}
      </ul>
    )
  }
  return renderTourText(value)
}

function normalizeTourItems(value) {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function ProgressDots({ current, total }) {
  if (total <= 1) return null
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, idx) => (
        <span
          key={`dot-${idx}`}
          className="h-1.5 w-1.5 rounded-full transition-all duration-200"
          style={{
            background: idx === current
              ? 'var(--ok-tour-text)'
              : 'color-mix(in srgb, var(--ok-tour-muted) 40%, var(--ok-tour-bg) 60%)',
            transform: idx === current ? 'scale(1.1)' : 'scale(1)'
          }}
        />
      ))}
    </div>
  )
}

function emitStepChanged(steps, index) {
  const list = Array.isArray(steps) ? steps : []
  const maxIndex = Math.max(0, list.length - 1)
  const safeIndex = clamp(typeof index === 'number' ? index : 0, 0, maxIndex)
  const step = list[safeIndex]
  const tab = focusTabForSelector(step?.selector)
  hardwareMockTourBus.emit('tour.step.changed', {
    stepId: step?.id ?? null,
    mode: step?.mode ?? null,
    index: safeIndex,
    total: list.length,
    selector: step?.selector ?? null,
    tab,
    allowNext: Boolean(step?.mode === 'hint' && step?.allowNext !== false)
  })
}

function emitTourClosed() {
  hardwareMockTourBus.emit('tour.step.changed', {
    stepId: null,
    mode: null,
    index: 0,
    total: 0,
    selector: null,
    tab: null,
    allowNext: false
  })
}

function createReactourSteps({ locale, dict, modelStepsRef, lastEventRef, currentStepRef, eventLogRef, onExit }) {
  const steps = modelStepsRef.current ?? []
  return steps.map((s) => {
    const resolvedPosition = s.placement || sidePlacementForSelector(s.selector)
    return {
      selector: s.selector,
      position: resolvedPosition,
      content: ({ currentStep, setCurrentStep, setIsOpen }) => {
      const liveSteps = modelStepsRef.current ?? []
      const maxIndex = liveSteps.length - 1
      const safeIndex = clamp(typeof currentStep === 'number' ? currentStep : 0, 0, maxIndex)
      currentStepRef.current = safeIndex
      const step = liveSteps[safeIndex]
      const canNext = Boolean(step?.mode === 'hint' && step?.allowNext !== false && safeIndex < maxIndex)
      const isLast = safeIndex >= maxIndex
      const isEvent = step?.mode === 'event'

      const closeTour = () => {
        setIsOpen(false)
        emitTourClosed()
        onExit?.()
      }

      const tips = step?.tips ?? step?.now
      const desc = step?.desc ?? step?.next
      const image = step?.image
      const lottie = step?.lottie

      return (
        <div
          className="text-sm"
          style={{
            minWidth: 280,
            maxWidth: 'min(360px, calc(100vw - 48px))',
            color: 'var(--ok-tour-text)',
            fontFamily: 'var(--font-ui)'
          }}
        >
          {/* Header: Step indicator + Close button */}
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-medium" style={{ color: 'var(--ok-tour-muted)' }}>
              Step {safeIndex + 1}/{liveSteps.length}
            </div>
            <button
              type="button"
              onClick={closeTour}
              className="grid h-5 w-5 place-items-center rounded transition-colors hover:opacity-70"
              style={{ color: 'var(--ok-tour-muted)' }}
              aria-label={dict.close}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>

          {/* Content: Text + Image (vertical layout when image exists) */}
          <div>
            {/* Tips (title) */}
            <div
              className="text-[15px] font-semibold leading-snug"
              style={{ color: 'var(--ok-tour-text)' }}
            >
              {renderTourContent(normalizeTourItems(tips))}
            </div>

            {/* Desc (description) */}
            {desc ? (
              <div
                className="mt-1.5 text-[13px] leading-relaxed"
                style={{ color: 'var(--ok-tour-muted)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                {renderTourContent(normalizeTourItems(desc))}
              </div>
            ) : null}

            {/* Animation or Image - displayed below text when present */}
            {lottie ? (
              <div className="mt-3 flex justify-center">
                <div
                  className="h-[144px] w-[144px] overflow-hidden rounded-lg"
                  style={{ background: 'color-mix(in srgb, var(--ok-tour-bg) 95%, var(--ok-tour-text) 5%)' }}
                >
                  <LottieAnimation src={lottie} />
                </div>
              </div>
            ) : image ? (
              <div className="mt-3 flex justify-center">
                <img
                  src={image}
                  alt=""
                  className="h-[200px] w-auto rounded-lg object-contain"
                  style={{ background: 'color-mix(in srgb, var(--ok-tour-bg) 95%, var(--ok-tour-text) 5%)' }}
                />
              </div>
            ) : null}
          </div>

          {/* Divider */}
          <div className="my-3 h-px" style={{ background: 'var(--ok-tour-border)' }} />

          {/* Footer: Progress dots + Action buttons in same row */}
          <div className="flex items-center justify-between gap-3">
            {/* Progress dots on the left */}
            <ProgressDots current={safeIndex} total={liveSteps.length} />

            {/* Action buttons on the right */}
            <div className="flex items-center gap-2">
              {safeIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const steps = modelStepsRef.current ?? []
                    const prevIndex = clamp(safeIndex - 1, 0, steps.length - 1)
                    const prevStep = steps[prevIndex]
                    const tab = focusTabForSelector(prevStep?.selector)
                    if (tab) hardwareMockTourBus.emit('tour.focus', { tab, stepId: prevStep?.id ?? null })
                    emitStepChanged(steps, prevIndex)
                    currentStepRef.current = prevIndex
                    setCurrentStep(prevIndex)
                  }}
                  className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-90"
                  style={{
                    background: 'color-mix(in srgb, var(--ok-tour-bg) 92%, var(--ok-tour-text) 8%)',
                    color: 'var(--ok-tour-text)',
                    border: '1px solid var(--ok-tour-border)'
                  }}
                >
                  {locale === 'en' ? 'Back' : '上一步'}
                </button>
              ) : null}

              {canNext ? (
                <button
                  type="button"
                  onClick={() => {
                    const steps = modelStepsRef.current ?? []
                    const maxIndex = steps.length - 1
                    const rawNext = clamp(safeIndex + 1, 0, maxIndex)
                    const nextIndex = rawNext
                    const nextStep = steps[nextIndex]
                    const tab = focusTabForSelector(nextStep?.selector)
                    if (tab) hardwareMockTourBus.emit('tour.focus', { tab, stepId: nextStep?.id ?? null })
                    emitStepChanged(steps, nextIndex)
                    currentStepRef.current = nextIndex
                    setCurrentStep(nextIndex)
                  }}
                  className="rounded-md px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90"
                  style={{
                    background: 'var(--ok-tour-text)',
                    color: 'var(--ok-tour-bg)'
                  }}
                >
                  {locale === 'en' ? 'Next' : '下一步'} →
                </button>
              ) : isLast ? (
                <button
                  type="button"
                  onClick={closeTour}
                  className="rounded-md px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90"
                  style={{
                    background: 'var(--ok-tour-text)',
                    color: 'var(--ok-tour-bg)'
                  }}
                >
                  {locale === 'en' ? 'Done' : '完成'}
                </button>
              ) : isEvent ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
                  style={{
                    background: 'color-mix(in srgb, var(--ok-tour-bg) 92%, var(--ok-tour-text) 8%)',
                    color: 'var(--ok-tour-muted)',
                    border: '1px solid var(--ok-tour-border)'
                  }}
                >
                  <span
                    className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ background: 'var(--ok-tour-muted)' }}
                  />
                  {locale === 'en' ? 'Waiting…' : '等待中…'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )
    }
  }
  })
}

export function HardwareMockTour({ locale = 'zh', enabled, onExit }) {
  const dict = useMemo(() => getDict(locale), [locale])
  const modelStepsRef = useRef(createWaitingModelSteps(locale))
  const currentStepRef = useRef(0)
  const lastEventRef = useRef(null)
  const eventLogRef = useRef([])

  return (
    <PortalTourProvider
      steps={createReactourSteps({ locale, dict, modelStepsRef, lastEventRef, currentStepRef, eventLogRef, onExit })}
      defaultOpen={false}
      showBadge={false}
      showDots={false}
      disableInteraction={false}
      onClickMask={() => {}}
      styles={{
        maskWrapper: (base) => ({
          ...base,
          zIndex: 9999,
          color: 'rgba(0, 0, 0, 0.45)'
        }),
        maskArea: (base) => ({
          ...base,
          rx: 12
        }),
        highlightedArea: (base) => ({
          ...base,
          stroke: 'rgba(255, 255, 255, 0.3)',
          strokeWidth: 1,
          rx: 12
        }),
        popover: (base) => ({
          ...base,
          zIndex: 10000,
          width: 'auto',
          maxWidth: 'min(400px, calc(100vw - 24px))',
          maxHeight: 'min(560px, calc(100vh - 80px))',
          overflowX: 'hidden',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          wordBreak: 'break-word',
          borderRadius: 12,
          padding: 16,
          paddingTop: 16,
          backgroundColor: 'var(--ok-tour-bg)',
          backgroundImage: 'none',
          border: '1px solid var(--ok-tour-border)',
          boxShadow: '0 16px 32px rgba(0, 0, 0, 0.2)'
        }),
        badge: (base) => ({ ...base, display: 'none' }),
        dot: (base) => ({ ...base, display: 'none' }),
        close: (base) => ({ ...base, display: 'none' }),
        controls: (base) => ({ ...base, display: 'none' })
      }}
    >
      <HardwareMockTourEventBridge
        enabled={enabled}
        locale={locale}
        dict={dict}
        modelStepsRef={modelStepsRef}
        lastEventRef={lastEventRef}
        currentStepRef={currentStepRef}
        eventLogRef={eventLogRef}
        onExit={onExit}
      />
    </PortalTourProvider>
  )
}

function HardwareMockTourEventBridge({
  enabled,
  locale,
  dict,
  modelStepsRef,
  lastEventRef,
  currentStepRef,
  eventLogRef,
  onExit
}) {
  const { setIsOpen, setCurrentStep, currentStep, setSteps } = useTour()
  const onExitRef = useRef(onExit)
  const focusElRef = useRef(null)

  useEffect(() => {
    onExitRef.current = onExit
  }, [onExit])

  useEffect(() => {
    const steps = modelStepsRef.current ?? []
    const maxIndex = steps.length - 1
    currentStepRef.current = clamp(typeof currentStep === 'number' ? currentStep : 0, 0, maxIndex)
  }, [currentStep, currentStepRef, modelStepsRef])

  useEffect(() => {
    if (!enabled) {
      if (focusElRef.current) {
        focusElRef.current.classList.remove('ok-tour-focus')
        focusElRef.current = null
      }
      return
    }

    const steps = modelStepsRef.current ?? []
    const maxIndex = Math.max(0, steps.length - 1)
    const safeIndex = clamp(typeof currentStep === 'number' ? currentStep : 0, 0, maxIndex)
    const selector = steps[safeIndex]?.selector
    const nextEl = selector ? document.querySelector(selector) : null

    if (focusElRef.current && focusElRef.current !== nextEl) {
      focusElRef.current.classList.remove('ok-tour-focus')
      focusElRef.current = null
    }

    if (nextEl && nextEl instanceof HTMLElement) {
      nextEl.classList.add('ok-tour-focus')
      focusElRef.current = nextEl
    }

    return () => {
      if (focusElRef.current) {
        focusElRef.current.classList.remove('ok-tour-focus')
        focusElRef.current = null
      }
    }
  }, [currentStep, enabled, modelStepsRef])

  useEffect(() => {
    if (!enabled) {
      setIsOpen(false)
      lastEventRef.current = null
      eventLogRef.current = []
      modelStepsRef.current = createWaitingModelSteps(locale)
      setSteps(
        createReactourSteps({ locale, dict, modelStepsRef, lastEventRef, currentStepRef, eventLogRef, onExit: onExitRef.current })
      )
      currentStepRef.current = 0
      setCurrentStep(0)
    }
  }, [currentStepRef, dict, enabled, lastEventRef, locale, modelStepsRef, setCurrentStep, setIsOpen, setSteps])

  useEffect(() => {
    if (!enabled) return
    // 开启导览时不弹出；仅初始化“等待开始”的步骤。真正开始由首次 command.sent 触发。
    lastEventRef.current = null
    eventLogRef.current = []
    modelStepsRef.current = createWaitingModelSteps(locale)
    setSteps(
      createReactourSteps({ locale, dict, modelStepsRef, lastEventRef, currentStepRef, eventLogRef, onExit: onExitRef.current })
    )
    currentStepRef.current = 0
    setCurrentStep(0)
    setIsOpen(false)
  }, [currentStepRef, dict, enabled, lastEventRef, locale, modelStepsRef, setCurrentStep, setIsOpen, setSteps])

  useEffect(() => {
    if (!enabled) return undefined

    function handleEvent(evt) {
      lastEventRef.current = evt
      eventLogRef.current = [...(eventLogRef.current ?? []), evt].slice(-80)
      const steps = modelStepsRef.current ?? []
      const maxIndex = steps.length - 1
      const idx = clamp(currentStepRef.current, 0, maxIndex)
      const step = steps[idx]
      if (!step) return
      if (!isEventStep(step)) return
      if (!safeExpect(step.expect, evt)) return

      const rawNext = clamp(idx + 1, 0, maxIndex)
      const next = rawNext
      const nextStep = steps[next]
      const tab = focusTabForSelector(nextStep?.selector)
      if (tab) hardwareMockTourBus.emit('tour.focus', { tab, stepId: nextStep?.id ?? null })
      emitStepChanged(steps, next)
      currentStepRef.current = next
      setCurrentStep(next)
    }

    const offCommandSent = hardwareMockTourBus.on('command.sent', (payload) => {
      const evt = { type: 'command.sent', ...payload }
      eventLogRef.current = [evt]
      modelStepsRef.current = createFlowSteps(locale, evt)
      setSteps(
        createReactourSteps({ locale, dict, modelStepsRef, lastEventRef, currentStepRef, eventLogRef, onExit: onExitRef.current })
      )
      {
        const first = modelStepsRef.current?.[0]
        const tab = focusTabForSelector(first?.selector)
        if (tab) hardwareMockTourBus.emit('tour.focus', { tab, stepId: first?.id ?? null })
        emitStepChanged(modelStepsRef.current ?? [], 0)
      }
      lastEventRef.current = evt
      currentStepRef.current = 0
      setCurrentStep(0)
      setIsOpen(true)
    })

    const offResult = hardwareMockTourBus.on('command.result', (payload) => handleEvent({ type: 'command.result', ...payload }))
    const offConfirm = hardwareMockTourBus.on('ui.confirm', (payload) => handleEvent({ type: 'ui.confirm', ...payload }))
    const offUiShown = hardwareMockTourBus.on('ui.shown', (payload) => handleEvent({ type: 'ui.shown', ...payload }))
    const offPinSubmit = hardwareMockTourBus.on('ui.pin.submit', (payload) => handleEvent({ type: 'ui.pin.submit', ...payload }))
    const offNext = hardwareMockTourBus.on('tour.next', () => {
      const steps = modelStepsRef.current ?? []
      const maxIndex = steps.length - 1
      const idx = clamp(currentStepRef.current, 0, maxIndex)
      const step = steps[idx]
      if (!step || step?.mode !== 'hint' || step?.allowNext === false || idx >= maxIndex) return
      const nextIndex = clamp(idx + 1, 0, maxIndex)
      const nextStep = steps[nextIndex]
      const tab = focusTabForSelector(nextStep?.selector)
      if (tab) hardwareMockTourBus.emit('tour.focus', { tab, stepId: nextStep?.id ?? null })
      emitStepChanged(steps, nextIndex)
      currentStepRef.current = nextIndex
      setCurrentStep(nextIndex)
    })
    const offRefresh = hardwareMockTourBus.on('tour.refresh', () => {
      setSteps(
        createReactourSteps({ locale, dict, modelStepsRef, lastEventRef, currentStepRef, eventLogRef, onExit: onExitRef.current })
      )
    })
    return () => {
      offCommandSent()
      offResult()
      offConfirm()
      offUiShown()
      offPinSubmit()
      offNext()
      offRefresh()
    }
  }, [currentStepRef, dict, enabled, lastEventRef, locale, modelStepsRef, setCurrentStep, setIsOpen, setSteps])

  return null
}
