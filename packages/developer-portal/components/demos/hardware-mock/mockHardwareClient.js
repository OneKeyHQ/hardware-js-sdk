import { createMockHardwareServer } from './mockHardwareServer'

function normalizeBasePath(basePath) {
  const value = (basePath ?? '').trim()
  if (!value) return ''
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.replace(/\/$/, '')
}

export function createMockHardwareClient({ basePath }) {
  const normalizedBasePath = normalizeBasePath(basePath)
  const server = createMockHardwareServer()

  const api = {
    basePath: normalizedBasePath,

    async connect() {
      return server.connect()
    },

    async disconnect() {
      return server.disconnect()
    },

    async sendCommand(command, params) {
      return server.command(command, params)
    }
  }

  api.searchDevices = async () => api.sendCommand('searchDevices')
  api.getFeatures = async (connectId) => api.sendCommand('getFeatures', { connectId })

  api.btcGetAddress = async (connectId, deviceId, params) =>
    api.sendCommand('btcGetAddress', { ...(params ?? {}), connectId, deviceId })
  api.btcSignMessage = async (connectId, deviceId, params) =>
    api.sendCommand('btcSignMessage', { ...(params ?? {}), connectId, deviceId })

  api.deviceUnlock = async (connectId, params) =>
    api.sendCommand('deviceUnlock', { ...(params ?? {}), connectId })

  api.submitPin = async (params) => api.sendCommand('submit_pin', params)
  api.confirmAction = async (params) => api.sendCommand('confirm_action', params)
  api.cancelAction = async (params) => api.sendCommand('cancel_action', params)
  api.setDeviceModel = async (deviceType) => api.sendCommand('setDeviceModel', { deviceType })

  return api
}
