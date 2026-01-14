function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function normalizePath(path) {
  if (typeof path !== 'string') return "m/44'/0'/0'/0/0"
  const value = path.trim()
  if (!value) return "m/44'/0'/0'/0/0"
  if (value.startsWith('m/')) return value
  if (value.startsWith('/')) return `m${value}`
  return `m/${value}`
}

function parseBip44Path(path) {
  const normalized = normalizePath(path)
  const parts = normalized
    .split('/')
    .map((item) => item.trim())
    .filter(Boolean)

  if (parts[0] !== 'm') return { purpose: null, coinType: null, raw: normalized }

  const hardenedInt = (value) => {
    if (!value) return null
    const cleaned = value.replace(/['hH]$/, '')
    const num = Number.parseInt(cleaned, 10)
    return Number.isFinite(num) ? num : null
  }

  return {
    raw: normalized,
    purpose: hardenedInt(parts[1]),
    coinType: hardenedInt(parts[2])
  }
}

function getNetworkMetaFromPath(path) {
  const parsed = parseBip44Path(path)
  if (parsed.coinType === 60) {
    return {
      network: 'Ethereum',
      icon: '/hardware-pro/res/evm-eth.png',
      primaryColor: '#637FFF'
    }
  }
  if (parsed.coinType === 501) {
    return {
      network: 'Solana',
      icon: '/hardware-pro/res/chain-sol.png',
      primaryColor: '#C74AE3'
    }
  }
  return {
    network: 'Bitcoin',
    icon: '/hardware-pro/res/btc-btc.png',
    primaryColor: '#FF9C00'
  }
}

function getAddrTypeFromPath(path, network) {
  const parsed = parseBip44Path(path)
  if (network === 'Bitcoin') {
    if (parsed.purpose === 49) return 'Nested Segwit'
    if (parsed.purpose === 84) return 'Native Segwit'
    if (parsed.purpose === 86) return 'Taproot'
    return 'Legacy'
  }
  if (network === 'Ethereum') return 'BIP44 Standard'
  if (network === 'Solana') return 'BIP44 Standard'
  return ''
}

function fakeAddress({ network, path }) {
  const seed = `${network}:${normalizePath(path)}`
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  if (network === 'Ethereum') {
    const hex = hash.toString(16).padStart(8, '0')
    return `0x${hex}${hex}${hex}${hex}${hex}`.slice(0, 42)
  }
  if (network === 'Solana') {
    return `So1aNaMock${hash.toString(36).padStart(20, '0')}`.slice(0, 44)
  }
  return `bc1qmock${hash.toString(36).padStart(32, '0')}`.slice(0, 42)
}

function normalizeSignMessageParams(params) {
  const path = normalizePath(params?.path)
  const messageHex =
    typeof params?.messageHex === 'string' && params.messageHex.trim()
      ? params.messageHex.trim()
      : '6578616d706c65206d657373616765'

  return {
    path,
    messageHex
  }
}

function buildPinUi({ requestId }) {
  return {
    type: 'pin',
    requestId
  }
}

function buildConfirmUi({ requestId, action, details }) {
  return {
    type: 'confirm',
    requestId,
    action,
    details
  }
}

export function createMockHardwareServer() {
  const session = {
    connected: false,
    unlocked: false,
    pending: null,
    deviceType: 'pro',
    model: 'OneKey Pro',
    deviceName: 'OneKey Pro'
  }

  async function connect() {
    await delay(450)
    session.connected = true
    session.unlocked = false
    session.pending = null
    return {
      deviceId: 'OK-EMULATOR-001',
      model: session.model,
      deviceName: session.deviceName,
      bleName: 'ONEKEY-EMULATOR',
      firmware: '3.0.0-mock',
      transport: 'mock',
      unlocked: session.unlocked,
      deviceType: session.deviceType
    }
  }

  async function disconnect() {
    await delay(200)
    session.connected = false
    session.unlocked = false
    session.pending = null
    return { disconnected: true }
  }

  async function command(commandName, params) {
    const command = commandName
    if (!command || typeof command !== 'string') {
      throw new Error('command 不能为空')
    }

    if (!session.connected && command !== 'get_info' && command !== 'searchDevices') {
      session.connected = true
    }

    const commandDelay =
      command === 'confirm_action'
        ? 280
        : command === 'btcSignMessage' || command === 'BTCsignMessage' || command === 'sign_tx'
          ? 900
          : command === 'submit_pin'
            ? 450
            : 350
    await delay(commandDelay)

    switch (command) {
      case 'setDeviceModel': {
        const deviceType = typeof params?.deviceType === 'string' ? params.deviceType : 'pro'
        session.deviceType = deviceType === 'classic1s' ? 'classic1s' : 'pro'
        session.model = session.deviceType === 'classic1s' ? 'OneKey Classic 1s' : 'OneKey Pro'
        session.deviceName = session.model
        session.connected = true
        session.unlocked = false
        session.pending = null
        return {
          deviceId: 'OK-EMULATOR-001',
          model: session.model,
          deviceName: session.deviceName,
          firmware: '3.0.0-mock',
          transport: 'mock',
          unlocked: session.unlocked,
          deviceType: session.deviceType
        }
      }

      case 'searchDevices': {
        session.connected = true
        return {
          success: true,
          payload: [
            {
              connectId: 'mock-connect-001',
              uuid: 'mock-uuid-001',
              deviceType: session.deviceType,
              deviceId: 'OK-EMULATOR-001',
              name: 'ONEKEY-EMULATOR',
              commType: 'emulator'
            }
          ]
        }
      }

      case 'getFeatures': {
        const connectId = typeof params?.connectId === 'string' ? params.connectId : null
        if (!connectId) throw new Error('connectId 不能为空。')

        session.connected = true
        return {
          success: true,
          payload: {
            device_id: 'OK-EMULATOR-001',
            model: session.model,
            deviceName: session.deviceName,
            bleName: 'ONEKEY-EMULATOR',
            firmware: '3.0.0-mock',
            transport: 'mock',
            unlocked: session.unlocked,
            deviceType: session.deviceType
          }
        }
      }

      case 'get_info':
        return {
          model: session.model,
          deviceName: session.deviceName,
          bleName: 'ONEKEY-EMULATOR',
          firmware: '3.0.0-mock',
          features: ['mock', 'demo', 'deterministic'],
          unlocked: session.unlocked
        }

      case 'deviceUnlock':
      case 'unlock_device': {
        if (session.unlocked) {
          session.pending = null
          return { success: true, payload: { unlocked: true }, unlocked: true }
        }

        if (session.pending?.type === 'deviceUnlock') {
          const { requestId, stage } = session.pending
          if (stage === 'pin') return { unlocked: session.unlocked, ui: buildPinUi({ requestId }) }
        }

        const requestId = createRequestId()
        session.pending = { type: 'deviceUnlock', requestId, stage: 'pin' }
        return { unlocked: session.unlocked, ui: buildPinUi({ requestId }) }
      }

      case 'btcGetAddress':
      case 'BTCgetAddress':
      case 'get_address': {
        const path = normalizePath(params?.path)
        const showOnDevice = Boolean(params?.showOnOneKey ?? params?.showOnDevice)

        const meta = getNetworkMetaFromPath(path)
        const addrType = getAddrTypeFromPath(path, meta.network)
        const address = fakeAddress({ network: meta.network, path })

        if (session.pending?.type === 'btcGetAddress') {
          const { requestId, stage } = session.pending
          if (stage === 'pin') return { unlocked: session.unlocked, ui: buildPinUi({ requestId }) }
          if (stage === 'confirm') {
            return {
              unlocked: session.unlocked,
              ui: buildConfirmUi({
                requestId,
                action: 'btcGetAddress',
                details: session.pending.details
              })
            }
          }
        }

        // Demo 规则：每次发送交互命令都从“未解锁（需要 PIN）”开始，避免受上一次解锁状态影响。
        session.unlocked = false

        const requestId = createRequestId()

        const details = {
          network: meta.network,
          primaryColor: meta.primaryColor,
          icon: meta.icon,
          path,
          addrType,
          address,
          qrFirst: false
        }

        if (!session.unlocked) {
          session.pending = {
            type: 'btcGetAddress',
            requestId,
            stage: 'pin',
            details,
            showOnDevice
          }
          return { unlocked: session.unlocked, ui: buildPinUi({ requestId }) }
        }

        if (!showOnDevice) {
          session.pending = null
          return {
            success: true,
            payload: {
              path,
              address
            }
          }
        }

        session.pending = {
          type: 'btcGetAddress',
          requestId,
          stage: 'confirm',
          details,
          showOnDevice
        }
        return { ui: buildConfirmUi({ requestId, action: 'btcGetAddress', details }) }
      }

      case 'btcSignMessage':
      case 'BTCsignMessage':
      case 'sign_tx': {
        const signPayload = normalizeSignMessageParams(params)

        if (session.pending?.type === 'btcSignMessage') {
          const { requestId, stage } = session.pending
          if (stage === 'pin') return { unlocked: session.unlocked, ui: buildPinUi({ requestId }) }
          if (stage === 'confirm') {
            return {
              ui: buildConfirmUi({ requestId, action: 'btcSignMessage', details: session.pending.payload })
            }
          }
        }

        // Demo 规则：每次发送交互命令都从“未解锁（需要 PIN）”开始，避免受上一次解锁状态影响。
        session.unlocked = false

        const requestId = createRequestId()

        if (!session.unlocked) {
          session.pending = {
            type: 'btcSignMessage',
            requestId,
            stage: 'pin',
            payload: signPayload
          }
          return { unlocked: session.unlocked, ui: buildPinUi({ requestId }) }
        }

        session.pending = { type: 'btcSignMessage', requestId, stage: 'confirm', payload: signPayload }
        return { ui: buildConfirmUi({ requestId, action: 'btcSignMessage', details: signPayload }) }
      }

      case 'submit_pin': {
        const requestId = typeof params?.requestId === 'string' ? params.requestId : null
        if (!session.pending || session.pending.stage !== 'pin') {
          throw new Error('当前不需要输入 PIN。')
        }
        if (requestId && requestId !== session.pending.requestId) {
          throw new Error('PIN 请求已过期。')
        }

        const rawPin = typeof params?.pin === 'string' ? params.pin.trim() : ''
        if (!rawPin) throw new Error('PIN 不能为空。')

        // Mock 规则：不校验 PIN 内容，只要“看起来像一次 PIN 提交”即可继续流程。
        // - 设备输入模式会用特殊 token 代表“已在设备输入”
        // - 软件输入模式直接传 4 位字符串
        const isDevicePinToken = rawPin === '@@ONEKEY_INPUT_PIN_IN_DEVICE'
        const isValidPin = isDevicePinToken || rawPin.length >= 4
        if (!isValidPin) throw new Error('PIN 长度不足 4 位。')

        session.unlocked = true

        if (session.pending.type === 'deviceUnlock') {
          session.pending = null
          return { success: true, payload: { unlocked: session.unlocked }, unlocked: session.unlocked }
        }

        if (session.pending.type === 'btcGetAddress') {
          if (session.pending.showOnDevice === false) {
            const details = session.pending.details
            session.pending = null
            return okResult({
              success: true,
              payload: { address: details.address, path: details.path }
            })
          }
          session.pending = { ...session.pending, stage: 'confirm' }
          return {
            unlocked: session.unlocked,
            ui: buildConfirmUi({ requestId: session.pending.requestId, action: 'btcGetAddress', details: session.pending.details })
          }
        }

        if (session.pending.type === 'btcSignMessage') {
          session.pending = { ...session.pending, stage: 'confirm' }
          return {
            unlocked: session.unlocked,
            ui: buildConfirmUi({ requestId: session.pending.requestId, action: 'btcSignMessage', details: session.pending.payload })
          }
        }

        session.pending = null
        return {
          unlocked: session.unlocked
        }
      }

      case 'confirm_action': {
        const requestId = typeof params?.requestId === 'string' ? params.requestId : null
        if (!session.pending || session.pending.stage !== 'confirm') {
          throw new Error('当前没有需要确认的操作。')
        }
        if (requestId && requestId !== session.pending.requestId) {
          throw new Error('确认请求已过期。')
        }

        const approved = Boolean(params?.approved)
        const pending = session.pending
        session.pending = null

        if (!approved) {
          throw new Error('用户拒绝确认（Mock）。')
        }

        if (pending.type === 'btcGetAddress') {
          return {
            success: true,
            payload: {
              address: pending.details.address,
              path: pending.details.path
            },
            unlocked: session.unlocked
          }
        }

        if (pending.type === 'btcSignMessage') {
          return {
            success: true,
            payload: {
              address: fakeAddress({ network: 'Bitcoin', path: pending.payload?.path }),
              signature: 'ZGVhZGJlZWY='
            },
            unlocked: session.unlocked
          }
        }

        return {
          signature: '0xdeadbeefmock',
          txid: '0xmocktxid',
          signed: {}
        }
      }

      case 'cancel_action': {
        const requestId = typeof params?.requestId === 'string' ? params.requestId : null
        if (!session.pending) {
          return { cancelled: true }
        }
        if (requestId && requestId !== session.pending.requestId) {
          throw new Error('操作已过期。')
        }
        session.pending = null
        return { cancelled: true }
      }

      default:
        throw new Error(`未知命令：${command}`)
    }
  }

  // 用于保持与旧实现一致的返回结构（不强制，但更易读）
  function okResult(data) {
    return data
  }

  return {
    connect,
    disconnect,
    command
  }
}
