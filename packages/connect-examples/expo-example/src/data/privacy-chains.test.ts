import { describe, expect, test } from '@jest/globals';
import { getMethodSupportedProtocols } from '@onekeyfe/hd-core';

import zcash from './zcash';
import monero from './monero';
import singleInput from './fixtures/monero-1-inputs.json';
import twoInputs from './fixtures/monero-2-inputs.json';
import { chainTestData } from '../testTools/chainMethodTest/data';

import type { PlaygroundProps } from '../components/Playground';

describe('API Payload privacy chain methods', () => {
  test.each([singleInput, twoInputs])(
    'uses nonempty key image transfers from the matching static signing inputs',
    template => {
      const preset = monero.find(entry => entry.method === 'moneroKeyImageSync')?.presupposes?.[
        template.inputs.length - 1
      ];
      expect(preset?.prepareSample).toBeInstanceOf(Function);
      const params = preset?.value;
      expect(params.transfers.length).toBe(template.inputs.length);
      expect(params.path).toBe(template.path);
      expect(params.networkType).toBe(template.networkType);
      template.inputs.forEach((input, index) => {
        const transfer = params.transfers[index];
        expect(transfer.outKey === input.outputs[input.real_output].key.dest).toBe(true);
        expect(transfer.txPubKey === input.real_out_tx_key).toBe(true);
        expect(transfer.internalOutputIndex).toBe(input.real_output_in_tx_index);
        expect(transfer.additionalTxPubKeys).toEqual(input.real_out_additional_tx_keys);
        expect(transfer.subAddrMajor).toBe(template.tsxData.account);
        expect(transfer.subAddrMinor).toBe(input.subaddr_minor);
      });
    }
  );

  test.each<[PlaygroundProps[], string[]]>([
    [zcash, ['zcashGetAddress', 'zcashGetFullViewingKey', 'zcashSignPczt']],
    [
      monero,
      ['moneroGetAddress', 'moneroGetWatchKey', 'moneroKeyImageSync', 'moneroSignTransaction'],
    ],
  ])('registers the public Core methods', (api, methods) => {
    expect(api.map(entry => entry.method)).toEqual(methods);
    api.forEach(entry =>
      expect(getMethodSupportedProtocols(entry.method).length).toBeGreaterThan(0)
    );
  });

  test('uses the latest address contract without the removed UFVK option', () => {
    const presets = zcash.find(entry => entry.method === 'zcashGetAddress')?.presupposes;
    if (!presets?.length) throw new Error('Missing Zcash address presets');
    presets.forEach(preset => {
      const items = preset.value.bundle ?? [preset.value];
      items.forEach((item: Record<string, unknown>) => {
        expect(item).not.toHaveProperty('includeUfvk');
      });
    });
    expect(presets.some(preset => preset.value.includeSeedFingerprint === true)).toBe(true);
  });

  test('provides separate confirmed UFVK exports for one account and a bundle', () => {
    const entry = zcash.find(item => item.method === 'zcashGetFullViewingKey');
    const presets = entry?.presupposes;
    if (!presets?.length) throw new Error('Missing Zcash viewing key presets');
    expect(presets.map(preset => preset.value.bundle?.length ?? 1)).toEqual([1, 2]);
    expect(getMethodSupportedProtocols('zcashGetFullViewingKey')).toEqual(['V2']);
    presets.forEach(preset => {
      expect(preset.prepareSample).toBeUndefined();
      const items = preset.value.bundle ?? [preset.value];
      expect(items).toEqual(
        Array.from({ length: items.length }, (_, account) => ({ path: `m/32'/133'/${account}'` }))
      );
    });
  });

  test.each<[string, string, RegExp]>([
    ['ZEC', 'zcashGetAddress', /^m\/32'\/133'\/\d+'$/],
    ['XMR', 'moneroGetAddress', /^m\/44'\/128'\/\d+'$/],
  ])('keeps %s batch tests on address-only presets', (symbol, method, pattern) => {
    const chain = chainTestData.find(entry => entry.symbol === symbol);
    expect(chain?.data.map(entry => entry.method)).toEqual([method]);
    const presets = chain?.data[0].presupposes;
    expect(presets?.length).toBeGreaterThan(1);
    presets?.forEach(preset => {
      const items = preset.value.bundle ?? [preset.value];
      items.forEach((item: { path: string }) => expect(item.path).toMatch(pattern));
    });
  });
});
