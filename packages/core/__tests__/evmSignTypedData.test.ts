import EVMSignTypedData from '../src/api/evm/EVMSignTypedData';

import type { EthereumSignTypedDataMessage, EthereumSignTypedDataTypes } from '../src/types';

// Mock the config module to avoid package.json resolution issues
jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

jest.mock('../src/data-manager/TransportManager', () => ({
  getProtocolV1MessageSchema: jest.fn(() => 'v1CurrentSchema'),
}));

jest.mock('../src/device/Device', () => ({
  Device: jest.fn(),
}));

function createMethod(
  data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>,
  metamaskV4Compat = true
): EVMSignTypedData {
  const method = new EVMSignTypedData({
    id: 1,
    payload: {
      method: 'evmSignTypedData',
      path: "m/44'/60'/0'/0/0",
      metamaskV4Compat,
      data,
      domainHash: '0xabcd',
      messageHash: '0x1234',
    },
  });
  method.device = {
    commands: { typedCall: { bind: jest.fn() } },
  } as any;
  method.init();
  return method;
}

function baseDomain(): { EIP712Domain: { name: string; type: string }[] } {
  return { EIP712Domain: [{ name: 'name', type: 'string' }] };
}

describe('EVMSignTypedData — hasClassicFamilyTypedDataFormatViolations', () => {
  // ─── early return ───
  describe('early return', () => {
    it('returns false when types is missing', () => {
      const method = createMethod({ primaryType: 'Foo', domain: {}, message: {} } as any);
      expect(method.hasClassicFamilyTypedDataFormatViolations({} as any)).toBe(false);
    });

    it('returns false when primaryType is missing', () => {
      const method = createMethod({
        types: baseDomain(),
        domain: {},
        message: {},
      } as any);
      expect(method.hasClassicFamilyTypedDataFormatViolations({ types: baseDomain() } as any)).toBe(
        false
      );
    });
  });

  // ─── struct fields ───
  describe('struct fields limit (16)', () => {
    it('returns false with exactly 16 fields', () => {
      const fields = Array.from({ length: 16 }, (_, i) => ({
        name: `f${i}`,
        type: 'uint256',
      }));
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: { ...baseDomain(), MyStruct: fields },
        primaryType: 'MyStruct',
        domain: { name: 'test' },
        message: Object.fromEntries(fields.map(f => [f.name, '1'])),
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(false);
    });

    it('returns true with 17 fields', () => {
      const fields = Array.from({ length: 17 }, (_, i) => ({
        name: `f${i}`,
        type: 'uint256',
      }));
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: { ...baseDomain(), MyStruct: fields },
        primaryType: 'MyStruct',
        domain: { name: 'test' },
        message: Object.fromEntries(fields.map(f => [f.name, '1'])),
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(true);
    });
  });

  // ─── name length ───
  describe('name length limit (63)', () => {
    it('returns false with 63-char type name', () => {
      const longName = 'A'.repeat(63);
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: { ...baseDomain(), [longName]: [{ name: 'x', type: 'uint256' }] },
        primaryType: longName,
        domain: { name: 'test' },
        message: { x: '1' },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(false);
    });

    it('returns true with 64-char type name', () => {
      const longName = 'A'.repeat(64);
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: { ...baseDomain(), [longName]: [{ name: 'x', type: 'uint256' }] },
        primaryType: longName,
        domain: { name: 'test' },
        message: { x: '1' },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(true);
    });

    it('returns true with 64-char field name', () => {
      const longFieldName = 'f'.repeat(64);
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: { ...baseDomain(), Foo: [{ name: longFieldName, type: 'uint256' }] },
        primaryType: 'Foo',
        domain: { name: 'test' },
        message: { [longFieldName]: '1' },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(true);
    });
  });

  // ─── access path depth ───
  describe('access path depth limit (6)', () => {
    it('returns false for depth exactly 6 (root + domain + 4 nested structs)', () => {
      // depth: root(1) + EIP712Domain or primaryType
      // primaryType path: root(1) + D(1) + C(1) + B(1) + A(1) + uint256(1) = 6
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: {
          ...baseDomain(),
          D: [{ name: 'c', type: 'C' }],
          C: [{ name: 'b', type: 'B' }],
          B: [{ name: 'a', type: 'A' }],
          A: [{ name: 'val', type: 'uint256' }],
        },
        primaryType: 'D',
        domain: { name: 'test' },
        message: { c: { b: { a: { val: '1' } } } },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(false);
    });

    it('returns true when depth exceeds 6', () => {
      // depth: root(1) + E(1) + D(1) + C(1) + B(1) + A(1) + uint256(1) = 7
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: {
          ...baseDomain(),
          E: [{ name: 'd', type: 'D' }],
          D: [{ name: 'c', type: 'C' }],
          C: [{ name: 'b', type: 'B' }],
          B: [{ name: 'a', type: 'A' }],
          A: [{ name: 'val', type: 'uint256' }],
        },
        primaryType: 'E',
        domain: { name: 'test' },
        message: { d: { c: { b: { a: { val: '1' } } } } },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(true);
    });

    it('returns true for cyclic type references', () => {
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: {
          ...baseDomain(),
          NodeA: [{ name: 'next', type: 'NodeB' }],
          NodeB: [{ name: 'next', type: 'NodeA' }],
        },
        primaryType: 'NodeA',
        domain: { name: 'test' },
        message: { next: { next: {} } },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(true);
    });
  });

  // ─── custom dependency structs ───
  describe('custom dependency structs limit (8)', () => {
    it('returns false with exactly 8 dep structs', () => {
      const types: EthereumSignTypedDataTypes = { ...baseDomain() };
      const message: Record<string, string> = {};
      const fields: { name: string; type: string }[] = [];
      for (let i = 1; i <= 8; i++) {
        const depName = `Dep${i}`;
        types[depName] = [{ name: 'v', type: 'uint256' }];
        fields.push({ name: `d${i}`, type: depName });
        message[`d${i}`] = JSON.stringify({ v: '1' });
      }
      types.Root = fields;
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types,
        primaryType: 'Root',
        domain: { name: 'test' },
        message,
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(false);
    });

    it('returns true with 9 dep structs', () => {
      const types: EthereumSignTypedDataTypes = { ...baseDomain() };
      const message: Record<string, string> = {};
      const fields: { name: string; type: string }[] = [];
      for (let i = 1; i <= 9; i++) {
        const depName = `Dep${i}`;
        types[depName] = [{ name: 'v', type: 'uint256' }];
        fields.push({ name: `d${i}`, type: depName });
        message[`d${i}`] = JSON.stringify({ v: '1' });
      }
      types.Root = fields;
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types,
        primaryType: 'Root',
        domain: { name: 'test' },
        message,
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(true);
    });
  });

  // ─── dynamic value size (string) ───
  describe('dynamic value size — string (1536 bytes)', () => {
    it('returns false with exactly 1536 bytes', () => {
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: { ...baseDomain(), Note: [{ name: 'text', type: 'string' }] },
        primaryType: 'Note',
        domain: { name: 'test' },
        message: { text: 'a'.repeat(1536) },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(false);
    });

    it('returns true with 1537 bytes', () => {
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: { ...baseDomain(), Note: [{ name: 'text', type: 'string' }] },
        primaryType: 'Note',
        domain: { name: 'test' },
        message: { text: 'a'.repeat(1537) },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(true);
    });
  });

  // ─── dynamic value size (bytes) ───
  describe('dynamic value size — bytes (1536 bytes)', () => {
    it('returns false with exactly 1536 bytes hex', () => {
      // 1536 bytes = 3072 hex chars
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: { ...baseDomain(), Blob: [{ name: 'raw', type: 'bytes' }] },
        primaryType: 'Blob',
        domain: { name: 'test' },
        message: { raw: `0x${'ab'.repeat(1536)}` },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(false);
    });

    it('returns true with 1537 bytes hex', () => {
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: { ...baseDomain(), Blob: [{ name: 'raw', type: 'bytes' }] },
        primaryType: 'Blob',
        domain: { name: 'test' },
        message: { raw: `0x${'ab'.repeat(1537)}` },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(true);
    });

    it('returns false for bytes without 0x prefix at exactly 1536 bytes', () => {
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: { ...baseDomain(), Blob: [{ name: 'raw', type: 'bytes' }] },
        primaryType: 'Blob',
        domain: { name: 'test' },
        message: { raw: 'ab'.repeat(1536) },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(false);
    });
  });

  // ─── array elements ───
  describe('array elements limit (24)', () => {
    it('returns false with 24 primitive elements', () => {
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: { ...baseDomain(), List: [{ name: 'items', type: 'uint256[]' }] },
        primaryType: 'List',
        domain: { name: 'test' },
        message: { items: Array.from({ length: 24 }, (_, i) => String(i)) },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(false);
    });

    it('returns true with 25 primitive elements', () => {
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: { ...baseDomain(), List: [{ name: 'items', type: 'uint256[]' }] },
        primaryType: 'List',
        domain: { name: 'test' },
        message: { items: Array.from({ length: 25 }, (_, i) => String(i)) },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(true);
    });

    it('returns true with 25 struct elements in V4 mode', () => {
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: {
          ...baseDomain(),
          Item: [{ name: 'v', type: 'uint256' }],
          List: [{ name: 'items', type: 'Item[]' }],
        },
        primaryType: 'List',
        domain: { name: 'test' },
        message: { items: Array.from({ length: 25 }, () => ({ v: '1' })) },
      };
      const method = createMethod(data, true);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(true);
    });

    it('returns false with 25 struct elements in non-V4 mode', () => {
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: {
          ...baseDomain(),
          Item: [{ name: 'v', type: 'uint256' }],
          List: [{ name: 'items', type: 'Item[]' }],
        },
        primaryType: 'List',
        domain: { name: 'test' },
        message: { items: Array.from({ length: 25 }, () => ({ v: '1' })) },
      };
      const method = createMethod(data, false);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(false);
    });
  });

  // ─── array type fields ───
  describe('total array type fields limit (24)', () => {
    it('returns false with exactly 24 array type fields across structs', () => {
      const types: EthereumSignTypedDataTypes = { ...baseDomain() };
      // Spread 24 array fields across 2 structs (12 each) to stay under the 16-field limit
      const fieldsA: { name: string; type: string }[] = [];
      const fieldsB: { name: string; type: string }[] = [];
      for (let i = 0; i < 12; i++) {
        fieldsA.push({ name: `a${i}`, type: 'uint256[]' });
        fieldsB.push({ name: `b${i}`, type: 'uint256[]' });
      }
      types.PartA = fieldsA;
      types.PartB = fieldsB;
      types.Root = [
        { name: 'partA', type: 'PartA' },
        { name: 'partB', type: 'PartB' },
      ];
      const messageA: Record<string, string[]> = {};
      const messageB: Record<string, string[]> = {};
      fieldsA.forEach(f => {
        messageA[f.name] = ['1'];
      });
      fieldsB.forEach(f => {
        messageB[f.name] = ['1'];
      });
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types,
        primaryType: 'Root',
        domain: { name: 'test' },
        message: { partA: messageA, partB: messageB },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(false);
    });

    it('returns true with 25 array type fields', () => {
      const types: EthereumSignTypedDataTypes = { ...baseDomain() };
      const fieldsA: { name: string; type: string }[] = [];
      const fieldsB: { name: string; type: string }[] = [];
      const message: Record<string, unknown> = {};
      for (let i = 0; i < 13; i++) {
        fieldsA.push({ name: `a${i}`, type: 'uint256[]' });
        message[`a${i}`] = ['1'];
      }
      for (let i = 0; i < 12; i++) {
        fieldsB.push({ name: `b${i}`, type: 'uint256[]' });
      }
      types.PartA = fieldsA;
      types.PartB = fieldsB;
      types.Root = [
        { name: 'partA', type: 'PartA' },
        { name: 'partB', type: 'PartB' },
      ];
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types,
        primaryType: 'Root',
        domain: { name: 'test' },
        message: { partA: message, partB: {} },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(true);
    });
  });

  // ─── happy path — no violations ───
  describe('no violations', () => {
    it('returns false for a simple valid message', () => {
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: {
          ...baseDomain(),
          Transfer: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
        },
        primaryType: 'Transfer',
        domain: { name: 'MyApp' },
        message: {
          to: '0x1234567890123456789012345678901234567890',
          amount: '1000000',
        },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(false);
    });
  });

  // ─── dynamic value in nested struct ───
  describe('dynamic value in nested struct', () => {
    it('returns true when a nested struct field exceeds dynamic value limit', () => {
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: {
          ...baseDomain(),
          Inner: [{ name: 'memo', type: 'string' }],
          Outer: [{ name: 'inner', type: 'Inner' }],
        },
        primaryType: 'Outer',
        domain: { name: 'test' },
        message: { inner: { memo: 'x'.repeat(1537) } },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(true);
    });
  });

  // ─── array with nested struct containing large string ───
  describe('array with nested large value', () => {
    it('returns true when array entry struct has oversized string', () => {
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: {
          ...baseDomain(),
          Entry: [{ name: 'data', type: 'string' }],
          Root: [{ name: 'entries', type: 'Entry[]' }],
        },
        primaryType: 'Root',
        domain: { name: 'test' },
        message: {
          entries: [{ data: 'ok' }, { data: 'b'.repeat(1537) }],
        },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(true);
    });
  });

  // ─── depth with array type ───
  describe('depth counting with array types', () => {
    it('counts array as additional depth level', () => {
      // root(1) + Outer(1) + Inner[](1) + Inner(1) + Sub(1) + uint256(1) = 6 ✓ OK
      const data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = {
        types: {
          ...baseDomain(),
          Sub: [{ name: 'val', type: 'uint256' }],
          Inner: [{ name: 'sub', type: 'Sub' }],
          Outer: [{ name: 'inners', type: 'Inner[]' }],
        },
        primaryType: 'Outer',
        domain: { name: 'test' },
        message: { inners: [{ sub: { val: '1' } }] },
      };
      const method = createMethod(data);
      expect(method.hasClassicFamilyTypedDataFormatViolations(data)).toBe(false);
    });
  });
});

