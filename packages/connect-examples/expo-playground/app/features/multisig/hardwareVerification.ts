import { verify } from '@noble/secp256k1';
import { Signature, Transaction } from 'ethers';

import type {
  MultisigHardwareVerification,
  MultisigTestCase,
  MultisigVerificationCheck,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeHex(value: string): string {
  return value.replace(/^0x/i, '').toLowerCase();
}

function extractDerSignature(value: string): string | undefined {
  const normalized = normalizeHex(value);
  if (!/^[0-9a-f]+$/.test(normalized) || normalized.length < 4 || normalized.length % 2 !== 0) {
    return undefined;
  }
  if (!normalized.startsWith('30')) return undefined;

  const payloadLength = Number.parseInt(normalized.slice(2, 4), 16);
  const derLength = (payloadLength + 2) * 2;
  if (normalized.length === derLength) return normalized;
  if (normalized.length === derLength + 2 && normalized.slice(derLength) === '01') {
    return normalized.slice(0, derLength);
  }
  return undefined;
}

function summarize(value: string): string {
  if (value.length <= 28) return value;
  return `${value.slice(0, 14)}…${value.slice(-10)}`;
}

function check(
  label: string,
  expected: string,
  actual: string,
  equals: (left: string, right: string) => boolean
): MultisigVerificationCheck {
  return {
    label,
    passed: equals(expected, actual),
    expected: summarize(expected),
    actual: summarize(actual),
  };
}

function complete(checks: MultisigVerificationCheck[]): MultisigHardwareVerification {
  if (checks.every(item => item.passed)) return { status: 'passed', checks };
  return {
    status: 'failed',
    checks,
    message: '硬件返回数据与当前 signer 的离线期望值不一致。',
  };
}

function unavailable(message: string): MultisigHardwareVerification {
  return { status: 'unavailable', checks: [], message };
}

export function verifyMultisigHardwareResult(
  testCase: MultisigTestCase,
  result: unknown
): MultisigHardwareVerification {
  const expectation = testCase.hardwareExpectation;
  if (!expectation) return unavailable('当前测试用例没有配置自动校验数据。');
  if (!isRecord(result) || result.success !== true || !isRecord(result.data)) {
    return unavailable('SDK 返回结构中没有可供自动校验的数据。');
  }

  const data = result.data;

  if (testCase.method === 'evmSignTypedData') {
    if (
      typeof data.address !== 'string' ||
      typeof data.signature !== 'string' ||
      !expectation.expectedSignature
    ) {
      return unavailable('SDK 返回中缺少 ETH 地址或签名。');
    }
    return complete([
      check(
        'Signer 地址',
        expectation.signerAddress,
        data.address,
        (expected, actual) => expected.toLowerCase() === actual.toLowerCase()
      ),
      check(
        'EIP-712 签名',
        expectation.expectedSignature,
        data.signature,
        (expected, actual) => normalizeHex(expected) === normalizeHex(actual)
      ),
    ]);
  }

  if (testCase.method === 'evmSignTransaction') {
    const transaction = testCase.parameters.transaction;
    if (
      !isRecord(transaction) ||
      typeof data.v !== 'string' ||
      typeof data.r !== 'string' ||
      typeof data.s !== 'string'
    ) {
      return unavailable('SDK 返回中缺少 EVM 交易签名。');
    }

    let recoveredAddress = '签名无法恢复';
    try {
      const signature = Signature.from({
        v: Number(BigInt(data.v)),
        r: data.r,
        s: data.s,
      });
      const transactionType =
        transaction.maxFeePerGas && transaction.maxPriorityFeePerGas ? 2 : 0;
      recoveredAddress =
        Transaction.from({ ...transaction, type: transactionType, signature }).from ??
        recoveredAddress;
    } catch {
      // 保留不可恢复结果，由统一校验结果展示为失败。
    }

    return complete([
      check(
        'Signer 地址',
        expectation.signerAddress,
        recoveredAddress,
        (expected, actual) => expected.toLowerCase() === actual.toLowerCase()
      ),
    ]);
  }

  if (testCase.method === 'btcGetAddress') {
    if (typeof data.address !== 'string' || !expectation.expectedAddress) {
      return unavailable('SDK 返回中缺少 BTC 多签地址。');
    }
    return complete([
      check(
        'BTC 多签地址',
        expectation.expectedAddress,
        data.address,
        (expected, actual) => expected === actual
      ),
    ]);
  }

  if (testCase.method === 'btcSignTransaction') {
    const signature = Array.isArray(data.signatures) ? data.signatures[0] : undefined;
    const sighash = testCase.reference?.sighash;
    const publicKey = testCase.reference?.childPublicKeys?.[expectation.signerIndex];
    if (typeof signature !== 'string') {
      return unavailable('SDK 返回中缺少 BTC 输入签名。');
    }
    if (!sighash || !publicKey) {
      return unavailable('当前 BTC 用例缺少 sighash 或 signer 子公钥，无法自动验签。');
    }

    const derSignature = extractDerSignature(signature);
    let passed = false;
    if (derSignature) {
      try {
        passed = verify(derSignature, normalizeHex(sighash), normalizeHex(publicKey));
      } catch {
        passed = false;
      }
    }
    return complete([
      {
        label: 'BTC 输入签名',
        passed,
        expected: `Signer ${expectation.signerIndex + 1} 公钥验签通过`,
        actual: summarize(signature),
      },
    ]);
  }

  return unavailable('当前硬件方法尚未配置自动校验规则。');
}
