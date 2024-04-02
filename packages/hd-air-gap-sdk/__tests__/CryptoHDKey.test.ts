import { CryptoCoinInfo, CryptoHDKey, CryptoKeypath, Network, PathComponent, Type } from '../src';
import { URRegistryDecoder } from '../src/URRegistryDecoder';

describe('CryptoHDKey', () => {
  test('encode', () => {
    const decoder = new URRegistryDecoder();
    // Mnemonic words: all all all all all all all all all all all all
    // Path: m/44'/60'/0'
    decoder.receivePart(
      'UR:CRYPTO-HDKEY/PTAOWKAXHDCLAXTADPZSWNCLPRJPFSBAJNPYPRIAKGDPNDDNFRDPLADSPYMHCTDPWFWYOTYNTDAESOAAHDCXROVOKKDSMWOYMDTPJLWMNNCEDIVLFPBZIOBZLKBYHGVDYTMOOXBGGTHDBSUEVWPFAHTAADEHOYADCSFNAMTAADDYOTADLNCSDWYKCSFNYKAEYKAOCYHHNNCPLGAXAXATTAADDYOEADLRAEWKLAWKAXAEAYCYHSGLPFZMASIYGWJTIHGRIHKKBKJOHSIAIAJLKPJTJYDMJKJYHSJTIEHSJPIEZSDWTDLB'
    );
    const cryptoAccount = decoder.resultRegistryType() as CryptoHDKey;
    expect(cryptoAccount).toBeDefined();
    expect(cryptoAccount.getBip32Key()).toBe(
      'xpub6CNFa58kEQJu2hwMVoofpDEKVVSg6gfwqBqE2zHAianaUnQkrJzJJ42iLDp7Dmg2aP88qCKoFZ4jidk3tECdQuF4567NGHDfe7iBRwHxgke'
    );
  });

  test('decode', () => {
    const cryptoAccount = new CryptoHDKey({
      isMaster: false,
      isPrivateKey: false,
      key: Buffer.from('03d92dfaf121b2723d0e6dabb2637b2d9b2b3b2d8026ab901f2df3eea3f6d200c9', 'hex'),
      chainCode: Buffer.from(
        'b8e2792694a195d86feb9e1c27e3411567158c1157e7f992a4124d580fdee5b0',
        'hex'
      ),
      useInfo: new CryptoCoinInfo(Type.ethereum, Network.mainnet),
      origin: new CryptoKeypath(
        [
          new PathComponent({ index: 44, hardened: true }),
          new PathComponent({ index: 60, hardened: true }),
          new PathComponent({ index: 0, hardened: true }),
        ],
        Buffer.from('5c9e228d', 'hex'),
        3
      ),
      children: new CryptoKeypath(
        [new PathComponent({ index: 0, hardened: false }), new PathComponent({ hardened: false })],
        undefined,
        0
      ),
      parentFingerprint: Buffer.from('614eb0ff', 'hex'), // 4 bytes
      name: 'OneKey',
      note: 'account.standard',
    });

    const encoded = cryptoAccount.toUREncoder(300).encodeWhole().join('')?.toUpperCase();
    expect(encoded).toBe(
      'UR:CRYPTO-HDKEY/PTAOWKAXHDCLAXTADPZSWNCLPRJPFSBAJNPYPRIAKGDPNDDNFRDPLADSPYMHCTDPWFWYOTYNTDAESOAAHDCXROVOKKDSMWOYMDTPJLWMNNCEDIVLFPBZIOBZLKBYHGVDYTMOOXBGGTHDBSUEVWPFAHTAADEHOYADCSFNAMTAADDYOTADLNCSDWYKCSFNYKAEYKAOCYHHNNCPLGAXAXATTAADDYOEADLRAEWKLAWKAXAEAYCYHSGLPFZMASIYGWJTIHGRIHKKBKJOHSIAIAJLKPJTJYDMJKJYHSJTIEHSJPIEZSDWTDLB'
    );
  });
});
