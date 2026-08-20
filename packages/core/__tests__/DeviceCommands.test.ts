import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { DeviceCommands } from '../src/device/DeviceCommands';
import { DEVICE } from '../src/events';
import { LoggerNames, getLogger } from '../src/utils';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const createCommands = () => {
  const commands = Object.create(DeviceCommands.prototype) as DeviceCommands;
  commands.device = {
    clearCancelableAction: jest.fn(),
    isProtocolV2: jest.fn(() => true),
  } as any;
  return commands;
};

describe('DeviceCommands failure mapping', () => {
  it.each(['File already exists', 'NFT already exists'])(
    'maps duplicate file response "%s" to FileAlreadyExists',
    async message => {
      const commands = createCommands();
      await expect(
        commands._filterCommonTypes(
          {
            type: 'Failure',
            message: { code: 'Failure_DataError', message },
          } as any,
          'NFTUpdate'
        )
      ).rejects.toMatchObject({ errorCode: HardwareErrorCode.FileAlreadyExists });
    }
  );

  it('logs passphrase request and canonical response without exposing the passphrase', async () => {
    const commands = createCommands();
    const log = getLogger(LoggerNames.DeviceCommands);
    const coreLog = getLogger(LoggerNames.Core);
    log.messages.length = 0;
    coreLog.messages.length = 0;
    commands.mainId = 'main-id';
    commands.transport = {
      call: jest.fn().mockResolvedValue({
        type: 'Success',
        message: {
          message: 'Passphrase accepted',
        },
      }),
    } as any;

    await expect(
      commands._commonCall('DeviceSessionAskPassphrase', {
        passphrase: 'hidden-wallet-secret',
        on_device: false,
      })
    ).resolves.toMatchObject({ type: 'Success' });

    expect(log.messages.at(-2)?.message).toEqual([
      '[DeviceCommands] [call] Sending',
      'DeviceSessionAskPassphrase',
      {
        passphrase: '[REDACTED]',
        on_device: false,
      },
    ]);
    expect(log.messages.at(-1)?.message).toEqual([
      '_filterCommonTypes: ',
      {
        request: 'DeviceSessionAskPassphrase',
        response: {
          type: 'Success',
          message: {
            message: 'Passphrase accepted',
          },
        },
      },
    ]);
    expect(
      coreLog.messages.some(entry => entry.message[0] === '[DeviceCommands] [call] Received')
    ).toBe(false);
    expect(JSON.stringify([...log.messages, ...coreLog.messages])).not.toContain(
      'hidden-wallet-secret'
    );
  });

  it('redacts passphrases from transport errors logged through Core', async () => {
    const commands = createCommands();
    const log = getLogger(LoggerNames.DeviceCommands);
    const coreLog = getLogger(LoggerNames.Core);
    log.messages.length = 0;
    coreLog.messages.length = 0;
    const transportError = Object.assign(new Error('transport failed'), {
      response: {
        data: {
          passphrase: 'hidden-wallet-secret',
        },
      },
    });
    commands.mainId = 'main-id';
    commands.transport = {
      call: jest.fn().mockRejectedValue(transportError),
    } as any;

    await expect(
      commands._commonCall('DeviceSessionAskPassphrase', {
        passphrase: 'hidden-wallet-secret',
        on_device: false,
      })
    ).rejects.toBe(transportError);

    expect(coreLog.messages.at(-1)?.message).toEqual([
      '[DeviceCommands] [call] Received error',
      {
        request: 'DeviceSessionAskPassphrase',
        errorCode: undefined,
        response: {
          passphrase: '[REDACTED]',
        },
      },
    ]);
    expect(JSON.stringify([...log.messages, ...coreLog.messages])).not.toContain(
      'hidden-wallet-secret'
    );
  });

  it('preserves the Protocol V2 peer-removed pairing error code', async () => {
    const commands = createCommands();
    const transportError = Object.assign(new Error('Peer removed pairing information'), {
      errorCode: HardwareErrorCode.BlePeerRemovedPairingInformation,
    });
    commands.mainId = 'main-id';
    commands.transport = {
      call: jest.fn().mockRejectedValue(transportError),
    } as any;

    await expect(commands._commonCall('DeviceInfoGet', {})).rejects.toBe(transportError);
  });

  it('logs canonical DeviceStatus response fields without exposing the device ID', async () => {
    const commands = createCommands();
    const log = getLogger(LoggerNames.DeviceCommands);
    log.messages.length = 0;
    commands.mainId = 'main-id';
    commands.transport = {
      call: jest.fn().mockResolvedValue({
        type: 'DeviceStatus',
        message: {
          device_id: 'sensitive-device-id',
          unlocked: true,
          init_states: true,
          backup_required: false,
          passphrase_enabled: true,
          attach_to_pin_enabled: false,
          unlocked_by_attach_to_pin: false,
        },
      }),
    } as any;

    await expect(commands._commonCall('DeviceStatusGet', {})).resolves.toMatchObject({
      type: 'DeviceStatus',
    });

    const receivedLog = log.messages.at(-1)?.message;
    expect(receivedLog).toEqual([
      '_filterCommonTypes: ',
      {
        request: 'DeviceStatusGet',
        response: {
          type: 'DeviceStatus',
          message: {
            device_id: '[REDACTED]',
            unlocked: true,
            init_states: true,
            backup_required: false,
            passphrase_enabled: true,
            attach_to_pin_enabled: false,
            unlocked_by_attach_to_pin: false,
          },
        },
      },
    ]);
    expect(JSON.stringify(receivedLog)).not.toContain('sensitive-device-id');
  });

  it('does not log DeviceSessionGet response secrets', async () => {
    const commands = createCommands();
    const log = getLogger(LoggerNames.DeviceCommands);
    log.messages.length = 0;

    await expect(
      commands._filterCommonTypes(
        {
          type: 'DeviceSession',
          message: {
            session_id: 'secret-session-id',
            btc_test_address: 'secret-wallet-address',
          },
        } as any,
        'DeviceSessionGet'
      )
    ).resolves.toMatchObject({ type: 'DeviceSession' });

    expect(JSON.stringify(log.messages)).not.toContain('secret-session-id');
    expect(JSON.stringify(log.messages)).not.toContain('secret-wallet-address');
  });

  it('logs the sanitized DeviceInfo response payload', async () => {
    const commands = createCommands();
    const log = getLogger(LoggerNames.DeviceCommands);
    log.messages.length = 0;

    await expect(
      commands._filterCommonTypes(
        {
          type: 'DeviceInfo',
          message: {
            protocol_version: 2,
            hw: {
              Device_type: 7,
              hardware_version: '1.0.0',
            },
            main_mcu: {
              application: {
                version: '5.0.0',
                build_id: '20260811',
                hash: 'firmware-hash',
              },
            },
          },
        } as any,
        'DeviceInfoGet'
      )
    ).resolves.toMatchObject({ type: 'DeviceInfo' });

    expect(log.messages.at(-1)?.message).toEqual([
      '_filterCommonTypes: ',
      {
        request: 'DeviceInfoGet',
        response: {
          type: 'DeviceInfo',
          message: {
            protocol_version: 2,
            hw: {
              Device_type: 7,
              hardware_version: '1.0.0',
            },
            main_mcu: {
              application: {
                version: '5.0.0',
                build_id: '20260811',
                hash: 'firmware-hash',
              },
            },
          },
        },
      },
    ]);
  });

  it('logs the sanitized DeviceFirmwareUpdateStatus response payload', async () => {
    const commands = createCommands();
    const log = getLogger(LoggerNames.DeviceCommands);
    log.messages.length = 0;

    await expect(
      commands._filterCommonTypes(
        {
          type: 'DeviceFirmwareUpdateStatus',
          message: {
            records: [
              {
                target_id: 4,
                status: 2,
                payload_version: 0x010203,
                path: 'vol0:/application_p1.bin',
              },
            ],
          },
        } as any,
        'DeviceFirmwareUpdateStatusGet'
      )
    ).resolves.toMatchObject({ type: 'DeviceFirmwareUpdateStatus' });

    expect(log.messages.at(-1)?.message).toEqual([
      '_filterCommonTypes: ',
      {
        request: 'DeviceFirmwareUpdateStatusGet',
        response: {
          type: 'DeviceFirmwareUpdateStatus',
          message: {
            records: [
              {
                target_id: 4,
                status: 2,
                payload_version: 0x010203,
                path: 'vol0:/application_p1.bin',
              },
            ],
          },
        },
      },
    ]);
  });

  it.each(['Failure_ProcessError', 5])(
    'maps USB-priority link disabled to public BLE error 723 for code %s',
    async code => {
      const commands = createCommands();

      await expect(
        commands._filterCommonTypes(
          {
            type: 'Failure',
            message: {
              code,
              message: ' link disabled ',
            },
          } as any,
          'DeviceInfo'
        )
      ).rejects.toMatchObject({
        errorCode: HardwareErrorCode.BleUnavailableWhileUsbConnected,
        params: {
          failureCode: code,
          firmwareMessage: ' link disabled ',
        },
      });
    }
  );

  it('maps an invalid DeviceSessionGet resume to WalletSessionInvalid', async () => {
    const commands = createCommands();

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: {
            code: 'Failure_ProcessError',
            subcode: 2,
            message: 'Invalid session',
          },
        } as any,
        'DeviceSessionGet'
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.WalletSessionInvalid,
      params: {
        failureCode: 'Failure_ProcessError',
        subcode: 2,
        firmwareMessage: 'Invalid session',
      },
    });
  });

  it('maps wallet-session user cancellation to ActionCancelled', async () => {
    const commands = createCommands();

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: {
            code: 'Failure_ProcessError',
            subcode: 1,
            message: 'Cancelled on device',
          },
        } as any,
        'DeviceSessionAskPassphrase'
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.ActionCancelled,
    });
  });

  it.each([
    [3, HardwareErrorCode.DeviceCheckUnlockTypeError],
    [4, HardwareErrorCode.DeviceNotOpenedPassphrase],
  ])('maps wallet-session subcode %s to its canonical wallet error', async (subcode, code) => {
    const commands = createCommands();

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: { code: 'Failure_ProcessError', subcode, message: 'Session selection failed' },
        } as any,
        'DeviceSessionAskPin'
      )
    ).rejects.toMatchObject({ errorCode: code });
  });

  it.each([
    ['DeviceSessionGet', 5, 'Another flow in progress'],
    ['DeviceSessionAskPin', 0, 'Busy'],
  ])('maps %s firmware busy failures to DeviceBusy', async (callType, subcode, message) => {
    const commands = createCommands();

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: { code: 'Failure_ProcessError', subcode, message },
        } as any,
        callType
      )
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.DeviceBusy });
  });

  it('maps the current AskPin passphrase-disabled response without relying on a subcode', async () => {
    const commands = createCommands();

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: {
            code: 'Failure_ProcessError',
            subcode: 0,
            message: 'Passphrase disabled',
          },
        } as any,
        'DeviceSessionAskPin'
      )
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.DeviceNotOpenedPassphrase });
  });

  it('rejects the Pro2 bootloader DeviceStatusGet unsupported response', async () => {
    const commands = createCommands();

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: {
            code: 'Failure_InvalidMessage',
            message: 'Handler not registered',
          },
        } as any,
        'DeviceStatusGet'
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
      message: 'Failure_InvalidMessage,Handler not registered',
    });
  });

  it('maps Protocol V2 DeviceLocked failure to a structured hardware error', async () => {
    const commands = createCommands();

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: {
            code: 'Failure_ProcessError',
            subcode: 9,
            message: 'Device locked',
          },
        } as any,
        'DeviceSettingsPageShow'
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceLocked,
      params: {
        failureCode: 'Failure_ProcessError',
        subcode: 9,
        firmwareMessage: 'Device locked',
      },
    });
  });

  it('maps Protocol V2 action-cancelled subcode to the canonical cancellation error', async () => {
    const commands = createCommands();

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: {
            code: 'Failure_ProcessError',
            subcode: 3,
            message: 'Cancelled on device',
          },
        } as any,
        'DeviceSettingsSet'
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.ActionCancelled,
      params: {
        failureCode: 'Failure_ProcessError',
        subcode: 3,
        firmwareMessage: 'Cancelled on device',
      },
    });
  });

  it.each(['Cancelled on device', 'Confirm dismissed', 'Update cancelled'])(
    'maps legacy Protocol V2 cancellation message "%s" without a subcode',
    async message => {
      const commands = createCommands();

      await expect(
        commands._filterCommonTypes(
          {
            type: 'Failure',
            message: {
              code: 'Failure_ProcessError',
              message,
            },
          } as any,
          'DeviceSettingsSet'
        )
      ).rejects.toMatchObject({
        errorCode: HardwareErrorCode.ActionCancelled,
        params: {
          failureCode: 'Failure_ProcessError',
          firmwareMessage: message,
        },
      });
    }
  );

  it.each(['SignTx', 'EthereumSignTypedDataOneKey', 'SolanaSignTx', 'GetAddress'] as const)(
    'does not treat domain-ambiguous Protocol V2 subcode 1 for %s as cancellation',
    async callType => {
      const commands = createCommands();

      await expect(
        commands._filterCommonTypes(
          {
            type: 'Failure',
            message: {
              code: 'Failure_ProcessError',
              subcode: 1,
              message: 'Domain-specific failure',
            },
          } as any,
          callType
        )
      ).rejects.toMatchObject({
        errorCode: HardwareErrorCode.RuntimeError,
      });
    }
  );

  it('does not use the legacy cancellation-message fallback for Protocol V1', async () => {
    const commands = createCommands();
    (commands.device.isProtocolV2 as jest.Mock).mockReturnValue(false);

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: {
            code: 'Failure_ProcessError',
            subcode: 1,
            message: 'Cancelled on device',
          },
        } as any,
        'ApplySettings'
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
    });
  });

  it('maps the DeviceError subcode 1 exception to DeviceBusy', async () => {
    const commands = createCommands();

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: {
            code: 'Failure_ProcessError',
            subcode: 1,
            message: 'Another process error',
          },
        } as any,
        'DeviceSettingsPageShow'
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceBusy,
      params: {
        failureCode: 'Failure_ProcessError',
        subcode: 1,
        firmwareMessage: 'Another process error',
      },
    });
  });

  it.each(['Device locked', 'Device is locked'])(
    'maps legacy Protocol V2 locked message "%s" without a subcode',
    async message => {
      const commands = createCommands();

      await expect(
        commands._filterCommonTypes(
          {
            type: 'Failure',
            message: {
              code: 'Failure_ProcessError',
              message,
            },
          } as any,
          'PortfolioUpdate'
        )
      ).rejects.toMatchObject({
        errorCode: HardwareErrorCode.DeviceLocked,
        params: {
          failureCode: 'Failure_ProcessError',
          firmwareMessage: message,
        },
      });
    }
  );

  it('does not use the legacy locked-message fallback for Protocol V1', async () => {
    const commands = createCommands();
    (commands.device.isProtocolV2 as jest.Mock).mockReturnValue(false);

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: {
            code: 'Failure_ProcessError',
            message: 'Device is locked',
          },
        } as any,
        'ApplySettings'
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
    });
  });

  it.each([
    ['ButtonAck', 'Not in Ethereum signing mode'],
    ['PinMatrixAck', 'Not in Conflux signing mode'],
  ])('keeps %s unexpected message "%s" as firmware runtime error', async (callType, message) => {
    const commands = createCommands();

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: {
            code: 'Failure_UnexpectedMessage',
            message,
          },
        } as any,
        callType as any
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
      message: `Failure_UnexpectedMessage,${message}`,
    });
  });

  it('keeps the existing NotInSigningMode mapping', async () => {
    const commands = createCommands();

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: {
            code: 'Failure_UnexpectedMessage',
            message: 'Not in Signing mode',
          },
        } as any,
        'ButtonAck'
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.NotInSigningMode,
    });
  });

  it('keeps the existing unexpected passphrase mapping', async () => {
    const commands = createCommands();

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: {
            code: 'Failure_UnexpectedMessage',
            message: 'Unexpected message',
          },
        } as any,
        'PassphraseAck'
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.UnexpectPassphrase,
    });
  });

  it('keeps non signing unexpected messages as runtime errors', async () => {
    const commands = createCommands();

    await expect(
      commands._filterCommonTypes(
        {
          type: 'Failure',
          message: {
            code: 'Failure_UnexpectedMessage',
            message: 'Not in Reset mode',
          },
        } as any,
        'ButtonAck'
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
      message: 'Failure_UnexpectedMessage,Not in Reset mode',
    });
  });
});

