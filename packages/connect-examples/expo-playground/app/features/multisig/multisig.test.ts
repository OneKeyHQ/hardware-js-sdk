import { describe, expect, test } from '@jest/globals';

import { BUILT_IN_MULTISIG_CASES } from './cases';
import { GENERATED_MULTISIG_FIXTURES } from './generatedFixtures';
import { applyJsonDraft, cloneAsCustomCase, setByPath } from './editor';
import { loadCustomCases, saveCustomCases } from './storage';
import { validateMultisigCase } from './validation';

class MemoryStorage {
  private value: string | null = null;

  getItem() {
    return this.value;
  }

  setItem(_key: string, value: string) {
    this.value = value;
  }
}

describe('multisig test workbench domain', () => {
  test('provides unique built-in cases for all four hardware methods', () => {
    const ids = BUILT_IN_MULTISIG_CASES.map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(BUILT_IN_MULTISIG_CASES.map(item => item.method))).toEqual(
      new Set(['evmSignTypedData', 'evmSignTransaction', 'btcGetAddress', 'btcSignTransaction'])
    );
  });

  test('covers the three firmware bitcoin multisig script families', () => {
    const scriptTypes = BUILT_IN_MULTISIG_CASES.filter(item => item.chain === 'btc').flatMap(item => {
      const params = item.parameters as { scriptType?: string; inputs?: Array<{ script_type?: string }> };
      return [params.scriptType, params.inputs?.[0]?.script_type].filter(Boolean);
    });

    expect(new Set(scriptTypes)).toEqual(
      new Set(['SPENDMULTISIG', 'SPENDP2SHWITNESS', 'SPENDWITNESS'])
    );
  });

  test('只加载 signer 1 的 ETH 和 BTC 硬件用例', () => {
    const ethCases = BUILT_IN_MULTISIG_CASES.filter(item =>
      item.id.startsWith('eth-generated-')
    );
    const btcCases = BUILT_IN_MULTISIG_CASES.filter(item =>
      item.id.startsWith('btc-generated-')
    );

    expect(ethCases).toHaveLength(3);
    expect(btcCases).toHaveLength(12);
    [...ethCases, ...btcCases].forEach(item => {
      expect(item.hardwareExpectation?.signerIndex).toBe(0);
      expect(item.hardwareExpectation?.signerEnvKey).toBe('MULTISIG_MNEMONIC_1');
      expect(item.title).toContain('Signer 1');
    });
  });

  test('提交的 fixture 固定为真机预置的 Signer 1 身份', () => {
    const signer1Addresses = GENERATED_MULTISIG_FIXTURES.eth.map(
      fixture => fixture.reference.signerAddresses[0]
    );

    expect(new Set(signer1Addresses)).toEqual(
      new Set(['0x5618207d27D78F09f61A5D92190d58c453feB4b7'])
    );
  });

  test('覆盖 Safe 的 ERC20、EIP-1559、approveHash 和 DelegateCall 用例', () => {
    const expectedIds = [
      'eth-generated-erc20-transfer-signer-1',
      'eth-safe-calldata-eip1559',
      'eth-safe-approve-hash',
      'eth-safe-calldata-delegate-call',
    ];

    expectedIds.forEach(id => {
      const testCase = BUILT_IN_MULTISIG_CASES.find(item => item.id === id);
      expect(testCase).toBeDefined();
      expect(testCase?.hardwareExpectation).toMatchObject({
        signerIndex: 0,
        signerEnvKey: 'MULTISIG_MNEMONIC_1',
      });
      expect(testCase?.title).toContain('Signer 1');
    });

    const eip1559 = BUILT_IN_MULTISIG_CASES.find(
      item => item.id === 'eth-safe-calldata-eip1559'
    )?.parameters.transaction as Record<string, unknown>;
    expect(eip1559).toMatchObject({
      maxFeePerGas: '0x77359400',
      maxPriorityFeePerGas: '0x3b9aca00',
    });
    expect(eip1559.gasPrice).toBeUndefined();

    const approveHash = BUILT_IN_MULTISIG_CASES.find(
      item => item.id === 'eth-safe-approve-hash'
    )?.parameters.transaction as { data: string };
    expect(approveHash.data).toMatch(/^0xd4d9bdcd[0-9a-f]{64}$/);

    const delegateCall = BUILT_IN_MULTISIG_CASES.find(
      item => item.id === 'eth-safe-calldata-delegate-call'
    )?.parameters.transaction as { data: string };
    expect(delegateCall.data.slice(10 + 3 * 64, 10 + 4 * 64)).toBe(
      '1'.padStart(64, '0')
    );
  });

  test('包含 Signer 1 的 P2WSH 2-of-2 非零地址索引用例', () => {
    const addressCase = BUILT_IN_MULTISIG_CASES.find(
      item => item.id === 'btc-generated-p2wsh-2of2-index2-address-signer-1'
    );

    expect(addressCase).toBeDefined();
    expect(addressCase).toMatchObject({
      title: 'P2WSH · Index 2 2-of-2 地址 · Signer 1',
      method: 'btcGetAddress',
      hardwareExpectation: {
        signerIndex: 0,
        signerEnvKey: 'MULTISIG_MNEMONIC_1',
        signerAddress: '15czspQVjfNWgQab4RwXaCtXgfG6tfqwug',
        expectedAddress: 'bc1qyjgph6g5ta9r5qv04lmaqxwxfn3ynesvdsy84uwme66l5u7za3tqnrfq4l',
      },
      parameters: {
        path: "m/48'/0'/0'/2'/0/2",
        scriptType: 'SPENDWITNESS',
        multisig: { m: 2, signatures: ['', ''] },
      },
    });
    expect(
      (addressCase?.parameters.multisig as { pubkeys: unknown[] }).pubkeys
    ).toHaveLength(2);
  });

  test('generated continuation cases prefill another signer and keep the current slot empty', () => {
    const partialCases = BUILT_IN_MULTISIG_CASES.filter(item =>
      item.id.startsWith('btc-generated-') && item.id.includes('-continue-')
    );

    expect(partialCases).toHaveLength(4);
    partialCases.forEach(item => {
      const parameters = item.parameters as {
        inputs: Array<{ multisig: { signatures: string[] } }>;
      };
      const signatures = parameters.inputs[0].multisig.signatures;
      const signerIndex = item.hardwareExpectation!.signerIndex;
      expect(signatures[signerIndex]).toBe('');
      expect(signatures.filter(Boolean)).toHaveLength(1);
      expect(item.hardwareExpectation?.prefilledSignerIndex).not.toBe(signerIndex);
      expect(item.reference?.broadcastable).toBe(false);
      expect(item.reference?.expectedSignatures).toHaveLength(
        parameters.inputs[0].multisig.signatures.length
      );
    });
  });

  test('all positive built-in cases pass local validation', () => {
    const positiveCases = BUILT_IN_MULTISIG_CASES.filter(item => !item.localOnly);
    const failures = positiveCases.flatMap(item =>
      validateMultisigCase(item).issues.map(issue => `${item.id}:${issue.path}:${issue.message}`)
    );

    expect(failures).toEqual([]);
  });

  test('硬件多签基准用例默认使用测试助记词的标准钱包', () => {
    const hardwareCases = BUILT_IN_MULTISIG_CASES.filter(item => !item.localOnly);

    hardwareCases.forEach(item => {
      expect(item.parameters.useEmptyPassphrase).toBe(true);
    });
  });

  test('rejects an invalid bitcoin multisig threshold', () => {
    const source = BUILT_IN_MULTISIG_CASES.find(
      item => item.id === 'btc-generated-p2wsh-address-signer-1'
    );
    expect(source).toBeDefined();

    const invalid = {
      ...source!,
      parameters: setByPath(source!.parameters, ['multisig', 'm'], 4),
    };

    expect(validateMultisigCase(invalid)).toEqual({
      valid: false,
      issues: [{ path: 'multisig.m', message: '签名阈值必须在 1 到公钥数量之间' }],
    });
  });

  test('applies valid JSON without mutating the source parameters', () => {
    const source = BUILT_IN_MULTISIG_CASES[0];
    const original = JSON.stringify(source.parameters);
    const nextParameters = {
      ...source.parameters,
      path: "m/44'/60'/0'/0/9",
    };
    const result = applyJsonDraft(JSON.stringify(nextParameters), source);

    expect(result.issues).toEqual([]);
    expect(result.parameters).toEqual(nextParameters);
    expect(JSON.stringify(source.parameters)).toBe(original);
  });

  test('keeps the last valid parameters when JSON is invalid', () => {
    const source = BUILT_IN_MULTISIG_CASES[0];
    const result = applyJsonDraft('{"path":', source);

    expect(result.parameters).toBeUndefined();
    expect(result.issues[0]).toEqual({ path: '$', message: 'JSON 格式无效' });
  });

  test('clones built-in cases into editable custom cases', () => {
    const clone = cloneAsCustomCase(BUILT_IN_MULTISIG_CASES[0], 'custom-1', '回归副本');

    expect(clone.id).toBe('custom-1');
    expect(clone.title).toBe('回归副本');
    expect(clone.source).toBe('custom');
    expect(clone.builtIn).toBe(false);
    expect(clone.parameters).not.toBe(BUILT_IN_MULTISIG_CASES[0].parameters);
  });

  test('persists only valid custom cases and degrades damaged storage to an empty list', () => {
    const storage = new MemoryStorage();
    const custom = cloneAsCustomCase(BUILT_IN_MULTISIG_CASES[0], 'custom-1');

    saveCustomCases(storage, [custom, BUILT_IN_MULTISIG_CASES[0]]);
    expect(loadCustomCases(storage)).toEqual([custom]);

    storage.setItem('ignored', '{broken');
    expect(loadCustomCases(storage)).toEqual([]);
  });
});
