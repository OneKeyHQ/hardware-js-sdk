import { describe, expect, test } from '@jest/globals';

import { firmware } from './firmware';
import { PRO2_REMOTE_FIRMWARE_TARGETS } from '../../constants/firmwareFiles';

describe('firmwareUpdateV4 文件选择配置', () => {
  test('本地固件目标支持 .bin、.okpkg 和 .pp 后缀', () => {
    const method = firmware.api.find(item => item.method === 'firmwareUpdateV4');
    const preset = method?.presets.find(item => item.title === 'V4 local target binaries');
    const fileParameters = preset?.parameters.filter(item => item.type === 'file') ?? [];

    expect(fileParameters.length).toBeGreaterThan(0);
    fileParameters.forEach(parameter => {
      expect(parameter.accept).toBe('.bin,.okpkg,.pp');
    });
  });

  test('远端固件 preset 传入完整且非空的更新目标', () => {
    const method = firmware.api.find(item => item.method === 'firmwareUpdateV4');
    const preset = method?.presets.find(item => item.title === 'V4 remote config update');
    const targets = preset?.parameters.find(item => item.name === 'targetsToUpdate');

    expect(targets?.value).toEqual(PRO2_REMOTE_FIRMWARE_TARGETS);
    expect(PRO2_REMOTE_FIRMWARE_TARGETS.length).toBeGreaterThan(0);
  });

  test('Device 固件模块公开当前公共入口且不重复', () => {
    const methodNames = firmware.api.map(item => item.method);

    expect(new Set(methodNames).size).toBe(methodNames.length);
    expect(methodNames).toEqual(
      expect.arrayContaining([
        'checkBridgeStatus',
        'checkFirmwareTypeAvailable',
        'firmwareUpdate',
        'deviceUpdateReboot',
      ])
    );
  });
});
