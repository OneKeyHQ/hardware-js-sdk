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
  summarizeWalletSession?: (
    payload: {
      protocol: 'V1' | 'V2';
      walletType: 'standard' | 'hidden';
      deviceId: string;
      passphraseState: string | null;
      sessionId?: string;
      resumed: boolean;
    },
    previousSessionId?: string
  ) => Record<string, unknown>;
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
        'all-cache-clear',
        'invalid-cache-params',
        'wrong-device-id',
        'attach-pin-preflight',
        'attach-pin-select',
        'attach-pin-state',
        'reconnect-same-device',
        'runtime-restart-checkpoint',
        'capture-pre-reset',
        'verify-post-reset',
      ])
    );
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
    expect(selectCase?.expected).toContain('不触发 Passphrase 弹窗');
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

  test('shows deviceId and passphraseState while comparing session IDs without exposing them', async () => {
    const { summarizeWalletSession } = await loadCasesModule();
    expect(summarizeWalletSession).toBeDefined();

    const rawSessionId = 'sensitive-session-id-value';
    const rawDeviceId = 'sensitive-device-id-value';
    const rawPassphraseState = 'sensitive-passphrase-state-value';
    const summary = summarizeWalletSession?.(
      {
        protocol: 'V2',
        walletType: 'hidden',
        deviceId: rawDeviceId,
        passphraseState: rawPassphraseState,
        sessionId: rawSessionId,
        resumed: true,
      },
      rawSessionId
    );
    const serialized = JSON.stringify(summary);

    expect(summary).toMatchObject({
      deviceId: rawDeviceId,
      passphraseState: rawPassphraseState,
      sessionId: 'present',
      sessionRelation: 'same',
      resumed: true,
    });
    expect(serialized).not.toContain(rawSessionId);
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
