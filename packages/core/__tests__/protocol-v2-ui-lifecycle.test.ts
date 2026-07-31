import { DeviceSessionPinType } from '@onekeyfe/hd-transport';

import { DEVICE } from '../src/events';
import { Device } from '../src/device/Device';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0-test'),
  DEFAULT_DOMAIN: 'https://example.com/',
}));

describe('Protocol V2 UI interaction lifecycle', () => {
  test('emits a matching PIN phase completion after DeviceSessionAskPin succeeds', async () => {
    const device = new Device({ id: 'connect-1' } as any);
    device.isProtocolV2 = jest.fn(() => true);
    device.updateProtocolV2Status = jest.fn(() => undefined as any);
    device.commands = {
      typedCall: jest.fn().mockResolvedValue({
        message: { unlocked: true },
      }),
    } as any;
    device.beginProtocolV2UiInteraction();

    const starts: unknown[] = [];
    const completions: unknown[] = [];
    device.on(DEVICE.PIN_ON_DEVICE, (...args) => starts.push(args));
    device.on(DEVICE.PIN_ON_DEVICE_COMPLETE, (...args) => completions.push(args));

    await device.unlockDevice(DeviceSessionPinType.Main, {
      source: 'unlock-coordinator',
      reason: 'device-locked',
      deviceOnly: true,
    });

    const startMetadata = (starts[0] as unknown[])[2] as Record<string, unknown>;
    const completionMetadata = (completions[0] as unknown[])[1] as Record<string, unknown>;
    expect(startMetadata.interaction).toMatchObject({
      phase: 'pin',
      transition: 'start',
      protocol: 'V2',
    });
    expect(completionMetadata).toMatchObject({
      interactionId: (startMetadata.interaction as { interactionId: string }).interactionId,
      phaseId: (startMetadata.interaction as { phaseId: string }).phaseId,
      phase: 'pin',
      transition: 'complete',
      outcome: 'succeeded',
      protocol: 'V2',
    });
    expect(completionMetadata.sequence).toBeGreaterThan(
      (startMetadata.interaction as { sequence: number }).sequence
    );
    expect(completionMetadata.phaseId).toBe(
      (startMetadata.interaction as { phaseId: string }).phaseId
    );
  });
});
