import { describe, expect, test } from '@jest/globals';

type WalletSessionCasesModule = {
  WALLET_SESSION_CASES?: Array<{
    id: string;
    protocols: string[];
    prerequisites: string[];
    steps: string[];
    expected: string[];
    execution: string;
    sdkMethod?: string;
  }>;
  buildWrongDeviceId?: (deviceId: string) => string;
  assertAttachPinUnlocked?: (state: { status: { unlockedAttachPin: boolean | null } }) => void;
  summarizeWalletSession?: (payload: {
    protocol: 'V1' | 'V2';
    walletType: 'standard' | 'hidden';
    deviceId: string;
    passphraseState: string;
    resumed: boolean;
  }) => Record<string, unknown>;
  getSatisfiedPrerequisiteIds?: (results: Record<string, { status: string }>) => Set<string>;
};

async function loadCasesModule(): Promise<WalletSessionCasesModule> {
  try {
    return (await import('./walletSessionCases')) as WalletSessionCasesModule;
  } catch {
    return {};
  }
}

describe('wallet session WebUSB test matrix', () => {
  test('covers wallet identity, cache isolation, Attach PIN, reconnect and reset flows', async () => {
    const { WALLET_SESSION_CASES = [] } = await loadCasesModule();
    const ids = new Set(WALLET_SESSION_CASES.map(item => item.id));

    expect(ids.size).toBe(WALLET_SESSION_CASES.length);

    expect(ids).toEqual(
      new Set([
        'webusb-baseline',
        'standard-open',
        'standard-address',
        'hidden-a-select',
        'hidden-a-address',
        'hidden-a-resume',
        'hidden-b-select',
        'hidden-b-address',
        'wallet-isolation',
        'wallet-cache-clear',
        'wallet-cache-invalid',
        'hidden-a-reselect-after-clear',
        'other-wallet-survives',
        'device-cache-clear',
        'device-cache-invalid',
        'hidden-a-reselect-after-device-clear',
        'all-cache-clear',
        'all-cache-invalid',
        'invalid-cache-params',
        'wrong-device-id',
        'attach-pin-preflight',
        'attach-pin-select',
        'attach-pin-state',
        'attach-pin-standard-rejected',
        'attach-pin-reselect-after-standard-rejection',
        'attach-pin-wrong-wallet-rejected',
        'reconnect-same-device',
        'reconnect-session-outcome',
        'runtime-restart-checkpoint',
        'capture-pre-reset',
        'verify-post-reset',
      ])
    );
  });

  test('only passed cases satisfy prerequisites while skipped cases remain terminal results', async () => {
    const { getSatisfiedPrerequisiteIds } = await loadCasesModule();
    expect(getSatisfiedPrerequisiteIds).toBeDefined();

    const satisfied = getSatisfiedPrerequisiteIds?.({
      passed: { status: 'passed' },
      skipped: { status: 'skipped' },
      failed: { status: 'failed' },
      running: { status: 'running' },
    });

    expect([...Array.from(satisfied ?? [])]).toEqual(['passed']);
  });

  test('makes restart, reconnect, global clear and Attach PIN safety expectations executable', async () => {
    const { WALLET_SESSION_CASES = [] } = await loadCasesModule();
    const byId = new Map(WALLET_SESSION_CASES.map(item => [item.id, item]));

    expect(byId.get('runtime-restart-checkpoint')?.prerequisites).toContain('hidden-a-address');
    expect(byId.get('runtime-restart-checkpoint')?.expected.join(' ')).toContain(
      'WalletSessionInvalid'
    );
    expect(byId.get('reconnect-session-outcome')?.expected.join(' ')).toContain(
      '不得自动选择新钱包'
    );
    expect(byId.get('all-cache-invalid')?.expected.join(' ')).toContain('WalletSessionInvalid');
    expect(byId.get('attach-pin-standard-rejected')?.expected.join(' ')).toContain(
      'DeviceCheckUnlockTypeError'
    );
    expect(byId.get('attach-pin-wrong-wallet-rejected')?.expected.join(' ')).toContain(
      'DeviceCheckPassphraseStateError'
    );
    expect(byId.get('attach-pin-state')?.expected.join(' ')).toContain('重复获取地址一致');
  });

  test('covers Host, device and Attach PIN hidden-wallet selection paths', async () => {
    const { WALLET_SESSION_CASES = [] } = await loadCasesModule();
    const byId = new Map(WALLET_SESSION_CASES.map(item => [item.id, item]));

    expect(byId.get('hidden-a-select')?.steps.join(' ')).toContain('Host 表单');
    expect(byId.get('hidden-a-select')?.expected.join(' ')).toContain('Host Passphrase 输入可用');
    expect(byId.get('hidden-b-select')?.steps.join(' ')).toContain('设备端输入');
    expect(byId.get('hidden-b-select')?.expected.join(' ')).toContain('设备端 Passphrase 输入可用');
    expect(byId.get('attach-pin-select')?.steps.join(' ')).toContain('选择 Attach PIN');
  });

  test('keeps every case explicit and orders prerequisites before dependants', async () => {
    const { WALLET_SESSION_CASES = [] } = await loadCasesModule();
    const indexById = new Map(WALLET_SESSION_CASES.map((item, index) => [item.id, index]));

    WALLET_SESSION_CASES.forEach((item, index) => {
      expect(item.protocols.length).toBeGreaterThan(0);
      expect(item.steps.length).toBeGreaterThan(0);
      expect(item.expected.length).toBeGreaterThan(0);
      item.prerequisites.forEach(prerequisite => {
        expect(indexById.get(prerequisite)).toBeLessThan(index);
      });
    });
  });

  test('runs Attach-to-PIN coverage through both Protocol V1 and Protocol V2', async () => {
    const { WALLET_SESSION_CASES = [] } = await loadCasesModule();
    const attachCases = WALLET_SESSION_CASES.filter(item => item.id.startsWith('attach-pin'));

    expect(attachCases).not.toHaveLength(0);
    attachCases.forEach(item => {
      expect(item.protocols).toEqual(['V1', 'V2']);
    });

    const selectCase = attachCases.find(item => item.id === 'attach-pin-select');
    expect(selectCase?.steps).toContain('刷新设备状态并确认 Attach PIN 解锁');
    expect(selectCase?.expected).toContain('unlockedAttachPin=true');
    expect(selectCase?.expected).toContain('只触发一次统一钱包选择弹窗');
  });

  test('rejects a hidden-wallet selection that was not unlocked by Attach PIN', async () => {
    const { assertAttachPinUnlocked } = await loadCasesModule();

    expect(assertAttachPinUnlocked).toBeDefined();
    expect(() => assertAttachPinUnlocked?.({ status: { unlockedAttachPin: true } })).not.toThrow();
    expect(() => assertAttachPinUnlocked?.({ status: { unlockedAttachPin: false } })).toThrow(
      'unlockedAttachPin=true'
    );
    expect(() => assertAttachPinUnlocked?.({ status: { unlockedAttachPin: null } })).toThrow(
      'unlockedAttachPin=true'
    );
  });

  test('never wires factory reset to a destructive SDK method', async () => {
    const { WALLET_SESSION_CASES = [] } = await loadCasesModule();
    const resetCases = WALLET_SESSION_CASES.filter(item => item.id.includes('reset'));

    expect(resetCases).not.toHaveLength(0);
    resetCases.forEach(item => {
      expect(item.execution).toBe('manual-checkpoint');
      expect(item.sdkMethod).not.toBe('deviceWipe');
      expect(item.steps.join(' ')).not.toMatch(/abandon\s+abandon/i);
    });
  });

  test('shows the public wallet identity while keeping device sessions internal', async () => {
    const { summarizeWalletSession } = await loadCasesModule();
    expect(summarizeWalletSession).toBeDefined();

    const rawDeviceId = 'sensitive-device-id-value';
    const rawPassphraseState = 'sensitive-passphrase-state-value';
    const summary = summarizeWalletSession?.({
      protocol: 'V2',
      walletType: 'hidden',
      deviceId: rawDeviceId,
      passphraseState: rawPassphraseState,
      resumed: true,
    });
    const serialized = JSON.stringify(summary);

    expect(summary).toMatchObject({
      deviceId: rawDeviceId,
      passphraseState: rawPassphraseState,
      sessionVisibility: 'sdk-internal',
      resumed: true,
    });
    expect(serialized).not.toContain('sessionId');
    expect(serialized).toContain(rawDeviceId);
    expect(serialized).toContain(rawPassphraseState);
  });

  test('builds a deterministic mismatched device ID without accepting an empty identity', async () => {
    const { buildWrongDeviceId } = await loadCasesModule();
    expect(buildWrongDeviceId).toBeDefined();
    expect(buildWrongDeviceId?.('device-id-a')).not.toBe('device-id-a');
    expect(() => buildWrongDeviceId?.('')).toThrow('deviceId');
  });
});
