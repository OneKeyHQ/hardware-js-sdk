import { publicKeyToAddress, hex2BfcAddress } from '../src/api/benfen/normalize';

describe('Benfen Address Normalization', () => {
  it('publicKeyToBFCAddress', () => {
    // Test case with a known public key and its expected address
    const publicKey = '6e9c9ef745cc3a250168db15526d18075dc52849d49f8a6ea5477c1c264b4848';
    const expectedHexAddress = '0xb4ced58018b75d7ba72a10fa97c09b7bf66533ff104bf9db1bfdb004b17d8eaa';
    const expectedAddress =
      'BFCb4ced58018b75d7ba72a10fa97c09b7bf66533ff104bf9db1bfdb004b17d8eaa2e35';

    const hexAddress = publicKeyToAddress(publicKey);
    const bfcAddress = hex2BfcAddress(hexAddress);
    expect(hexAddress).toBe(expectedHexAddress);
    expect(bfcAddress).toBe(expectedAddress);
  });
});
