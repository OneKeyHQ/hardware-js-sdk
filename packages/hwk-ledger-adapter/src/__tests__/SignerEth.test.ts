import { describe, it, expect, vi } from 'vitest';
import { SignerEth } from '../signer/SignerEth';

function createMockSdkSigner() {
  function mockAction(output: unknown) {
    return {
      observable: {
        subscribe(observer: any) {
          observer.next({ status: 'completed', output });
          return { unsubscribe: () => {} };
        },
      },
    };
  }

  return {
    getAddress: vi.fn().mockReturnValue(mockAction({ address: '0xABC', publicKey: '0xPK' })),
    signTransaction: vi.fn().mockReturnValue(mockAction({ r: '0xr', s: '0xs', v: 27 })),
    signMessage: vi.fn().mockReturnValue(mockAction({ r: '0xr', s: '0xs', v: 28 })),
    signTypedData: vi.fn().mockReturnValue(mockAction({ r: '0xr', s: '0xs', v: 28 })),
  };
}

describe('SignerEth', () => {
  it('should getAddress and return plain data', async () => {
    const sdk = createMockSdkSigner();
    const signer = new SignerEth(sdk);
    const result = await signer.getAddress("44'/60'/0'/0/0");
    expect(result).toEqual({ address: '0xABC', publicKey: '0xPK' });
    expect(sdk.getAddress).toHaveBeenCalledWith("44'/60'/0'/0/0", { checkOnDevice: false });
  });

  it('should getAddress with checkOnDevice', async () => {
    const sdk = createMockSdkSigner();
    const signer = new SignerEth(sdk);
    await signer.getAddress("44'/60'/0'/0/0", { checkOnDevice: true });
    expect(sdk.getAddress).toHaveBeenCalledWith("44'/60'/0'/0/0", { checkOnDevice: true });
  });

  it('should signTransaction', async () => {
    const sdk = createMockSdkSigner();
    const signer = new SignerEth(sdk);
    const result = await signer.signTransaction("44'/60'/0'/0/0", '0xdeadbeef');
    expect(result).toEqual({ r: '0xr', s: '0xs', v: 27 });
  });

  it('should signMessage', async () => {
    const sdk = createMockSdkSigner();
    const signer = new SignerEth(sdk);
    const result = await signer.signMessage("44'/60'/0'/0/0", 'Hello');
    expect(result).toEqual({ r: '0xr', s: '0xs', v: 28 });
  });

  it('should signTypedData', async () => {
    const sdk = createMockSdkSigner();
    const signer = new SignerEth(sdk);
    const result = await signer.signTypedData("44'/60'/0'/0/0", { types: {} });
    expect(result).toEqual({ r: '0xr', s: '0xs', v: 28 });
  });

  it('should forward interaction callbacks', async () => {
    const onInteraction = vi.fn();
    const sdk = createMockSdkSigner();
    sdk.getAddress.mockReturnValue({
      observable: {
        subscribe(observer: any) {
          observer.next({
            status: 'pending',
            intermediateValue: { requiredUserInteraction: 'verify-address' },
          });
          observer.next({ status: 'completed', output: { address: '0x1', publicKey: '0x2' } });
          return { unsubscribe: () => {} };
        },
      },
    });
    const signer = new SignerEth(sdk);
    signer.onInteraction = onInteraction;
    await signer.getAddress("44'/60'/0'/0/0");
    expect(onInteraction).toHaveBeenCalledWith('verify-address');
  });
});
