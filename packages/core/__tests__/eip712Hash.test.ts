import { getEIP712Hashes } from '../src/api/evm/eip712Hash';

import type { EthereumSignTypedDataMessage, EthereumSignTypedDataTypes } from '../src/types';

// Large "Extended spot terms"-like payload (multi-KB string and bytes, signed ints,
// uint64 max, struct arrays, nested fixed arrays). Expected MetaMask V4 hashes were
// cross-checked against ethers@6.14.1 TypedDataEncoder.hashDomain / .hash.
const extendedLikePayload = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Leg: [
      { name: 'market', type: 'string' },
      { name: 'qty', type: 'int256' },
      { name: 'price', type: 'uint64' },
      { name: 'flag', type: 'bool' },
      { name: 'memo', type: 'bytes' },
      { name: 'tag', type: 'bytes4' },
    ],
    Terms: [
      { name: 'terms', type: 'string' },
      { name: 'legs', type: 'Leg[]' },
      { name: 'ids', type: 'uint256[]' },
      { name: 'matrix', type: 'uint8[2][]' },
      { name: 'owner', type: 'address' },
      { name: 'salt', type: 'bytes32' },
    ],
  },
  primaryType: 'Terms',
  domain: {
    name: 'Extended',
    version: '1',
    chainId: '0x1',
    verifyingContract: '0x1111111111111111111111111111111111111111',
  },
  message: {
    terms: '现货条款 '.repeat(800) + 'x'.repeat(3000),
    legs: [
      {
        market: 'BTC-USD',
        qty: '-12345678901234567890',
        price: '18446744073709551615',
        flag: true,
        memo: `0x${'ab'.repeat(2000)}`,
        tag: '0xdeadbeef',
      },
      { market: 'ETH-USD', qty: 5, price: 0, flag: false, memo: '0x', tag: '0x00000001' },
    ],
    ids: ['1', '0xff', 1000],
    matrix: [
      [1, 2],
      [3, 4],
    ],
    owner: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
    salt: `0x${'12'.repeat(32)}`,
  },
} as unknown as EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>;

describe('getEIP712Hashes — large payload fixture', () => {
  it('matches ethers TypedDataEncoder (MetaMask V4 semantics)', () => {
    expect(getEIP712Hashes(extendedLikePayload, true)).toEqual({
      domainHash: '0x23ef509150f4888ed437f1c597a38fb861222102de9e6eaef14c347e2c926176',
      messageHash: '0xd4131c91b1153aa2ce4b3d6a1972baa767282bac5d6125aa3a805e7feaceeb48',
    });
  });

  it('only changes the message hash for strict (non-V4) struct-array encoding', () => {
    const strict = getEIP712Hashes(extendedLikePayload, false);
    expect(strict.domainHash).toBe(
      '0x23ef509150f4888ed437f1c597a38fb861222102de9e6eaef14c347e2c926176'
    );
    expect(strict.messageHash).not.toBe(
      '0xd4131c91b1153aa2ce4b3d6a1972baa767282bac5d6125aa3a805e7feaceeb48'
    );
  });
});
