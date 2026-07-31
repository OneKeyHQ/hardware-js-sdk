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
  it('logs passphrase call request and response without exposing the passphrase', async () => {
    const commands = createCommands();
    const requestLog = getLogger(LoggerNames.DeviceCommands);
    const responseLog = getLogger(LoggerNames.Core);
    requestLog.messages.length = 0;
    responseLog.messages.length = 0;
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
      commands.call('DeviceSessionAskPassphrase', {
        passphrase: 'hidden-wallet-secret',
        on_device: false,
      })
    ).resolves.toMatchObject({ type: 'Success' });

    expect(requestLog.messages.at(-1)?.message).toEqual([
      '[DeviceCommands] [call] Sending',
      'DeviceSessionAskPassphrase',
      {
        passphrase: '[REDACTED]',
        on_device: false,
      },
    ]);
    expect(responseLog.messages.at(-1)?.message).toEqual([
      '[DeviceCommands] [call] Received',
      'Success',
      {
        message: 'Passphrase accepted',
      },
    ]);
    expect(JSON.stringify([...requestLog.messages, ...responseLog.messages])).not.toContain(
      'hidden-wallet-secret'
    );
  });

  it('logs DeviceStatus response fields without exposing the device ID', async () => {
    const commands = createCommands();
    const log = getLogger(LoggerNames.Core);
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

    await expect(commands.call('DeviceStatusGet', {})).resolves.toMatchObject({
      type: 'DeviceStatus',
    });

    const receivedLog = log.messages.at(-1)?.message;
    expect(receivedLog).toEqual([
      '[DeviceCommands] [call] Received',
      'DeviceStatus',
      {
        device_id: '[REDACTED]',
        unlocked: true,
        init_states: true,
        backup_required: false,
        passphrase_enabled: true,
        attach_to_pin_enabled: false,
        unlocked_by_attach_to_pin: false,
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

  it.each(['Cancelled on device', 'Confirm dismissed'])(
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

  it.each(['Cancelled', 'User cancelled typed data signing'])(
    'maps the Protocol V2 MP engine cancellation response "%s" to ActionCancelled',
    async message => {
      const commands = createCommands();

      await expect(
        commands._filterCommonTypes(
          {
            type: 'Failure',
            message: {
              code: 'Failure_ProcessError',
              subcode: 1,
              message,
            },
          } as any,
          'SignTx'
        )
      ).rejects.toMatchObject({
        errorCode: HardwareErrorCode.ActionCancelled,
        params: {
          failureCode: 'Failure_ProcessError',
          subcode: 1,
          firmwareMessage: message,
        },
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
            message: 'Cancelled on device',
          },
        } as any,
        'ApplySettings'
      )
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
    });
  });

  it('keeps an unrecognized Protocol V2 process subcode generic', async () => {
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
      errorCode: HardwareErrorCode.RuntimeError,
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
  it('still auto-acks ButtonRequest when no hardware UI listener is registered', async () => {
    const commands = createCommands();
    const emit = jest.fn();
    const commonCall = jest.fn().mockResolvedValue({
      type: 'Success',
      message: {},
    });
    commands.device = {
      ...commands.device,
      getCurrentDeviceType: jest.fn(() => 'pro2'),
      setCancelableAction: jest.fn(),
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
      commands.callPromise = new Promise(() => {});
      const dispose = jest.fn().mockResolvedValue(undefined);
      commands.dispose = dispose;

      const cancellation = commands.cancel();
      jest.advanceTimersByTime(10_000);
      await Promise.resolve();

      await expect(cancellation).resolves.toBeUndefined();
      expect(dispose).toHaveBeenCalledWith(true);
      expect(commands.callPromise).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });
});
