import {
  type TrezorDebugLogEntry,
  filterTrezorDebugLogEntry,
  sanitizeTrezorDebugLogData,
  shouldLogTrezorDebugEntry,
} from '../debugLogFilter';

const entry = (
  event: string,
  data?: Record<string, unknown>,
  level: TrezorDebugLogEntry['level'] = 'info',
  scope = 'trezor-core'
): TrezorDebugLogEntry => ({
  level,
  scope,
  event,
  data,
});

describe('Trezor debug log filter', () => {
  test('keeps SDK method and protocol step logs', () => {
    expect(shouldLogTrezorDebugEntry(entry('core.call.start'))).toBe(true);
    expect(shouldLogTrezorDebugEntry(entry('core.send.start'))).toBe(true);
    expect(shouldLogTrezorDebugEntry(entry('session.method.response'))).toBe(true);
    expect(shouldLogTrezorDebugEntry(entry('webusb.scan.filtered'))).toBe(true);
    expect(shouldLogTrezorDebugEntry(entry('webusb.connector.enumerate.filtered'))).toBe(true);
    expect(shouldLogTrezorDebugEntry(entry('ble.connector.enumerate.filtered'))).toBe(true);
    expect(shouldLogTrezorDebugEntry(entry('ble.discovery.summary'))).toBe(true);
    expect(shouldLogTrezorDebugEntry(entry('connector.call.done'))).toBe(true);
  });

  test('drops noisy transport and scan logs by default', () => {
    expect(shouldLogTrezorDebugEntry(entry('webusb.transferOut.done'))).toBe(false);
    expect(shouldLogTrezorDebugEntry(entry('webusb.transferIn.done'))).toBe(false);
    expect(shouldLogTrezorDebugEntry(entry('webusb.scan.detail'))).toBe(false);
    expect(shouldLogTrezorDebugEntry(entry('webusb.scan.done'))).toBe(false);
    expect(shouldLogTrezorDebugEntry(entry('ble.connector.enumerate.detail'))).toBe(false);
    expect(shouldLogTrezorDebugEntry(entry('ble.renderer.scan.done'))).toBe(false);
    expect(shouldLogTrezorDebugEntry(entry('thp.loop'))).toBe(false);
    expect(shouldLogTrezorDebugEntry(entry('[TREZOR_VERIFY][usb] scan.device'))).toBe(false);
    expect(shouldLogTrezorDebugEntry(entry('[TrezorCapabilityTrace] connect.features'))).toBe(
      false
    );
  });

  test('keeps warning and error logs even for noisy scopes', () => {
    expect(shouldLogTrezorDebugEntry(entry('webusb.disconnect.close.error', {}, 'warn'))).toBe(
      true
    );
    expect(shouldLogTrezorDebugEntry(entry('webusb.transferIn.error', {}, 'error'))).toBe(true);
  });

  test('redacts packet and transport payload fields while keeping useful metadata', () => {
    expect(
      sanitizeTrezorDebugLogData({
        protocol: 'v2',
        name: 'EthereumSignTx',
        responseType: 'ButtonRequest',
        packetHex: '001122',
        frameHeadHex: 'aabb',
        device: { serialNumber: 'secret' },
        devices: [{ serialNumber: 'secret' }],
        bytes: 64,
        messageBytes: 120,
        chunkCount: 3,
        chunkSize: 64,
        endpoint: 1,
        error: 'Failure_ActionCancelled',
      })
    ).toEqual({
      protocol: 'v2',
      name: 'EthereumSignTx',
      responseType: 'ButtonRequest',
      packetHex: '[redacted]',
      frameHeadHex: '[redacted]',
      device: '[redacted]',
      devices: '[redacted]',
      bytes: '[redacted]',
      messageBytes: '[redacted]',
      chunkCount: '[redacted]',
      chunkSize: '[redacted]',
      endpoint: '[redacted]',
      error: 'Failure_ActionCancelled',
    });
  });

  test('marks THP logs as handled so host adapters do not duplicate them', () => {
    expect(filterTrezorDebugLogEntry(entry('thp.call.request'))).toEqual(
      expect.objectContaining({
        event: 'thp.call.request',
        thpModuleForwarded: true,
      })
    );
    expect(
      filterTrezorDebugLogEntry(
        entry('session.method.start', {
          protocol: 'thp',
          name: 'EthereumGetAddress',
        })
      )
    ).toEqual(
      expect.objectContaining({
        event: 'session.method.start',
        thpModuleForwarded: true,
      })
    );
    expect(
      filterTrezorDebugLogEntry(
        entry('session.method.start', {
          protocol: 'v1',
          name: 'Initialize',
        })
      )
    ).toEqual(
      expect.objectContaining({
        event: 'session.method.start',
        thpModuleForwarded: undefined,
      })
    );
  });
});
