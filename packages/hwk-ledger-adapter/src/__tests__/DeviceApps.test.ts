import { DeviceApps } from '../device-apps/DeviceApps';

import type { LedgerKitModule } from '../device-apps/DeviceApps';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';

interface RecordedAction {
  kind: string;
  args: { input: unknown };
}

function makeActionCtor(kind: string) {
  return function ctor(this: RecordedAction, args: { input: unknown }) {
    this.kind = kind;
    this.args = args;
  } as unknown as new (args: { input: unknown }) => RecordedAction;
}

function completedAction<T>(output: T) {
  return {
    cancel: jest.fn(),
    observable: {
      subscribe(observer: { next: (v: unknown) => void; complete?: () => void }) {
        observer.next({ status: 'completed', output });
        observer.complete?.();
        return { unsubscribe: () => {} };
      },
    },
  };
}

function createMocks() {
  const ledgerKit = {
    GetDeviceMetadataDeviceAction: makeActionCtor('metadata'),
    InstallOrUpdateAppsDeviceAction: makeActionCtor('install'),
    ListAppsWithMetadataDeviceAction: makeActionCtor('listWithMetadata'),
    ListAppsDeviceAction: makeActionCtor('list'),
    GetOsVersionCommand: makeActionCtor('osVersion'),
    isSuccessCommandResult: (_r: unknown): _r is never => false,
  } as unknown as LedgerKitModule;

  const executed: RecordedAction[] = [];
  const dmk = {
    executeDeviceAction: jest.fn(({ deviceAction }: { deviceAction: RecordedAction }) => {
      executed.push(deviceAction);
      if (deviceAction.kind === 'install') {
        return completedAction({
          successfullyInstalled: [],
          alreadyInstalled: [],
          missingApplications: [],
        });
      }
      return completedAction({});
    }),
  } as unknown as DeviceManagementKit;

  return { dmk, ledgerKit, executed };
}

describe('DeviceApps.install', () => {
  it('force-refreshes device metadata before running the install action', async () => {
    const { dmk, ledgerKit, executed } = createMocks();
    const apps = new DeviceApps(dmk, 'session-1', ledgerKit);

    await apps.install('Tron');

    expect(executed.map(a => a.kind)).toEqual(['metadata', 'install']);
    expect(executed[0].args.input).toMatchObject({
      forceUpdate: true,
      useSecureChannel: true,
    });
  });

  it('passes unlockTimeout through to the metadata refresh', async () => {
    const { dmk, ledgerKit, executed } = createMocks();
    const apps = new DeviceApps(dmk, 'session-1', ledgerKit);

    await apps.install('Tron', undefined, { unlockTimeout: 1234 });

    expect(executed[0].args.input).toMatchObject({
      forceUpdate: true,
      unlockTimeout: 1234,
    });
  });
});