describe('EVMSignTypedData — OneKey Pro Safe Protocol V1', () => {
  it('收到 Pro 的 Safe 请求后按 EthereumGnosisSafeTxAck 字段回传', async () => {
    const data = {
      types: {
        EIP712Domain: [
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        SafeTx: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
          { name: 'operation', type: 'uint8' },
          { name: 'safeTxGas', type: 'uint256' },
          { name: 'baseGas', type: 'uint256' },
          { name: 'gasPrice', type: 'uint256' },
          { name: 'gasToken', type: 'address' },
          { name: 'refundReceiver', type: 'address' },
          { name: 'nonce', type: 'uint256' },
        ],
      },
      primaryType: 'SafeTx',
      domain: {
        chainId: '0x89',
        verifyingContract: '0x673f21761c5400531a37554a602fe0407addd0dd',
      },
      message: {
        to: '0x5618207d27d78f09f61a5d92190d58c453feb4b7',
        value: '1000',
        data: '0x001234',
        operation: '1',
        safeTxGas: '256',
        baseGas: '0',
        gasPrice: '15',
        gasToken: '0x0000000000000000000000000000000000000000',
        refundReceiver: '0x0000000000000000000000000000000000000000',
        nonce: '2',
      },
    } as EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>;
    const method = createMethod(data);
    const typedCall = jest.fn().mockResolvedValue({
      type: 'EthereumTypedDataSignatureOneKey',
      message: {
        address: '0x5618207d27d78f09f61a5d92190d58c453feb4b7',
        signature: 'abcd',
      },
    });

    const result = await method.handleSignTypedData({
      typedCall: typedCall as any,
      signData: data,
      response: { type: 'EthereumGnosisSafeTxRequest', message: {} } as any,
      supportTrezor: false,
    });

    expect(typedCall).toHaveBeenCalledWith(
      'EthereumGnosisSafeTxAck',
      ['EthereumTypedDataSignature', 'EthereumTypedDataSignatureOneKey'],
      {
        to: '0x5618207d27d78f09f61a5d92190d58c453feb4b7',
        value: '03e8',
        data: '1234',
        operation: 1,
        safeTxGas: '0100',
        baseGas: '00',
        gasPrice: '0f',
        gasToken: '0x0000000000000000000000000000000000000000',
        refundReceiver: '0x0000000000000000000000000000000000000000',
        nonce: '02',
        chain_id: 137,
        verifyingContract: '0x673f21761c5400531a37554a602fe0407addd0dd',
      }
    );
    expect(result).toEqual({
      address: '0x5618207d27d78f09f61a5d92190d58c453feb4b7',
      signature: 'abcd',
    });
  });
});
