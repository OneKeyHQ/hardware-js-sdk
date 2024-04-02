import { URRegistryDecoder } from '../URRegistryDecoder';
import { CryptoHDKey } from '../registry';

describe('CryptoHDKey', () => {
  test('encode', () => {
    const decoder = new URRegistryDecoder();
    decoder.receivePart(
      'UR:CRYPTO-HDKEY/PTAOWKAXHDCLAOVSBAPEJOLYSNPRTYSGATEEBAJLDYBKMKVSPRWNGMAHJTSTPRMHYTHKAXCEIAFEGWAAHDCXJPMHURTLNNYKHGZCOTTIJEFNCPROPYDYLKGSCSMKAYSTRLBGJLGSGLVODPPAWFVLAHTAADEHOEADCSFNAOAEAMTAADDYOTADLNCSDWYKCSFNYKAEYKAOCYTIZSYLCNAXAXATTAADDYOEADLRAEWKLAWKAXAEAYCYTENNASHHASIYGWJTIHGRIHKKBKJOHSIAIAJLKPJTJYDMJKJYHSJTIEHSJPIETEGRMOKP'
    );
    const cryptoAccount = decoder.resultRegistryType() as CryptoHDKey;
    expect(cryptoAccount).toBeDefined();

    // expect(sum(1, 2)).toBe(3);
  });
});
