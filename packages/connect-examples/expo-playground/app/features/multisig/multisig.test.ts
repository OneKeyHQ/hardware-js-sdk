import { describe, expect, test } from '@jest/globals';

import { BUILT_IN_MULTISIG_CASES } from './cases';
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

  test('loads a complete three-signer ETH and BTC hardware matrix', () => {
    const ethCases = BUILT_IN_MULTISIG_CASES.filter(item =>
      item.id.startsWith('eth-generated-')
    );
    const btcCases = BUILT_IN_MULTISIG_CASES.filter(item =>
      item.id.startsWith('btc-generated-')
    );

    expect(ethCases).toHaveLength(6);
    expect(btcCases).toHaveLength(27);
    [...ethCases, ...btcCases].forEach(item => {
      expect(item.hardwareExpectation?.signerEnvKey).toMatch(/^MULTISIG_MNEMONIC_[123]$/);
      expect(item.title).toMatch(/Signer [123]/);
    });
  });

  test('generated continuation cases prefill another signer and keep the current slot empty', () => {
    const partialCases = BUILT_IN_MULTISIG_CASES.filter(item =>
      item.id.startsWith('btc-generated-') && item.id.includes('-continue-')
    );

    expect(partialCases).toHaveLength(9);
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
      expect(item.reference?.expectedSignatures).toHaveLength(3);
    });
  });

  test('all positive built-in cases pass local validation', () => {
    const positiveCases = BUILT_IN_MULTISIG_CASES.filter(item => !item.localOnly);
    const failures = positiveCases.flatMap(item =>
      validateMultisigCase(item).issues.map(issue => `${item.id}:${issue.path}:${issue.message}`)
    );

    expect(failures).toEqual([]);
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
