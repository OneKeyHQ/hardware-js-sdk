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

// raw 仅供 SDK 内部兼容投影使用，不属于公共 DeviceState。
// @ts-expect-error raw 不应成为外部接入者需要理解的字段
type RemovedPublicRaw = DeviceState['raw'];

// session 属于 SDK 运行时内部缓存，不应通过公共状态或事件暴露。
// @ts-expect-error session 不属于公共 DeviceState
type RemovedPublicSession = DeviceState['session'];
