import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { DeviceCommands } from '../src/device/DeviceCommands';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const createCommands = () => {
  const commands = Object.create(DeviceCommands.prototype) as DeviceCommands;
  commands.device = {
    clearCancelableAction: jest.fn(),
  } as any;
  return commands;
};

describe('DeviceCommands failure mapping', () => {
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
