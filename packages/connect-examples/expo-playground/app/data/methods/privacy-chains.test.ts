import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, test } from '@jest/globals';
import { getMethodSupportedProtocols } from '@onekeyfe/hd-core';

import { zcash } from './zcash';
import { monero } from './monero';
import { signerMethodsRegistry } from '../../hooks/useMethodsRegistry';
import { parseParameterValue } from '../../utils/parameterUtils';
import transparent from '../../../../expo-example/src/data/fixtures/zcash-transparent.json';
import orchard from '../../../../expo-example/src/data/fixtures/zcash-orchard.json';
import ironwood from '../../../../expo-example/src/data/fixtures/zcash-ironwood.json';
import singleInput from '../../../../expo-example/src/data/fixtures/monero-1-inputs.json';
import twoInputs from '../../../../expo-example/src/data/fixtures/monero-2-inputs.json';

import type { MethodPreset } from '../types';

const parameters = (preset: MethodPreset): Record<string, unknown> =>
  Object.fromEntries(preset.parameters.map(field => [field.name, field.value]));

describe('Playground static privacy chain methods', () => {
  test.each<[typeof zcash | typeof monero, string[]]>([
    [zcash, ['zcashGetAddress', 'zcashGetFullViewingKey', 'zcashSignPczt']],
    [
      monero,
      ['moneroGetAddress', 'moneroGetWatchKey', 'moneroKeyImageSync', 'moneroSignTransaction'],
    ],
  ])('registers every public API without a preparation hook', (chain, methods) => {
    expect(signerMethodsRegistry.getChainMethods(chain.id).map(entry => entry.method)).toEqual(
      methods
    );
    chain.api.forEach(entry => {
      expect(getMethodSupportedProtocols(entry.method).length).toBeGreaterThan(0);
      expect(entry).not.toHaveProperty('prepareSample');
      entry.presets.forEach(preset => expect(preset).not.toHaveProperty('prepareSample'));
      expect(signerMethodsRegistry.searchMethods(entry.method)).toContain(entry);
    });
    const source = readFileSync(resolve(__dirname, `${chain.id}.ts`), 'utf8');
    expect(source).not.toMatch(/manualSigning|prepareSample|readDevice|executeMethod/);
  });

  test('keeps the existing common chains first and the two additions in name order', () => {
    const chains = signerMethodsRegistry.chains.map(chain => chain.id);
    expect(chains.slice(0, 5)).toEqual(['bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot']);
    expect(chains.indexOf('monero')).toBeLessThan(chains.indexOf('zcash'));
  });

  test.each<[string, unknown]>([
    ['tsxData', { num_inputs: 1, fee: '1' }],
    ['transfers', [{ internalOutputIndex: 0 }]],
  ])('parses edited %s JSON before submitting the API parameters', (name, value) => {
    expect(parseParameterValue(name, JSON.stringify(value))).toEqual(value);
  });

  test('separates Zcash address retrieval from confirmed viewing key export', () => {
    const address = zcash.api.find(entry => entry.method === 'zcashGetAddress');
    expect(address?.presets[0].parameters.map(field => field.name)).not.toContain('includeUfvk');
    expect(address?.presets[0].parameters.map(field => field.name)).toContain(
      'includeSeedFingerprint'
    );
    const viewing = zcash.api.find(entry => entry.method === 'zcashGetFullViewingKey');
    expect(viewing?.presets.map(parameters)).toEqual([
      { path: "m/32'/133'/0'" },
      { bundle: [{ path: "m/32'/133'/0'" }, { path: "m/32'/133'/1'" }] },
    ]);
    expect(getMethodSupportedProtocols('zcashGetFullViewingKey')).toEqual(['V2']);
  });

  test('uses the existing fixed transparent and shielded PCZT bytes unchanged', () => {
    const signing = zcash.api.find(entry => entry.method === 'zcashSignPczt');
    if (!signing) throw new Error('Missing Zcash signing method');
    const expected = [transparent.pczt, orchard.pczt, ironwood.pczt, '00'];
    expect(signing.presets.length).toBe(expected.length);
    signing.presets.forEach((preset, index) => {
      expect(parameters(preset).pczt === expected[index]).toBe(true);
    });
  });

  test.each([singleInput, twoInputs])(
    'uses fixed Monero inputs and nonempty transfers',
    template => {
      const index = template.inputs.length - 1;
      const signing = monero.api.find(entry => entry.method === 'moneroSignTransaction');
      const sync = monero.api.find(entry => entry.method === 'moneroKeyImageSync');
      if (!signing || !sync) throw new Error('Missing Monero methods');
      const transaction = parameters(signing.presets[index]);
      expect(
        transaction.tsxData === template.tsxData && transaction.inputs === template.inputs
      ).toBe(true);
      const { transfers } = parameters(sync.presets[index]);
      if (!Array.isArray(transfers)) throw new Error('Missing transfers');
      expect(transfers.length).toBe(template.inputs.length);
      template.inputs.forEach((input, inputIndex) => {
        expect(transfers[inputIndex].outKey === input.outputs[input.real_output].key.dest).toBe(
          true
        );
        expect(transfers[inputIndex].txPubKey === input.real_out_tx_key).toBe(true);
        expect(transfers[inputIndex].internalOutputIndex).toBe(input.real_output_in_tx_index);
      });
    }
  );
});
