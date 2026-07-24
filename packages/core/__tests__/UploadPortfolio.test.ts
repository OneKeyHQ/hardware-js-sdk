import UploadPortfolio from '../src/api/UploadPortfolio';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('UploadPortfolio timeout', () => {
  test('applies the command timeout to staging and PortfolioUpdate', async () => {
    const packageBytes = new Uint8Array([1, 2, 3]);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { processed_byte: 3 } })
      .mockResolvedValueOnce({ message: {} });
    const method = new UploadPortfolio({
      id: 1,
      payload: {
        method: 'uploadPortfolio',
        packageBytes,
      },
    });
    method.device = {
      commands: { typedCall },
    } as any;
    method.postMessage = jest.fn();

    method.init();
    await method.run();

    expect(method.executionPriority).toBe('background');
    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'FilesystemFileWrite',
      'FilesystemFile',
      expect.any(Object),
      { timeoutMs: 5_000 }
    );
    expect(typedCall).toHaveBeenNthCalledWith(
      2,
      'PortfolioUpdate',
      'Success',
      {},
      { timeoutMs: 5_000 }
    );
  });
});
