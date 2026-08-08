import { outputToTrezor } from '../btc';
import { buildContractMessage } from '../tron';

import type { BtcTxOutput, TronContract } from '@onekeyfe/hwk-adapter-core';

const TRON_ADDR = `41${'a'.repeat(40)}`;

/**
 * Reject conflicting mutually-exclusive fields instead of silently picking one.
 * Parity with hd-core / Trezor Suite; the exactly-one happy path is unchanged.
 */
describe('btc outputToTrezor exactly-one target', () => {
  it('accepts a single target (unchanged behavior)', () => {
    const opReturn = outputToTrezor({ opReturnData: 'aa', amount: '0' } as BtcTxOutput);
    expect(opReturn.script_type).toBe('PAYTOOPRETURN');

    const external = outputToTrezor({ address: 'bc1qexample', amount: '1000' } as BtcTxOutput);
    expect(external.address).toBe('bc1qexample');
    expect(external.script_type).toBe('PAYTOADDRESS');
  });

  it('rejects address + opReturnData in one output', () => {
    expect(() =>
      outputToTrezor({ address: 'bc1qexample', opReturnData: 'aa', amount: '0' } as BtcTxOutput)
    ).toThrow(/exactly one of opReturnData, address, or path/);
  });

  it('rejects address + path in one output', () => {
    expect(() =>
      outputToTrezor({
        address: 'bc1qexample',
        path: "m/84'/0'/0'/1/0",
        amount: '1000',
      } as BtcTxOutput)
    ).toThrow(/exactly one/);
  });
});

describe('tron buildContractMessage exactly-one contract', () => {
  it('accepts a single contract (unchanged behavior)', () => {
    const { messageName } = buildContractMessage(
      { transferContract: { toAddress: TRON_ADDR, amount: '1' } } as TronContract,
      TRON_ADDR
    );
    expect(messageName).toBe('TronTransferContract');
  });

  it('rejects two contract types in one request', () => {
    expect(() =>
      buildContractMessage(
        {
          transferContract: { toAddress: TRON_ADDR, amount: '1' },
          freezeBalanceV2Contract: { balance: 1 },
        } as TronContract,
        TRON_ADDR
      )
    ).toThrow(/exactly one contract type/);
  });
});
