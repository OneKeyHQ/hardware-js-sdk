import { describe, expect, test } from '@jest/globals';

import { applyDeviceStateToDevice } from './deviceStateAdapter';

describe('applyDeviceStateToDevice', () => {
  test('hydrates canonical identity without fabricating legacy Features', () => {
    const device = {
      connectId: 'usb-path',
      deviceId: '',
      serialNo: '',
      uuid: '',
      deviceType: 'unknown',
      name: 'USB device',
    };
    const state = {
      protocol: 'V2',
      protocolVersion: 2,
      identity: {
        serialNo: 'PRO2-SERIAL',
        deviceId: 'wallet-device-id',
        deviceType: 'pro2',
        label: 'Desk wallet',
        bleName: 'OneKey Pro2 AB12',
      },
      status: { mode: 'normal' },
      settings: {},
      versions: {},
    };

    expect(applyDeviceStateToDevice(device as never, state as never)).toEqual({
      ...device,
      serialNo: 'PRO2-SERIAL',
      uuid: 'PRO2-SERIAL',
      deviceId: 'wallet-device-id',
      deviceType: 'pro2',
      label: 'Desk wallet',
      name: 'OneKey Pro2 AB12',
      deviceState: state,
      protocol: 'V2',
      protocolVersion: 2,
    });
  });

  test('uses label for the connection name when BLE name is unavailable', () => {
    expect(
      applyDeviceStateToDevice(
        {
          connectId: 'usb-path',
          deviceId: 'old-id',
          uuid: 'old-serial',
          deviceType: 'pro2',
          name: 'USB device',
        } as never,
        {
          identity: {
            label: 'Renamed wallet',
          },
          status: {},
          settings: {},
          versions: {},
        } as never
      )
    ).toMatchObject({
      name: 'Renamed wallet',
      label: 'Renamed wallet',
    });
  });

  test('preserves real Protocol V1 Features already attached to the device', () => {
    const features = { deviceId: 'v1-device-id' };
    const result = applyDeviceStateToDevice(
      {
        connectId: 'v1-path',
        deviceId: 'v1-device-id',
        uuid: 'v1-serial',
        deviceType: 'classic',
        name: 'Classic',
        features,
      } as never,
      {
        identity: {},
        status: {},
        settings: {},
        versions: {},
      } as never
    );

    expect(result.features).toBe(features);
  });
});
