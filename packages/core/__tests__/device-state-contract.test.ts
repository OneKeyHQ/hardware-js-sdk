import { DEVICE } from '../src/events';
import type { DeviceState, DeviceStateEvent } from '../src/types';

describe('DeviceState contract', () => {
  test('exports the unified device state event contract', () => {
    expect(DEVICE.STATE).toBe('state');

    const state = {} as DeviceState;
    const event: DeviceStateEvent = {
      connectId: 'usb-1',
      state,
      revision: 1,
      source: 'initialize',
      changedKeys: ['identity.label'],
    };

    expect(event.state).toBe(state);
  });
});
