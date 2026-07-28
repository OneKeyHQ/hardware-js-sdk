import type { KaspaSignInputParams, KaspaSignOutputParams } from '../src/types';

const input: KaspaSignInputParams = {
  path: "m/44'/111111'/0'/0/0",
  prevTxId: 'aa'.repeat(32),
  outputIndex: 0,
  sequenceNumber: 0,
  output: { satoshis: 200000 },
};

const output: KaspaSignOutputParams = {
  satoshis: 100000,
  address: 'kaspa:example',
};

export { input, output };
