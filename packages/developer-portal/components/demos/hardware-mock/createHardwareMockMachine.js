import { assign, createMachine, fromPromise } from 'xstate'
import { createMockHardwareClient } from './mockHardwareClient'

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `log_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function createLog({ level, title, data }) {
  return {
    id: createId(),
    ts: new Date().toISOString(),
    level,
    title,
    data
  }
}

function summarizeConfirmDetails(details) {
  if (!details || typeof details !== 'object') return null

  if (typeof details.address === 'string') {
    return {
      network: details.network ?? null,
      path: details.path ?? null,
      address: details.address
    }
  }

  if (typeof details.messageHex === 'string') {
    return {
      path: details.path ?? null,
      messageHex: details.messageHex
    }
  }

  return details
}

function resolveSuccessTitle(output) {
  if (output?.ui?.type === 'pin') return 'UI_REQUEST PIN'
  if (output?.ui?.type === 'confirm') {
    return `UI_REQUEST CONFIRM ${output.ui.action ?? ''}`.trim()
  }

  const payload = output?.payload
  if (Array.isArray(payload) && payload[0]?.connectId) return 'RESULT searchDevices'
  if (payload?.device_id) return 'RESULT getFeatures'
  if (payload?.address) return 'RESULT btcGetAddress'
  if (payload?.signature) return 'RESULT btcSignMessage'
  if (payload?.unlocked === true) return 'STATE unlocked=true'

  return 'OK'
}

export function createHardwareMockMachine({ basePath }) {
  const client = createMockHardwareClient({ basePath })

  return createMachine(
    {
      id: 'hardwareMockDemo',
      initial: 'booting',
      context: {
        basePath: client.basePath,
        mockReady: false,
        mockError: null,
        device: null,
        ui: null,
        lastError: null,
        logs: []
      },
      states: {
        booting: {
          invoke: {
            src: 'boot',
            input: ({ context }) => ({ basePath: context.basePath }),
            onDone: {
              target: 'ready',
              actions: ['markMockReady', 'setDevice', 'clearUi', 'logMockReady', 'logDeviceReady']
            },
            onError: {
              target: 'ready',
              actions: ['markMockError', 'logMockError']
            }
          }
        },

        ready: {
          on: {
            SEND: {
              target: 'sending',
              actions: ['clearLastError', 'logCommandRequest']
            },
            CLEAR_LOGS: { actions: ['clearLogs'] }
          }
        },

        sending: {
          invoke: {
            src: 'sendCommand',
            input: ({ context, event }) => ({
              basePath: context.basePath,
              command: event.command,
              params: event.params,
              connectId: context.device?.connectId ?? null,
              deviceId: context.device?.deviceId ?? null
            }),
            onDone: [
              {
                guard: 'isPinUi',
                target: 'awaitingPin',
                actions: ['setUiFromOutput', 'syncDeviceFromOutput', 'logCommandSuccess']
              },
              {
                guard: 'isConfirmUi',
                target: 'awaitingConfirm',
                actions: ['setUiFromOutput', 'syncDeviceFromOutput', 'logCommandSuccess']
              },
              {
                target: 'ready',
                actions: ['clearUi', 'syncDeviceFromOutput', 'logCommandSuccess']
              }
            ],
            onError: {
              target: 'ready',
              actions: ['setLastError', 'logCommandError']
            }
          }
        },

        awaitingPin: {
          on: {
            SUBMIT_PIN: {
              target: 'submittingPin',
              actions: ['clearLastError', 'logPinSubmitRequest']
            },
            CANCEL: {
              target: 'canceling',
              actions: ['clearLastError', 'logCancelRequest']
            },
            CLEAR_LOGS: { actions: ['clearLogs'] }
          }
        },

        submittingPin: {
          invoke: {
            src: 'submitPin',
            input: ({ context, event }) => ({
              basePath: context.basePath,
              pin: event.pin,
              requestId: context.ui?.requestId ?? null
            }),
            onDone: [
              {
                guard: 'isPinUi',
                target: 'awaitingPin',
                actions: ['setUiFromOutput', 'syncDeviceFromOutput', 'logCommandSuccess']
              },
              {
                guard: 'isConfirmUi',
                target: 'awaitingConfirm',
                actions: ['setUiFromOutput', 'syncDeviceFromOutput', 'logCommandSuccess']
              },
              {
                target: 'ready',
                actions: ['clearUi', 'syncDeviceFromOutput', 'logCommandSuccess']
              }
            ],
            onError: {
              target: 'awaitingPin',
              actions: ['setLastError', 'logCommandError']
            }
          }
        },

        awaitingConfirm: {
          on: {
            CONFIRM: {
              target: 'submittingConfirm',
              actions: ['clearLastError', 'logConfirmRequest']
            },
            CANCEL: {
              target: 'canceling',
              actions: ['clearLastError', 'logCancelRequest']
            },
            CLEAR_LOGS: { actions: ['clearLogs'] }
          }
        },

        submittingConfirm: {
          invoke: {
            src: 'confirmAction',
            input: ({ context, event }) => ({
              basePath: context.basePath,
              approved: event.approved,
              requestId: context.ui?.requestId ?? null
            }),
            onDone: {
              target: 'ready',
              actions: ['clearUi', 'syncDeviceFromOutput', 'logCommandSuccess']
            },
            onError: {
              target: 'ready',
              actions: ['clearUi', 'setLastError', 'logCommandError']
            }
          }
        },

        canceling: {
          invoke: {
            src: 'cancelAction',
            input: ({ context }) => ({
              basePath: context.basePath,
              requestId: context.ui?.requestId ?? null
            }),
            onDone: {
              target: 'ready',
              actions: ['clearUi', 'syncDeviceFromOutput', 'logCommandSuccess']
            },
            onError: {
              target: 'ready',
              actions: ['clearUi', 'setLastError', 'logCommandError']
            }
          }
        }
      }
    },
    {
      actions: {
        markMockReady: assign(() => ({
          mockReady: true,
          mockError: null
        })),

        markMockError: assign(({ event }) => ({
          mockReady: false,
          mockError: event.error?.message ?? 'Mock 启动失败'
        })),

        clearLastError: assign(() => ({ lastError: null })),

        setLastError: assign(({ event }) => ({
          lastError: event.error?.message ?? '未知错误'
        })),

        setDevice: assign(({ event }) => ({
          device: event.output
        })),

        clearDevice: assign(() => ({ device: null, ui: null })),

        setUiFromOutput: assign(({ event }) => ({
          ui: event.output?.ui ?? null
        })),

        clearUi: assign(() => ({ ui: null })),

        syncDeviceFromOutput: assign(({ context, event }) => {
          const output = event.output
          if (!output) return {}

          const next = { ...(context.device ?? {}) }
          let changed = false

          const apply = (key, value, typeCheck) => {
            if (!typeCheck(value)) return
            if (next[key] === value) return
            next[key] = value
            changed = true
          }

          apply('unlocked', output.unlocked, (v) => typeof v === 'boolean')
          apply('deviceId', output.deviceId, (v) => typeof v === 'string' && v)
          apply('model', output.model, (v) => typeof v === 'string' && v)
          apply('deviceName', output.deviceName, (v) => typeof v === 'string' && v)
          apply('deviceType', output.deviceType, (v) => typeof v === 'string' && v)
          apply('bleName', output.bleName, (v) => typeof v === 'string')
          apply('firmware', output.firmware, (v) => typeof v === 'string' && v)
          apply('transport', output.transport, (v) => typeof v === 'string' && v)

          if (!changed) return {}
          return {
            device: next
          }
        }),

        clearLogs: assign(() => ({ logs: [] })),

        logMockReady: assign(({ context }) => ({
          logs: [
            ...context.logs,
            createLog({ level: 'system', title: 'Mock 已就绪' })
          ]
        })),

        logMockError: assign(({ context, event }) => ({
          logs: [
            ...context.logs,
            createLog({
              level: 'error',
              title: 'Mock 启动失败',
              data: { message: event.error?.message ?? '未知错误' }
            })
          ]
        })),

        logDeviceReady: assign(({ context, event }) => ({
          logs: [
            ...context.logs,
            createLog({
              level: 'response',
              title: 'DEVICE_READY',
              data: event.output
            })
          ]
        })),

        logCommandRequest: assign(({ context, event }) => ({
          logs: [
            ...context.logs,
            createLog({
              level: 'request',
              title: `CALL ${event.command}`,
              data: event.params
            })
          ]
        })),

        logPinSubmitRequest: assign(({ context }) => ({
          logs: [
            ...context.logs,
            createLog({
              level: 'request',
              title: 'UI_RESPONSE PIN',
              data: { requestId: context.ui?.requestId ?? null, pin: '****' }
            })
          ]
        })),

        logConfirmRequest: assign(({ context, event }) => ({
          logs: [
            ...context.logs,
            createLog({
              level: 'request',
              title: 'UI_RESPONSE CONFIRM',
              data: { requestId: context.ui?.requestId ?? null, approved: Boolean(event.approved) }
            })
          ]
        })),

        logCancelRequest: assign(({ context }) => ({
          logs: [
            ...context.logs,
            createLog({
              level: 'request',
              title: 'UI_RESPONSE CANCEL',
              data: { requestId: context.ui?.requestId ?? null }
            })
          ]
        })),

        logCommandSuccess: assign(({ context, event }) => ({
          logs: [
            ...context.logs,
            createLog({
              level: 'response',
              title: resolveSuccessTitle(event.output),
              data: event.output?.ui
                ? { ui: { ...event.output.ui, details: summarizeConfirmDetails(event.output.ui.details) } }
                : typeof event.output?.success === 'boolean' && event.output?.payload
                  ? { success: event.output.success, payload: event.output.payload }
                  : event.output
            })
          ]
        })),

        logCommandError: assign(({ context, event }) => ({
          logs: [
            ...context.logs,
            createLog({
              level: 'error',
              title: '命令失败',
              data: { message: event.error?.message ?? '未知错误' }
            })
          ]
        }))
      },
      actors: {
        boot: fromPromise(async ({ input }) => {
          const devices = await client.searchDevices()
          const first = Array.isArray(devices?.payload) ? devices.payload[0] : null
          const connectId = first?.connectId ?? first?.connect_id ?? 'mock-connect-001'
          const features = await client.getFeatures(connectId)
          const deviceId = features?.payload?.device_id ?? features?.payload?.deviceId ?? 'OK-EMULATOR-001'

          return {
            connectId,
            deviceId,
            model: features?.payload?.model ?? 'OneKey Pro',
            deviceName: features?.payload?.device_name ?? features?.payload?.deviceName ?? 'OneKey Pro',
            bleName: features?.payload?.ble_name ?? features?.payload?.bleName ?? 'ONEKEY-EMULATOR',
            firmware: features?.payload?.firmware ?? '3.0.0-mock',
            transport: features?.payload?.transport ?? 'mock',
            unlocked: Boolean(features?.payload?.unlocked),
            deviceType: features?.payload?.deviceType ?? first?.deviceType ?? 'pro'
          }
        }),

        sendCommand: fromPromise(async ({ input }) => {
          if (input.command === 'searchDevices') return client.searchDevices()
          if (input.command === 'getFeatures') return client.getFeatures(input.params?.connectId ?? input.connectId)

          if (input.command === 'deviceUnlock') {
            const connectId = input.params?.connectId ?? input.connectId ?? 'mock-connect-001'
            return client.deviceUnlock(connectId, input.params)
          }

          if (input.command === 'btcGetAddress') {
            const connectId = input.params?.connectId ?? input.connectId ?? 'mock-connect-001'
            const deviceId = input.params?.deviceId ?? input.deviceId ?? 'OK-EMULATOR-001'
            return client.btcGetAddress(connectId, deviceId, input.params)
          }

          if (input.command === 'btcSignMessage') {
            const connectId = input.params?.connectId ?? input.connectId ?? 'mock-connect-001'
            const deviceId = input.params?.deviceId ?? input.deviceId ?? 'OK-EMULATOR-001'
            return client.btcSignMessage(connectId, deviceId, input.params)
          }

          return client.sendCommand(input.command, input.params)
        }),

        submitPin: fromPromise(async ({ input }) => {
          return client.submitPin({ pin: input.pin, requestId: input.requestId })
        }),

        confirmAction: fromPromise(async ({ input }) => {
          return client.confirmAction({ approved: input.approved, requestId: input.requestId })
        }),
        cancelAction: fromPromise(async ({ input }) => {
          return client.cancelAction({ requestId: input.requestId })
        })
      },
      guards: {
        isPinUi: ({ event }) => event.output?.ui?.type === 'pin',
        isConfirmUi: ({ event }) => event.output?.ui?.type === 'confirm'
      }
    }
  )
}
