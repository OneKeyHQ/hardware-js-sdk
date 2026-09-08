import {
  DEVICE,
  HardwareErrorCode,
  ORPHAN_ELIGIBLE_ERROR_CODES,
  UI_REQUEST,
  UI_RESPONSE,
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

  it('searches and connects through injected connector', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);

    await expect(adapter.searchDevices()).resolves.toHaveLength(1);
    await expect(adapter.connectDevice('safe-7')).resolves.toEqual({
      success: true,
      payload: 'safe-7',
    });
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
      },
    });
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
      },
    });
    expect(connector.connect).not.toHaveBeenCalled();
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

    await expect(adapter.connectDevice('safe-7')).resolves.toEqual({
      success: true,
      payload: 'safe-7',
    });
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

      expect(result).toEqual({
        success: false,
        payload: {
          code: HardwareErrorCode.UserRejected,
          error: 'Failure_ActionCancelled',
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

    expect(result).toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.UserRejected,
        error: 'Cancelled',
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

    expect(result).toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.MethodNotSupported,
        error: 'Unsupported script type',
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

    expect(result).toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.DevicePathForbidden,
        error: 'Forbidden key path',
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

    expect(result).toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.MethodNotSupported,
        error: 'Firmware error',
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

    expect(result).toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.MethodNotSupported,
        error: 'Unknown message',
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

    expect(result).toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.DeviceNotInitialized,
        error: 'Device is not initialized',
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

    expect(result).toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.DeviceBusyInternal,
        error: 'Device is busy',
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

    expect(result).toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.PinMismatch,
        error: 'PIN mismatch',
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

    await expect(adapter.connectDevice('safe-7')).resolves.toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.DeviceNotFound,
        error: 'Trezor device not found',
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

      const result = await adapter.evmGetAddress('safe-7', 'trezor-1', {
        path: "m/44'/60'/0'/0/0",
        showOnDevice: false,
        useEmptyPassphrase: true,
      });

      expect(result).toEqual({
        success: false,
        payload: {
          code: HardwareErrorCode.DeviceNotFound,
          error: 'Trezor device not found',
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

    await expect(adapter.getFeatures('safe-7')).resolves.toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.PinCancelled,
        error: 'Trezor device still locked after PIN attempt',
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
      adapter.evmGetAddress('safe-7', 'trezor-1', {
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

    const first = adapter.evmGetAddress('safe-7', 'trezor-1', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });
    const second = adapter.evmGetAddress('safe-7', 'trezor-1', {
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

  it('retries once on DeviceDisconnected and succeeds with fresh session', async () => {
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

    const result = await adapter.evmGetAddress('safe-7', 'trezor-1', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });

    expect(result).toEqual({
      success: true,
      payload: { address: '0xabc', path: "m/44'/60'/0'/0/0" },
    });
    // Reconnect happened: connect called once on initial connectDevice + once on retry.
    expect(connector.connect).toHaveBeenCalledTimes(2);
  });

  it('does not infinite-loop: second DeviceDisconnected after retry surfaces failure', async () => {
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

    const result = await adapter.evmGetAddress('safe-7', 'trezor-1', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.payload.code).toBe(HardwareErrorCode.DeviceDisconnected);
    }
    expect(connector.call).toHaveBeenCalledTimes(4);
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

    const first = adapter.evmGetAddress('safe-7', 'trezor-1', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });
    await new Promise(resolve => setImmediate(resolve));
    const second = await adapter.evmGetAddress('safe-7', 'trezor-1', {
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

    const first = adapter.evmGetAddress('safe-7', 'trezor-1', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });
    await new Promise(resolve => setImmediate(resolve));
    const second = await adapter.evmGetAddress('safe-5', 'trezor-2', {
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
    await adapter.connectDevice('safe-7');

    (connector.call as CallMock).mockImplementationOnce(() => new Promise(() => undefined));

    const inFlight = adapter.evmGetAddress('safe-7', 'trezor-1', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });

    // Give the queue time to start the job.
    await new Promise(resolve => setImmediate(resolve));

    adapter.cancel('safe-7');

    const result = await inFlight;
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.payload.code).toBe(HardwareErrorCode.UserAborted);
    }
  });

  it('resetState clears sessions / devices / queues without disposing', async () => {
    const connector = createConnector();
    const adapter = new TrezorAdapter(connector);
    await adapter.connectDevice('safe-7');

    adapter.resetState();

    // After reset, the next call has no cached session — must reconnect.
    await adapter.evmGetAddress('safe-7', 'trezor-1', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
      useEmptyPassphrase: true,
    });
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
