import { LoggerNames, getLogger } from '../src/utils/logger';
import { completeRequestContext, createRequestContext } from '../src/utils/tracing';

describe('RequestContext 错误日志', () => {
  test('已作为 API 响应返回的请求错误不写入 console.error 级别', () => {
    const logger = getLogger(LoggerNames.Core);
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => undefined);

    createRequestContext(1001, 'searchDevices', { sdkInstanceId: 'SDK-test' });
    completeRequestContext(1001, new Error('device did not respond'));

    expect(errorSpy).not.toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('method=searchDevices'));
  });
});
