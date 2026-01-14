import { eventStep, hintStep } from './stepHelpers'

function createProExampleSteps(locale, { command }) {
  const isEn = locale === 'en'
  return [
    hintStep({
      id: 'example-code',
      selector: '[data-tour="example-code"]',
      placement: 'left',
      tips: isEn ? 'Request Sent' : '请求已发送',
      desc: isEn
        ? `SDK is calling \`${command}\`. Check the example code on the right.`
        : `SDK 正在调用 \`${command}\`。右侧是示例代码。`
    })
  ]
}

function createProPinSteps(locale) {
  const isEn = locale === 'en'
  return [
    eventStep({
      id: 'pin',
      selector: '[data-tour="device-screen"]',
      placement: 'right',
      tips: isEn ? 'Enter PIN' : '输入 PIN',
      desc: isEn
        ? 'Device requires PIN verification. Enter any 4 digits on the device screen.'
        : '设备需要 PIN 验证。在设备屏幕上输入任意 4 位数字。',
      lottie: '/animation/enter-pin-on-pro-light.json',
      expect: (evt) => evt?.type === 'ui.pin.submit'
    })
  ]
}

function createProRequestButtonHintSteps(locale, { command, showOnOneKey }) {
  const isEn = locale === 'en'
  const isGetAddress = command === 'btcGetAddress'
  return [
    hintStep({
      id: 'callback-request-button',
      selector: '[data-tour="callback-code"]',
      placement: 'left',
      tips: isEn ? 'REQUEST_BUTTON Event' : 'REQUEST_BUTTON 事件',
      desc: isEn
        ? `SDK emits \`UI_EVENT: REQUEST_BUTTON\`. ${isGetAddress && showOnOneKey ? 'Device shows address for confirmation.' : 'Device awaits user confirmation.'}`
        : `SDK 触发 \`UI_EVENT: REQUEST_BUTTON\`。${isGetAddress && showOnOneKey ? '设备显示地址等待确认。' : '设备等待用户确认。'}`
    })
  ]
}

function createProConfirmAndWaitSteps(locale) {
  const isEn = locale === 'en'
  return [
    eventStep({
      id: 'confirm',
      selector: '[data-tour="device-screen"]',
      placement: 'right',
      tips: isEn ? 'Confirm on Device' : '在设备上确认',
      desc: isEn
        ? 'Review the information and tap Confirm on the device to approve.'
        : '查看信息后，在设备上点击确认按钮。',
      lottie: '/animation/confirm-on-pro-light.json',
      expect: (evt) => evt?.type === 'command.result'
    })
  ]
}

function createProWaitResultSteps(locale) {
  const isEn = locale === 'en'
  return [
    eventStep({
      id: 'wait-result',
      selector: '[data-tour="result-panel"]',
      placement: 'left',
      tips: isEn ? 'Waiting for Result' : '等待结果',
      desc: isEn
        ? 'SDK is processing the request. Result will appear shortly.'
        : 'SDK 正在处理请求，结果即将返回。',
      expect: (evt) => evt?.type === 'command.result'
    })
  ]
}

function createProResultSteps(locale, { hasNext = false } = {}) {
  const isEn = locale === 'en'
  return [
    hintStep({
      id: 'result',
      selector: '[data-tour="result-panel"]',
      placement: 'left',
      tips: isEn ? 'Result Ready' : '结果已返回',
      desc: isEn
        ? 'The SDK response is shown here. You can inspect the payload data structure.'
        : 'SDK 返回的结果显示在这里，可以查看 payload 数据结构。'
    })
  ]
}

function createProCallbackTemplateSteps(locale) {
  const isEn = locale === 'en'
  return [
    hintStep({
      id: 'callback-code',
      selector: '[data-tour="callback-code"]',
      placement: 'left',
      tips: isEn ? 'Event Callbacks' : '事件回调',
      desc: isEn
        ? 'This template shows how to handle `UI_EVENT` in your app. Copy and adapt as needed.'
        : '这个模板展示如何在应用中处理 `UI_EVENT`。可复制并根据需要调整。'
    })
  ]
}

function createEmulatorPromoSteps(locale) {
  const isEn = locale === 'en'
  return [
    hintStep({
      id: 'emulator-promo',
      selector: '[data-tour="emulator-link"]',
      placement: 'top',
      tips: isEn ? 'Try Real Device Emulator' : '试试真实设备模拟器',
      desc: isEn
        ? 'Want to debug with a real OneKey device online? Click here to open the Device Emulator.'
        : '想要在线调试真实的 OneKey 设备？点击这里打开设备模拟器。'
    })
  ]
}

export function createProInteractiveSteps(locale, { command, showOnOneKey }) {
  const isGetAddress = command === 'btcGetAddress'
  const requiresConfirm = command === 'btcSignMessage' || (isGetAddress && Boolean(showOnOneKey))

  if (requiresConfirm) {
    return [
      ...createProExampleSteps(locale, { command }),
      ...createProPinSteps(locale),
      ...createProRequestButtonHintSteps(locale, { command, showOnOneKey }),
      ...createProConfirmAndWaitSteps(locale),
      ...createProResultSteps(locale, { hasNext: false }),
      ...createEmulatorPromoSteps(locale)
    ]
  }

  return [
    ...createProExampleSteps(locale, { command }),
    ...createProPinSteps(locale),
    ...createProWaitResultSteps(locale),
    ...createProResultSteps(locale, { hasNext: true }),
    ...createProCallbackTemplateSteps(locale),
    ...createEmulatorPromoSteps(locale)
  ]
}
