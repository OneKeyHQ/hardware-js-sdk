import {
  DEVICE,
  HardwareErrorCode,
  ORPHAN_ELIGIBLE_ERROR_CODES,
  UI_REQUEST,
  UI_RESPONSE,
  createHardwareInteractionId,
  parseHardwareRuntimeId,
} from '@onekeyfe/hwk-adapter-core';

import { TrezorAdapter, onSdkEvent } from '../index';

import type { IConnector } from '@onekeyfe/hwk-adapter-core';

type ConnectMock = jest.Mock<ReturnType<IConnector['connect']>, Parameters<IConnector['connect']>>;
type CallMock = jest.Mock<Promise<unknown>, Parameters<IConnector['call']>>;
type SearchDevicesMock = jest.Mock<
  ReturnType<IConnector['searchDevices']>,
  Parameters<IConnector['searchDevices']>
>;

describe('TrezorAdapter', () => {
  function createConnector(): IConnector {
    return {
      connectionType: 'ble',
      searchDevices: jest.fn().mockResolvedValue([
        {
          connectId: 'safe-7',
          deviceId: 'safe-7',
          name: 'Trezor Safe 7',
          model: 'T3W1',
        },
      ]),
      connect: jest.fn().mockResolvedValue({
        sessionId: 'safe-7-session',
        deviceInfo: {
          vendor: 'trezor',
          model: 'T3W1',
          firmwareVersion: '',
          deviceId: 'safe-7',
          connectId: 'safe-7',
          connectionType: 'ble',
        },
      }),
      disconnect: jest.fn().mockResolvedValue(undefined),
      call: jest.fn().mockResolvedValue(Uint8Array.from([4, 5, 6])),
      cancel: jest.fn().mockResolvedValue(undefined),
      uiResponse: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      reset: jest.fn(),
    };
  }

  function createSeriallessUsbConnector(): IConnector {
    const connector: IConnector = { ...createConnector(), connectionType: 'usb' };
    (connector.searchDevices as SearchDevicesMock).mockResolvedValue([
      {
        connectId: 'trezor-webusb-1209-53c1-0',
        deviceId: '',
        name: 'Trezor USB',
        connectionType: 'usb',
        capabilities: { persistentDeviceIdentity: false },
      },
      {
        connectId: 'trezor-webusb-1209-53c1-1',
        deviceId: '',
        name: 'Trezor USB',
        connectionType: 'usb',
        capabilities: { persistentDeviceIdentity: false },
      },
    ]);
    (connector.connect as ConnectMock).mockImplementation(connectId =>
      Promise.resolve({
        sessionId: `${connectId}-session`,
        deviceInfo: {
          vendor: 'trezor',
          model: 'T2T1',
          firmwareVersion: '2.8.0',
          deviceId:
            connectId === 'trezor-webusb-1209-53c1-1' ? 'expected-device-id' : 'wrong-device-id',
          connectId: connectId ?? '',
          connectionType: 'usb',
          capabilities: { persistentDeviceIdentity: false },
        },
      })
    );
    return connector;
  }

  it('searches and connects through injected connector', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);

    await expect(adapter.searchDevices()).resolves.toHaveLength(1);
    const connected = await adapter.connectDevice('safe-7');
    expect(connected).toEqual({
      success: true,
      payload: expect.any(String),
    });
    if (connected.success) {
      expect(parseHardwareRuntimeId(connected.payload)).toMatchObject({
        kind: 'interaction',
        vendor: 'trezor',
      });
    }
  });

  it('reconnects a known BLE endpoint and verifies identity before the wallet call', async () => {
    const connector = createConnector();
    (connector.searchDevices as SearchDevicesMock).mockResolvedValue([]);
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'v1' })
      .mockResolvedValueOnce({ address: 'verified-address' });
    const adapter = new TrezorAdapter(connector, {
      knownDeviceConnections: [{ deviceId: 'safe-7', bleConnectId: 'safe-7' }],
    });
    const select = jest.fn();
    const verified = jest.fn();
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, select);
    adapter.on(DEVICE.TREZOR_CONNECTION_VERIFIED, verified);

    const result = await adapter.evmGetAddress('', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
    });

    expect(result.success).toBe(true);
    expect(connector.connect).toHaveBeenCalledWith('safe-7', { transportType: 'ble' });
    expect(select).not.toHaveBeenCalled();
    expect(verified).not.toHaveBeenCalled();
  });

  it('asks the host to select even a sole unbound BLE device', async () => {
    const connector = createConnector();
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'v1' })
      .mockResolvedValueOnce({ address: 'verified-address' });
    const adapter = new TrezorAdapter(connector);
    const selected = jest.fn(event => {
      expect(connector.connect).not.toHaveBeenCalled();
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
        payload: {
          sdkConnectId: event.payload.devices[0].connectId,
          requestId: event.payload.requestId,
        },
      });
    });
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, selected);

    const result = await adapter.evmGetAddress('', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
    });

    expect(result.success).toBe(true);
    expect(selected).toHaveBeenCalledTimes(1);
    expect(connector.connect).toHaveBeenCalledWith('safe-7', { transportType: 'ble' });
  });

  it.each([true, false])('requires persistence before the wallet call (saved=%s)', async saved => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    (connector.call as CallMock).mockImplementation(async (_session, method) => {
      if (method === 'createAppSession') return { protocol: 'v1' };
      return { address: 'verified-address' };
    });
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
        payload: { requestId: event.payload.requestId, sdkConnectId: 'safe-7' },
      });
    });
    const save = jest.fn();
    adapter.on(UI_REQUEST.REQUEST_SAVE_DEVICE_BINDING, event => {
      save(event.payload);
      expect(
        (connector.call as CallMock).mock.calls.some(([, method]) => method === 'evmGetAddress')
      ).toBe(false);
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_SAVE_DEVICE_BINDING,
        payload: { requestId: event.payload.requestId, saved },
      });
    });
    const result = await adapter.evmGetAddress('', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
      extra: { dbDeviceId: 'binding-record' },
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(saved);
    expect(
      (connector.call as CallMock).mock.calls.some(([, method]) => method === 'evmGetAddress')
    ).toBe(saved);
  });

  it('carries opaque context through explicit binding only after the wallet call succeeds', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const extra = { dbDeviceId: 'db-trezor' };
    const verified = jest.fn();
    adapter.on(DEVICE.TREZOR_CONNECTION_VERIFIED, verified);
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
      expect(event.payload).toMatchObject({
        extra,
        context: { kind: 'bind-connection', transport: 'ble', reason: 'missing-binding' },
      });
      expect(verified).not.toHaveBeenCalled();
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
        payload: { requestId: event.payload.requestId, sdkConnectId: 'safe-7' },
      });
    });
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'v1' })
      .mockImplementationOnce(async (_session, _method, params) => {
        expect(verified).not.toHaveBeenCalled();
        expect(params).not.toHaveProperty('extra');
        expect(params).not.toHaveProperty('knownConnections');
        expect(params).not.toHaveProperty('allowDeviceSelection');
        return { address: 'verified-address' };
      });
    const result = await adapter.evmGetAddress('stale-usb', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
      knownConnections: [],
      extra,
    });
    expect(result.success).toBe(true);
    expect(verified).toHaveBeenCalledTimes(1);
    expect(verified).toHaveBeenCalledWith({
      type: DEVICE.TREZOR_CONNECTION_VERIFIED,
      payload: {
        deviceId: 'safe-7',
        connectId: 'safe-7',
        connectionType: 'ble',
        extra,
        selectionRequestId: expect.any(String),
      },
    });
  });

  it('does not emit a selected binding when the requested passphrase wallet differs', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const verified = jest.fn();
    const selectionIds: string[] = [];
    adapter.on(DEVICE.TREZOR_CONNECTION_VERIFIED, verified);
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
      selectionIds.push(event.payload.requestId);
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
        payload: { requestId: event.payload.requestId, sdkConnectId: 'safe-7' },
      });
    });
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'v1' })
      .mockResolvedValueOnce({ publicKey: 'different-wallet' });
    const result = await adapter.evmGetAddress('', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      passphraseState: 'expected-wallet-state',
      knownConnections: [],
      extra: { dbDeviceId: 'db-trezor' },
    });
    expect(result).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.PassphraseStateMismatch },
    });
    expect(verified).not.toHaveBeenCalled();
    expect(connector.call).not.toHaveBeenCalledWith(
      expect.any(String),
      'evmGetAddress',
      expect.anything()
    );
    expect(connector.disconnect).toHaveBeenCalledTimes(1);
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'v1' })
      .mockResolvedValueOnce({ address: 'verified-address' });
    const retry = await adapter.evmGetAddress('', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
      knownConnections: [],
      extra: { dbDeviceId: 'db-trezor' },
    });
    expect(retry.success).toBe(true);
    expect(selectionIds).toHaveLength(2);
    expect(selectionIds[0]).not.toBe(selectionIds[1]);
    expect(verified).toHaveBeenCalledTimes(1);
    expect(verified).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ selectionRequestId: selectionIds[1] }),
      })
    );
  });

  it('does not open a selection after cancellation during a BLE scan', async () => {
    const connector = createConnector();
    let finishScan!: (devices: Awaited<ReturnType<IConnector['searchDevices']>>) => void;
    let scanStarted!: () => void;
    const started = new Promise<void>(resolve => {
      scanStarted = resolve;
    });
    (connector.searchDevices as SearchDevicesMock).mockImplementation(() => {
      scanStarted();
      return new Promise(resolve => {
        finishScan = resolve;
      });
    });
    const adapter = new TrezorAdapter(connector);
    const select = jest.fn();
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, select);
    const operation = adapter.evmGetAddress('', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
      knownConnections: [],
    });
    await started;
    adapter.cancel();
    finishScan([{ connectId: 'safe-7', name: 'Trezor Safe 7', connectionType: 'ble' }]);
    expect(await operation).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.UserAborted },
    });
    expect(select).not.toHaveBeenCalled();
    expect(connector.connect).not.toHaveBeenCalled();
    await adapter.dispose();
  });

  it('does not let a cancelled scan overwrite a newer verified session', async () => {
    const connector = createConnector();
    let finishScan!: (devices: Awaited<ReturnType<IConnector['searchDevices']>>) => void;
    let scanStarted!: () => void;
    const started = new Promise<void>(resolve => {
      scanStarted = resolve;
    });
    const descriptors = [
      { connectId: 'safe-7', deviceId: '', name: 'Trezor Safe 7', connectionType: 'ble' as const },
    ];
    (connector.searchDevices as SearchDevicesMock)
      .mockImplementationOnce(() => {
        scanStarted();
        return new Promise(resolve => {
          finishScan = resolve;
        });
      })
      .mockResolvedValue(descriptors);
    (connector.call as CallMock).mockImplementation(async (_session, method) =>
      method === '__thpCreateSession' ? { protocol: 'v1' } : { address: 'verified-address' }
    );
    const adapter = new TrezorAdapter(connector);
    const select = jest.fn(event =>
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
        payload: { requestId: event.payload.requestId, sdkConnectId: 'safe-7' },
      })
    );
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, select);
    const params = { path: "m/44'/60'/0'/0/0", useEmptyPassphrase: true, knownConnections: [] };
    const first = adapter.evmGetAddress('', 'safe-7', params);
    await started;
    adapter.cancel();
    expect(await first).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.UserAborted },
    });
    expect((await adapter.evmGetAddress('', 'safe-7', params)).success).toBe(true);
    finishScan(descriptors);
    await new Promise(resolve => setImmediate(resolve));
    expect(
      (
        await adapter.evmGetAddress('', 'safe-7', {
          ...params,
          knownConnections: [{ transport: 'ble', connectId: 'safe-7' }],
        })
      ).success
    ).toBe(true);
    expect(select).toHaveBeenCalledTimes(1);
    expect(connector.connect).toHaveBeenCalledTimes(1);
    await adapter.searchDevices({ transportType: 'ble' });
    expect((await adapter.evmGetAddress('', 'safe-7', params)).success).toBe(true);
    expect(connector.connect).toHaveBeenCalledTimes(1);
    await adapter.dispose();
  });

  it('returns cancellation before a selected raw call finishes while retaining safe teardown', async () => {
    const connector = createConnector();
    let finishCall!: (value: unknown) => void;
    let callStarted!: () => void;
    const started = new Promise<void>(resolve => {
      callStarted = resolve;
    });
    (connector.call as CallMock).mockImplementation(async (_session, method) => {
      if (method === '__thpCreateSession') return { protocol: 'v1' };
      callStarted();
      return new Promise(resolve => {
        finishCall = resolve;
      });
    });
    const adapter = new TrezorAdapter(connector);
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event =>
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
        payload: { requestId: event.payload.requestId, sdkConnectId: 'safe-7' },
      })
    );
    const operation = adapter.evmGetAddress('', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
      knownConnections: [],
    });
    await started;
    adapter.cancel();
    expect(await operation).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.UserAborted },
    });
    expect(connector.disconnect).not.toHaveBeenCalled();
    finishCall({ address: 'verified-address' });
    await adapter.dispose();
    expect(connector.disconnect).toHaveBeenCalledTimes(1);
  });

  it('consumes a connection failure that arrives after cancellation', async () => {
    const connector = createConnector();
    let failConnect!: (error: Error) => void;
    let connectStarted!: () => void;
    const started = new Promise<void>(resolve => {
      connectStarted = resolve;
    });
    (connector.connect as ConnectMock).mockImplementationOnce(() => {
      connectStarted();
      return new Promise((_resolve, reject) => {
        failConnect = reject;
      });
    });
    const adapter = new TrezorAdapter(connector);
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event =>
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
        payload: { requestId: event.payload.requestId, sdkConnectId: 'safe-7' },
      })
    );
    const operation = adapter.evmGetAddress('', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
      knownConnections: [],
    });
    await started;
    adapter.cancel();
    expect(await operation).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.UserAborted },
    });
    failConnect(new Error('Synthetic late handshake failure'));
    await new Promise(resolve => setImmediate(resolve));
    await adapter.dispose();
    expect(connector.disconnect).not.toHaveBeenCalled();
  });

  it('reselects and publishes a binding after passphrase discovery verification fails', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const verified = jest.fn();
    const select = jest.fn(event =>
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
        payload: { requestId: event.payload.requestId, sdkConnectId: 'safe-7' },
      })
    );
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, select);
    adapter.on(DEVICE.TREZOR_CONNECTION_VERIFIED, verified);
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'v1' })
      .mockResolvedValueOnce({ publicKey: 'different-wallet' })
      .mockResolvedValueOnce({ protocol: 'v1' })
      .mockResolvedValueOnce({ publicKey: 'expected-wallet-state' });
    const context = {
      knownConnections: [],
      extra: { dbDeviceId: 'db-trezor' },
      expectedDeviceIdentity: {
        vendor: 'trezor' as const,
        type: 'deviceId' as const,
        value: 'safe-7',
      },
    };
    expect(await adapter.getPassphraseState('', 'expected-wallet-state', context)).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.PassphraseStateMismatch },
    });
    expect(verified).not.toHaveBeenCalled();
    expect(connector.disconnect).toHaveBeenCalledTimes(1);
    expect(await adapter.getPassphraseState('', 'expected-wallet-state', context)).toMatchObject({
      success: true,
    });
    expect(select).toHaveBeenCalledTimes(2);
    expect(verified).toHaveBeenCalledTimes(1);
    expect(verified).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          selectionRequestId: select.mock.calls[1][0].payload.requestId,
        }),
      })
    );
    await adapter.dispose();
  });

  it('uses the call-provided BLE hint directly and does not scan when selection is disabled', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'v1' })
      .mockResolvedValueOnce({ address: 'verified-address' });
    const result = await adapter.evmGetAddress('stale-usb', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
      knownConnections: [{ transport: 'ble', connectId: 'safe-7' }],
      allowDeviceSelection: false,
    });
    expect(result.success).toBe(true);
    expect(connector.searchDevices).not.toHaveBeenCalled();
    expect(connector.connect).toHaveBeenCalledWith('safe-7', { transportType: 'ble' });
  });

  it('does not rebind an unavailable saved BLE endpoint', async () => {
    const connector = createConnector();
    (connector.connect as ConnectMock).mockRejectedValueOnce(
      Object.assign(new Error('Not advertising'), { code: HardwareErrorCode.DeviceNotFound })
    );
    const adapter = new TrezorAdapter(connector);
    const selection = jest.fn();
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, selection);
    const result = await adapter.evmGetAddress('', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
      knownConnections: [{ transport: 'ble', connectId: 'safe-7' }],
    });
    expect(result).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.DeviceNotFound },
    });
    expect(selection).not.toHaveBeenCalled();
    expect(connector.searchDevices).not.toHaveBeenCalled();
    expect(connector.call).not.toHaveBeenCalled();
  });

  it('terminates binding UI when a selected BLE endpoint fails to connect', async () => {
    const connector = createConnector();
    (connector.connect as ConnectMock).mockRejectedValueOnce(
      Object.assign(new Error('Not advertising'), { code: HardwareErrorCode.DeviceNotFound })
    );
    const adapter = new TrezorAdapter(connector);
    const status = jest.fn();
    adapter.on(UI_REQUEST.DEVICE_BINDING_STATUS, status);
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
        payload: { requestId: event.payload.requestId, sdkConnectId: 'safe-7' },
      });
    });
    const result = await adapter.evmGetAddress('', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
      knownConnections: [],
    });
    expect(result.success).toBe(false);
    expect(status).toHaveBeenLastCalledWith({
      type: UI_REQUEST.DEVICE_BINDING_STATUS,
      payload: { selectionRequestId: expect.any(String), status: 'failed' },
    });
  });

  it('does not fall back to BLE when a discovered USB endpoint disappears', async () => {
    const connector: IConnector = { ...createConnector(), availableTransports: ['usb', 'ble'] };
    (connector.searchDevices as SearchDevicesMock).mockResolvedValue([
      { connectId: 'usb-unplugged', connectionType: 'usb', name: 'Trezor USB' },
    ]);
    (connector.connect as ConnectMock).mockRejectedValueOnce(
      Object.assign(new Error('USB was unplugged'), { code: HardwareErrorCode.DeviceNotFound })
    );
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'v1' })
      .mockResolvedValueOnce({ address: 'verified-address' });
    const adapter = new TrezorAdapter(connector, {
      knownDeviceConnections: [{ deviceId: 'safe-7', bleConnectId: 'safe-7' }],
    });

    const result = await adapter.evmGetAddress('', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.DeviceNotFound },
    });
    expect(connector.connect).toHaveBeenNthCalledWith(1, 'usb-unplugged', { transportType: 'usb' });
    expect(connector.connect).toHaveBeenCalledTimes(1);
  });

  it('prefers identity-matched USB over a known BLE binding', async () => {
    const connector = createSeriallessUsbConnector();
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'v1' })
      .mockResolvedValueOnce({ address: 'verified-address' });
    const adapter = new TrezorAdapter(connector, {
      knownDeviceConnections: [{ deviceId: 'expected-device-id', bleConnectId: 'known-ble' }],
    });

    const result = await adapter.evmGetAddress('', 'expected-device-id', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
    });

    expect(result.success).toBe(true);
    expect(connector.connect).not.toHaveBeenCalledWith('known-ble');
    expect(connector.call).toHaveBeenLastCalledWith(
      'trezor-webusb-1209-53c1-1-session',
      'evmGetAddress',
      expect.any(Object)
    );
  });

  it('rejects a stale selection response before connecting', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
        payload: { sdkConnectId: 'not-in-this-scan', requestId: event.payload.requestId },
      });
    });

    const result = await adapter.evmGetAddress('', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.DeviceNotFound },
    });
    expect(connector.connect).not.toHaveBeenCalled();
  });

  it('never dispatches or persists a selected BLE device with a different identity', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const verified = jest.fn();
    adapter.on(DEVICE.TREZOR_CONNECTION_VERIFIED, verified);
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => {
      if (event.payload.rejectedConnectId) {
        expect(event.payload.rejectedConnectId).toBe('safe-7');
        expect(event.payload.devices).toEqual([]);
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
          payload: { cancelled: true, requestId: event.payload.requestId },
        });
        return;
      }
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
        payload: { sdkConnectId: 'safe-7', requestId: event.payload.requestId },
      });
    });

    const result = await adapter.evmGetAddress('', 'another-device', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.UserAborted },
    });
    expect(connector.call).not.toHaveBeenCalled();
    expect(connector.disconnect).toHaveBeenCalledWith('safe-7-session');
    expect(verified).not.toHaveBeenCalled();
  });

  it('cancels an unbound BLE selection without opening a device', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    adapter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event =>
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
        payload: { requestId: event.payload.requestId, cancelled: true },
      })
    );

    const result = await adapter.evmGetAddress('', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.UserAborted },
    });
    expect(connector.connect).not.toHaveBeenCalled();
    expect(connector.call).not.toHaveBeenCalled();
  });

  it('uses the exact server challenge and returns the raw attestation proof', async () => {
    const connector = createConnector();
    const challenge = 'ab'.repeat(32);
    const proof = {
      optiga_certificates: ['00'],
      optiga_signature: '11',
    };
    (connector.call as CallMock)
      .mockResolvedValueOnce({ internal_model: 'T3W1' })
      .mockResolvedValueOnce(proof);
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.verifyDeviceAuthenticity('safe-7', { challenge });

    expect(connector.call).toHaveBeenNthCalledWith(2, 'safe-7-session', 'authenticateDevice', {
      challenge,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.payload).toMatchObject({
        vendor: 'trezor',
        trezorProof: {
          challenge,
          deviceModel: 'T3W1',
          proof,
        },
      });
    }
  });

  it('rejects a malformed server challenge before connecting to the device', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.verifyDeviceAuthenticity('safe-7', { challenge: 'abcd' });

    expect(result).toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.InvalidParams,
        error: 'Device authenticity challenge must be exactly 32 bytes encoded as hex',
        recovery: { scope: 'not-recoverable' },
      },
    });
    expect(connector.connect).not.toHaveBeenCalled();
    expect(connector.call).not.toHaveBeenCalled();
  });

  it('returns device search targets without opening a device session', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);

    const targets = await adapter.searchDeviceTargets({ waitForAllTransports: true });

    expect(connector.searchDevices).toHaveBeenCalledWith({ waitForAll: true });
    expect(connector.connect).not.toHaveBeenCalled();
    expect(targets).toEqual([
      expect.objectContaining({
        searchTargetId: 'safe-7',
        searchTargetReusePolicy: 'current-discovery',
        vendor: 'trezor',
        connectionType: 'ble',
        kind: 'physical',
      }),
    ]);
  });

  it('marks only a stable discovery locator as reconnectable', async () => {
    const connector = createConnector();
    (connector.searchDevices as SearchDevicesMock).mockResolvedValueOnce([
      {
        connectId: 'trezor-usb-serial',
        deviceId: '',
        name: 'Trezor USB',
        model: 'T3W1',
        connectionType: 'usb',
        capabilities: { persistentDeviceIdentity: true },
      },
    ]);
    const adapter = new TrezorAdapter(connector);

    const targets = await adapter.searchDeviceTargets();

    expect(targets[0]).toMatchObject({
      searchTargetId: 'trezor-usb-serial',
      searchTargetReusePolicy: 'reconnectable',
    });
  });

  it('connects without deriving public data and exposes info through the interaction', async () => {
    const connector = createConnector();
    (connector.connect as ConnectMock).mockResolvedValueOnce({
      sessionId: 'safe-7-session',
      deviceInfo: {
        vendor: 'trezor',
        model: 'T3W1',
        firmwareVersion: '2.8.0',
        deviceId: 'safe-7',
        connectId: 'safe-7',
        connectionType: 'ble',
        raw: { features: { device_id: 'TREZOR-DEVICE-ID' } },
      },
    });
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.connectDevice('safe-7');

    expect(connector.connect).toHaveBeenCalledWith('safe-7');
    expect(connector.call).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      payload: expect.any(String),
    });
    if (!result.success) return;
    expect(parseHardwareRuntimeId(result.payload)).toMatchObject({
      kind: 'interaction',
      vendor: 'trezor',
    });
    await expect(adapter.getDeviceInfo(result.payload, '')).resolves.toEqual({
      success: true,
      payload: expect.objectContaining({
        vendor: 'trezor',
        connectId: 'safe-7',
        deviceId: 'safe-7',
      }),
    });
  });

  it('fails an ended interaction without reconnecting', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('safe-7');
    expect(connected.success).toBe(true);
    if (!connected.success) return;
    await adapter.releaseInteraction(connected.payload);
    jest.clearAllMocks();

    const result = await adapter.evmGetAddress(connected.payload, '', {
      path: "m/44'/60'/0'/0/0",
      interactionId: connected.payload,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.payload.code).toBe(HardwareErrorCode.InteractionEnded);
    }
    expect(connector.searchDevices).not.toHaveBeenCalled();
    expect(connector.connect).not.toHaveBeenCalled();
    expect(connector.call).not.toHaveBeenCalled();
  });

  it('never allows debug roots in a server-challenge reward flow', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.verifyDeviceAuthenticity('safe-7', {
      challenge: 'ab'.repeat(32),
      dangerouslyAllowDebugKeys: true,
    });

    expect(result).toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.InvalidParams,
        error: 'Debug attestation roots cannot be used with a server challenge',
        recovery: { scope: 'not-recoverable' },
      },
    });
    expect(connector.connect).not.toHaveBeenCalled();
  });

  it('retires an older interaction when the same target is selected again', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const first = await adapter.connectDevice('safe-7');
    const second = await adapter.connectDevice('safe-7');
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (!first.success || !second.success) return;

    const oldInfo = await adapter.getDeviceInfo(first.payload, '');
    expect(oldInfo.success).toBe(false);
    if (!oldInfo.success) {
      expect(oldInfo.payload.code).toBe(HardwareErrorCode.InteractionEnded);
    }
    await expect(adapter.getDeviceInfo(second.payload, '')).resolves.toEqual({
      success: true,
      payload: expect.objectContaining({ connectId: 'safe-7' }),
    });
  });

  it('does not disconnect the replacement interaction when the retired owner ends late', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const first = await adapter.connectDevice('safe-7');
    const second = await adapter.connectDevice('safe-7');
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (!first.success || !second.success) return;
    jest.clearAllMocks();

    await adapter.releaseInteraction(first.payload);

    expect(connector.disconnect).not.toHaveBeenCalled();
    await expect(adapter.getDeviceInfo(second.payload, '')).resolves.toEqual({
      success: true,
      payload: expect.objectContaining({ connectId: 'safe-7' }),
    });

    await adapter.releaseInteraction(second.payload);
    expect(connector.disconnect).toHaveBeenCalledWith('safe-7-session');
  });

  it('rejects conflicting positional and common interaction ids', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const first = await adapter.connectDevice('safe-7');
    const second = await adapter.connectDevice('safe-5');
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (!first.success || !second.success) return;
    jest.clearAllMocks();

    const result = await adapter.evmGetAddress(first.payload, 'trezor-1', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
      interactionId: second.payload,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.payload.code).toBe(HardwareErrorCode.InvalidParams);
    }
    expect(connector.call).not.toHaveBeenCalled();
  });

  it('rejects a different physical device before executing a wallet method', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.evmGetAddress('safe-7', 'different-trezor', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.payload).toMatchObject({
        code: HardwareErrorCode.DeviceMismatch,
        params: { expected: 'different-trezor', actual: 'safe-7' },
      });
    }
    expect(connector.call).not.toHaveBeenCalled();
  });

  it('finds the expected serialless USB device before an operation-first wallet call', async () => {
    const connector = createSeriallessUsbConnector();
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'v1' })
      .mockResolvedValueOnce({ address: '0x1234' });
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.evmGetAddress('', 'expected-device-id', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });

    expect(connector.connect).toHaveBeenNthCalledWith(1, 'trezor-webusb-1209-53c1-0', {
      transportType: 'usb',
    });
    expect(connector.disconnect).toHaveBeenCalledWith('trezor-webusb-1209-53c1-0-session');
    expect(connector.connect).toHaveBeenNthCalledWith(2, 'trezor-webusb-1209-53c1-1', {
      transportType: 'usb',
    });
    expect(result).toEqual({
      success: true,
      payload: { address: '0x1234' },
    });
    expect(connector.call).toHaveBeenCalledWith(
      'trezor-webusb-1209-53c1-1-session',
      'evmGetAddress',
      expect.any(Object)
    );
  });

  it('keeps an all-network operation on the serialless USB device selected by identity', async () => {
    const connector = createSeriallessUsbConnector();
    (connector.call as CallMock)
      .mockResolvedValueOnce({ device_id: 'expected-device-id' })
      .mockResolvedValueOnce({ protocol: 'v1' })
      .mockResolvedValueOnce({ address: '0x1234', path: "m/44'/60'/0'/0/0" });
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.allNetworkGetAddress('', 'expected-device-id', {
      useEmptyPassphrase: true,
      bundle: [
        {
          network: 'eth',
          methodName: 'evmGetAddress',
          path: "m/44'/60'/0'/0/0",
          showOnDevice: false,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(connector.disconnect).toHaveBeenCalledWith('trezor-webusb-1209-53c1-0-session');
    expect((connector.call as CallMock).mock.calls.map(([sessionId]) => sessionId)).toEqual([
      'trezor-webusb-1209-53c1-1-session',
      'trezor-webusb-1209-53c1-1-session',
      'trezor-webusb-1209-53c1-1-session',
    ]);
  });

  it('does not open another serialless candidate after connector initialization fails', async () => {
    const connector = createSeriallessUsbConnector();
    (connector.connect as ConnectMock).mockReset().mockRejectedValueOnce(
      Object.assign(new Error('first candidate transport failed'), {
        code: HardwareErrorCode.TransportError,
      })
    );
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.evmGetAddress('', 'expected-device-id', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.TransportError },
    });
    expect(connector.connect).toHaveBeenCalledTimes(1);
    expect(connector.connect).toHaveBeenCalledWith('trezor-webusb-1209-53c1-0', {
      transportType: 'usb',
    });
    expect(connector.call).not.toHaveBeenCalled();
  });

  it('finds the expected serialless USB device before a device-manager mutation', async () => {
    const connector = createSeriallessUsbConnector();
    (connector.call as CallMock).mockResolvedValueOnce({ message: 'Success' });
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.changePin(
      '',
      { remove: false },
      {
        expectedDeviceIdentity: {
          vendor: 'trezor',
          type: 'deviceId',
          value: 'expected-device-id',
        },
      }
    );

    expect(result).toEqual({ success: true, payload: { message: 'Success' } });
    expect(connector.disconnect).toHaveBeenCalledWith('trezor-webusb-1209-53c1-0-session');
    expect(connector.call).toHaveBeenCalledWith('trezor-webusb-1209-53c1-1-session', 'changePin', {
      remove: false,
    });
  });

  it('ends a pinned interaction when its transport disconnects without reconnecting', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('safe-7');
    expect(connected.success).toBe(true);
    if (!connected.success) return;
    (connector.call as CallMock).mockRejectedValueOnce(
      Object.assign(new Error('disconnected'), {
        code: HardwareErrorCode.DeviceDisconnected,
      })
    );
    jest.clearAllMocks();

    const result = await adapter.evmGetAddress(connected.payload, '', {
      path: "m/44'/60'/0'/0/0",
      interactionId: connected.payload,
      useEmptyPassphrase: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.payload.code).toBe(HardwareErrorCode.InteractionEnded);
    }
    expect(connector.searchDevices).not.toHaveBeenCalled();
    expect(connector.connect).not.toHaveBeenCalled();
  });

  it('cancels the active job without terminating its interaction', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('safe-7');
    expect(connected.success).toBe(true);
    if (!connected.success) return;

    adapter.cancel(connected.payload);

    expect(connector.cancel).toHaveBeenCalledWith('safe-7-session');
    const info = await adapter.getDeviceInfo(connected.payload, '');
    expect(info.success).toBe(true);
    await adapter.releaseInteraction(connected.payload);
  });

  it('maps WebUSB transfer errors during connect to TransportError', async () => {
    const connector = createConnector();
    (connector.connect as ConnectMock).mockRejectedValueOnce(
      new Error("Failed to execute 'transferIn' on 'USBDevice': A transfer error has occurred.")
    );
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.connectDevice('safe-7');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.payload.code).toBe(HardwareErrorCode.TransportError);
      expect(result.payload.error).toContain('transferIn');
    }
  });

  it('retries once when an interrupted THP handshake leaves one malformed frame', async () => {
    const connector = createConnector();
    (connector.connect as ConnectMock).mockRejectedValueOnce(
      Object.assign(new Error('Malformed protocol format'), {
        name: 'TrezorProtocolError',
        code: 'Malformed protocol format',
      })
    );
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.connectDevice('safe-7');
    expect(result).toEqual({
      success: true,
      payload: expect.any(String),
    });
    if (result.success) {
      expect(parseHardwareRuntimeId(result.payload)).toMatchObject({
        kind: 'interaction',
        vendor: 'trezor',
      });
    }
    expect(connector.connect).toHaveBeenCalledTimes(2);
  });

  it('does not retry unrelated Trezor protocol errors', async () => {
    const connector = createConnector();
    (connector.connect as ConnectMock).mockRejectedValueOnce(
      Object.assign(new Error('Unexpected protocol version'), {
        name: 'TrezorProtocolError',
        code: 'Unexpected protocol version',
      })
    );
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.connectDevice('safe-7');

    expect(result.success).toBe(false);
    expect(connector.connect).toHaveBeenCalledTimes(1);
  });

  it('emits request and failed response logs with the device error details', async () => {
    const connector = createConnector();
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty' })
      .mockRejectedValueOnce(
        Object.assign(new Error('Failure_ActionCancelled'), {
          code: 'Failure_ActionCancelled',
        })
      );
    const logs: string[] = [];
    const unsubscribe = onSdkEvent(event => {
      if (event.type === 'log') {
        logs.push(event.message);
      }
    });
    const adapter = new TrezorAdapter(connector);

    try {
      const result = await adapter.btcSignMessage('safe-7', 'safe-7', {
        path: "m/84'/0'/0'/0/0",
        coin: 'Bitcoin',
        message: 'hello',
        useEmptyPassphrase: true,
      });

      expect(result).toMatchObject({
        success: false,
        payload: {
          code: HardwareErrorCode.UserRejected,
          error: 'Failure_ActionCancelled',
          origin: 'device',
        },
      });
      expect(logs.some(log => log.includes('[TrezorAdapter][REQ]'))).toBe(true);
      expect(logs.some(log => log.includes('"method":"btcSignMessage"'))).toBe(true);
      // Signing bodies are redacted wholesale (aligned with hd-core logBlockEvent).
      expect(logs.some(log => log.includes('"message":"hello"'))).toBe(false);
      expect(logs.some(log => log.includes('"params":"[redacted]"'))).toBe(true);
      expect(logs.some(log => log.includes('[TrezorAdapter][RES]'))).toBe(true);
      expect(logs.some(log => log.includes('"success":false'))).toBe(true);
      expect(logs.some(log => log.includes('[TrezorAdapter][ERROR]'))).toBe(true);
      expect(logs.some(log => log.includes('"code":"Failure_ActionCancelled"'))).toBe(true);
      expect(logs.some(log => log.includes('Failure_ActionCancelled'))).toBe(true);
    } finally {
      unsubscribe();
    }
  });

  it('maps Trezor response-only action cancel failures to UserRejected', async () => {
    const connector = createConnector();
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty' })
      .mockRejectedValueOnce(
        Object.assign(new Error('Cancelled'), {
          name: 'TrezorFailureError',
          response: {
            type: 'Failure',
            message: {
              code: 'Failure_ActionCancelled',
              message: 'Cancelled',
            },
          },
        })
      );
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.evmSignTransaction('safe-7', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      to: '0x2222222222222222222222222222222222222222',
      value: '0x0',
      nonce: '0x0',
      gasLimit: '0xea60',
      gasPrice: '0x04a817c800',
      chainId: 1,
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: {
        code: HardwareErrorCode.UserRejected,
        error: 'Cancelled',
        origin: 'device',
      },
    });
  });

  it('maps unsupported Trezor script type failures to MethodNotSupported', async () => {
    const connector = createConnector();
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty' })
      .mockRejectedValueOnce(
        Object.assign(new Error('Unsupported script type'), {
          name: 'TrezorFailureError',
          response: {
            type: 'Failure',
            message: {
              code: 'Failure_ProcessError',
              message: 'Unsupported script type',
            },
          },
        })
      );
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.btcSignMessage('safe-7', 'safe-7', {
      path: "m/86'/0'/0'/0/0",
      coin: 'Bitcoin',
      message: 'hello',
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: {
        code: HardwareErrorCode.MethodNotSupported,
        error: 'Unsupported script type',
        origin: 'host',
      },
    });
  });

  it('maps Trezor forbidden key path failures to DevicePathForbidden', async () => {
    const connector = createConnector();
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty' })
      .mockRejectedValueOnce(
        Object.assign(new Error('Forbidden key path'), {
          name: 'TrezorFailureError',
          response: {
            type: 'Failure',
            message: {
              code: 'Failure_DataError',
              message: 'Forbidden key path',
            },
          },
        })
      );
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.btcSignMessage('safe-7', 'safe-7', {
      path: "m/86'/0'/0'/0/0",
      coin: 'Bitcoin',
      message: 'hello',
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: {
        code: HardwareErrorCode.DevicePathForbidden,
        error: 'Forbidden key path',
        origin: 'device',
      },
    });
  });

  it('maps a device-enforced on-device passphrase failure to PassphraseAlwaysOnDevice', async () => {
    const alwaysOnDevice =
      'Providing passphrase in message is not allowed when PASSPHRASE_ALWAYS_ON_DEVICE is True.';
    const connector = createConnector();
    (connector.call as CallMock).mockRejectedValueOnce(
      Object.assign(new Error(alwaysOnDevice), {
        name: 'TrezorFailureError',
        response: {
          type: 'Failure',
          message: { code: 'Failure_DataError', message: alwaysOnDevice },
        },
      })
    );
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.btcSignMessage('safe-7', 'safe-7', {
      path: "m/86'/0'/0'/0/0",
      coin: 'Bitcoin',
      message: 'hello',
      useEmptyPassphrase: true,
    });

    expect(result).toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.PassphraseAlwaysOnDevice,
        error: alwaysOnDevice,
        recovery: { scope: 'unknown' },
      },
    });
  });

  it('maps Trezor firmware errors to MethodNotSupported', async () => {
    const connector = createConnector();
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty' })
      .mockRejectedValueOnce(
        Object.assign(new Error('Firmware error'), {
          name: 'TrezorFailureError',
          response: {
            type: 'Failure',
            message: {
              code: 'Failure_FirmwareError',
              message: 'Firmware error',
            },
          },
        })
      );
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.btcSignMessage('safe-7', 'safe-7', {
      path: "m/86'/0'/0'/0/0",
      coin: 'Bitcoin',
      message: 'hello',
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: {
        code: HardwareErrorCode.MethodNotSupported,
        error: 'Firmware error',
        origin: 'host',
      },
    });
  });

  it('maps Trezor unexpected-message failures to MethodNotSupported', async () => {
    const connector = createConnector();
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty' })
      .mockRejectedValueOnce(
        Object.assign(new Error('Unknown message'), {
          name: 'TrezorFailureError',
          code: 'Failure_UnexpectedMessage',
          response: {
            type: 'Failure',
            message: {
              code: 'Failure_UnexpectedMessage',
              message: 'Unknown message',
            },
          },
        })
      );
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.btcSignMessage('safe-7', 'safe-7', {
      path: "m/86'/0'/0'/0/0",
      coin: 'Bitcoin',
      message: 'hello',
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: {
        code: HardwareErrorCode.MethodNotSupported,
        error: 'Unknown message',
        origin: 'host',
      },
    });
  });

  it('maps Trezor not-initialized failures to DeviceNotInitialized', async () => {
    const connector = createConnector();
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty' })
      .mockRejectedValueOnce(
        Object.assign(new Error('Device is not initialized'), {
          name: 'TrezorFailureError',
          response: {
            type: 'Failure',
            message: {
              code: 'Failure_NotInitialized',
              message: 'Device is not initialized',
            },
          },
        })
      );
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.btcSignMessage('safe-7', 'safe-7', {
      path: "m/86'/0'/0'/0/0",
      coin: 'Bitcoin',
      message: 'hello',
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: {
        code: HardwareErrorCode.DeviceNotInitialized,
        error: 'Device is not initialized',
        origin: 'device',
      },
    });
  });

  it('maps Trezor busy failures to DeviceBusyInternal', async () => {
    const connector = createConnector();
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty' })
      .mockRejectedValueOnce(
        Object.assign(new Error('Device is busy'), {
          name: 'TrezorFailureError',
          response: {
            type: 'Failure',
            message: { code: 'Failure_Busy', message: 'Device is busy' },
          },
        })
      );
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.btcSignMessage('safe-7', 'safe-7', {
      path: "m/86'/0'/0'/0/0",
      coin: 'Bitcoin',
      message: 'hello',
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: {
        code: HardwareErrorCode.DeviceBusyInternal,
        error: 'Device is busy',
        origin: 'device',
      },
    });
  });

  it('maps Trezor PIN mismatch failures to PinMismatch', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock).mockRejectedValueOnce(
      Object.assign(new Error('PIN mismatch'), {
        name: 'TrezorFailureError',
        response: {
          type: 'Failure',
          message: { code: 'Failure_PinMismatch', message: 'PIN mismatch' },
        },
      })
    );

    const result = await adapter.changePin('safe-7', { remove: false });

    expect(result).toMatchObject({
      success: false,
      payload: {
        code: HardwareErrorCode.PinMismatch,
        error: 'PIN mismatch',
        origin: 'device',
      },
    });
  });

  it('returns DeviceNotFound without reconnect UI when target Trezor is unavailable', async () => {
    const connector = createConnector();
    const deviceNotFoundError = Object.assign(new Error('Trezor device not found'), {
      code: HardwareErrorCode.DeviceNotFound,
    });
    (connector.connect as ConnectMock).mockRejectedValue(deviceNotFoundError);
    const adapter = new TrezorAdapter(connector);
    const requests: unknown[] = [];
    adapter.on(UI_REQUEST.REQUEST_DEVICE_CONNECT, event => {
      requests.push(event);
      adapter.uiResponse({
        type: UI_RESPONSE.RECEIVE_DEVICE_CONNECT,
        payload: { confirmed: true },
      });
    });

    await expect(adapter.connectDevice('safe-7')).resolves.toMatchObject({
      success: false,
      payload: {
        code: HardwareErrorCode.DeviceNotFound,
        error: 'Trezor device not found',
        origin: 'transport',
      },
    });

    expect(connector.connect).toHaveBeenCalledTimes(1);
    expect(requests).toEqual([]);
  });

  it('does not wait for reconnect UI when a chain call cannot find the Trezor', async () => {
    const connector = createConnector();
    const deviceNotFoundError = Object.assign(new Error('Trezor device not found'), {
      code: HardwareErrorCode.DeviceNotFound,
    });
    (connector.connect as ConnectMock).mockRejectedValue(deviceNotFoundError);
    const adapter = new TrezorAdapter(connector);
    try {
      const requests: unknown[] = [];
      adapter.on(UI_REQUEST.REQUEST_DEVICE_CONNECT, event => {
        requests.push(event);
      });

      const result = await adapter.evmGetAddress('safe-7', 'safe-7', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
        useEmptyPassphrase: true,
      });

      expect(result).toMatchObject({
        success: false,
        payload: {
          code: HardwareErrorCode.DeviceNotFound,
          error: 'Trezor device not found',
          origin: 'transport',
        },
      });
      expect(requests).toEqual([]);
      expect(connector.connect).toHaveBeenCalledTimes(1);
    } finally {
      await adapter.dispose();
    }
  });

  it('getFeatures uses active connector session', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock).mockResolvedValueOnce({ device_id: 'trezor-1' });

    await expect(adapter.getFeatures('safe-7')).resolves.toEqual({
      success: true,
      payload: { device_id: 'trezor-1' },
    });
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'getFeatures', {});
  });

  it('maps Trezor THP locked-after-PIN-cancel failure to PinCancelled', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock).mockRejectedValueOnce(
      Object.assign(new Error('Trezor device still locked after PIN attempt'), {
        code: 'Device_InitializeFailed',
      })
    );

    await expect(adapter.getFeatures('safe-7')).resolves.toMatchObject({
      success: false,
      payload: {
        code: HardwareErrorCode.PinCancelled,
        error: 'Trezor device still locked after PIN attempt',
        origin: 'host',
      },
    });
  });

  it('delegates Trezor device settings through dedicated management methods', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock)
      .mockResolvedValueOnce({ message: 'Success' })
      .mockResolvedValueOnce({ message: 'Success' })
      .mockResolvedValueOnce({ message: 'Success' })
      .mockResolvedValueOnce({ message: 'Success' });

    await expect(
      adapter.deviceSettings('safe-7', {
        use_passphrase: false,
        haptic_feedback: true,
      })
    ).resolves.toEqual({
      success: true,
      payload: { message: 'Success' },
    });
    await adapter.setBrightness('safe-7', { value: 128 });
    await adapter.changePin('safe-7', { remove: true });
    await adapter.wipeDevice('safe-7');

    expect(connector.call).toHaveBeenNthCalledWith(1, 'safe-7-session', 'deviceSettings', {
      use_passphrase: false,
      haptic_feedback: true,
    });
    expect(connector.call).toHaveBeenNthCalledWith(2, 'safe-7-session', 'setBrightness', {
      value: 128,
    });
    expect(connector.call).toHaveBeenNthCalledWith(3, 'safe-7-session', 'changePin', {
      remove: true,
    });
    expect(connector.call).toHaveBeenNthCalledWith(4, 'safe-7-session', 'wipeDevice', {});
  });

  it('rejects a device-manager mutation on a different physical Trezor', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    jest.clearAllMocks();

    const result = await adapter.changePin(
      'safe-7',
      { remove: false },
      {
        expectedDeviceIdentity: {
          vendor: 'trezor',
          type: 'deviceId',
          value: 'expected-device-id',
        },
      }
    );

    expect(result).toMatchObject({
      success: false,
      payload: {
        code: HardwareErrorCode.DeviceMismatch,
        params: { expected: 'expected-device-id', actual: 'safe-7' },
      },
    });
    expect(connector.call).not.toHaveBeenCalled();
  });

  it('does not reconnect or replay a device-manager mutation after disconnect', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock).mockRejectedValueOnce(
      Object.assign(new Error('Trezor BLE device disconnected'), {
        code: HardwareErrorCode.DeviceDisconnected,
      })
    );
    (connector.connect as ConnectMock).mockResolvedValueOnce({
      sessionId: 'safe-5-session',
      deviceInfo: {
        vendor: 'trezor',
        model: 'T3T1',
        firmwareVersion: '',
        deviceId: 'safe-5',
        connectId: 'safe-7',
        connectionType: 'ble',
      },
    });

    const result = await adapter.wipeDevice('safe-7', {
      expectedDeviceIdentity: {
        vendor: 'trezor',
        type: 'deviceId',
        value: 'safe-7',
      },
    });

    expect(result).toMatchObject({
      success: false,
      payload: {
        code: HardwareErrorCode.DeviceDisconnected,
        recovery: { scope: 'unknown' },
        params: {
          operationMayHaveCompleted: true,
          method: 'wipeDevice',
        },
      },
    });
    expect(connector.connect).toHaveBeenCalledTimes(1);
    expect(connector.call).toHaveBeenCalledTimes(1);
  });

  it('rejects a non-Trezor identity before a device-manager operation', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);

    const result = await adapter.wipeDevice('safe-7', {
      expectedDeviceIdentity: {
        vendor: 'keystone',
        type: 'walletId',
        value: 'wallet-id',
      },
    });

    expect(result).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.InvalidParams },
    });
    expect(connector.connect).not.toHaveBeenCalled();
    expect(connector.call).not.toHaveBeenCalled();
  });

  it('forwards Trezor features events from connector', () => {
    const connector = createConnector();
    const handlers = new Map<string, (data: unknown) => void>();
    (connector.on as jest.Mock).mockImplementation(
      (event: string, handler: (data: unknown) => void) => {
        handlers.set(event, handler);
      }
    );
    const adapter = new TrezorAdapter(connector);
    const onSupportFeatures = jest.fn();
    adapter.on(DEVICE.FEATURES, onSupportFeatures);

    handlers.get(DEVICE.FEATURES)?.({
      device: {
        connectId: 'safe-7',
        deviceId: 'trezor-device-id',
        name: 'Trezor Safe 7',
        model: 'T3W1',
        features: {
          device_id: 'trezor-device-id',
          model: 'Safe 7',
          internal_model: 'T3W1',
        },
      },
    });

    expect(onSupportFeatures).toHaveBeenCalledWith({
      type: DEVICE.FEATURES,
      device: expect.objectContaining({
        connectId: 'safe-7',
        deviceId: 'trezor-device-id',
        features: expect.objectContaining({
          device_id: 'trezor-device-id',
          internal_model: 'T3W1',
        }),
      }),
      payload: {
        device: expect.objectContaining({
          connectId: 'safe-7',
          deviceId: 'trezor-device-id',
          features: expect.objectContaining({
            device_id: 'trezor-device-id',
            internal_model: 'T3W1',
          }),
        }),
      },
    });
  });

  it('does not expose THP pairing credentials through a public read API', () => {
    const adapter = new TrezorAdapter(createConnector());

    expect(
      (adapter as unknown as { getPersistableDeviceState?: unknown }).getPersistableDeviceState
    ).toBeUndefined();
  });

  it('evmGetAddress delegates to active connector session', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock)
      .mockResolvedValueOnce({
        protocol: 'thp',
        thpSessionId: 'session-empty',
      })
      .mockResolvedValueOnce({
        address: '0x1234567890123456789012345678901234567890',
        path: "m/44'/60'/0'/0/0",
      });

    await expect(
      adapter.evmGetAddress('safe-7', 'safe-7', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
        useEmptyPassphrase: true,
      })
    ).resolves.toEqual({
      success: true,
      payload: {
        address: '0x1234567890123456789012345678901234567890',
        path: "m/44'/60'/0'/0/0",
      },
    });
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'evmGetAddress', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
    });
  });

  it('concurrent first calls share a single connect promise', async () => {
    const connector = createConnector();
    let resolveConnect: (value: Awaited<ReturnType<IConnector['connect']>>) => void = () =>
      undefined;
    (connector.connect as ConnectMock).mockReturnValueOnce(
      new Promise(resolve => {
        resolveConnect = resolve;
      })
    );

    const adapter = new TrezorAdapter(connector);

    const first = adapter.evmGetAddress('safe-7', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });
    const second = adapter.evmGetAddress('safe-7', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });

    // DeviceJobQueue defers the job to a microtask — drain so the first job
    // actually reaches connector.connect() before we assert.
    await new Promise(resolve => setImmediate(resolve));

    // Both calls should be waiting on the same in-flight connect (queue
    // serializes them; only the first reached _ensureSession).
    expect(connector.connect).toHaveBeenCalledTimes(1);

    resolveConnect({
      sessionId: 'safe-7-session',
      deviceInfo: {
        vendor: 'trezor',
        model: 'T3W1',
        firmwareVersion: '',
        deviceId: 'safe-7',
        connectId: 'safe-7',
        connectionType: 'ble',
      },
    });

    await Promise.all([first, second]);
    expect(connector.connect).toHaveBeenCalledTimes(1);
  });

  it('dispose unregisters connector listeners so stale events do not reach the emitter', async () => {
    const connector = createConnector();
    const handlers = new Map<string, Set<(data: unknown) => void>>();
    (connector.on as jest.Mock).mockImplementation(
      (event: string, handler: (data: unknown) => void) => {
        if (!handlers.has(event)) handlers.set(event, new Set());
        handlers.get(event)!.add(handler);
      }
    );
    (connector.off as jest.Mock).mockImplementation(
      (event: string, handler: (data: unknown) => void) => {
        handlers.get(event)?.delete(handler);
      }
    );

    const adapter = new TrezorAdapter(connector);
    const disconnectEvents = jest.fn();
    adapter.on(DEVICE.DISCONNECT, disconnectEvents);

    // Sanity: before dispose, connector events reach the adapter emitter.
    handlers.get('device-disconnect')?.forEach(h => h({ connectId: 'safe-7' }));
    expect(disconnectEvents).toHaveBeenCalledTimes(1);

    await adapter.dispose();

    // After dispose, all four connector listeners should be unregistered.
    expect(handlers.get('device-connect')?.size ?? 0).toBe(0);
    expect(handlers.get('device-disconnect')?.size ?? 0).toBe(0);
    expect(handlers.get('ui-request')?.size ?? 0).toBe(0);
    expect(handlers.get('ui-event')?.size ?? 0).toBe(0);
  });

  it('waits for a cancelled raw connector call before dispose resets the connector', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('safe-7');
    expect(connected.success).toBe(true);
    if (!connected.success) return;
    let resolveRawCall: (value: Record<string, unknown>) => void = () => undefined;
    (connector.call as CallMock).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveRawCall = resolve;
        })
    );
    jest.clearAllMocks();

    const pending = adapter.getFeatures(connected.payload, {
      interactionId: connected.payload,
      expectedDeviceIdentity: {
        vendor: 'trezor',
        type: 'deviceId',
        value: 'safe-7',
      },
    });
    await new Promise(resolve => setImmediate(resolve));
    adapter.cancel(connected.payload);
    await expect(pending).resolves.toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.UserAborted },
    });

    const disposing = adapter.dispose();
    await new Promise(resolve => setImmediate(resolve));
    expect(connector.disconnect).not.toHaveBeenCalled();
    expect(connector.reset).not.toHaveBeenCalled();

    resolveRawCall({ label: 'late result' });
    await disposing;
    expect(connector.disconnect).toHaveBeenCalledWith('safe-7-session');
    expect(connector.reset).toHaveBeenCalledTimes(1);
  });

  it('cancel forwards UI_RESPONSE.CANCEL to the connector', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    adapter.cancel('safe-7');

    expect(connector.uiResponse).toHaveBeenCalledWith({ type: UI_RESPONSE.CANCEL });
    expect(connector.cancel).toHaveBeenCalledWith('safe-7-session');
  });

  it('cancel without connectId broadcasts CANCEL and cancels all sessions', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    adapter.cancel();

    expect(connector.uiResponse).toHaveBeenCalledWith({ type: UI_RESPONSE.CANCEL });
    expect(connector.cancel).toHaveBeenCalledWith('safe-7-session');
  });

  it('getChainFingerprint returns features.device_id (chain-agnostic)', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock).mockResolvedValueOnce({
      device_id: 'trezor-device-uuid-abc',
      vendor: 'trezor.io',
    });

    await expect(
      adapter.getChainFingerprint('safe-7', 'caller-supplied-id', 'evm')
    ).resolves.toEqual({
      success: true,
      payload: 'trezor-device-uuid-abc',
    });
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'getFeatures', {});
  });

  it('getChainFingerprint fails clearly when features lack device_id', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock).mockResolvedValueOnce({ vendor: 'trezor.io' });

    const result = await adapter.getChainFingerprint('safe-7', 'caller-id', 'evm');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.payload.error).toMatch(/device_id/);
      expect(result.payload.code).toBe(HardwareErrorCode.UnknownError);
    }
  });

  it('allNetworkGetAddress returns per-item results with features.device_id fingerprint', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty-1' })
      .mockResolvedValueOnce({
        address: '0x1234567890123456789012345678901234567890',
        path: "m/44'/60'/0'/0/0",
      })
      .mockResolvedValueOnce({ device_id: 'trezor-device-uuid-abc' })
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty-2' })
      .mockResolvedValueOnce({
        xpub: 'xpub...',
        publicKey: '02abcd',
        fingerprint: 123,
        chainCode: '00',
        depth: 3,
        path: "m/44'/0'/0'",
      });

    const result = await adapter.allNetworkGetAddress('safe-7', '', {
      useEmptyPassphrase: true,
      bundle: [
        {
          network: 'eth',
          methodName: 'evmGetAddress',
          path: "m/44'/60'/0'/0/0",
          showOnDevice: false,
        },
        {
          network: 'btc',
          methodName: 'btcGetPublicKey',
          path: "m/44'/0'/0'",
          showOnDevice: false,
        },
        {
          network: 'bad',
          methodName: 'unsupportedMethod',
          path: "m/44'/0'/0'",
        } as never,
      ],
    });

    expect(result).toEqual({
      success: true,
      payload: [
        {
          network: 'eth',
          methodName: 'evmGetAddress',
          path: "m/44'/60'/0'/0/0",
          showOnDevice: false,
          success: true,
          payload: {
            address: '0x1234567890123456789012345678901234567890',
            path: "m/44'/60'/0'/0/0",
            deviceIdentity: {
              vendor: 'trezor',
              type: 'deviceId',
              value: 'trezor-device-uuid-abc',
            },
            chainFingerprint: 'trezor-device-uuid-abc',
            chainFingerprintChain: 'evm',
          },
        },
        {
          network: 'btc',
          methodName: 'btcGetPublicKey',
          path: "m/44'/0'/0'",
          showOnDevice: false,
          coin: 'Bitcoin',
          success: true,
          payload: {
            xpub: 'xpub...',
            publicKey: '02abcd',
            fingerprint: 123,
            chainCode: '00',
            depth: 3,
            path: "m/44'/0'/0'",
            deviceIdentity: {
              vendor: 'trezor',
              type: 'deviceId',
              value: 'trezor-device-uuid-abc',
            },
            chainFingerprint: 'trezor-device-uuid-abc',
            chainFingerprintChain: 'btc',
          },
        },
        {
          network: 'bad',
          methodName: 'unsupportedMethod',
          path: "m/44'/0'/0'",
          success: false,
          payload: {
            code: HardwareErrorCode.InvalidParams,
            error: 'Unsupported allNetwork method: unsupportedMethod',
          },
        },
      ],
    });
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'getFeatures', {});
  });

  it('allNetworkGetAddress aborts the single-chain bundle on DevicePathForbidden without extra round-trips', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty' })
      .mockRejectedValueOnce(
        Object.assign(new Error('Forbidden key path'), {
          name: 'TrezorFailureError',
          response: {
            type: 'Failure',
            message: { code: 'Failure_DataError', message: 'Forbidden key path' },
          },
        })
      );

    const callsBefore = (connector.call as CallMock).mock.calls.length;
    const result = await adapter.allNetworkGetAddress('safe-7', '', {
      useEmptyPassphrase: true,
      bundle: [
        {
          network: 'eth',
          methodName: 'evmGetAddress',
          path: "m/44'/60'/0'/0/0",
          showOnDevice: false,
        },
        {
          network: 'eth',
          methodName: 'evmGetAddress',
          path: "m/44'/60'/0'/0/1",
          showOnDevice: false,
        },
        {
          network: 'eth',
          methodName: 'evmGetAddress',
          path: "m/44'/60'/0'/0/2",
          showOnDevice: false,
        },
      ],
    });

    // First item's forbidden path aborts the whole single-chain bundle.
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.payload.code).toBe(HardwareErrorCode.DevicePathForbidden);
    }
    // Only the first item hit the device (THP session + the rejecting call);
    // items 2 and 3 were never requested.
    const callsAfter = (connector.call as CallMock).mock.calls.length;
    expect(callsAfter - callsBefore).toBe(2);
  });

  it('allNetworkGetAddress aborts every bundle on PassphraseAlwaysOnDevice', async () => {
    const alwaysOnDevice =
      'Providing passphrase in message is not allowed when PASSPHRASE_ALWAYS_ON_DEVICE is True.';
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty' })
      .mockRejectedValueOnce(
        Object.assign(new Error(alwaysOnDevice), {
          name: 'TrezorFailureError',
          response: {
            type: 'Failure',
            message: { code: 'Failure_DataError', message: alwaysOnDevice },
          },
        })
      );

    const callsBefore = (connector.call as CallMock).mock.calls.length;
    const result = await adapter.allNetworkGetAddress('safe-7', '', {
      useEmptyPassphrase: true,
      bundle: [
        {
          network: 'eth',
          methodName: 'evmGetAddress',
          path: "m/44'/60'/0'/0/0",
          showOnDevice: false,
        },
        {
          network: 'sol',
          methodName: 'solGetAddress',
          path: "m/44'/501'/0'/0'",
          showOnDevice: false,
        },
      ],
    });

    expect(result).toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.PassphraseAlwaysOnDevice,
        error: alwaysOnDevice,
        recovery: { scope: 'unknown' },
      },
    });
    expect(ORPHAN_ELIGIBLE_ERROR_CODES).toContain(HardwareErrorCode.PassphraseAlwaysOnDevice);
    const callsAfter = (connector.call as CallMock).mock.calls.length;
    expect(callsAfter - callsBefore).toBe(2);
  });

  it('allNetworkGetAddress keeps a mixed-network bundle alive past DevicePathForbidden', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock).mockImplementation((_session, method) => {
      if (method === 'evmGetAddress') {
        return Promise.reject(
          Object.assign(new Error('Forbidden key path'), {
            name: 'TrezorFailureError',
            response: {
              type: 'Failure',
              message: { code: 'Failure_DataError', message: 'Forbidden key path' },
            },
          })
        );
      }
      if (method === 'solGetAddress') {
        return Promise.resolve({ address: 'sol-address', path: "m/44'/501'/0'/0'" });
      }
      if (method === 'getFeatures') {
        return Promise.resolve({ device_id: 'trezor-device-uuid-abc' });
      }
      return Promise.resolve({ protocol: 'thp', thpSessionId: 'session-empty' });
    });

    const result = await adapter.allNetworkGetAddress('safe-7', '', {
      useEmptyPassphrase: true,
      bundle: [
        {
          network: 'eth',
          methodName: 'evmGetAddress',
          path: "m/44'/60'/0'/0/0",
          showOnDevice: false,
        },
        {
          network: 'sol',
          methodName: 'solGetAddress',
          path: "m/44'/501'/0'/0'",
          showOnDevice: false,
        },
      ],
    });

    // Mixed bundle: the forbidden eth path fails per-item, sol still derives.
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.payload[0]).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DevicePathForbidden },
      });
      expect(result.payload[1]).toMatchObject({
        success: true,
        payload: { address: 'sol-address' },
      });
    }
    const solRequested = (connector.call as CallMock).mock.calls.some(
      call => call[1] === 'solGetAddress'
    );
    expect(solRequested).toBe(true);
  });

  it('allNetworkGetAddress verifies Trezor device_id without the chain fingerprint shim', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (adapter as unknown as { getChainFingerprint?: unknown }).getChainFingerprint = undefined;
    (connector.call as CallMock)
      .mockResolvedValueOnce({ device_id: 'trezor-device-uuid-abc' })
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty' })
      .mockResolvedValueOnce({
        address: '0x1234567890123456789012345678901234567890',
        path: "m/44'/60'/0'/0/0",
      });

    const result = await adapter.allNetworkGetAddress('safe-7', 'trezor-device-uuid-abc', {
      useEmptyPassphrase: true,
      bundle: [
        {
          network: 'eth',
          methodName: 'evmGetAddress',
          path: "m/44'/60'/0'/0/0",
          showOnDevice: false,
        },
      ],
    });

    expect(result).toEqual({
      success: true,
      payload: [
        {
          network: 'eth',
          methodName: 'evmGetAddress',
          path: "m/44'/60'/0'/0/0",
          showOnDevice: false,
          success: true,
          payload: {
            address: '0x1234567890123456789012345678901234567890',
            path: "m/44'/60'/0'/0/0",
            deviceIdentity: {
              vendor: 'trezor',
              type: 'deviceId',
              value: 'trezor-device-uuid-abc',
            },
            chainFingerprint: 'trezor-device-uuid-abc',
            chainFingerprintChain: 'evm',
          },
        },
      ],
    });
    expect(connector.call).toHaveBeenNthCalledWith(1, 'safe-7-session', 'getFeatures', {});
    expect(connector.call).toHaveBeenNthCalledWith(2, 'safe-7-session', '__thpCreateSession', {
      passphraseMode: 'empty',
    });
    expect(connector.call).toHaveBeenNthCalledWith(3, 'safe-7-session', 'evmGetAddress', {
      network: 'eth',
      methodName: 'evmGetAddress',
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
    });
  });

  it('allNetworkGetAddress adds Trezor BTC coin params from network', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty-1' })
      .mockResolvedValueOnce({
        address: 'ltc-address',
        path: "m/84'/2'/0'/0/0",
      })
      .mockResolvedValueOnce({ device_id: 'trezor-device-uuid-abc' })
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty-2' })
      .mockResolvedValueOnce({
        xpub: 'doge-xpub',
        publicKey: '02abcd',
        fingerprint: 123,
        chainCode: '00',
        depth: 3,
        path: "m/44'/3'/0'",
      });

    await adapter.allNetworkGetAddress('safe-7', '', {
      useEmptyPassphrase: true,
      bundle: [
        {
          network: 'ltc',
          methodName: 'btcGetAddress',
          path: "m/84'/2'/0'/0/0",
          showOnDevice: false,
        },
        {
          network: 'doge',
          methodName: 'btcGetPublicKey',
          path: "m/44'/3'/0'",
          showOnDevice: false,
        },
      ],
    });

    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'btcGetAddress', {
      network: 'ltc',
      methodName: 'btcGetAddress',
      path: "m/84'/2'/0'/0/0",
      showOnDevice: false,
      coin: 'Litecoin',
    });
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'btcGetPublicKey', {
      network: 'doge',
      methodName: 'btcGetPublicKey',
      path: "m/44'/3'/0'",
      showOnDevice: false,
      coin: 'Dogecoin',
    });
  });

  it('allNetworkGetAddress applies request-level passphrase params without leaking them to item calls', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const logs: string[] = [];
    const unsubscribe = onSdkEvent(event => {
      if (event.type === 'log') {
        logs.push(event.message);
      }
    });
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-hidden' })
      .mockResolvedValueOnce({ publicKey: 'aabbccdd' })
      .mockResolvedValueOnce({
        address: '0x1234567890123456789012345678901234567890',
        path: "m/44'/60'/0'/0/0",
      })
      .mockResolvedValueOnce({ device_id: 'trezor-device-uuid-abc' });

    try {
      const result = await adapter.allNetworkGetAddress('safe-7', '', {
        passphraseState: 'aabbccdd',
        useEmptyPassphrase: false,
        bundle: [
          {
            network: 'eth',
            methodName: 'evmGetAddress',
            path: "m/44'/60'/0'/0/0",
            showOnDevice: false,
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload[0]).not.toHaveProperty('passphraseState');
        expect(result.payload[0]).not.toHaveProperty('useEmptyPassphrase');
      }
      expect(logs.some(log => log.includes('"passphraseState":"[redacted]"'))).toBe(true);
      expect(logs.some(log => log.includes('aabbccdd'))).toBe(false);
    } finally {
      unsubscribe();
    }
    expect(connector.call).toHaveBeenNthCalledWith(1, 'safe-7-session', '__thpCreateSession', {
      passphraseMode: 'prompt',
    });
    expect(connector.call).toHaveBeenNthCalledWith(2, 'safe-7-session', 'btcGetPublicKey', {
      path: "m/44'/0'/0'",
      showOnDevice: false,
    });
    expect(connector.call).toHaveBeenNthCalledWith(3, 'safe-7-session', 'evmGetAddress', {
      network: 'eth',
      methodName: 'evmGetAddress',
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
    });
    expect(connector.call).toHaveBeenNthCalledWith(4, 'safe-7-session', 'getFeatures', {});
  });

  it('allNetworkGetAddress verifies expected Trezor device_id before address calls', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock).mockResolvedValueOnce({
      device_id: 'actual-device-id',
    });

    const result = await adapter.allNetworkGetAddress('safe-7', 'expected-device-id', {
      bundle: [
        {
          network: 'eth',
          methodName: 'evmGetAddress',
          path: "m/44'/60'/0'/0/0",
          showOnDevice: true,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.payload.code).toBe(HardwareErrorCode.DeviceMismatch);
      expect(result.payload.params).toEqual({
        expected: 'expected-device-id',
        actual: 'actual-device-id',
      });
    }
    expect(connector.call).toHaveBeenCalledTimes(1);
    expect(connector.call).toHaveBeenCalledWith('safe-7-session', 'getFeatures', {});
  });

  it('uses batch BLE context and keeps host fields out of firmware calls', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    (connector.call as CallMock).mockImplementation(async (_session, method) => {
      if (method === 'getFeatures') return { device_id: 'safe-7' };
      if (method === 'createAppSession') return { protocol: 'v1' };
      return { address: 'verified-address' };
    });
    const result = await adapter.allNetworkGetAddress('stale-usb', 'safe-7', {
      useEmptyPassphrase: true,
      knownConnections: [{ transport: 'ble', connectId: 'safe-7' }],
      extra: { dbDeviceId: 'trezor-db' },
      allowDeviceSelection: false,
      bundle: [{ network: 'evm', methodName: 'evmGetAddress', path: "m/44'/60'/0'/0/0" }],
    });
    expect(result.success).toBe(true);
    expect(connector.connect).toHaveBeenCalledTimes(1);
    expect(connector.connect).toHaveBeenCalledWith('safe-7', { transportType: 'ble' });
    expect(connector.searchDevices).not.toHaveBeenCalled();
    for (const call of (connector.call as CallMock).mock.calls) {
      expect(call[0]).toBe('safe-7-session');
      expect(call[2]).not.toHaveProperty('extra');
      expect(call[2]).not.toHaveProperty('knownConnections');
      expect(call[2]).not.toHaveProperty('bundle');
    }
  });

  it('does not reconnect for batch identity after a successful address loses its connection', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    const disconnected = (connector.on as jest.Mock).mock.calls.find(
      ([event]) => event === 'device-disconnect'
    )?.[1] as (data: { connectId: string }) => void;
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'v1' })
      .mockImplementationOnce(async () => {
        disconnected({ connectId: 'safe-7' });
        return { address: 'verified-address' };
      });
    const result = await adapter.allNetworkGetAddress('safe-7', '', {
      useEmptyPassphrase: true,
      bundle: [{ network: 'evm', methodName: 'evmGetAddress', path: "m/44'/60'/0'/0/0" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.payload.code).toBe(HardwareErrorCode.DeviceDisconnected);
    expect(connector.connect).toHaveBeenCalledTimes(1);
    expect(connector.call).toHaveBeenCalledTimes(2);
  });

  it('pins all-network feature and address calls to the common interaction target', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('safe-7');
    expect(connected.success).toBe(true);
    if (!connected.success) return;
    (connector.call as CallMock)
      .mockResolvedValueOnce({
        address: '0x1234567890123456789012345678901234567890',
        path: "m/44'/60'/0'/0/0",
      })
      .mockResolvedValueOnce({ device_id: 'trezor-device-uuid-abc' });

    const result = await adapter.allNetworkGetAddress('stale-or-unrelated-connect-id', '', {
      interactionId: connected.payload,
      bundle: [
        {
          network: 'eth',
          methodName: 'evmGetAddress',
          path: "m/44'/60'/0'/0/0",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(
      (connector.call as CallMock).mock.calls.every(call => call[0] === 'safe-7-session')
    ).toBe(true);
    expect(connector.connect).toHaveBeenCalledTimes(1);
  });

  it('rejects conflicting all-network interaction ids before device I/O', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('safe-7');
    expect(connected.success).toBe(true);
    if (!connected.success) return;
    jest.clearAllMocks();

    const result = await adapter.allNetworkGetAddress(connected.payload, '', {
      interactionId: createHardwareInteractionId('trezor'),
      bundle: [
        {
          network: 'eth',
          methodName: 'evmGetAddress',
          path: "m/44'/60'/0'/0/0",
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.payload.code).toBe(HardwareErrorCode.InvalidParams);
    expect(connector.call).not.toHaveBeenCalled();
    expect(connector.connect).not.toHaveBeenCalled();
  });

  it('searchDevices preserves currently-connected devices that the rescan missed', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    // Rescan finds a different device — connected 'safe-7' is missing from scan.
    (connector.searchDevices as SearchDevicesMock).mockResolvedValueOnce([
      { connectId: 'safe-5', deviceId: 'safe-5', name: 'Trezor Safe 5', model: 'T3T1' },
    ]);

    const devices = await adapter.searchDevices();
    const connectIds = devices.map(d => d.connectId).sort();
    expect(connectIds).toEqual(['safe-5', 'safe-7']);

    // Both are queryable via getDeviceInfo
    await expect(adapter.getDeviceInfo('safe-7', 'safe-7')).resolves.toMatchObject({
      success: true,
    });
    await expect(adapter.getDeviceInfo('safe-5', 'safe-5')).resolves.toMatchObject({
      success: true,
    });
  });

  it('passes waitForAllTransports through to the connector search', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);

    await adapter.searchDevices({ waitForAllTransports: true });

    expect(connector.searchDevices).toHaveBeenCalledWith({ waitForAll: true });
  });

  it('searchDevices still evicts scanned-missing devices with no active session', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);

    // First scan populates 'safe-7' (no connect).
    await adapter.searchDevices();

    // Second scan doesn't find 'safe-7'; it should be evicted since no session.
    (connector.searchDevices as SearchDevicesMock).mockResolvedValueOnce([]);
    const devices = await adapter.searchDevices();
    expect(devices).toHaveLength(0);
  });

  it('ends a one-shot call on DeviceDisconnected without a fresh session', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    const disconnectError = Object.assign(new Error('Trezor BLE device disconnected'), {
      code: HardwareErrorCode.DeviceDisconnected,
    });
    (connector.call as CallMock)
      .mockRejectedValueOnce(disconnectError)
      .mockResolvedValueOnce({
        protocol: 'thp',
        thpSessionId: 'session-empty-2',
      })
      .mockResolvedValueOnce({
        address: '0xabc',
        path: "m/44'/60'/0'/0/0",
      });

    const result = await adapter.evmGetAddress('safe-7', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.DeviceDisconnected },
    });
    expect(connector.connect).toHaveBeenCalledTimes(1);
    expect(connector.call).toHaveBeenCalledTimes(1);
  });

  it('does not replay a signing method after an ambiguous disconnect', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'signing-session' })
      .mockRejectedValueOnce(
        Object.assign(new Error('Trezor BLE device disconnected'), {
          code: HardwareErrorCode.DeviceDisconnected,
        })
      );

    const result = await adapter.evmSignMessage('safe-7', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      message: 'hello',
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: {
        code: HardwareErrorCode.DeviceDisconnected,
        recovery: { scope: 'unknown' },
        params: {
          operationMayHaveCompleted: true,
          method: 'evmSignMessage',
        },
      },
    });
    expect(connector.connect).toHaveBeenCalledTimes(1);
    expect(connector.call).toHaveBeenCalledTimes(2);
  });

  it('ends a pinned signing interaction with an ambiguous-operation marker', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('safe-7');
    expect(connected.success).toBe(true);
    if (!connected.success) return;
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'signing-session' })
      .mockRejectedValueOnce(
        Object.assign(new Error('Trezor BLE device disconnected'), {
          code: HardwareErrorCode.DeviceDisconnected,
        })
      );

    const result = await adapter.evmSignMessage(connected.payload, 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      message: 'hello',
      interactionId: connected.payload,
      useEmptyPassphrase: true,
    });

    expect(result).toMatchObject({
      success: false,
      payload: {
        code: HardwareErrorCode.InteractionEnded,
        recovery: { scope: 'unknown' },
        params: {
          interactionId: connected.payload,
          operationMayHaveCompleted: true,
          method: 'evmSignMessage',
        },
      },
    });
    expect(connector.connect).toHaveBeenCalledTimes(1);
    expect(connector.call).toHaveBeenCalledTimes(2);
  });

  it('never probes a replacement physical device after a one-shot call disconnects', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    (connector.call as CallMock).mockRejectedValueOnce(
      Object.assign(new Error('Trezor BLE device disconnected'), {
        code: HardwareErrorCode.DeviceDisconnected,
      })
    );
    (connector.connect as ConnectMock).mockResolvedValueOnce({
      sessionId: 'safe-5-session',
      deviceInfo: {
        vendor: 'trezor',
        model: 'T3W1',
        firmwareVersion: '',
        deviceId: 'safe-5',
        connectId: 'safe-7',
        connectionType: 'ble',
      },
    });

    const result = await adapter.evmGetAddress('safe-7', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.payload).toMatchObject({
        code: HardwareErrorCode.DeviceDisconnected,
      });
    }
    expect(connector.connect).toHaveBeenCalledTimes(1);
    expect(connector.call).toHaveBeenCalledTimes(1);
  });

  it('surfaces the first business-call disconnect without retrying', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    const disconnectError = Object.assign(new Error('Trezor BLE device disconnected'), {
      code: HardwareErrorCode.DeviceDisconnected,
    });
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty-1' })
      .mockRejectedValueOnce(disconnectError)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'session-empty-2' })
      .mockRejectedValueOnce(disconnectError);

    const result = await adapter.evmGetAddress('safe-7', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.payload.code).toBe(HardwareErrorCode.DeviceDisconnected);
    }
    expect(connector.call).toHaveBeenCalledTimes(2);
    expect(connector.connect).toHaveBeenCalledTimes(1);
  });

  // Upstream switched DeviceJobQueue from per-device-parallel with preemption
  // to global FIFO with rejectIfBusy. The two replacement cases below pin the
  // new contract — anything that used to rely on preemption needs to live at
  // the application layer now.
  it('rejects a second call while the first is in flight (rejectIfBusy)', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    (connector.call as CallMock).mockImplementationOnce(() => new Promise(() => undefined));

    const first = adapter.evmGetAddress('safe-7', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });
    await new Promise(resolve => setImmediate(resolve));
    const second = await adapter.evmGetAddress('safe-7', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.payload.code).toBe(HardwareErrorCode.DeviceBusyInternal);
    }
    void first; // unhandled by design — first is a never-resolving mock
  });

  it('serializes calls across different devices (single global FIFO queue)', async () => {
    const connector = createConnector();
    (connector.connect as ConnectMock).mockImplementation(async (deviceId?: string) => ({
      sessionId: `${deviceId ?? 'safe-7'}-session`,
      deviceInfo: {
        vendor: 'trezor',
        model: 'T3W1',
        firmwareVersion: '',
        deviceId: deviceId ?? 'safe-7',
        connectId: deviceId ?? 'safe-7',
        connectionType: 'ble',
      },
    }));

    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');
    await adapter.connectDevice('safe-5');

    // First call hangs; second call is rejected immediately because the
    // queue is busy. (Pre-upstream-rewrite this would have run in parallel.)
    (connector.call as CallMock).mockImplementationOnce(() => new Promise(() => undefined));

    const first = adapter.evmGetAddress('safe-7', 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });
    await new Promise(resolve => setImmediate(resolve));
    const second = await adapter.evmGetAddress('safe-5', 'safe-5', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.payload.code).toBe(HardwareErrorCode.DeviceBusyInternal);
    }
    void first;
  });

  it('cancel aborts an in-flight call via forceCancelActive', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('safe-7');
    expect(connected.success).toBe(true);
    if (!connected.success) return;

    (connector.call as CallMock).mockImplementationOnce(() => new Promise(() => undefined));

    const inFlight = adapter.evmGetAddress(connected.payload, 'safe-7', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
      interactionId: connected.payload,
    });

    // Give the queue time to start the job.
    await new Promise(resolve => setImmediate(resolve));

    adapter.cancel('safe-7');

    const result = await inFlight;
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.payload.code).toBe(HardwareErrorCode.UserAborted);
    }
    expect((await adapter.getDeviceInfo(connected.payload, '')).success).toBe(true);
  });

  it('does not overlap a retry with a connector call that outlived cancellation', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('safe-7');
    expect(connected.success).toBe(true);
    if (!connected.success) return;

    let resolveRawCall: (value: unknown) => void = () => undefined;
    (connector.call as CallMock).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveRawCall = resolve;
        })
    );
    const inFlight = adapter.getFeatures(connected.payload, {
      interactionId: connected.payload,
    });
    await new Promise(resolve => setImmediate(resolve));

    adapter.cancel(connected.payload);
    const cancelled = await inFlight;
    expect(cancelled).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.UserAborted },
    });

    const earlyRetry = await adapter.getFeatures(connected.payload, {
      interactionId: connected.payload,
    });
    expect(earlyRetry).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.DeviceBusyInternal },
    });
    expect(connector.call).toHaveBeenCalledTimes(1);

    resolveRawCall({ device_id: 'safe-7' });
    await new Promise(resolve => setImmediate(resolve));
    const settledRetry = await adapter.getFeatures(connected.payload, {
      interactionId: connected.payload,
    });
    expect(settledRetry.success).toBe(true);
    expect(connector.call).toHaveBeenCalledTimes(2);
  });

  it('waits for a cancelled raw call before releasing its interaction session', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('safe-7');
    expect(connected.success).toBe(true);
    if (!connected.success) return;

    let resolveRawCall: (value: unknown) => void = () => undefined;
    (connector.call as CallMock).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveRawCall = resolve;
        })
    );
    const inFlight = adapter.getFeatures(connected.payload, {
      interactionId: connected.payload,
    });
    await new Promise(resolve => setImmediate(resolve));
    adapter.cancel(connected.payload);
    await expect(inFlight).resolves.toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.UserAborted },
    });

    const release = adapter.releaseInteraction(connected.payload);
    await new Promise(resolve => setImmediate(resolve));
    expect(connector.disconnect).not.toHaveBeenCalled();
    await expect(adapter.connectDevice('safe-7')).resolves.toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.DeviceBusyInternal },
    });

    resolveRawCall({ device_id: 'safe-7' });
    await release;
    expect(connector.disconnect).toHaveBeenCalledWith('safe-7-session');
    await expect(adapter.connectDevice('safe-7')).resolves.toMatchObject({ success: true });
  });

  it('applies the cancelled-call drain guard to passphrase discovery', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('safe-7');
    expect(connected.success).toBe(true);
    if (!connected.success) return;

    let resolveRawCall: (value: unknown) => void = () => undefined;
    (connector.call as CallMock)
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveRawCall = resolve;
          })
      )
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'passphrase-session' })
      .mockResolvedValueOnce({ publicKey: 'wallet-public-key' })
      .mockResolvedValueOnce({ passphrase_protection: true });

    const inFlight = adapter.getPassphraseState(connected.payload);
    await new Promise(resolve => setImmediate(resolve));
    adapter.cancel(connected.payload);

    const cancelled = await inFlight;
    expect(cancelled).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.UserAborted },
    });

    const earlyRetry = await adapter.getPassphraseState(connected.payload);
    expect(earlyRetry).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.DeviceBusyInternal },
    });
    expect(connector.call).toHaveBeenCalledTimes(1);

    resolveRawCall({ protocol: 'thp', thpSessionId: 'cancelled-session' });
    await new Promise(resolve => setImmediate(resolve));

    const settledRetry = await adapter.getPassphraseState(connected.payload);
    expect(settledRetry).toEqual({ success: true, payload: 'wallet-public-key' });
    expect(connector.call).toHaveBeenCalledTimes(4);
  });

  it('retains a pinned interaction for the complete passphrase discovery job', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('safe-7');
    expect(connected.success).toBe(true);
    if (!connected.success) return;

    const interactions = (
      adapter as unknown as {
        _interactions: {
          retain(interactionId: string): () => void;
        };
      }
    )._interactions;
    const originalRetain = interactions.retain.bind(interactions);
    const release = jest.fn();
    const retain = jest.spyOn(interactions, 'retain').mockImplementation(interactionId => {
      const originalRelease = originalRetain(interactionId);
      return () => {
        release();
        originalRelease();
      };
    });
    (connector.call as CallMock)
      .mockResolvedValueOnce({ protocol: 'thp', thpSessionId: 'passphrase-session' })
      .mockResolvedValueOnce({ publicKey: 'wallet-public-key' })
      .mockResolvedValueOnce({ passphrase_protection: true });

    await expect(
      adapter.getPassphraseState(connected.payload, undefined, {
        expectedDeviceIdentity: { vendor: 'trezor', type: 'deviceId', value: 'safe-7' },
      })
    ).resolves.toEqual({
      success: true,
      payload: 'wallet-public-key',
    });
    expect(retain).toHaveBeenCalledWith(connected.payload);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rejects a pinned passphrase job for another device before wallet calls', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    const connected = await adapter.connectDevice('safe-7');
    if (!connected.success) throw new Error('Test connection failed');
    (connector.call as CallMock).mockClear();
    const result = await adapter.getPassphraseState(connected.payload, undefined, {
      expectedDeviceIdentity: { vendor: 'trezor', type: 'deviceId', value: 'different-device' },
    });
    expect(result).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.DeviceMismatch },
    });
    expect(connector.call).not.toHaveBeenCalled();
    expect(connector.connect).toHaveBeenCalledTimes(1);
  });

  it('does not reconnect while a cancelled raw call is draining after resetState', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    let resolveRawCall: (value: unknown) => void = () => undefined;
    (connector.call as CallMock).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveRawCall = resolve;
        })
    );
    const inFlight = adapter.getFeatures('safe-7');
    await new Promise(resolve => setImmediate(resolve));
    adapter.cancel('safe-7');
    await expect(inFlight).resolves.toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.UserAborted },
    });

    adapter.resetState();
    await expect(adapter.getFeatures('safe-7')).resolves.toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.DeviceBusyInternal },
    });
    expect(connector.connect).toHaveBeenCalledTimes(1);

    resolveRawCall({ device_id: 'safe-7' });
    await new Promise(resolve => setImmediate(resolve));
    await expect(adapter.getFeatures('safe-7')).resolves.toMatchObject({ success: true });
    expect(connector.connect).toHaveBeenCalledTimes(2);
  });

  it('retires a connect that resolves after resetState without overlapping its replacement', async () => {
    const connector = createConnector();
    let resolveConnect: (value: Awaited<ReturnType<IConnector['connect']>>) => void = () =>
      undefined;
    (connector.connect as ConnectMock).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveConnect = resolve;
        })
    );
    const adapter = new TrezorAdapter(connector);

    const first = adapter.connectDevice('safe-7');
    await new Promise(resolve => setImmediate(resolve));
    adapter.resetState();

    await expect(adapter.connectDevice('safe-7')).resolves.toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.DeviceBusyInternal },
    });
    expect(connector.connect).toHaveBeenCalledTimes(1);

    resolveConnect({
      sessionId: 'late-safe-7-session',
      deviceInfo: {
        vendor: 'trezor',
        model: 'T3W1',
        firmwareVersion: '',
        deviceId: 'safe-7',
        connectId: 'safe-7',
        connectionType: 'ble',
      },
    });
    await expect(first).resolves.toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.UserAborted },
    });
    expect(connector.disconnect).toHaveBeenCalledWith('late-safe-7-session');
    await expect(adapter.getDeviceInfo('safe-7', '')).resolves.toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.DeviceNotFound },
    });

    await expect(adapter.connectDevice('safe-7')).resolves.toMatchObject({ success: true });
    expect(connector.connect).toHaveBeenCalledTimes(2);
  });

  it('resetState disconnects the old session before allowing a fresh connection', async () => {
    const connector = createConnector();
    let resolveDisconnect: () => void = () => undefined;
    (connector.disconnect as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          resolveDisconnect = resolve;
        })
    );
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    adapter.resetState();

    await expect(
      adapter.evmGetAddress('safe-7', 'safe-7', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
        useEmptyPassphrase: true,
      })
    ).resolves.toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.DeviceBusyInternal },
    });
    await new Promise(resolve => setImmediate(resolve));
    expect(connector.disconnect).toHaveBeenCalledWith('safe-7-session');
    expect(connector.connect).toHaveBeenCalledTimes(1);

    resolveDisconnect();
    await new Promise(resolve => setImmediate(resolve));
    await expect(
      adapter.evmGetAddress('safe-7', 'safe-7', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
        useEmptyPassphrase: true,
      })
    ).resolves.toMatchObject({ success: true });
    expect(connector.connect).toHaveBeenCalledTimes(2);
  });

  it('search reset waits for the previous session to disconnect before scanning', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    await expect(adapter.searchDevices({ resetSession: true })).resolves.toHaveLength(1);

    expect(connector.disconnect).toHaveBeenCalledWith('safe-7-session');
    expect(connector.searchDevices).toHaveBeenCalledTimes(1);
    await expect(
      adapter.evmGetAddress('safe-7', 'safe-7', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
        useEmptyPassphrase: true,
      })
    ).resolves.toMatchObject({ success: true });
    expect(connector.connect).toHaveBeenCalledTimes(2);
  });

  it('searchDevices fills "unknown" for missing model + firmwareVersion', async () => {
    const connector = createConnector();
    (connector.searchDevices as SearchDevicesMock).mockResolvedValueOnce([
      { connectId: 'mystery-trezor', deviceId: 'mystery-trezor', name: 'Trezor' },
    ]);

    const adapter = new TrezorAdapter(connector);
    const devices = await adapter.searchDevices();

    expect(devices[0]).toMatchObject({
      model: 'unknown',
      firmwareVersion: 'unknown',
    });
  });

  it('searchDevices uses per-device connectionType over the nominal connector value', async () => {
    // A combined USB+BLE connector reports a nominal connectionType (here
    // 'ble') but tags each discovered device with its real transport. The
    // adapter must surface the per-device value so hosts can tell a USB entry
    // from a BLE one (needed by the USB→BLE binding picker), and fall back to
    // the connector's value only when a device is untagged.
    const connector = createConnector(); // connector.connectionType === 'ble'
    (connector.searchDevices as SearchDevicesMock).mockResolvedValueOnce([
      { connectId: 'usb-sn', deviceId: 'dev-1', name: 'Trezor USB', connectionType: 'usb' },
      { connectId: 'ble-mac', deviceId: 'dev-1', name: 'Trezor BLE', connectionType: 'ble' },
      { connectId: 'untagged', deviceId: 'dev-2', name: 'Trezor' },
    ]);

    const adapter = new TrezorAdapter(connector);
    const devices = await adapter.searchDevices();

    const byConnectId = Object.fromEntries(devices.map(d => [d.connectId, d.connectionType]));
    expect(byConnectId['usb-sn']).toBe('usb');
    expect(byConnectId['ble-mac']).toBe('ble');
    // Untagged → falls back to the connector's nominal value.
    expect(byConnectId.untagged).toBe('ble');
  });
});

