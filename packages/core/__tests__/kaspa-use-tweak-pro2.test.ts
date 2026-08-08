import KaspaGetAddress from '../src/api/kaspa/KaspaGetAddress';
import KaspaSignTransaction from '../src/api/kaspa/KaspaSignTransaction';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('Kaspa Pro2 product-family useTweak capability', () => {
  test.each([
    ['get address', KaspaGetAddress],
    ['sign transaction', KaspaSignTransaction],
  ])('allows useTweak=false for %s', (_name, Method) => {
    const method = new Method({ id: 1, payload: {} } as never);

    expect(method.getUseTweakVersionRange()).toMatchObject({
      model_pro2: { min: '0.0.0' },
    });
  });
});
