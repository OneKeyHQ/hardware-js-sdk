import { describe, expect, it } from '@jest/globals';

import { createWalletSessionTraceProxy } from './walletSessionTrace';

describe('wallet session API trace', () => {
  it('keeps passphraseState visible while redacting wallet session ids', async () => {
    const traces: unknown[] = [];
    const api = createWalletSessionTraceProxy(
      {
        openWalletSession: async (
          connectId: string,
          params: { mode: string; deviceId: string; passphraseState: string }
        ) => {
          void connectId;
          void params;
          return {
            success: true,
            payload: {
              walletType: 'hidden',
              passphraseState: 'wallet-state-a',
              sessionId: 'firmware-session-id',
            },
          };
        },
      },
      trace => traces.push(trace)
    );

    await api.openWalletSession('connect-id', {
      mode: 'resume-hidden',
      deviceId: 'device-id',
      passphraseState: 'wallet-state-a',
    });

    expect(traces).toEqual([
      expect.objectContaining({
        method: 'openWalletSession',
        arguments: [
          'connect-id',
          {
            mode: 'resume-hidden',
            deviceId: 'device-id',
            passphraseState: 'wallet-state-a',
          },
        ],
        response: {
          success: true,
          payload: {
            walletType: 'hidden',
            passphraseState: 'wallet-state-a',
            sessionId: '[REDACTED:wallet-session-id]',
          },
        },
      }),
    ]);
  });

  it('redacts an actual passphrase from arguments', async () => {
    const traces: unknown[] = [];
    const api = createWalletSessionTraceProxy(
      {
        sendPassphrase: async (params: { passphrase: string }) => {
          void params;
          return { success: true };
        },
      },
      trace => traces.push(trace)
    );

    await api.sendPassphrase({ passphrase: 'do-not-render' });

    expect(JSON.stringify(traces)).not.toContain('do-not-render');
    expect(traces).toEqual([
      expect.objectContaining({
        arguments: [{ passphrase: '[REDACTED:passphrase]' }],
      }),
    ]);
  });
});
