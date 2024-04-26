import dnxGetAddress from '../dnxGetAddress';

describe('Test Mock Device method', () => {
  test('test dnxGetAddress', () => {
    const res = dnxGetAddress('', '', {
      mnemonic: 'all all all all all all all all all all all all',
      path: "m/44'/29538'/0'/0'/0'",
    });

    expect(res.payload.address).toEqual(
      'XwnJY9PT7f3QrBoJVZv3mqKbbWqy9cRHpS6YytLS4aCMhVi15WYTjqmR6yjBLg98jnSS9YW3ci3xJQX3sTF7pWan1genzbFHV'
    );
  });
});
