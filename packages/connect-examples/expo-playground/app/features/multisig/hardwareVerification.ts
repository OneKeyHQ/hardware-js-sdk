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

function stripSighashAll(value: string): string {
  const normalized = normalizeHex(value);
  return normalized.endsWith('01') ? normalized.slice(0, -2) : normalized;
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
      check('Signer 地址', expectation.signerAddress, data.address, (expected, actual) =>
        expected.toLowerCase() === actual.toLowerCase()
      ),
      check('EIP-712 签名', expectation.expectedSignature, data.signature, (expected, actual) =>
        normalizeHex(expected) === normalizeHex(actual)
      ),
    ]);
  }

  if (testCase.method === 'btcGetAddress') {
    if (typeof data.address !== 'string' || !expectation.expectedAddress) {
      return unavailable('SDK 返回中缺少 BTC 多签地址。');
    }
    return complete([
      check('BTC 多签地址', expectation.expectedAddress, data.address, (expected, actual) =>
        expected === actual
      ),
    ]);
  }

  if (testCase.method === 'btcSignTransaction') {
    const signature = Array.isArray(data.signatures) ? data.signatures[0] : undefined;
    if (typeof signature !== 'string' || !expectation.expectedSignature) {
      return unavailable('SDK 返回中缺少 BTC 输入签名。');
    }
    return complete([
      check('BTC 输入签名', expectation.expectedSignature, signature, (expected, actual) =>
        stripSighashAll(expected) === stripSighashAll(actual)
      ),
    ]);
  }

  return unavailable('当前硬件方法尚未配置自动校验规则。');
}
