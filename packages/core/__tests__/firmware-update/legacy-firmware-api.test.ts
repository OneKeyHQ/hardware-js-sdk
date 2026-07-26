import { createCoreApi } from '../../src/inject';

import type { CoreApi } from '../../src/types/api';

const createCallMock = (result: unknown) =>
  jest.fn().mockResolvedValue(result) as unknown as CoreApi['call'];

describe('legacy firmware public API', () => {
  it.each([
    {
      name: 'firmwareUpdate version overload',
      invoke: (api: ReturnType<typeof createCoreApi>) =>
        api.firmwareUpdate('connect-id', {
          version: [3, 0, 0],
          updateType: 'firmware',
          rebootOnSuccess: true,
        }),
      expectedCall: {
        connectId: 'connect-id',
        method: 'firmwareUpdate',
        rebootOnSuccess: true,
        updateType: 'firmware',
        version: [3, 0, 0],
      },
    },
    {
      name: 'firmwareUpdate binary overload',
      invoke: (api: ReturnType<typeof createCoreApi>) =>
        api.firmwareUpdate('connect-id', {
          binary: new ArrayBuffer(4),
          updateType: 'firmware',
        }),
      expectedCall: {
        binary: expect.any(ArrayBuffer),
        connectId: 'connect-id',
        method: 'firmwareUpdate',
        updateType: 'firmware',
      },
    },
    {
      name: 'firmwareUpdateV2 version overload',
      invoke: (api: ReturnType<typeof createCoreApi>) =>
        api.firmwareUpdateV2('connect-id', {
          version: [4, 0, 1],
          updateType: 'firmware',
          platform: 'native',
        }),
      expectedCall: {
        connectId: 'connect-id',
        method: 'firmwareUpdateV2',
        platform: 'native',
        updateType: 'firmware',
        version: [4, 0, 1],
      },
    },
    {
      name: 'firmwareUpdateV2 binary overload',
      invoke: (api: ReturnType<typeof createCoreApi>) =>
        api.firmwareUpdateV2('connect-id', {
          binary: new ArrayBuffer(8),
          updateType: 'ble',
          platform: 'desktop',
        }),
      expectedCall: {
        binary: expect.any(ArrayBuffer),
        connectId: 'connect-id',
        method: 'firmwareUpdateV2',
        platform: 'desktop',
        updateType: 'ble',
      },
    },
    {
      name: 'firmwareUpdateV3 version input',
      invoke: (api: ReturnType<typeof createCoreApi>) =>
        api.firmwareUpdateV3('connect-id', {
          bleVersion: [2, 1, 0],
          bootloaderVersion: [2, 8, 0],
          firmwareVersion: [5, 0, 0],
          platform: 'native',
        }),
      expectedCall: {
        bleVersion: [2, 1, 0],
        bootloaderVersion: [2, 8, 0],
        connectId: 'connect-id',
        firmwareVersion: [5, 0, 0],
        method: 'firmwareUpdateV3',
        platform: 'native',
      },
    },
    {
      name: 'firmwareUpdateV3 binary input',
      invoke: (api: ReturnType<typeof createCoreApi>) =>
        api.firmwareUpdateV3('connect-id', {
          bleBinary: new ArrayBuffer(2),
          bootloaderBinary: new ArrayBuffer(3),
          firmwareBinary: new ArrayBuffer(4),
          platform: 'desktop',
          resourceBinary: new ArrayBuffer(5),
        }),
      expectedCall: {
        bleBinary: expect.any(ArrayBuffer),
        bootloaderBinary: expect.any(ArrayBuffer),
        connectId: 'connect-id',
        firmwareBinary: expect.any(ArrayBuffer),
        method: 'firmwareUpdateV3',
        platform: 'desktop',
        resourceBinary: expect.any(ArrayBuffer),
      },
    },
    {
      name: 'firmwareUpdateV4 target input',
      invoke: (api: ReturnType<typeof createCoreApi>) =>
        api.firmwareUpdateV4('connect-id', {
          applicationP1Binary: new ArrayBuffer(4),
          platform: 'native',
          targetsToUpdate: ['app_v1'],
        }),
      expectedCall: {
        applicationP1Binary: expect.any(ArrayBuffer),
        connectId: 'connect-id',
        method: 'firmwareUpdateV4',
        platform: 'native',
        targetsToUpdate: ['app_v1'],
      },
    },
  ])('preserves $name request and response shapes', async ({ invoke, expectedCall }) => {
    const response = {
      success: true,
      payload: {
        bootloaderVersion: '2.8.0',
        firmwareVersion: '5.0.0',
        bleVersion: '2.1.0',
      },
    };
    const call = createCallMock(response);
    const api = createCoreApi(call);

    await expect(invoke(api)).resolves.toBe(response);
    expect(call).toHaveBeenCalledWith(expectedCall);
  });
});
