import { eventStep, hintStep } from './stepHelpers'

function createClassic1sExampleSteps(locale, { command }) {
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

function createClassic1sMatrixAndModalHintSteps(locale) {
  const isEn = locale === 'en'
  return [
    hintStep({
      id: 'pin-matrix-and-modal',
      selector: '[data-tour="device-screen"]',
      placement: 'right',
      tips: isEn ? 'PIN Matrix on Device' : '设备上的 PIN 矩阵',
      desc: isEn
        ? 'Classic 1s displays a shuffled PIN matrix on the device screen. Match the positions when entering PIN.'
        : 'Classic 1s 在设备屏幕上显示乱序的 PIN 矩阵。输入 PIN 时需对照位置。'
    })
  ]
}

function createClassic1sPinSteps(locale) {
  const isEn = locale === 'en'
  return [
    eventStep({
      id: 'pin',
      selector: '[data-tour="classic-pin-modal"]',
      // Use coordinate function to force right position with more offset
      // Returns [x, y] based on target's right edge, adding extra padding for better visibility
      placement: (positionProps) => [positionProps.right + 16, positionProps.top],
      tips: isEn ? 'Enter PIN on Panel' : '在面板上输入 PIN',
      desc: isEn
        ? 'Look at the PIN matrix on the device screen (left), then enter 4 digits on this panel matching the positions.'
        : '查看左侧设备屏幕上的 PIN 矩阵，然后在此面板上按对应位置输入 4 位数字。',
      image: '/mock-demo/classic1s-input-pin.gif',
      expect: (evt) => evt?.type === 'ui.pin.submit'
    })
  ]
}

function createClassic1sRequestButtonHintSteps(locale, { command, showOnOneKey }) {
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

function createClassic1sConfirmAndWaitSteps(locale) {
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
      lottie: '/animation/confirm-on-classic.json',
      expect: (evt) => evt?.type === 'command.result'
    })
  ]
}

function createClassic1sWaitResultSteps(locale) {
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

function createClassic1sResultSteps(locale) {
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

function createClassic1sCallbackTemplateSteps(locale) {
  const isEn = locale === 'en'
  return [
    hintStep({
      id: 'callback-code',
      selector: '[data-tour="callback-code"]',
      placement: 'left',
      tips: isEn ? 'Event Callbacks' : '事件回调',
      desc: isEn
        ? 'This template shows how to handle `UI_EVENT` including `REQUEST_PIN` for Classic 1s.'
        : '这个模板展示如何处理 `UI_EVENT`，包括 Classic 1s 的 `REQUEST_PIN`。'
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

export function createClassic1sInteractiveSteps(locale, { command, showOnOneKey }) {
  const isGetAddress = command === 'btcGetAddress'
  const requiresConfirm = command === 'btcSignMessage' || (isGetAddress && Boolean(showOnOneKey))

  if (requiresConfirm) {
    return [
      ...createClassic1sExampleSteps(locale, { command }),
      ...createClassic1sMatrixAndModalHintSteps(locale),
      ...createClassic1sPinSteps(locale),
      ...createClassic1sRequestButtonHintSteps(locale, { command, showOnOneKey }),
      ...createClassic1sConfirmAndWaitSteps(locale),
      ...createClassic1sResultSteps(locale),
      ...createEmulatorPromoSteps(locale)
    ]
  }

  return [
    ...createClassic1sExampleSteps(locale, { command }),
    ...createClassic1sMatrixAndModalHintSteps(locale),
    ...createClassic1sPinSteps(locale),
    ...createClassic1sWaitResultSteps(locale),
    ...createClassic1sResultSteps(locale),
    ...createClassic1sCallbackTemplateSteps(locale),
    ...createEmulatorPromoSteps(locale)
  ]
}
