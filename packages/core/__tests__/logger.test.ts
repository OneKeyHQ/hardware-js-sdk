import { getLog, initLog, setLoggerPostMessage } from '../src/utils/logger';

describe('logger', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    setLoggerPostMessage(() => undefined);
  });

  it('keeps diagnostic logs while console output is disabled', () => {
    const prefix = `logger-test-${Date.now()}`;
    const logger = initLog(prefix, false);
    const postMessage = jest.fn();
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    setLoggerPostMessage(postMessage);

    logger.log('log-message');
    logger.error('error-message');
    logger.warn('warn-message');
    logger.debug('debug-message');

    expect(getLog().filter(item => item.prefix === prefix)).toEqual([
      expect.objectContaining({ level: 'log', message: ['log-message'] }),
      expect.objectContaining({ level: 'error', message: ['error-message'] }),
      expect.objectContaining({ level: 'warn', message: ['warn-message'] }),
      expect.objectContaining({ level: 'debug', message: ['debug-message'] }),
    ]);
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledTimes(4);
  });
});
