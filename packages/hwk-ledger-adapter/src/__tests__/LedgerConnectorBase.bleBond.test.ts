import { OpeningConnectionError } from '@ledgerhq/device-management-kit';
import {
  HardwareErrorCode,
  UI_REQUEST,
  UI_RESPONSE,
  rehydrateConnectorError,
  serializeConnectorError,
} from '@onekeyfe/hwk-adapter-core';

import { LedgerAdapter } from '../adapter/LedgerAdapter';
import { LedgerConnectorBase } from '../connector/LedgerConnectorBase';
import { ERROR_TAG, isConnectionLevelError, mapLedgerError } from '../errors';

const staleBondErrors = [
  ['iOS peer-removed tag', { _tag: 'PeerRemovedPairingError', err: { iosErrorCode: 14 } }],
  ['Android peer-removed tag', { _tag: 'PeerRemovedPairingError', err: { errorCode: 2 } }],
  ['iOS notification failure', { _tag: ERROR_TAG.PairingRefused, err: { iosErrorCode: 14 } }],
  [
    'Android insufficient authentication',
    { _tag: ERROR_TAG.PairingRefused, err: { attErrorCode: 5 } },
  ],
  [
    'Android native reason',
    { _tag: ERROR_TAG.PairingRefused, err: { reason: 'status 5 (GATT_INSUF_AUTHENTICATION)' } },
  ],
  [
    'macOS native error',
    new OpeningConnectionError(
      Object.assign(new Error('Pairing information was removed'), {
        nativeErrorDomain: 'CBErrorDomain',
        nativeErrorCode: 14,
      })
    ),
  ],
  [
    'macOS IPC error with a localized description',
    new OpeningConnectionError(
      new Error(
        "Error invoking remote method '$onekey-3p-ble-connect': Error: CBErrorDomain:14 配对信息已被移除"
      )
    ),
  ],
] as const;

function connectorWithConnectFailure(error: unknown) {
  const connector = new LedgerConnectorBase(async () => ({}), { connectionType: 'ble' });
  const manager = {
    hasDiscoveredDevice: () => true,
    connect: jest.fn().mockRejectedValue(error),
    disposeKeepingDmk: jest.fn(),
  };
  Object.assign(connector, { _deviceManager: manager });
  return { connector, manager };
}

describe('Ledger stale Bluetooth pairing', () => {
  it.each(staleBondErrors)(
    'preserves %s through connect and serialization',
    async (_name, cause) => {
      expect(mapLedgerError(cause).code).toBe(HardwareErrorCode.BleBondInvalid);
      const { connector, manager } = connectorWithConnectFailure(cause);
      const error = await connector.connect('ledger-test').catch((caught: unknown) => caught);
      const serialized = JSON.parse(JSON.stringify(serializeConnectorError(error)));

      expect(serialized).toMatchObject({ code: HardwareErrorCode.BleBondInvalid });
      const rehydrated = rehydrateConnectorError(serialized);
      expect(mapLedgerError(rehydrated).code).toBe(HardwareErrorCode.BleBondInvalid);
      expect(isConnectionLevelError(rehydrated)).toBe(true);
      expect(manager.connect).toHaveBeenCalledTimes(1);
      expect(manager.disposeKeepingDmk).toHaveBeenCalledTimes(1);
    }
  );

  it('returns the stale-bond recovery code from a public adapter request without retrying', async () => {
    const { connector, manager } = connectorWithConnectFailure(staleBondErrors[0][1]);
    const adapter = new LedgerAdapter(connector);
    adapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
        payload: { granted: true },
      });
    });
    try {
      const result = await adapter.getLedgerFirmwareVersion('ledger-test');

      expect(JSON.parse(JSON.stringify(result))).toMatchObject({
        success: false,
        payload: {
          code: HardwareErrorCode.BleBondInvalid,
          recovery: { scope: 'search-target' },
        },
      });
      expect(manager.connect).toHaveBeenCalledTimes(1);
    } finally {
      await adapter.dispose();
    }
  });

  it('preserves an app cancellation when a peer-removed error arrives afterwards', async () => {
    jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
    let rejectConnect: (error: unknown) => void = () => undefined;
    const pendingConnect = new Promise<string>((_resolve, reject) => {
      rejectConnect = reject;
    });
    const { connector, manager } = connectorWithConnectFailure(undefined);
    manager.connect.mockReturnValue(pendingConnect);
    const adapter = new LedgerAdapter(connector);
    adapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
        payload: { granted: true },
      });
    });
    try {
      const request = adapter.getLedgerFirmwareVersion('ledger-test');
      await new Promise<void>(resolve => {
        setImmediate(resolve);
      });
      expect(manager.connect).toHaveBeenCalledTimes(1);

      adapter.cancel('ledger-test');
      rejectConnect(staleBondErrors[1][1]);

      await expect(request).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });
      expect(manager.connect).toHaveBeenCalledTimes(1);
    } finally {
      rejectConnect(staleBondErrors[1][1]);
      await adapter.dispose();
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it.each([
    ['pairing timeout', { _tag: ERROR_TAG.BlePairingTimeout }],
    ['pairing refusal', { _tag: ERROR_TAG.PairingRefused, err: { errorCode: 2 } }],
    ['unknown GATT failure', new OpeningConnectionError(new Error('connection failed'))],
    [
      'unrelated code 14',
      new OpeningConnectionError(Object.assign(new Error('failed'), { code: 14 })),
    ],
    [
      'another CoreBluetooth error',
      new OpeningConnectionError(new Error('CBErrorDomain:6 disconnected')),
    ],
    [
      'another native error domain',
      new OpeningConnectionError(
        Object.assign(new Error('failed'), {
          nativeErrorDomain: 'OtherDomain',
          nativeErrorCode: 14,
        })
      ),
    ],
    ['a longer native code', new OpeningConnectionError(new Error('CBErrorDomain:140 failed'))],
  ])('keeps %s in the existing pairing-failure category', async (_name, cause) => {
    const { connector, manager } = connectorWithConnectFailure(cause);
    const error = await connector.connect('ledger-test').catch((caught: unknown) => caught);

    expect(mapLedgerError(error).code).toBe(HardwareErrorCode.BlePairingTimeout);
    expect(manager.connect).toHaveBeenCalledTimes(1);
  });
});
