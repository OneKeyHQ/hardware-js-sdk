import suiGetAddress from '../suiGetAddress';

describe('Test Mock Device method', () => {
  test('test suiGetAddress', () => {
    const res = suiGetAddress('', '', {
      mnemonic: 'all all all all all all all all all all all all',
      path: "m/44'/784'/0'/0'/0'",
    });

    expect(res.payload.address).toEqual(
      '0x3c34fc4801d2875cd9fb148c8ffe5121b302ec7928c1024cb30ce193e417ec43'
    );
  });
});