/**
 * Type-only: Trezor's public method signature must not accept Ledger's
 * whole-RLP shape — the compile error is the first line of defense before
 * the connector's runtime InvalidParams guard (PR #824 review finding).
 */
function typeOnlyTrezorEvmSignTxShape(adapter: TrezorAdapter) {
  void adapter.evmSignTransaction('connect-1', 'device-1', {
    path: "m/44'/60'/0'/0/0",
    // @ts-expect-error Trezor consumes structured fields; serializedTx is Ledger-only.
    serializedTx: '0xdeadbeef',
  });
}
void typeOnlyTrezorEvmSignTxShape;

describe('TrezorAdapter._sanitizeForLog', () => {
  const sanitize = (value: unknown, methodName?: string) =>
    (
      TrezorAdapter as unknown as {
        _sanitizeForLog(v: unknown, m?: string): unknown;
      }
    )._sanitizeForLog(value, methodName) as Record<string, unknown>;

  it('redacts secrets: red-line (pin/passphrase/THP keys) + seed-level', () => {
    const out = sanitize({
      pin: '1234',
      passphrase: 'secret',
      passphraseState: 'st',
      credential: 'c',
      host_static_key: 'hk',
      trezor_static_public_key: 'tk',
      entropy: 'deadbeef',
      mnemonic: 'abandon abandon',
      seed: 'seedhex',
      word: 'abandon',
      words: ['abandon'],
      privateKey: 'pk',
    });
    for (const key of Object.keys(out)) {
      expect(out[key]).toBe('[redacted]');
    }
  });

  it('matches keys after normalization, so snake_case secrets are redacted too', () => {
    const out = sanitize({
      private_key: 'pk',
      chain_code_keep: 'not-sensitive',
      node: { private_key: 'pk2', public_key: 'pub' },
    });
    expect(out.private_key).toBe('[redacted]');
    expect(out.chain_code_keep).toBe('not-sensitive');
    expect((out.node as Record<string, unknown>).private_key).toBe('[redacted]');
    expect((out.node as Record<string, unknown>).public_key).toBe('pub');
  });

  it('summarizes binary values instead of flattening them into index maps', () => {
    const out = sanitize({ definitions: new ArrayBuffer(8), raw: new Uint8Array(4) });
    expect(out.definitions).toBe('[BINARY:8]');
    expect(out.raw).toBe('[BINARY:4]');
  });

  it('redacts a signing method body wholesale (aligned with hd-core logBlockEvent)', () => {
    expect(sanitize({ message: 'hello', address: '0xabc' }, 'evmSignTransaction')).toBe(
      '[redacted]'
    );
    const out = sanitize({ address: '0xabc' }, 'evmGetAddress');
    expect(out.address).toBe('0xabc');
  });

  it('keeps transaction data so a failed sign can still be reproduced', () => {
    const tx = {
      to: '0xabc',
      value: '0x16345785d8a0000',
      data: '0xdeadbeef',
      address: 'bc1qexample',
      path: "m/84'/0'/0'/0/0",
      chainId: 1,
      message: 'hello',
    };
    expect(sanitize({ ...tx })).toEqual(tx);
  });

  it('redacts nested secrets while keeping sibling tx fields', () => {
    const out = sanitize({ params: { mnemonic: 'x', value: '0x1' } });
    const params = out.params as Record<string, unknown>;
    expect(params.mnemonic).toBe('[redacted]');
    expect(params.value).toBe('0x1');
  });
});
