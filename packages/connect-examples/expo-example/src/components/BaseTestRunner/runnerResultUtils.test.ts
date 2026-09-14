import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import {
  classifyRunnerFailure,
  getRunnerReportResult,
  getRunnerReportStatus,
} from './runnerResultUtils';

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

describe('runner reports', () => {
  it('separates skipped cases from failures and successes', () => {
    expect(getRunnerReportStatus(['success', 'skip'])).toBe('Success');
    expect(getRunnerReportStatus(['skip'])).toBe('Skipped');
    expect(getRunnerReportStatus(['success', 'fail', 'skip'])).toBe('Fail');
    expect(getRunnerReportStatus(['success', 'warning'])).toBe('Warning');
  });

  it('does not report missing, pending or empty results as successful', () => {
    expect(getRunnerReportStatus([])).toBe('Incomplete');
    expect(getRunnerReportStatus(['success', undefined])).toBe('Incomplete');
    expect(getRunnerReportStatus(['success', 'none'])).toBe('Incomplete');
    expect(getRunnerReportStatus(['success', 'pending'])).toBe('Incomplete');
  });

  it('only displays the successful result for a passed case', () => {
    expect(getRunnerReportResult({ verify: 'success' }, 'expected value')).toBe('expected value');
    expect(getRunnerReportResult({ verify: 'skip' }, 'expected value')).toBe('Skipped');
    expect(getRunnerReportResult({ verify: 'skip', error: 'unsupported' }, 'success')).toBe(
      'Skipped: unsupported'
    );
    expect(getRunnerReportResult({ verify: 'fail', error: 'disconnected' }, 'success')).toBe(
      'disconnected'
    );
    expect(getRunnerReportResult({ verify: 'warning', error: 'cancelled' }, 'success')).toBe(
      'cancelled'
    );
    expect(getRunnerReportResult({ verify: 'pending' }, 'success')).toBe('Not run');
    expect(getRunnerReportResult(undefined, 'success')).toBe('Not run');
  });
});