describe('DeviceCommands Protocol V2 interactive response compatibility', () => {
  it('auto-acks Pro2 ButtonRequest and registers Cancel instead of Initialize', async () => {
    const commands = createCommands();
    const emit = jest.fn();
    const cancelDevice = jest.spyOn(commands, 'cancelDevice').mockResolvedValue(undefined);
    const cancelDeviceOnOneKeyDevice = jest
      .spyOn(commands, 'cancelDeviceOnOneKeyDevice')
      .mockResolvedValue(undefined);
    const commonCall = jest.fn().mockResolvedValue({
      type: 'Success',
      message: {},
    });
    const setCancelableAction = jest.fn();
    commands.device = {
      ...commands.device,
      getCurrentDeviceType: jest.fn(() => 'pro2'),
      setCancelableAction,
      emit,
      listenerCount: jest.fn(() => 0),
    } as any;
    commands._commonCall = commonCall as any;

    await expect(
      commands._filterCommonTypes(
        {
          type: 'ButtonRequest',
          message: { code: 'ButtonRequest_PinEntry' },
        } as any,
        'GetAddress'
      )
    ).resolves.toMatchObject({ type: 'Success' });

    expect(emit).toHaveBeenCalledWith(
      DEVICE.BUTTON,
      commands.device,
      expect.objectContaining({ code: 'ButtonRequest_PinEntry' })
    );
    expect(commonCall).toHaveBeenCalledWith('ButtonAck', {}, undefined);
    await setCancelableAction.mock.calls[0][0]();
    expect(cancelDevice).toHaveBeenCalledTimes(1);
    expect(cancelDeviceOnOneKeyDevice).not.toHaveBeenCalled();
  });

  it('rejects PassphraseRequest when the Pro2 UI listener is not registered', async () => {
    const commands = createCommands();
    commands.device = {
      ...commands.device,
      listenerCount: jest.fn(() => 0),
    } as any;

    await expect(
      commands._filterCommonTypes(
        {
          type: 'PassphraseRequest',
          message: { exists_attach_pin_user: true },
        } as any,
        'GetAddress'
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
      message: '_promptPassphrase: Passphrase callback not configured',
    });
  });

  it('rejects PinMatrixRequest when the Pro2 UI listener is not registered', async () => {
    const commands = createCommands();
    commands.device = {
      ...commands.device,
      instanceId: 'pro2-test-device',
      listenerCount: jest.fn(() => 0),
    } as any;

    await expect(
      commands._filterCommonTypes(
        {
          type: 'PinMatrixRequest',
          message: { type: 'PinMatrixRequestType_Current' },
        } as any,
        'GetAddress'
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
    });
  });
});

describe('DeviceCommands cancellation', () => {
  it('stops waiting after the bounded cancellation timeout', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    try {
      const commands = createCommands();
      commands.disposed = false;
      commands.mainId = 'main-id';
      commands.callPromise = new Promise(() => {});
      const disconnect = jest.fn().mockResolvedValue(undefined);
      commands.transport = {
        name: 'ReactNativeBleTransport',
        disconnect,
      } as any;
      const dispose = jest.fn().mockResolvedValue(undefined);
      commands.dispose = dispose;

      const cancellation = commands.cancel();
      jest.advanceTimersByTime(10_000);
      await Promise.resolve();

      await expect(cancellation).resolves.toBeUndefined();
      expect(dispose).toHaveBeenCalledWith(true);
      expect(disconnect).toHaveBeenCalledWith('main-id');
      expect(commands.callPromise).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });
});
