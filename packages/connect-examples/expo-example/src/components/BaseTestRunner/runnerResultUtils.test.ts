import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { classifyRunnerFailure } from './runnerResultUtils';

describe('classifyRunnerFailure', () => {
  it('将设备不支持的方法标记为跳过', () => {
    expect(classifyRunnerFailure(HardwareErrorCode.DeviceNotSupportMethod)).toBe('skip');
  });

  it.each([HardwareErrorCode.PinCancelled, HardwareErrorCode.ActionCancelled])(
    '将用户取消错误 %s 标记为警告',
    errorCode => {
      expect(classifyRunnerFailure(errorCode)).toBe('warning');
    }
  );

  it('将其他错误标记为失败', () => {
    expect(classifyRunnerFailure(HardwareErrorCode.RuntimeError)).toBe('fail');
    expect(classifyRunnerFailure('timeout')).toBe('fail');
  });
});
