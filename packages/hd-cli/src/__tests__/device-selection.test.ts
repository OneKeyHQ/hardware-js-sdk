import { selectSearchDevice } from '../deviceSelection';

describe('selectSearchDevice', () => {
  it('多设备环境优先选择显式 connectId 对应的设备', () => {
    const devices = [
      { connectId: 'first-device', name: 'Pro A9CA' },
      { connectId: 'target-device', name: 'Pro2 6136' },
    ];

    expect(selectSearchDevice(devices, 'target-device')).toEqual(devices[1]);
  });

  it('未指定 connectId 时保持选择第一台设备的兼容行为', () => {
    const devices = [
      { connectId: 'first-device', name: 'Pro2 6136' },
      { connectId: 'second-device', name: 'Pro2 C445' },
    ];

    expect(selectSearchDevice(devices)).toEqual(devices[0]);
  });

  it('显式 connectId 暂未出现在扫描结果时仍保留该目标', () => {
    const devices = [{ connectId: 'other-device', name: 'Pro2 C445' }];

    expect(selectSearchDevice(devices, 'target-device')).toEqual({
      connectId: 'target-device',
    });
  });
});
