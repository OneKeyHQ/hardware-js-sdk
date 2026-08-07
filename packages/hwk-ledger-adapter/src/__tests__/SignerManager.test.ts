import { SignerManager } from '../signer/SignerManager';

import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';

describe('SignerManager', () => {
  let mockDmk: DeviceManagementKit;
  let mockSignerBuilder: any;
  let manager: SignerManager;

  beforeEach(() => {
    mockDmk = {} as DeviceManagementKit;
    mockSignerBuilder = jest.fn().mockReturnValue({
      build: jest.fn().mockReturnValue({ getAddress: jest.fn() }),
    });
    manager = new SignerManager(mockDmk, mockSignerBuilder);
  });

  it('should create a signer for a new sessionId', async () => {
    const signer = await manager.getOrCreate('session-1');
    expect(signer).toBeDefined();
    expect(mockSignerBuilder).toHaveBeenCalledWith({ dmk: mockDmk, sessionId: 'session-1' });
  });

  it('should create fresh signer each time (DMK signers are not reusable)', async () => {
    const first = await manager.getOrCreate('session-1');
    const second = await manager.getOrCreate('session-1');
    expect(first).not.toBe(second);
    expect(mockSignerBuilder).toHaveBeenCalledTimes(2);
  });

  it('should create new signer for different sessionId', async () => {
    const first = await manager.getOrCreate('session-1');
    const second = await manager.getOrCreate('session-2');
    expect(first).not.toBe(second);
    expect(mockSignerBuilder).toHaveBeenCalledTimes(2);
  });

  it('should inject non-blocking context module into custom signer builders', async () => {
    const build = jest.fn().mockReturnValue({ getAddress: jest.fn() });
    const withContextModule = jest.fn().mockReturnValue({ build });
    const signerBuilder = jest.fn().mockReturnValue({
      withContextModule,
      build: jest.fn(),
    });
    manager = new SignerManager(mockDmk, signerBuilder);

    await manager.getOrCreate('session-1');

    expect(withContextModule).toHaveBeenCalledTimes(1);
    const contextModule = withContextModule.mock.calls[0]?.[0];
    expect(contextModule).toEqual(expect.objectContaining({ report: expect.any(Function) }));
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('should clear cache for a specific sessionId', async () => {
    await manager.getOrCreate('session-1');
    manager.invalidate('session-1');
    await manager.getOrCreate('session-1');
    expect(mockSignerBuilder).toHaveBeenCalledTimes(2);
  });

  it('should clear all caches', async () => {
    await manager.getOrCreate('session-1');
    await manager.getOrCreate('session-2');
    manager.clearAll();
    await manager.getOrCreate('session-1');
    expect(mockSignerBuilder).toHaveBeenCalledTimes(3);
  });

  it('should not wait for blind-signing report failures', async () => {
    const originalReport = jest.fn((_params: unknown) => new Promise<void>(() => {}));
    const contextModule = {
      getContexts: jest.fn(),
      getFieldContext: jest.fn(),
      getTypedDataFilters: jest.fn(),
      getSolanaContext: jest.fn(),
      report: originalReport,
    };

    const reportPromise = SignerManager.wrapBlindSigningReportNonBlocking(contextModule).report(
      {} as never
    );

    await expect(
      Promise.race([reportPromise, Promise.resolve('blocked')])
    ).resolves.toBeUndefined();
    expect(originalReport).toHaveBeenCalledTimes(1);
  });
});
