import { computeSignTxRoundLimit } from '../btc';

import type { BtcRefTransaction } from '@onekeyfe/hwk-adapter-core';

const makeRefTx = (inputs: number, outputs: number): BtcRefTransaction =>
  ({
    hash: '00'.repeat(32),
    version: 1,
    inputs: Array.from({ length: inputs }, () => ({
      prevHash: '00'.repeat(32),
      prevIndex: 0,
      script: '',
      sequence: 0xffffffff,
    })),
    outputs: Array.from({ length: outputs }, () => ({
      amount: '0',
      scriptPubKey: '00',
    })),
    locktime: 0,
  } as BtcRefTransaction);

// Conservative model of the rounds a device actually drives: current tx pieces
// (re-streamed once per signing pass on legacy) + each input walking its full
// referenced prev-tx (meta + in/outs).
const realisticRounds = (inputs: number, outputs: number, refIns: number, refOuts: number) =>
  inputs * (inputs + outputs) + inputs * (1 + refIns + refOuts) + outputs + 2;

describe('computeSignTxRoundLimit', () => {
  const OLD_FORMULA = (i: number, o: number) => (i + o + 1) * 8 + 64;

  it('covers a small tx spending a LARGE prev-tx (the N3 false-negative)', () => {
    // 2-in/2-out spending a 200-output exchange payout — the case the old
    // formula rejected.
    const refTx = makeRefTx(1, 200);
    const limit = computeSignTxRoundLimit(2, 2, [refTx, refTx], 0);
    const need = realisticRounds(2, 2, 1, 200);

    expect(OLD_FORMULA(2, 2)).toBeLessThan(need); // old cap would throw
    expect(limit).toBeGreaterThan(need); // new cap clears it
  });

  it('covers a legacy many-input tx (O(inputs²) re-streaming)', () => {
    const refTxs = Array.from({ length: 50 }, () => makeRefTx(1, 2));
    const limit = computeSignTxRoundLimit(50, 2, refTxs, 0);
    const need = realisticRounds(50, 2, 1, 2);

    expect(limit).toBeGreaterThan(need);
  });

  it('stays finite/positive with no refTxs and grows with prev-tx size', () => {
    const small = computeSignTxRoundLimit(1, 1, [makeRefTx(1, 1)], 0);
    const large = computeSignTxRoundLimit(1, 1, [makeRefTx(1, 500)], 0);
    expect(small).toBeGreaterThan(0);
    expect(large).toBeGreaterThan(small);
  });
});
