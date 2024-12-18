import { publicKeyToAddress, hex2BfcAddress } from '../src/api/benfen/normalize';

export const TEST_FIXTURES = [
  // 12 位助记词
  {
    publicKey: '554652d41f799d254b6f9f34a52b1b10be217ccf0ddcc8bf2389747099d53e3d',
    hexAddress: '0x2d6e023ee0f3763c95e8b55621dec35e41cdc1438f3716588628f3a1a41e005d',
    bfcAddress: 'BFC2d6e023ee0f3763c95e8b55621dec35e41cdc1438f3716588628f3a1a41e005d8fc4',
  },
  {
    publicKey: 'f199d06ee5abd9055143af7c14e98d9fce7bd08c4de9a20ab18205d467350ca4',
    hexAddress: '0x8e6de169f88b291a03070a99ed8f1ccb61046fa5a07e760c860501689bd41346',
    bfcAddress: 'BFC8e6de169f88b291a03070a99ed8f1ccb61046fa5a07e760c860501689bd4134662c1',
  },
  {
    publicKey: '12ee1cee9f0fa0016db328a5d3e5a3979a9c3ec4f2a85efde473f4575727ab5b',
    hexAddress: '0x2b2253617385ee359d87860d1e9fc1e461223f0695ecbd67407878d48fcd10dc',
    bfcAddress: 'BFC2b2253617385ee359d87860d1e9fc1e461223f0695ecbd67407878d48fcd10dc7099',
  },
  // 18 位助记词
  {
    publicKey: 'c556f258d4840fe69826f58dfa9cd20df604a2a2f4b1af57c82f72c1e96c0fd6',
    hexAddress: '0xe94f5633460f2d2b851837ebacfa21fcaad6390044190afe889d31f0544f2e77',
    bfcAddress: 'BFCe94f5633460f2d2b851837ebacfa21fcaad6390044190afe889d31f0544f2e773e53',
  },
  {
    publicKey: '852f3b4496eb533282d2dcbf536cebdd372d8d8cf106677e91f40f7e694dd724',
    hexAddress: '0xa37f1d6df2c75464608c850faa601522d03fbd02e406ffee2cf0bcdae3cb5f39',
    bfcAddress: 'BFCa37f1d6df2c75464608c850faa601522d03fbd02e406ffee2cf0bcdae3cb5f399914',
  },
  {
    publicKey: 'cd6f02eec5c5cc0eaa8c9da78a1e7f2dc69481b64030d130c3f2fe4f24dfe6e8',
    hexAddress: '0x763ca26a1b55f3b5386ba61befb7b3110a424ff70a18f003205465e576699e9b',
    bfcAddress: 'BFC763ca26a1b55f3b5386ba61befb7b3110a424ff70a18f003205465e576699e9bf887',
  },

  // 24 位助记词
  // "path": "m/44'/728'/0'/0'/0'",
  {
    publicKey: 'd59fc3edda0e16a8b5b827829b97a65398223e319cf3a8afeb482f5c6f6653c6',
    hexAddress: '0x7356158f73e541ff7eb1a1aa97341d414fbc35fc7710e138e2d2d31207a41e6a',
    bfcAddress: 'BFC7356158f73e541ff7eb1a1aa97341d414fbc35fc7710e138e2d2d31207a41e6a6a90',
  },
  // "path": "m/44'/728'/0'/0'",
  {
    publicKey: 'a3600ca62a50a9650ac26f9b8b731eea83afca735ddbd83e688121e0f74fceb6',
    hexAddress: '0x1a4889f782d427a863b69086840128e5308a2c071935d6c7e079a4ad4d136ebc',
    bfcAddress: 'BFC1a4889f782d427a863b69086840128e5308a2c071935d6c7e079a4ad4d136ebce4d2',
  },
  // "path": "m/44'/728'/0'/0'/1'",
  {
    publicKey: '8e0411e3059c9339038d927049ae79ccf4f2f5339a923aef258a1e69f70f733f',
    hexAddress: '0x67f30006ee36ae36f6e3203f88fb8a48b08756144cf02a64137627d45c504e24',
    bfcAddress: 'BFC67f30006ee36ae36f6e3203f88fb8a48b08756144cf02a64137627d45c504e244dd2',
  },
];

describe('Benfen Address Normalization', () => {
  TEST_FIXTURES.forEach(({ publicKey, hexAddress, bfcAddress }) => {
    it(`should correctly convert public key ${publicKey.slice(0, 8)}... to BFC address`, () => {
      const generatedHexAddress = publicKeyToAddress(publicKey);
      const generatedBfcAddress = hex2BfcAddress(generatedHexAddress);

      expect(generatedHexAddress).toBe(hexAddress);
      expect(generatedBfcAddress).toBe(bfcAddress);
    });
  });
});
