/* eslint-disable @typescript-eslint/no-var-requires */
const { getProtocolV1SendOptions, shouldLogFirmwareUploadProgress } = require('../src');

describe('firmware upload progress logging', () => {
  test('按 5% 进度限流打印', () => {
    expect(
      shouldLogFirmwareUploadProgress({
        percent: 9,
        lastLoggedPercent: 5,
        now: 5_000,
        lastLoggedAt: 0,
      })
    ).toBe(false);

    expect(
      shouldLogFirmwareUploadProgress({
        percent: 10,
        lastLoggedPercent: 5,
        now: 5_000,
        lastLoggedAt: 0,
      })
    ).toBe(true);
  });

  test('进度不足 5% 时最长每 10 秒打印一次心跳', () => {
    expect(
      shouldLogFirmwareUploadProgress({
        percent: 7,
        lastLoggedPercent: 5,
        now: 10_000,
        lastLoggedAt: 0,
      })
    ).toBe(true);
  });
});

describe('firmware upload write mode', () => {
  test('固件上传使用带响应写入，普通命令保持默认模式', () => {
    expect(getProtocolV1SendOptions('FirmwareUpload')).toEqual({ withoutResponse: false });
    expect(getProtocolV1SendOptions('Initialize')).toBeUndefined();
  });
});
