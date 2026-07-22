import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, expect, test } from '@jest/globals';

const source = readFileSync(
  resolve(
    process.cwd(),
    'packages/connect-examples/expo-playground/app/components/providers/SDKProvider.tsx'
  ),
  'utf8'
);

describe('SDKProvider canonical device state events', () => {
  test('stores DEVICE.STATE and applies it to the connected device', () => {
    expect(source).toContain('sdkInstance.on(DEVICE.STATE');
    expect(source).toContain('applyDeviceStateToDevice(currentDevice, event.state)');
    expect(source).toContain('applyDeviceStateToDevice');
  });
});
