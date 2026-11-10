import { LoggerNames, enableLog, getLogger } from '../src/utils/logger';

describe('logger', () => {
  afterEach(() => {
    enableLog(false);
    jest.restoreAllMocks();
  });

  test('enables method logs that share a prefix with common-connect-sdk', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    enableLog(true);

    expect(getLogger(LoggerNames.Method)).toBe(getLogger(LoggerNames.HdCommonConnectSdk));
    getLogger(LoggerNames.Method).debug('shared prefix message');

    expect(consoleSpy).toHaveBeenCalledWith(LoggerNames.Method, 'shared prefix message');
  });
});
