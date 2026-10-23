import { LoggerNames, enableLog, getLogger } from '../src/utils/logger';

describe('logger', () => {
  afterEach(() => {
    enableLog(false);
  });

  test('enables method logs that share a prefix with common-connect-sdk', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      enableLog(true);
      getLogger(LoggerNames.Method).debug('[FirmwareUpdateV4] BLE FileWrite window');

      expect(getLogger(LoggerNames.Method)).toBe(getLogger(LoggerNames.HdCommonConnectSdk));
      expect(consoleSpy).toHaveBeenCalledWith(
        LoggerNames.Method,
        '[FirmwareUpdateV4] BLE FileWrite window'
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
