import { createSDK, disposeSDK } from '../sdk';
import { program, runFirmwareUpdateV4WithRetry } from '../cli';

jest.mock('../sdk', () => ({
  createSDK: jest.fn(),
  disposeSDK: jest.fn(),
}));

const transientProbeFailure = {
  success: false,
  payload: {
    error: 'Device protocol mismatch: expected V2; device did not respond to expected protocol',
  },
};

const createSdkMock = () => ({
  getDeviceState: jest.fn(),
  firmwareUpdateV4: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
});

describe('firmware-update-v4 CLI command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('exposes firmware-update-v4 as the formal command', () => {
    const command = program.commands.find(item => item.name() === 'firmware-update-v4');

    expect(command).toBeDefined();
    expect(command?.description()).toBe(
      'Run Protocol V2 firmware update through sdk.firmwareUpdateV4'
    );
    expect(command?.options.some(option => option.long === '--resource-archive')).toBe(true);
  });

  test('does not expose the pre-release firmware-update-v4-debug command', () => {
    expect(program.commands.some(item => item.name() === 'firmware-update-v4-debug')).toBe(false);
    expect(program.commands.some(item => item.aliases().includes('firmware-update-v4-debug'))).toBe(
      false
    );
  });

  test('retries only the read-only USB probe before starting the firmware update', async () => {
    const firstSdk = createSdkMock();
    const retrySdk = createSdkMock();
    firstSdk.getDeviceState.mockResolvedValue(transientProbeFailure);
    retrySdk.getDeviceState.mockResolvedValue({ success: true, payload: { protocol: 'V2' } });
    retrySdk.firmwareUpdateV4.mockResolvedValue({ success: true, payload: {} });
    jest.mocked(createSDK).mockResolvedValue(retrySdk as never);
    jest.mocked(disposeSDK).mockResolvedValue(undefined);
    jest.spyOn(global, 'setTimeout').mockImplementation(callback => {
      callback();
      return 0 as never;
    });

    const result = await runFirmwareUpdateV4WithRetry({
      sdk: firstSdk as never,
      globalOpts: { transport: 'usb', connectId: 'stale-connect-id' },
      params: { applicationP1Binary: new ArrayBuffer(1) } as never,
      retries: 1,
    });

    expect(firstSdk.firmwareUpdateV4).not.toHaveBeenCalled();
    expect(disposeSDK).toHaveBeenCalledTimes(1);
    expect(retrySdk.getDeviceState).toHaveBeenCalledWith(undefined, {
      scope: 'runtime',
      connectProtocol: 'V2',
      retryCount: 0,
    });
    expect(retrySdk.firmwareUpdateV4).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ success: true, payload: { metrics: { attempt: 2 } } });
  });

  test('does not replay firmwareUpdateV4 after the read-only probe succeeds', async () => {
    const sdk = createSdkMock();
    sdk.getDeviceState.mockResolvedValue({ success: true, payload: { protocol: 'V2' } });
    sdk.firmwareUpdateV4.mockResolvedValue(transientProbeFailure);

    const result = await runFirmwareUpdateV4WithRetry({
      sdk: sdk as never,
      globalOpts: { transport: 'usb', connectId: 'pro2-connect-id' },
      params: { applicationP1Binary: new ArrayBuffer(1) } as never,
      retries: 2,
    });

    expect(sdk.getDeviceState).toHaveBeenCalledTimes(1);
    expect(sdk.firmwareUpdateV4).toHaveBeenCalledTimes(1);
    expect(disposeSDK).not.toHaveBeenCalled();
    expect(createSDK).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: false,
      payload: { error: transientProbeFailure.payload.error, metrics: { attempt: 1 } },
    });
  });
});
