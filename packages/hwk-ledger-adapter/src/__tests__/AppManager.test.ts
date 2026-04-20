import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetAppAndVersionCommand,
  OpenAppCommand,
  CloseAppCommand,
  CommandResultFactory,
} from '@ledgerhq/device-management-kit';
import { AppManager } from '../app/AppManager';

function createMockDmk() {
  return {
    startDiscovering: vi.fn(),
    stopDiscovering: vi.fn(),
    listenToAvailableDevices: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendCommand: vi.fn(),
  };
}

/** Helper to build a success CommandResult for GetAppAndVersionCommand. */
function appResult(name: string) {
  return CommandResultFactory({ data: { name, version: '1.0.0' } });
}

/** Helper to build a success CommandResult for void commands. */
function voidResult() {
  return CommandResultFactory({ data: undefined as void });
}

describe('AppManager', () => {
  let dmk: ReturnType<typeof createMockDmk>;
  let appManager: AppManager;

  beforeEach(() => {
    dmk = createMockDmk();
    appManager = new AppManager(dmk as any, { waitMs: 10, maxRetries: 3 });
  });

  describe('getAppName (static)', () => {
    it('maps ETH to Ethereum', () => {
      expect(AppManager.getAppName('ETH')).toBe('Ethereum');
    });

    it('maps BTC to Bitcoin', () => {
      expect(AppManager.getAppName('BTC')).toBe('Bitcoin');
    });

    it('maps SOL to Solana', () => {
      expect(AppManager.getAppName('SOL')).toBe('Solana');
    });

    it('maps TRX to Tron', () => {
      expect(AppManager.getAppName('TRX')).toBe('Tron');
    });

    it('maps XRP to XRP', () => {
      expect(AppManager.getAppName('XRP')).toBe('XRP');
    });

    it('maps ADA to Cardano', () => {
      expect(AppManager.getAppName('ADA')).toBe('Cardano');
    });

    it('maps DOT to Polkadot', () => {
      expect(AppManager.getAppName('DOT')).toBe('Polkadot');
    });

    it('maps ATOM to Cosmos', () => {
      expect(AppManager.getAppName('ATOM')).toBe('Cosmos');
    });

    it('returns undefined for unknown chain', () => {
      expect(AppManager.getAppName('UNKNOWN')).toBeUndefined();
    });
  });

  describe('ensureAppOpen', () => {
    it('returns immediately if correct app is already open', async () => {
      (dmk.sendCommand as ReturnType<typeof vi.fn>).mockResolvedValue(appResult('Ethereum'));

      await appManager.ensureAppOpen('session-1', 'Ethereum');

      // sendCommand should only be called once (getCurrentApp)
      expect(dmk.sendCommand).toHaveBeenCalledTimes(1);
    });

    it('opens the target app if a different app is running', async () => {
      let getAppCallCount = 0;
      (dmk.sendCommand as ReturnType<typeof vi.fn>).mockImplementation(
        async (params: { command: unknown }) => {
          if (params.command instanceof GetAppAndVersionCommand) {
            getAppCallCount++;
            // First call: wrong app, second call: dashboard, third call: target app
            if (getAppCallCount === 1) return appResult('Bitcoin');
            if (getAppCallCount === 2) return appResult('BOLOS');
            return appResult('Ethereum');
          }
          // close-app and open-app return void result
          return voidResult();
        }
      );

      await appManager.ensureAppOpen('session-1', 'Ethereum');

      // Should have called: getCurrentApp, closeApp, getCurrentApp (dashboard), openApp, getCurrentApp (Ethereum)
      const calls = (dmk.sendCommand as ReturnType<typeof vi.fn>).mock.calls;
      const closeAppCall = calls.find((call: any[]) => call[0].command instanceof CloseAppCommand);
      expect(closeAppCall).toBeDefined();

      const openAppCall = calls.find((call: any[]) => call[0].command instanceof OpenAppCommand);
      expect(openAppCall).toBeDefined();
    });

    it('opens the target app directly from dashboard', async () => {
      let getAppCallCount = 0;
      (dmk.sendCommand as ReturnType<typeof vi.fn>).mockImplementation(
        async (params: { command: unknown }) => {
          if (params.command instanceof GetAppAndVersionCommand) {
            getAppCallCount++;
            if (getAppCallCount === 1) return appResult('BOLOS');
            return appResult('Ethereum');
          }
          return voidResult();
        }
      );

      await appManager.ensureAppOpen('session-1', 'Ethereum');

      // Should NOT have called close-app since we're on dashboard
      const calls = (dmk.sendCommand as ReturnType<typeof vi.fn>).mock.calls;
      const closeAppCalls = calls.filter(
        (call: any[]) => call[0].command instanceof CloseAppCommand
      );
      expect(closeAppCalls).toHaveLength(0);

      const openAppCall = calls.find((call: any[]) => call[0].command instanceof OpenAppCommand);
      expect(openAppCall).toBeDefined();
    });

    it('throws if the target app fails to open after max retries', async () => {
      (dmk.sendCommand as ReturnType<typeof vi.fn>).mockImplementation(
        async (params: { command: unknown }) => {
          if (params.command instanceof GetAppAndVersionCommand) {
            return appResult('BOLOS');
          }
          return voidResult();
        }
      );

      await expect(appManager.ensureAppOpen('session-1', 'Ethereum')).rejects.toThrow(
        /failed to open/i
      );
    });
  });
});
