'use client'

import { useMachine } from '@xstate/react'
import gsap from 'gsap'
import { Check, ChevronDown, Compass, Copy, Delete, ExternalLink, Info, Play, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { createHardwareMockMachine } from './createHardwareMockMachine'
import { EditorCodeBlock } from './EditorCodeBlock'
import { ProDeviceScreen } from './pro/ProDeviceScreen'
import { Classic1sDeviceScreen } from './classic1s/Classic1sDeviceScreen'
import { HardwareMockTour } from './tour/HardwareMockTour'
import { hardwareMockTourBus } from './tour/hardwareMockTourBus'

const I18N = {
  zh: {
    status: {
      booting: '初始化 Mock...',
      notReady: 'Mock 未就绪',
      unavailable: 'Mock 不可用',
      canceling: '取消中...',
      sending: '交互中...',
      awaitingPin: '等待输入 PIN...',
      submittingPin: '校验 PIN...',
      awaitingConfirm: '等待确认...',
      submittingConfirm: '确认中...',
      ready: '就绪'
    },
    labels: {
      mock: 'Mock',
      ready: '就绪',
      failed: '失败',
      device: '设备',
      unlocked: '已解锁',
      locked: '已锁定',
      deviceModel: '设备型号',
      deviceStage: '设备台',
      interactionBuilder: '交互编排',
      stepCommand: '选择命令',
      stepParams: '参数设置',
      stepSend: '发送交互',
      commandNoParams: '该命令无需参数。',
      clearLogs: '清空日志',
      exampleCode: '示例代码',
      currentExample: '当前示例',
      copy: '复制',
      copied: '已复制',
      commandPanel: '交互面板',
      command: '命令',
      sendCommand: '发送命令',
      showOnDevice: 'showOnOneKey（在设备上显示并确认）',
      deviceScreen: '设备屏幕（Mock）',
      terminal: '终端日志',
      noLogs: '暂无日志。试试先解锁设备并输入 PIN，或发送命令触发交互。',
      demoNotice: 'Mock 演示（不连接真实硬件）',
      pinNote: 'PIN：任意 4 位（Mock 不校验）',
      openEmulator: '打开 OneKey Emulator',
      guide: '导览',
      devViewTitle: '开发者视角',
      tabExample: '示例代码',
      tabCallback: '回调处理',
      tabResult: '结果',
      noResult: '暂无结果。发送命令后这里会展示返回值。',
      showRawLogs: '查看完整日志',
      noPayload: '无返回数据。',
      guideTitle: '交互导览',
      guideNext: '下一步',
      guideWaiting: '等待操作…'
    },
    tour: {
      idleTitle: '操作指引',
      idlePrimary: '导览未开始。点击「导览」并发送第一个命令。',
      idleSecondary: '右侧可先预览示例与回调，了解下一步。',
      actionTitle: '操作指引',
      reviewTitle: '操作指引',
      sendPrimary: '请选择命令/参数，然后点击「发送命令」。',
      sendSecondary: '结果会显示在右侧 Result 面板。',
      pinPrimary: 'PIN 已请求，完成后会进入下一步。',
      pinSecondary: '提交后会自动推进。',
      confirmPrimary: '请在设备上确认本次交互。',
      confirmSecondary: '确认后等待结果回传。',
      waitResultPrimary: '正在等待结果返回。',
      waitResultSecondary: 'Result 面板会显示 payload。',
      resultPrimary: '结果已返回，请查看右侧 payload。',
      resultSecondary: '需要事件细节可切到 Callbacks。',
      callbackPrimary: '右侧是回调模板，复盘 UI_EVENT。',
      callbackSecondary: '按 REQUEST_* 事件处理即可。'
    }
  },
  en: {
    status: {
      booting: 'Initializing Mock...',
      notReady: 'Mock not ready',
      unavailable: 'Mock unavailable',
      canceling: 'Canceling...',
      sending: 'In progress...',
      awaitingPin: 'Waiting for PIN...',
      submittingPin: 'Verifying PIN...',
      awaitingConfirm: 'Waiting for confirmation...',
      submittingConfirm: 'Confirming...',
      ready: 'Ready'
    },
    labels: {
      mock: 'Mock',
      ready: 'Ready',
      failed: 'Failed',
      device: 'Device',
      unlocked: 'Unlocked',
      locked: 'Locked',
      deviceModel: 'Model',
      deviceStage: 'Device stage',
      interactionBuilder: 'Interaction builder',
      stepCommand: 'Choose command',
      stepParams: 'Parameters',
      stepSend: 'Send',
      commandNoParams: 'No parameters needed for this command.',
      clearLogs: 'Clear logs',
      exampleCode: 'Example code',
      currentExample: 'Current example',
      copy: 'Copy',
      copied: 'Copied',
      commandPanel: 'Command panel',
      command: 'Command',
      sendCommand: 'Send',
      showOnDevice: 'showOnOneKey (confirm on device)',
      deviceScreen: 'Device screen (Mock)',
      terminal: 'Terminal logs',
      noLogs: 'No logs yet. Try unlocking the device or send a command to start.',
      demoNotice: 'Mock demo (no real hardware)',
      pinNote: 'PIN: any 4 digits (not validated)',
      openEmulator: 'Open OneKey Emulator',
      guide: 'Guide',
      devViewTitle: 'Developer View',
      tabExample: 'Example',
      tabCallback: 'Callbacks',
      tabResult: 'Result',
      noResult: 'No result yet. Send a command to see output.',
      showRawLogs: 'Show raw logs',
      noPayload: 'No payload.',
      guideTitle: 'Interaction guide',
      guideNext: 'Next',
      guideWaiting: 'Waiting…'
    },
    tour: {
      idleTitle: 'Guide',
      idlePrimary: 'Tour is idle. Click “Guide” and send your first command.',
      idleSecondary: 'You can preview examples and callbacks on the right.',
      actionTitle: 'Guide',
      reviewTitle: 'Guide',
      sendPrimary: 'Pick a command/params, then click “Send”.',
      sendSecondary: 'The result will appear in the Result panel on the right.',
      pinPrimary: 'PIN is requested. Completing it advances the flow.',
      pinSecondary: 'Submitting moves to the next step automatically.',
      confirmPrimary: 'Confirm the interaction on the device.',
      confirmSecondary: 'Wait for the result to return.',
      waitResultPrimary: 'Waiting for the result to arrive.',
      waitResultSecondary: 'The Result panel will show the payload.',
      resultPrimary: 'Result returned. Review the payload on the right.',
      resultSecondary: 'Switch to Callbacks for UI_EVENT details.',
      callbackPrimary: 'Callback templates are on the right.',
      callbackSecondary: 'Handle the REQUEST_* events as indicated.'
    }
  }
}

function getDict(locale) {
  return I18N[locale] ?? I18N.zh
}

const COMMAND_OPTIONS = {
  zh: [
    { value: 'searchDevices', title: 'searchDevices', description: 'searchDevices' },
    { value: 'btcGetAddress', title: 'btcGetAddress', description: 'btcGetAddress' },
    { value: 'btcSignMessage', title: 'btcSignMessage', description: 'btcSignMessage' }
  ],
  en: [
    { value: 'searchDevices', title: 'searchDevices', description: 'searchDevices' },
    { value: 'btcGetAddress', title: 'btcGetAddress', description: 'btcGetAddress' },
    { value: 'btcSignMessage', title: 'btcSignMessage', description: 'btcSignMessage' }
  ]
}

function getCommandOptions(locale) {
  return COMMAND_OPTIONS[locale] ?? COMMAND_OPTIONS.zh
}

function formatTime(isoString) {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return date.toLocaleTimeString(undefined, { hour12: false })
}

function formatBoolean(locale, value) {
  if ((locale ?? 'zh') === 'en') return value ? 'Yes' : 'No'
  return value ? '是' : '否'
}

function formatJson(data) {
  if (data === undefined) return ''
  try {
    return JSON.stringify(data)
  } catch {
    return String(data)
  }
}

function formatJsonPretty(data) {
  if (data === undefined) return ''
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

function findLineNumber(text, includes) {
  if (!text) return null
  const lines = String(text).split('\n')
  const idx = lines.findIndex((line) => line.includes(includes))
  return idx >= 0 ? idx + 1 : null
}

function getLevelStyle(level) {
  switch (level) {
    case 'request':
      return 'text-[#00B812]'
    case 'response':
      return 'text-zinc-900 dark:text-zinc-100'
    case 'error':
      return 'text-red-600 dark:text-red-400'
    default:
      return 'text-zinc-600 dark:text-zinc-400'
  }
}

const TOUR_HINT_ACCENTS = {
  action: '#00B812',
  review: '#2563eb',
  idle: '#64748b'
}

function buildTourHintPayload({ locale, dict, stepId, tourEnabled, tourStarted }) {
  const isEn = locale === 'en'
  const tourDict = dict?.tour ?? {}
  const safeString = (key, fallback) => (tourDict[key] ?? fallback)

  const defaultActionTitle = isEn ? 'Guide' : '操作指引'
  const defaultReviewTitle = isEn ? 'Guide' : '操作指引'
  const defaultSendPrimary = isEn ? 'Pick a command/params, then click “Send”.' : '请选择命令/参数，然后点击「发送命令」。'
  const defaultSendSecondary = isEn ? 'The result will appear in the Result panel on the right.' : '结果会显示在右侧 Result 面板。'
  const defaultIdlePrimary = isEn ? 'Tour is idle. Click “Guide” and send your first command.' : '导览未开始。点击「导览」并发送第一个命令。'
  const defaultIdleSecondary = isEn ? 'You can preview examples and callbacks on the right.' : '右侧可先预览示例与回调，了解下一步。'

  if (!tourEnabled || !tourStarted) {
    return {
      type: 'idle',
      accent: TOUR_HINT_ACCENTS.idle,
      title: safeString('idleTitle', isEn ? 'Guide' : '操作指引'),
      primary: safeString('idlePrimary', defaultIdlePrimary),
      secondary: safeString('idleSecondary', defaultIdleSecondary)
    }
  }

  const actionBase = {
    type: 'action',
    accent: TOUR_HINT_ACCENTS.action,
    title: safeString('actionTitle', defaultActionTitle),
    primary: safeString('sendPrimary', defaultSendPrimary),
    secondary: safeString('sendSecondary', defaultSendSecondary)
  }
  const reviewBase = {
    type: 'review',
    accent: TOUR_HINT_ACCENTS.review,
    title: safeString('reviewTitle', defaultReviewTitle)
  }

  switch (stepId) {
    case 'waiting-start':
    case 'example-code':
      return actionBase
    case 'pin-matrix-and-modal':
    case 'pin':
      return {
        ...actionBase,
        primary: safeString('pinPrimary', isEn ? 'PIN is requested. Completing it advances the flow.' : 'PIN 已请求，完成后会进入下一步。'),
        secondary: safeString('pinSecondary', isEn ? 'Submitting moves to the next step automatically.' : '提交后会自动推进。')
      }
    case 'callback-request-button':
    case 'confirm':
      return {
        ...actionBase,
        primary: safeString('confirmPrimary', isEn ? 'Confirm the interaction on the device.' : '在设备上确认交互。'),
        secondary: safeString('confirmSecondary', isEn ? 'Wait for the result to appear in the Result tab.' : '等待结果自动返回。')
      }
    case 'wait-result':
      return {
        ...reviewBase,
        primary: safeString('waitResultPrimary', isEn ? 'Waiting for the result to arrive.' : '等待结果自动呈现。'),
        secondary: safeString('waitResultSecondary', isEn ? 'Result output appears on the right.' : '可在 Result 面板中查看 payload。')
      }
    case 'result':
      return {
        ...reviewBase,
        primary: safeString('resultPrimary', isEn ? 'Payload is ready—review it on the right.' : '结果已准备好，从右侧阅读 payload。'),
        secondary: safeString('resultSecondary', isEn ? 'Switch to Callbacks if you need UI_EVENT guidance.' : '若需要，切换到 Callbacks 查阅 UI_EVENT。')
      }
    case 'callback-code':
      return {
        ...reviewBase,
        primary: safeString('callbackPrimary', isEn ? 'Callback template lives on the right.' : '回调模板在右侧，复盘 UI_EVENT。'),
        secondary: safeString('callbackSecondary', isEn ? 'Handle the REQUEST_* events based on UI hints.' : '参考 `REQUEST_*` 事件处理流程。')
      }
    default:
      return actionBase
  }
}

function buildExampleCode({ locale, command, btcPath, addressShowOnOneKey, messageHex }) {
  const init = [
    "import HardwareSDK from '@onekeyfe/hd-common-connect-sdk'",
    '',
    'await HardwareSDK.init({',
    "  env: 'webusb',",
    '  fetchConfig: true,',
    '  debug: false,',
    '})',
    ''
  ]

  if (command === 'searchDevices') {
    return [
      ...init,
      'const res = await HardwareSDK.searchDevices()',
      'if (!res.success) throw new Error(res.payload.error)',
      '',
      'console.log(res.payload)'
    ].join('\n')
  }

  const shared = [
    ...init,
    'const devicesRes = await HardwareSDK.searchDevices()',
    'if (!devicesRes.success) throw new Error(devicesRes.payload.error)',
    'const connectId = devicesRes.payload[0].connectId',
    '',
    'const featuresRes = await HardwareSDK.getFeatures(connectId)',
    'if (!featuresRes.success) throw new Error(featuresRes.payload.error)',
    'const deviceId = featuresRes.payload.device_id',
    ''
  ]

  if (command === 'btcGetAddress') {
    return [
      ...shared,
      'const res = await HardwareSDK.btcGetAddress(connectId, deviceId, {',
      `  path: ${JSON.stringify(btcPath)},`,
      "  coin: 'btc',",
      `  showOnOneKey: ${String(Boolean(addressShowOnOneKey))},`,
      '})',
      'if (!res.success) throw new Error(res.payload.error)',
      '',
      'console.log(res.payload)'
    ].join('\n')
  }

  return [
    ...shared,
    'const res = await HardwareSDK.btcSignMessage(connectId, deviceId, {',
    `  path: ${JSON.stringify(btcPath)},`,
    `  messageHex: ${JSON.stringify(messageHex)},`,
    "  coin: 'btc',",
    '})',
    'if (!res.success) throw new Error(res.payload.error)',
    '',
    'console.log(res.payload)'
  ].join('\n')
}

function createSeededRng(seed) {
  let state = 2166136261
  const s = String(seed ?? '')
  for (let i = 0; i < s.length; i += 1) {
    state ^= s.charCodeAt(i)
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

function buildClassicPinLayout(seed) {
  const digits = seededShuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], seed)
  return digits.slice(0, 10)
}

export function HardwareMockDemo({ locale = 'zh' }) {
  const dict = useMemo(() => getDict(locale), [locale])
  const commandOptions = useMemo(() => getCommandOptions(locale), [locale])

  const basePath = useMemo(() => {
    return (process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '') || '').trim()
  }, [])

  const machine = useMemo(() => createHardwareMockMachine({ basePath }), [basePath])
  const [state, send] = useMachine(machine)

  const logsRef = useRef(null)
  const deviceRef = useRef(null)
  const lastSentRef = useRef({ command: null, params: null })
  const deviceTypeRef = useRef('pro')
  const uiTypeRef = useRef(null)
  const classicPinEntryOnDeviceRef = useRef(false)

  const [command, setCommand] = useState('btcGetAddress')
  const [btcPath, setBtcPath] = useState("m/44'/0'/0'/0/0")
  const [addressShowOnOneKey, setAddressShowOnOneKey] = useState(true)
  const [messageHex, setMessageHex] = useState('6578616d706c65206d657373616765')
  const [deviceTypeControl, setDeviceTypeControl] = useState('pro')
  const [classicPinModalOpen, setClassicPinModalOpen] = useState(false)
  const [classicPinValue, setClassicPinValue] = useState('')
  const [classicPinEntryOnDevice, setClassicPinEntryOnDevice] = useState(false)
  const pinOriginRef = useRef(null) // manual | command | null
  const [copied, setCopied] = useState(false)
  const [tourEnabled, setTourEnabled] = useState(true)
  const tourEnabledRef = useRef(true)
  const handleTourExit = useCallback(() => setTourEnabled(false), [])
  const [tourStarted, setTourStarted] = useState(false)
  const tourStartedRef = useRef(false)
  const [currentTourStepId, setCurrentTourStepId] = useState(null)
  const [tourStepMeta, setTourStepMeta] = useState({ index: 0, total: 0, allowNext: false, mode: null })
  const [rightTab, setRightTab] = useState('example')
  const [editorFocus, setEditorFocus] = useState({ tab: 'example', activeLine: null })
  const currentTourStepIdRef = useRef(null)
  const preferredCallbackLineRef = useRef(null)
  const [tourHint, setTourHint] = useState(() =>
    buildTourHintPayload({ locale, dict, stepId: null, tourEnabled, tourStarted })
  )

  const logs = state.context.logs
  const ui = state.context.ui
  const deviceType = state.context.device?.deviceType ?? 'pro'

  const tourGuided = Boolean(tourEnabled && tourStarted)
  const allowPinInteraction = !tourGuided || currentTourStepId === 'pin'
  const allowConfirmInteraction = !tourGuided || currentTourStepId === 'confirm'

  const isBusy =
    state.matches('booting') ||
    state.matches('sending') ||
    state.matches('submittingPin') ||
    state.matches('submittingConfirm') ||
    state.matches('canceling')

  const isAwaitingUi =
    state.matches('awaitingPin') ||
    state.matches('submittingPin') ||
    state.matches('awaitingConfirm') ||
    state.matches('submittingConfirm') ||
    state.matches('canceling')

  const mockReady = state.context.mockReady
  const mockError = state.context.mockError
  const lastError = state.context.lastError
  const controlsDisabled = !mockReady || isBusy || isAwaitingUi || tourGuided
  const modelControlDisabled = !mockReady || isBusy || isAwaitingUi || tourStarted
  const pinRequestId = ui?.type === 'pin' ? ui?.requestId ?? null : null
  const classicPinMatrix = useMemo(() => {
    if (deviceType !== 'classic1s') return null
    if (ui?.type !== 'pin') return null
    return buildClassicPinLayout(String(ui?.requestId ?? 'pin'))
  }, [deviceType, ui?.requestId, ui?.type])

  const compactShowOnDeviceLabel = 'showOnOneKey'

  deviceTypeRef.current = deviceType
  uiTypeRef.current = ui?.type ?? null
  classicPinEntryOnDeviceRef.current = Boolean(classicPinEntryOnDevice)

  useEffect(() => {
    setDeviceTypeControl(deviceType)
  }, [deviceType])

	  useEffect(() => {
	    if (deviceType !== 'classic1s') {
	      setClassicPinModalOpen(false)
	      setClassicPinEntryOnDevice(false)
	      setClassicPinValue('')
	      pinOriginRef.current = null
	      return
	    }

    if (ui?.type !== 'pin') {
      setClassicPinModalOpen(false)
      setClassicPinEntryOnDevice(false)
      setClassicPinValue('')
      pinOriginRef.current = null
      return
    }

    // Classic 1s：
    // - 手动点击 unlock：直接进入设备端 PIN 界面（不弹窗）
    // - 发起受保护交互触发 REQUEST_PIN：弹出手机侧盲输 PIN 弹窗，可切换到设备输入
	    if (pinOriginRef.current === 'manual') {
	      setClassicPinModalOpen(false)
	      setClassicPinEntryOnDevice(true)
	      setClassicPinValue('')
	      return
	    }

	    setClassicPinValue('')
	    setClassicPinEntryOnDevice(false)
	    setClassicPinModalOpen(Boolean(allowPinInteraction))
	    if (tourGuided && allowPinInteraction) {
	      window.setTimeout(() => {
	        hardwareMockTourBus.emit('tour.refresh', { reason: 'classic1s.pin.modal.effect' })
	      }, 0)
	    }
	  }, [allowPinInteraction, deviceType, pinRequestId, tourGuided, ui?.type])

  const code = useMemo(
    () =>
      buildExampleCode({
        locale,
        command,
        btcPath,
        addressShowOnOneKey,
        messageHex
      }),
    [addressShowOnOneKey, btcPath, command, locale, messageHex]
  )

  const exampleFilename = useMemo(() => {
    if (command === 'searchDevices') return 'examples/searchDevices.ts'
    if (command === 'btcGetAddress') return 'examples/btcGetAddress.ts'
    if (command === 'btcSignMessage') return 'examples/btcSignMessage.ts'
    return 'examples/demo.ts'
  }, [command])

  const callbackFilename = useMemo(() => {
    return 'src/hardware-ui-events.ts'
  }, [])

  const resultFilename = useMemo(() => {
    return `results/${command}.json`
  }, [command])

  useEffect(() => {
    tourEnabledRef.current = Boolean(tourEnabled)
    if (!tourEnabled) {
      setTourStarted(false)
      tourStartedRef.current = false
      currentTourStepIdRef.current = null
      setCurrentTourStepId(null)
      setTourStepMeta({ index: 0, total: 0, allowNext: false, mode: null })
    }
  }, [tourEnabled])

  useEffect(() => {
    tourStartedRef.current = Boolean(tourStarted)
    if (!tourStarted) {
      currentTourStepIdRef.current = null
      setCurrentTourStepId(null)
    }
  }, [tourStarted])

  useEffect(() => {
    setTourHint(
      buildTourHintPayload({
        locale,
        dict,
        stepId: currentTourStepId,
        tourEnabled,
        tourStarted
      })
    )
  }, [locale, dict, currentTourStepId, tourEnabled, tourStarted])

  const callbackCode = useMemo(() => {
    const isEn = locale === 'en'
    const isPro = (deviceTypeControl ?? 'pro') !== 'classic1s'
    const extraHint =
      command === 'btcGetAddress' && !addressShowOnOneKey
        ? isEn
          ? `\n// Note: showOnOneKey=false usually skips device confirmation, so REQUEST_BUTTON may not happen.\n`
          : `\n// 注意：showOnOneKey=false 通常会跳过“设备上确认”，因此可能不会触发 REQUEST_BUTTON。\n`
        : ''

    if (isEn) {
      if (isPro) {
        return `import HardwareSDK from '@onekeyfe/hd-common-connect-sdk'
import { UI_EVENT, UI_REQUEST } from '@onekeyfe/hd-core'

// Pro: PIN is entered on device, so REQUEST_PIN will NOT be emitted.
// Subscribe once at app startup (subscribe early to avoid blocking).
HardwareSDK.on(UI_EVENT, (message) => {
  switch (message.type) {
    case UI_REQUEST.REQUEST_BUTTON: {
      // The device needs user confirmation (e.g. btcGetAddress showOnOneKey=true).
      // This callback happens when the confirm screen is shown (not at the end).
      // Usually you only show a "Confirm on device" hint (no uiResponse needed).
      return
    }

    case UI_REQUEST.CLOSE_UI_WINDOW: {
      // Close any modal/dialog you opened (Classic/Pure PIN prompt etc.)
      return
    }

    default:
      return
  }
})
${extraHint}`
      }

      return `import HardwareSDK from '@onekeyfe/hd-common-connect-sdk'
import { UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core'

// Classic 1s / Pure: REQUEST_PIN may happen. Pro will NOT emit REQUEST_PIN (PIN is entered on device).
// Subscribe once at app startup (subscribe early to avoid blocking on PIN).
HardwareSDK.on(UI_EVENT, (message) => {
  switch (message.type) {
    case UI_REQUEST.REQUEST_PIN: {
      // Option A (recommended): input PIN on device
      HardwareSDK.uiResponse({
        type: UI_RESPONSE.RECEIVE_PIN,
        payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
      })

      // Option B: blind PIN input in software (Classic 1s / Pure only)
      // HardwareSDK.uiResponse({ type: UI_RESPONSE.RECEIVE_PIN, payload: userInputPin })
      return
    }

    case UI_REQUEST.REQUEST_BUTTON: {
      // The device needs user confirmation (e.g. btcGetAddress showOnOneKey=true).
      // This callback happens when the confirm screen is shown (not at the end).
      // Usually you only show a "Confirm on device" hint (no uiResponse needed).
      return
    }

    case UI_REQUEST.CLOSE_UI_WINDOW: {
      // Close any modal/dialog you opened for blind PIN input.
      return
    }

    default:
      return
  }
})
${extraHint}`
    }

    if (isPro) {
      return `import HardwareSDK from '@onekeyfe/hd-common-connect-sdk'
import { UI_EVENT, UI_REQUEST } from '@onekeyfe/hd-core'

// Pro：PIN 在设备上输入，因此不会触发 REQUEST_PIN，也不需要 uiResponse。
// 建议：应用启动时订阅一次（越早越好），避免交互流程阻塞。
HardwareSDK.on(UI_EVENT, (message) => {
  switch (message.type) {
    case UI_REQUEST.REQUEST_BUTTON: {
      // 设备进入需要确认的阶段（例如 btcGetAddress showOnOneKey=true）。
      // 该回调发生在“确认页面出现时”（不是最后）。
      // 通常你只需要提示“请在设备确认”（一般不需要 uiResponse）。
      return
    }

    case UI_REQUEST.CLOSE_UI_WINDOW: {
      // 关闭你打开的弹窗（例如 Classic/Pure 的 PIN 弹窗）
      return
    }

    default:
      return
  }
})
${extraHint}`
    }

    return `import HardwareSDK from '@onekeyfe/hd-common-connect-sdk'
import { UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core'

// Classic 1s / Pure：可能触发 REQUEST_PIN；Pro 不会（因为 PIN 在设备上输入）。
// 建议：应用启动时订阅一次（越早越好），避免 PIN 交互导致调用卡住。
HardwareSDK.on(UI_EVENT, (message) => {
  switch (message.type) {
    case UI_REQUEST.REQUEST_PIN: {
      // 方式 1（推荐）：在设备上输入 PIN
      HardwareSDK.uiResponse({
        type: UI_RESPONSE.RECEIVE_PIN,
        payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
      })

      // 方式 2：软件盲输 PIN（Classic 1s / Pure 才支持）
      // HardwareSDK.uiResponse({ type: UI_RESPONSE.RECEIVE_PIN, payload: userInputPin })
      return
    }

    case UI_REQUEST.REQUEST_BUTTON: {
      // 设备进入需要确认的阶段（例如 btcGetAddress showOnOneKey=true）。
      // 该回调发生在“确认页面出现时”（不是最后）。
      // 通常你只需要提示“请在设备确认”（一般不需要 uiResponse）。
      return
    }

    case UI_REQUEST.CLOSE_UI_WINDOW: {
      // 用户完成输入/取消后，SDK 会要求你关闭弹窗（盲输 PIN 场景）
      return
    }

    default:
      return
  }
})
${extraHint}`
  }, [addressShowOnOneKey, command, deviceTypeControl, locale])

  const editorMarks = useMemo(() => {
    const exampleCall =
      command === 'btcGetAddress'
        ? findLineNumber(code, 'HardwareSDK.btcGetAddress')
        : command === 'btcSignMessage'
          ? findLineNumber(code, 'HardwareSDK.btcSignMessage')
          : command === 'searchDevices'
            ? findLineNumber(code, 'HardwareSDK.searchDevices')
            : null

    const callbackOn = findLineNumber(callbackCode, 'HardwareSDK.on(UI_EVENT')
    const callbackPin = findLineNumber(callbackCode, 'case UI_REQUEST.REQUEST_PIN')
    const callbackReceivePin = findLineNumber(callbackCode, 'UI_RESPONSE.RECEIVE_PIN')
    const callbackButtonHint = findLineNumber(callbackCode, 'REQUEST_BUTTON')

    return {
      example: {
        exampleCall
      },
      callback: {
        callbackOn,
        callbackPin,
        callbackReceivePin,
        callbackButtonHint
      }
    }
  }, [callbackCode, code, command])

  useEffect(() => {
    const offStep = hardwareMockTourBus.on('tour.step.changed', (payload) => {
      const stepId = payload?.stepId ?? null
      currentTourStepIdRef.current = stepId
      setCurrentTourStepId(stepId)
      setTourStepMeta({
        index: typeof payload?.index === 'number' ? payload.index : 0,
        total: typeof payload?.total === 'number' ? payload.total : 0,
        allowNext: Boolean(payload?.allowNext),
        mode: payload?.mode ?? null
      })

      // Classic 1s：Step=输入 PIN 时应优先锁定弹窗（而不是设备屏幕）。
      if (
        stepId === 'pin' &&
        deviceTypeRef.current === 'classic1s' &&
        uiTypeRef.current === 'pin' &&
        pinOriginRef.current !== 'manual' &&
        !classicPinEntryOnDeviceRef.current
      ) {
        setClassicPinValue('')
        setClassicPinEntryOnDevice(false)
        setClassicPinModalOpen(true)
        window.setTimeout(() => {
          hardwareMockTourBus.emit('tour.refresh', { reason: 'classic1s.pin.modal.open' })
        }, 0)
      }
    })
    return offStep
  }, [])

  useEffect(() => {
    const off = hardwareMockTourBus.on('tour.focus', (payload) => {
      if (!tourEnabledRef.current || !tourStartedRef.current) return
      const tab = payload?.tab
      if (tab === 'example' || tab === 'callback' || tab === 'result') {
        flushSync(() => {
          setRightTab(tab)
          setEditorFocus((prev) => {
            if (tab === 'example') return { ...prev, tab, activeLine: editorMarks.example.exampleCall ?? null }
            if (tab === 'callback') {
              const preferred = preferredCallbackLineRef.current
              return { ...prev, tab, activeLine: preferred ?? editorMarks.callback.callbackOn ?? null }
            }
            if (tab === 'result') return { ...prev, tab, activeLine: null }
            return { ...prev, tab }
          })
        })
      }
    })
    return off
  }, [editorMarks])

  useEffect(() => {
    if (!tourEnabled) return
    const connectId = state.context.device?.connectId ?? null
    const deviceId = state.context.device?.deviceId ?? null

    const params =
      command === 'btcGetAddress'
        ? {
            connectId,
            deviceId,
            path: btcPath,
            coin: 'btc',
            showOnOneKey: addressShowOnOneKey
          }
        : command === 'btcSignMessage'
          ? {
              connectId,
              deviceId,
              path: btcPath,
              coin: 'btc',
              messageHex
            }
          : command === 'searchDevices'
            ? undefined
            : undefined

    hardwareMockTourBus.emit('code.updated', { command, params, code })
  }, [tourEnabled, command, btcPath, addressShowOnOneKey, messageHex, code, state.context.device])

  useEffect(() => {
    if (!tourEnabled || !tourStarted) return
    if (!ui?.type) return
    hardwareMockTourBus.emit('ui.shown', { uiType: ui.type, action: ui?.action ?? null })
    // 仅记录“如果导览稍后聚焦到 callback-code，应当标记哪一行”。
    if (ui.type === 'pin') preferredCallbackLineRef.current = editorMarks.callback.callbackPin ?? null
    if (ui.type === 'confirm') {
      preferredCallbackLineRef.current =
        editorMarks.callback.callbackButtonHint ?? editorMarks.callback.callbackOn ?? null
    }
    if (rightTab === 'callback') {
      const preferred = preferredCallbackLineRef.current
      if (preferred) {
        flushSync(() => {
          setEditorFocus((prev) => (prev.tab === 'callback' ? { ...prev, activeLine: preferred } : prev))
        })
      }
    }
  }, [editorMarks, rightTab, tourEnabled, tourStarted, ui?.type, ui?.action])

  useEffect(() => {
    if (!tourEnabled || !tourStarted) return
    if (currentTourStepId === 'callback-request-button') {
      preferredCallbackLineRef.current =
        editorMarks.callback.callbackButtonHint ?? editorMarks.callback.callbackOn ?? null
      if (rightTab === 'callback') {
        const preferred = preferredCallbackLineRef.current
        if (preferred) {
          flushSync(() => {
            setEditorFocus((prev) => (prev.tab === 'callback' ? { ...prev, activeLine: preferred } : prev))
          })
        }
      }
    }
  }, [currentTourStepId, editorMarks, rightTab, tourEnabled, tourStarted])

  useEffect(() => {
    const el = deviceRef.current
    if (!el) return

    gsap.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power1.out' })
  }, [ui?.type, mockReady])

  // 结果/日志区域不再逐行滚动动画；保留核心交互区域的轻量动画即可。

  useEffect(() => {
    if (!tourEnabled || !tourStarted) return
    const last = logs[logs.length - 1]
    if (!last) return
    if (last.level !== 'response' && last.level !== 'error') return

    // 交互式流程里，第一次 response 往往只是返回 ui（PIN/Confirm），不应当被当成“最终结果”推进导览。
    // 只有当响应里不再包含 ui（即真正的 payload/result）时，才发出 command.result。
    if (last.level === 'response' && last?.data && typeof last.data === 'object' && 'ui' in last.data) {
      return
    }

    const sent = lastSentRef.current ?? { command: null, params: null }
    hardwareMockTourBus.emit('command.result', { command: sent.command, params: sent.params, log: last })
    // Tour 期间的“结果”展示由导览步骤驱动（避免 callback-code 步骤还没看完就自动跳到 Result）。
    // 如果当前导览本身已经聚焦到 result，再同步激活该 tab。
    if (currentTourStepIdRef.current === 'result') {
      flushSync(() => {
        setRightTab('result')
        setEditorFocus((prev) => ({ ...prev, tab: 'result', activeLine: null }))
      })
    }
  }, [tourEnabled, tourStarted, logs])

  // Prism 高亮已由 EditorCodeBlock 负责，这里不再手动调用 Prism。

  function handleSendCommand() {
    const connectId = state.context.device?.connectId ?? null
    const deviceId = state.context.device?.deviceId ?? null

    if (deviceTypeControl === 'classic1s') {
      pinOriginRef.current = 'command'
    } else {
      pinOriginRef.current = null
    }

    const params =
      command === 'btcGetAddress'
        ? {
            connectId,
            deviceId,
            path: btcPath,
            coin: 'btc',
            showOnOneKey: addressShowOnOneKey
          }
        : command === 'btcSignMessage'
          ? {
              connectId,
              deviceId,
              path: btcPath,
              coin: 'btc',
              messageHex
            }
          : undefined

	    lastSentRef.current = { command, params }
	    if (tourEnabledRef.current) {
	      // 先标记“导览已开始”，确保 Tour 触发的 tour.focus 能被立即消费。
	      tourStartedRef.current = true
	      setTourStarted(true)
	      currentTourStepIdRef.current = null
	      setCurrentTourStepId(null)
	      preferredCallbackLineRef.current = null
	      hardwareMockTourBus.emit('command.sent', { command, params, deviceType: deviceTypeControl })
	    }
	    setRightTab('example')
	    setEditorFocus((prev) => ({
	      ...prev,
      tab: 'example',
      activeLine: editorMarks.example.exampleCall ?? null
    }))
    send({ type: 'SEND', command, params })
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
      if (tourEnabled) {
        hardwareMockTourBus.emit('code.copied', { command })
      }
    } catch {
      setCopied(false)
    }
  }

  const classicPinPanel =
    deviceType === 'classic1s' && classicPinModalOpen && ui?.type === 'pin' ? (
      <div
        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-950"
        data-tour="classic-pin-modal"
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <div className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {locale === 'en' ? 'PIN Panel' : 'PIN 面板'}
            </div>
            <div className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {locale === 'en'
                ? 'Match the PIN matrix on the device. Any 4 digits work (mock does not validate).'
                : '对照设备上的 PIN 矩阵输入，任意 4 位即可提交（Mock 不校验）。'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setClassicPinModalOpen(false)
              setClassicPinEntryOnDevice(false)
              setClassicPinValue('')
              send({ type: 'CANCEL' })
            }}
            className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            aria-label={locale === 'en' ? 'Close' : '关闭'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-4">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 shadow-sm dark:border-zinc-800 dark:bg-zinc-800/60">
            <div className="grid grid-cols-3 gap-px bg-zinc-200 dark:bg-zinc-800/60">
              <div className="col-span-3 bg-white px-4 py-3 dark:bg-zinc-950">
                <div className="flex h-10 items-center justify-center gap-2">
                  {Array.from({ length: Math.min(4, classicPinValue.length) }).map((_, idx) => (
                    <span
                      key={`pin-dot-${idx}`}
                      className="h-2.5 w-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100"
                    />
                  ))}
                </div>
              </div>

              {Array.from({ length: 12 }).map((_, cellIndex) => {
                const isDeleteKey = cellIndex === 9
                const isConfirmKey = cellIndex === 11
                const positionIndex = cellIndex < 9 ? cellIndex : cellIndex === 10 ? 9 : null
                const baseDisabled = isBusy || !allowPinInteraction

                if (isDeleteKey) {
                  const disabled = baseDisabled || !classicPinValue
                  return (
                    <button
                      key="pin-delete"
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return
                        setClassicPinValue((prev) => prev.slice(0, -1))
                      }}
                      className={[
                        'h-[68px] w-full',
                        'grid place-items-center',
                        'bg-zinc-200 text-zinc-700',
                        'transition-colors',
                        'hover:bg-zinc-300 active:bg-zinc-400',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:ring-zinc-500/40',
                        'disabled:pointer-events-none disabled:opacity-50',
                        'dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:active:bg-zinc-600'
                      ].join(' ')}
                      aria-label={locale === 'en' ? 'Delete' : '删除'}
                    >
                      <Delete className="h-5 w-5" />
                    </button>
                  )
                }

                if (isConfirmKey) {
                  const disabled = baseDisabled || classicPinValue.length < 4
                  return (
                    <button
                      key="pin-confirm"
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return
                        setClassicPinModalOpen(false)
                        if (tourEnabled && tourStarted) {
                          hardwareMockTourBus.emit('ui.pin.submit', { pinLength: String(classicPinValue ?? '').length })
                        } else {
                          setRightTab('callback')
                          setEditorFocus((prev) => ({
                            ...prev,
                            tab: 'callback',
                            activeLine: editorMarks.callback.callbackReceivePin ?? null
                          }))
                        }
                        send({ type: 'SUBMIT_PIN', pin: String(classicPinValue ?? '').slice(0, 4) })
                      }}
                      className={[
                        'h-[68px] w-full',
                        'grid place-items-center',
                        'bg-zinc-600 text-white',
                        'transition-colors',
                        'hover:bg-zinc-700 active:bg-zinc-800',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:ring-zinc-500/40',
                        'disabled:pointer-events-none disabled:opacity-50',
                        'dark:bg-zinc-300 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:active:bg-zinc-100'
                      ].join(' ')}
                      aria-label={locale === 'en' ? 'Confirm' : '确认'}
                    >
                      <Check className="h-6 w-6" />
                    </button>
                  )
                }

                if (positionIndex === null) return null

                return (
                  <button
                    key={`dot-${positionIndex}`}
                    type="button"
                    disabled={baseDisabled}
                    onClick={() => {
                      if (!allowPinInteraction) return
                      const mapping = classicPinMatrix ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
                      const digit = mapping[positionIndex]
                      setClassicPinValue((prev) => `${prev}${String(digit)}`.slice(0, 4))
                    }}
                    className={[
                      'h-[68px] w-full',
                      'grid place-items-center',
                      'bg-zinc-50',
                      'transition-colors',
                      'hover:bg-zinc-100 active:bg-zinc-200',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:ring-zinc-500/40',
                      'disabled:pointer-events-none disabled:opacity-50',
                      'dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70 dark:active:bg-zinc-800'
                    ].join(' ')}
                    aria-label={`pin-dot-${positionIndex}`}
                  >
                    <span className="h-3 w-3 rounded-full bg-zinc-800 dark:bg-zinc-100" />
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={isBusy || !allowPinInteraction}
            onClick={() => {
              if (!allowPinInteraction) return
              setClassicPinModalOpen(false)
              setClassicPinValue('')
              setClassicPinEntryOnDevice(true)
              if (tourGuided && currentTourStepIdRef.current === 'pin') {
                window.setTimeout(() => {
                  hardwareMockTourBus.emit('tour.refresh', { reason: 'classic1s.pin.switchToDevice' })
                }, 0)
              }
            }}
            className="mt-4 w-full text-center text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {locale === 'en' ? 'Use device input' : '使用设备输入'}
          </button>
        </div>
      </div>
    ) : null

  const showClassicPinGroup = Boolean(classicPinPanel)

  return (
    <div className="not-prose my-0 w-full overflow-x-hidden ok-hardware-mock" style={{ fontFamily: 'var(--font-ui)' }}>
      <div className="p-0.5 sm:p-1">
        <HardwareMockTour locale={locale} enabled={tourEnabled} onExit={handleTourExit} />

        {(mockError || lastError) && (
          <div className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">
            {mockError ? `${locale === 'en' ? 'Mock error' : 'Mock 错误'}：${mockError}` : null}
            {mockError && lastError ? ' · ' : null}
            {lastError ? `${locale === 'en' ? 'Error' : '最近错误'}：${lastError}` : null}
          </div>
        )}

        <div className="mt-2 overflow-hidden rounded-[32px] border border-zinc-200/80 bg-[linear-gradient(135deg,_#f7f8fb_0%,_#eef2f7_55%,_#e9edf3_100%)] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-[linear-gradient(120deg,_#0b0f14_0%,_#111826_55%,_#0a0f15_100%)]">
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),_transparent_55%)] opacity-60 dark:opacity-20" />
            <div className="relative grid gap-4 lg:grid-cols-[minmax(240px,_0.3fr)_minmax(0,_0.7fr)] lg:gap-5">
              <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
                <div className="relative overflow-visible">
                  {showClassicPinGroup ? (
                    <div
                      data-tour="classic-pin-group"
                      className="pointer-events-none absolute left-0 top-0 h-full w-full lg:w-[calc(100%+344px)]"
                    />
                  ) : null}
                  {classicPinPanel ? (
                    <div className="mt-3 lg:absolute lg:left-full lg:top-6 lg:ml-6 lg:mt-0 lg:w-[320px]">
                      {classicPinPanel}
                    </div>
                  ) : null}

                  <div className="relative min-h-[560px] overflow-hidden rounded-[26px] border border-white/80 bg-white/80 px-2 py-3 shadow-[0_14px_30px_rgba(30,20,10,0.08)] backdrop-blur lg:min-h-[640px] dark:border-white/10 dark:bg-white/5">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),_transparent_55%)] opacity-50 dark:opacity-10" />
                    <div className="relative">
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center rounded-full bg-white/80 p-0.5 ring-1 ring-zinc-200/70 shadow-sm dark:bg-zinc-900/60 dark:ring-zinc-700/70">
                          {[
                            { value: 'pro', label: 'Pro' },
                            { value: 'classic1s', label: 'Classic 1s' }
                          ].map((item) => {
                            const active = deviceTypeControl === item.value
                            return (
                              <button
                                key={item.value}
                                type="button"
                                disabled={modelControlDisabled}
                                onClick={() => {
                                  if (modelControlDisabled) return
                                  const next = item.value
                                  setDeviceTypeControl(next)
                                  send({ type: 'SEND', command: 'setDeviceModel', params: { deviceType: next } })
                                }}
                                className={[
                                  'h-6 rounded-full px-2.5 text-[10px] font-semibold transition-colors',
                                  active
                                    ? 'bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900'
                                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white',
                                  modelControlDisabled ? 'cursor-not-allowed opacity-60' : ''
                                ].join(' ')}
                              >
                                {item.label}
                              </button>
                            )
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const next = !tourEnabledRef.current
                            tourEnabledRef.current = next
                            setTourEnabled(next)
                          }}
                          className={[
                            'relative inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-medium transition-all',
                            tourEnabled
                              ? 'border-zinc-400 bg-zinc-100 text-zinc-900 dark:border-zinc-300 dark:bg-zinc-100 dark:text-zinc-900'
                              : 'border-zinc-300 bg-transparent text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-300'
                          ].join(' ')}
                          aria-pressed={tourEnabled}
                          aria-label={dict.labels.guide}
                          title={dict.labels.guide}
                        >
                          <Compass size={12} strokeWidth={1.8} />
                          <span>{dict.labels.guide}</span>
                          {tourEnabled ? (
                            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            </span>
                          ) : null}
                        </button>
                      </div>

                      <div className="mt-2 rounded-2xl border border-zinc-200/60 bg-white/70 p-2.5 shadow-sm dark:border-zinc-800/60 dark:bg-white/5 ok-command-panel">
                        <div className="flex items-center gap-2">
                          <span className="w-[72px] shrink-0 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{dict.labels.command}</span>
                          <div className="relative min-w-0 flex-1">
                            <select
                              data-tour="command-select"
                              value={command}
                              onChange={(e) => {
                                const nextCommand = e.target.value
                                setCommand(nextCommand)
                                if (tourEnabled) {
                                  hardwareMockTourBus.emit('command.changed', { command: nextCommand })
                                }
                              }}
                              disabled={controlsDisabled}
                              className="w-full appearance-none pr-8 text-xs text-zinc-900 outline-none dark:text-zinc-100"
                            >
                              {commandOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.title}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                          </div>

                          <button
                            type="button"
                            onClick={handleSendCommand}
                            disabled={controlsDisabled}
                            data-tour="send-button"
                            className="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#00B812] px-3 text-xs font-medium text-white transition-colors hover:bg-[#00a010] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Play size={12} strokeWidth={2} fill="currentColor" />
                            {dict.labels.sendCommand}
                          </button>
                        </div>

                        <div className="mt-2.5 grid gap-2">
                          {command !== 'searchDevices' ? (
                            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                              <span className="w-[72px] shrink-0 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">Path</span>
                              <input
                                value={btcPath}
                                onChange={(e) => setBtcPath(e.target.value)}
                                disabled={controlsDisabled}
                                className="min-w-0 flex-1"
                              />
                            </label>
                          ) : null}

                          {command === 'btcSignMessage' ? (
                            <label className="grid gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                              <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">Message</span>
                              <textarea
                                value={messageHex}
                                onChange={(e) => setMessageHex(e.target.value)}
                                disabled={controlsDisabled}
                                rows={2}
                                className="w-full resize-none"
                              />
                            </label>
                          ) : null}

                          {command === 'btcGetAddress' ? (
                            <div data-tour="show-on-onekey" className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                              <span className="w-[72px] shrink-0 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{compactShowOnDeviceLabel}</span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={addressShowOnOneKey}
                                onClick={() => {
                                  if (controlsDisabled) return
                                  const next = !addressShowOnOneKey
                                  setAddressShowOnOneKey(next)
                                  if (tourEnabled) {
                                    hardwareMockTourBus.emit('param.changed', { key: 'showOnOneKey', value: next })
                                  }
                                }}
                                disabled={controlsDisabled}
                                className={[
                                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none',
                                  addressShowOnOneKey
                                    ? 'bg-[#00B812]'
                                    : 'bg-zinc-300 dark:bg-zinc-600',
                                  controlsDisabled ? 'cursor-not-allowed opacity-60' : ''
                                ].join(' ')}
                              >
                                <span
                                  className={[
                                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                                    addressShowOnOneKey ? 'translate-x-[22px]' : 'translate-x-[2px]'
                                  ].join(' ')}
                                />
                              </button>
                            </div>
                          ) : null}

                          {command === 'searchDevices' ? (
                            <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                              {dict.labels.commandNoParams}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div ref={deviceRef} className="mt-3 py-[10px] flex justify-center" data-tour="device-screen">
                        {deviceType === 'classic1s' ? (
                          <Classic1sDeviceScreen
                            locale={locale}
                            busy={isBusy}
                            device={state.context.device}
                            ui={ui}
                            pinEntryOnDevice={classicPinEntryOnDevice}
                            pinMatrix={classicPinMatrix}
                            allowPinInput={allowPinInteraction}
                            allowConfirmInput={allowConfirmInteraction}
                            onSubmitPin={(pinValue) => {
                              if (!allowPinInteraction) return
                              if (tourEnabled && tourStarted) {
                                hardwareMockTourBus.emit('ui.pin.submit', { pinLength: String(pinValue ?? '').length })
                              } else {
                                setRightTab('callback')
                                setEditorFocus((prev) => ({
                                  ...prev,
                                  tab: 'callback',
                                  activeLine: editorMarks.callback.callbackReceivePin ?? null
                                }))
                              }
                              send({ type: 'SUBMIT_PIN', pin: pinValue })
                            }}
                            onConfirm={() => {
                              if (!allowConfirmInteraction) return
                              if (tourEnabled && tourStarted) {
                                hardwareMockTourBus.emit('ui.confirm', { action: ui?.action ?? null, approved: true })
                              } else if (ui?.action === 'btcGetAddress') {
                                setRightTab('callback')
                                setEditorFocus((prev) => ({ ...prev, tab: 'callback', activeLine: editorMarks.callback.callbackOn ?? null }))
                              }
                              send({ type: 'CONFIRM', approved: true })
                            }}
                            onReject={() => {
                              if (!allowConfirmInteraction) return
                              if (tourEnabled) {
                                hardwareMockTourBus.emit('ui.confirm', { action: ui?.action ?? null, approved: false })
                              }
                              send({ type: 'CONFIRM', approved: false })
                            }}
                            onTapToUnlock={() => {
                              if (tourGuided) return
                              if (!mockReady || isBusy || isAwaitingUi) return
                              pinOriginRef.current = 'manual'
                              setClassicPinModalOpen(false)
                              setClassicPinEntryOnDevice(true)
                              setClassicPinValue('')
                              if (tourEnabled) {
                                hardwareMockTourBus.emit('ui.unlock.tap', {})
                              }
                              send({ type: 'SEND', command: 'deviceUnlock', params: { connectId: state.context.device?.connectId ?? null } })
                            }}
                          />
                        ) : (
                          <ProDeviceScreen
                            basePath={basePath}
                            locale={locale}
                            busy={isBusy}
                            device={state.context.device}
                            ui={ui}
                            allowPinInput={allowPinInteraction}
                            allowConfirmInput={allowConfirmInteraction}
                            onSubmitPin={(pinValue) => {
                              if (!allowPinInteraction) return
                              if (tourEnabled && tourStarted) {
                                hardwareMockTourBus.emit('ui.pin.submit', { pinLength: String(pinValue ?? '').length })
                              } else {
                                setRightTab('callback')
                                setEditorFocus((prev) => ({
                                  ...prev,
                                  tab: 'callback',
                                  activeLine: editorMarks.callback.callbackReceivePin ?? null
                                }))
                              }
                              send({ type: 'SUBMIT_PIN', pin: pinValue })
                            }}
                            onConfirm={() => {
                              if (!allowConfirmInteraction) return
                              if (tourEnabled && tourStarted) {
                                hardwareMockTourBus.emit('ui.confirm', { action: ui?.action ?? null, approved: true })
                              } else if (ui?.action === 'btcGetAddress') {
                                setRightTab('callback')
                                setEditorFocus((prev) => ({ ...prev, tab: 'callback', activeLine: editorMarks.callback.callbackOn ?? null }))
                              }
                              send({ type: 'CONFIRM', approved: true })
                            }}
                            onReject={() => {
                              if (!allowConfirmInteraction) return
                              if (tourEnabled) {
                                hardwareMockTourBus.emit('ui.confirm', { action: ui?.action ?? null, approved: false })
                              }
                              send({ type: 'CONFIRM', approved: false })
                            }}
                            onCancel={() => send({ type: 'CANCEL' })}
                            onTapToUnlock={() => {
                              if (tourGuided) return
                              if (!mockReady || isBusy || isAwaitingUi) return
                              if (tourEnabled) {
                                hardwareMockTourBus.emit('ui.unlock.tap', {})
                              }
                              send({ type: 'SEND', command: 'deviceUnlock', params: { connectId: state.context.device?.connectId ?? null } })
                            }}
                          />
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
                          <span>{dict.labels.device}</span>
                          <span className="rounded bg-zinc-100/80 px-1.5 py-0.5 text-[8px] font-semibold text-zinc-500 dark:bg-zinc-900/40 dark:text-zinc-400">
                            {dict.labels.mock}
                          </span>
                          <a
                            href="https://hardware-example.onekey.so/#/emulator"
                            target="_blank"
                            rel="noopener noreferrer"
                            data-tour="emulator-link"
                            className="ml-1 inline-flex items-center gap-1 text-[9px] font-medium normal-case tracking-normal text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                            title={dict.labels.openEmulator}
                          >
                            <ExternalLink size={10} strokeWidth={1.8} />
                          </a>
                        </div>
                        <div className="inline-flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                          <Info size={12} strokeWidth={2} className="text-zinc-400 dark:text-zinc-500" />
                          <span className="whitespace-nowrap">{dict.labels.pinNote}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative min-w-0">
                <div className="relative min-w-0 overflow-hidden rounded-[26px] border border-white/80 bg-white/90 p-4 shadow-[0_14px_30px_rgba(30,20,10,0.08)] backdrop-blur min-h-[560px] lg:min-h-[640px] dark:border-white/10 dark:bg-white/5">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.5),_transparent_60%)] opacity-40 dark:opacity-10" />
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{dict.labels.devViewTitle}</div>
                        <span className="truncate font-mono text-[10px] text-zinc-500/80 dark:text-zinc-500">
                          {command}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {rightTab === 'example' ? (
                          <button
                            type="button"
                            onClick={handleCopy}
                            disabled={tourGuided}
                            className="grid h-7 w-7 place-items-center rounded-md bg-white/80 text-zinc-900 shadow-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-950/60 dark:text-zinc-100 dark:hover:bg-zinc-950"
                            aria-label={copied ? dict.labels.copied : dict.labels.copy}
                            title={copied ? dict.labels.copied : dict.labels.copy}
                          >
                            {copied ? <Check size={14} strokeWidth={1.8} /> : <Copy size={14} strokeWidth={1.8} />}
                          </button>
                        ) : null}

                        <div className="inline-flex rounded-lg bg-white/80 p-0.5 text-xs shadow-sm dark:bg-zinc-950/60">
                          {[
                            { key: 'example', label: dict.labels.tabExample },
                            { key: 'callback', label: dict.labels.tabCallback },
                            { key: 'result', label: dict.labels.tabResult }
                          ].map((tab) => (
                            <button
                              key={tab.key}
                              type="button"
                              disabled={tourGuided}
                              onClick={() => {
                                if (tourGuided) return
                                setRightTab(tab.key)
                                setEditorFocus((prev) => {
                                  if (tab.key === 'example') return { ...prev, tab: tab.key, activeLine: editorMarks.example.exampleCall ?? null }
                                  if (tab.key === 'callback') return { ...prev, tab: tab.key, activeLine: editorMarks.callback.callbackOn ?? null }
                                  if (tab.key === 'result') return { ...prev, tab: tab.key, activeLine: null }
                                  return { ...prev, tab: tab.key }
                                })
                              }}
                              className={[
                                'rounded px-2.5 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                                rightTab === tab.key
                                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                  : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900'
                              ].join(' ')}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex min-h-0 flex-1 flex-col">
                      {rightTab === 'example' ? (
                        <EditorCodeBlock
                          dataTour="example-code"
                          code={code}
                          language="typescript"
                          filename={exampleFilename}
                          activeLine={tourEnabled && tourStarted && editorFocus.tab === 'example' ? editorFocus.activeLine : null}
                          breakpoints={
                            tourEnabled && tourStarted && editorFocus.tab === 'example' && editorFocus.activeLine ? [editorFocus.activeLine] : []
                          }
                          showBreakpoints={tourEnabled && tourStarted}
                          className="min-h-0 flex-1"
                        />
                      ) : null}

                      {rightTab === 'callback' ? (
                        <EditorCodeBlock
                          dataTour="callback-code"
                          code={callbackCode}
                          language="typescript"
                          filename={callbackFilename}
                          activeLine={tourEnabled && tourStarted && editorFocus.tab === 'callback' ? editorFocus.activeLine : null}
                          breakpoints={
                            tourEnabled && tourStarted && editorFocus.tab === 'callback' && editorFocus.activeLine ? [editorFocus.activeLine] : []
                          }
                          showBreakpoints={tourEnabled && tourStarted}
                          className="min-h-0 flex-1"
                        />
                      ) : null}

                      {rightTab === 'result'
                        ? (() => {
                            const last = [...logs].reverse().find((item) => item.level === 'response' || item.level === 'error') ?? null
                            return (
                              <div className="flex min-h-0 flex-1 flex-col gap-2" data-tour="result-panel">
                                {last ? (
                                  <div className="font-mono text-xs">
                                    <span className="text-zinc-500 dark:text-zinc-500">[{formatTime(last.ts)}]</span>{' '}
                                    <span className={getLevelStyle(last.level)}>{last.title}</span>
                                  </div>
                                ) : null}

                                {last && last.data !== undefined ? (
                                  <EditorCodeBlock
                                    code={formatJsonPretty(last.data)}
                                    language="json"
                                    filename={resultFilename}
                                    activeLine={null}
                                    breakpoints={[]}
                                    cursor="default"
                                    className="min-h-0 flex-1"
                                  />
                                ) : (
                                  <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl bg-white/70 p-3 text-xs text-zinc-500 dark:bg-zinc-950/40 dark:text-zinc-500">
                                    {!last ? dict.labels.noResult : dict.labels.noPayload}
                                  </div>
                                )}

                                {last ? (
                                  <details>
                                    <summary className="cursor-pointer select-none text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                                      {dict.labels.showRawLogs}
                                    </summary>
                                    <div className="mt-2 space-y-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
                                      {logs.map((item) => (
                                        <div key={item.id}>
                                          <span className="text-zinc-500 dark:text-zinc-500">[{formatTime(item.ts)}]</span>{' '}
                                          <span className={getLevelStyle(item.level)}>{item.title}</span>
                                          {item.data !== undefined ? (
                                            <span className="text-zinc-500 dark:text-zinc-400"> {formatJson(item.data)}</span>
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                ) : null}
                              </div>
                            )
                          })()
                        : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
