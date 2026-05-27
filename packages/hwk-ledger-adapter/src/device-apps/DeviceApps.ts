/* eslint-disable max-classes-per-file -- DeviceApps + the duck-typed custom DeviceActions stay co-located because the custom actions only exist to feed deviceActionToPromise / DMK's executeDeviceAction. */
import { DeviceActionStatus } from '@ledgerhq/device-management-kit';
import { Subject } from 'rxjs';

import { deviceActionToPromise } from '../signer/deviceActionToPromise';
import { debugLog } from '../utils/debugLog';

import type { DeviceManagementKit, GetOsVersionResponse } from '@ledgerhq/device-management-kit';
import type { Observable } from 'rxjs';
import type { CancelReason } from '../signer/deviceActionToPromise';

const INSTALL_TIMEOUT_MS = 5 * 60_000;

export interface AppMetadata {
  versionName: string;
  versionId: number;
  version: string;
  versionDisplayName: string | null;
  description: string | null;
  icon: string | null;
  bytes: number | null;
  currencyId: string | null;
  isDevTools: boolean;
}

/**
 * Progress fraction reported by DMK's InstallOrUpdateAppsDeviceAction.
 * Note: DMK's raw `requiredUserInteraction` for install (e.g. allow-secure-connection,
 * allow-manager) is intentionally NOT exposed here — those signals are routed through
 * the public 'ui-event' channel (collapsed to EConnectorInteraction) and additionally
 * captured via debugLog in the connector for diagnosis.
 */
export interface InstallProgress {
  progress: number;
}

export type InstallProgressCallback = (progress: InstallProgress) => void;

export interface InstallAppCallParams {
  appName: string;
}

/** Raised by DeviceApps.install when DMK reports the requested app is not in the catalog. */
export class AppNotFoundInCatalogError extends Error {
  readonly missingApplications: string[];

  constructor(missing: string[]) {
    super(`Ledger app not found in catalog: ${missing.join(', ')}`);
    this.name = 'AppNotFoundInCatalogError';
    this.missingApplications = missing;
  }
}

export interface ListInstalledAppsCallParams {
  unlockTimeout?: number;
}

export interface FirmwareVersion {
  /** BOLOS version on the secure element — the user-facing firmware version. */
  seVersion: string;
  /** MCU SEPH (SE–MCU link protocol) version. */
  mcuSephVersion: string;
  /** MCU bootloader version. */
  mcuBootloaderVersion: string;
  /** Hardware revision (e.g. "00" / "01" on Nano X). */
  hwVersion: string;
}

/** Full GetOsVersionResponse projected to a plain serializable shape. */
export interface LedgerDeviceInfo extends FirmwareVersion {
  isBootloader: boolean;
  isOsu: boolean;
  targetId: number;
  seTargetId?: number;
  mcuTargetId?: number;
  /** Secure element flags as hex string (raw bytes turned readable). */
  seFlagsHex: string;
}

/**
 * OS-level device management (install, list apps). Mirrors SignerEth:
 * built fresh per call, consumer sets onInteraction / onRegisterCanceller.
 */
export class DeviceApps {
  onInteraction?: (interaction: string) => void;

  onRegisterCanceller?: (cancel: (reason?: CancelReason) => void) => void;

  /* eslint-disable no-useless-constructor, no-empty-function -- TS parameter properties pattern */
  constructor(
    private readonly _dmk: DeviceManagementKit,
    private readonly _sessionId: string,
    private readonly _ledgerKit: LedgerKitModule
  ) {}
  /* eslint-enable no-useless-constructor, no-empty-function */

  async listInstalled(options?: { unlockTimeout?: number }): Promise<AppMetadata[]> {
    const action = (this._dmk as unknown as DmkExecuteCapable).executeDeviceAction({
      sessionId: this._sessionId,
      deviceAction: new this._ledgerKit.ListAppsWithMetadataDeviceAction({
        input: { unlockTimeout: options?.unlockTimeout },
      }),
    });
    const result = await deviceActionToPromise<Array<DmkApplication | null>>(
      action,
      this.onInteraction,
      undefined,
      this.onRegisterCanceller
    );
    return result.filter((a): a is DmkApplication => a !== null).map(applicationToMetadata);
  }

  // Catalog lookup via custom device action — DMK has no typed wrapper for this.
  async listAvailable(): Promise<AppMetadata[]> {
    const customAction = new ListAvailableAppsDeviceAction({
      GetOsVersionCommand: this._ledgerKit.GetOsVersionCommand,
      isSuccessCommandResult: this._ledgerKit.isSuccessCommandResult,
    });
    const action = (this._dmk as unknown as DmkExecuteCapable).executeDeviceAction({
      sessionId: this._sessionId,
      deviceAction: customAction,
    });
    const result = await deviceActionToPromise<DmkApplication[]>(
      action,
      this.onInteraction,
      undefined,
      this.onRegisterCanceller
    );
    return result.map(applicationToMetadata);
  }

  async getFirmwareVersion(): Promise<FirmwareVersion> {
    const v = await this._fetchOsVersion();
    return {
      seVersion: v.seVersion,
      mcuSephVersion: v.mcuSephVersion,
      mcuBootloaderVersion: v.mcuBootloaderVersion,
      hwVersion: v.hwVersion,
    };
  }

  async getDeviceInfo(): Promise<LedgerDeviceInfo> {
    const v = await this._fetchOsVersion();
    return {
      isBootloader: v.isBootloader,
      isOsu: v.isOsu,
      targetId: v.targetId,
      seTargetId: v.seTargetId,
      mcuTargetId: v.mcuTargetId,
      seVersion: v.seVersion,
      seFlagsHex: bytesToHex(v.seFlags),
      mcuSephVersion: v.mcuSephVersion,
      mcuBootloaderVersion: v.mcuBootloaderVersion,
      hwVersion: v.hwVersion,
    };
  }

  // Sole sendCommand path — routed via executeDeviceAction so unlock-device
  // interaction flows through onInteraction like the other methods.
  private async _fetchOsVersion(): Promise<GetOsVersionResponse> {
    const customAction = new GetOsVersionDeviceAction({
      GetOsVersionCommand: this._ledgerKit.GetOsVersionCommand,
      isSuccessCommandResult: this._ledgerKit.isSuccessCommandResult,
    });
    const action = (this._dmk as unknown as DmkExecuteCapable).executeDeviceAction({
      sessionId: this._sessionId,
      deviceAction: customAction,
    });
    return deviceActionToPromise<GetOsVersionResponse>(
      action,
      this.onInteraction,
      undefined,
      this.onRegisterCanceller
    );
  }

  async install(
    appName: string,
    onProgress?: InstallProgressCallback,
    options?: { unlockTimeout?: number }
  ): Promise<void> {
    if (!appName) throw new Error('DeviceApps.install: appName is required');
    debugLog('[DeviceApps] install:', appName);

    // Use InstallOrUpdateAppsDeviceAction (not InstallAppDeviceAction): it runs
    // UPDATE_DEVICE_METADATA → BUILD_INSTALL_PLAN → CHECK_IF_ENOUGH_MEMORY →
    // INSTALL_APPLICATION, so OOM fails fast (zero bytes written) and the refreshed
    // metadata feeds PredictOutOfMemoryTask accurate sizes — no client-side estimate.
    const action = (this._dmk as unknown as DmkExecuteCapable).executeDeviceAction({
      sessionId: this._sessionId,
      deviceAction: new this._ledgerKit.InstallOrUpdateAppsDeviceAction({
        input: {
          applications: [{ name: appName }],
          allowMissingApplication: false,
          unlockTimeout: options?.unlockTimeout,
        },
      }),
    });

    const result = await deviceActionToPromise<InstallOrUpdateAppsOutput>(
      action,
      this.onInteraction,
      INSTALL_TIMEOUT_MS,
      this.onRegisterCanceller,
      intermediateValue => {
        const iv = intermediateValue as
          | {
              requiredUserInteraction?: string;
              installPlan?: { currentProgress?: number } | null;
            }
          | undefined;
        // Surface DMK's install-specific interaction string (e.g. allow-secure-connection,
        // allow-manager, verify-app) into the debug log for post-hoc diagnosis. The
        // public 'ui-event' channel still emits the collapsed EConnectorInteraction so
        // existing UI consumers keep working.
        if (iv?.requiredUserInteraction && iv.requiredUserInteraction !== 'none') {
          debugLog('[DeviceApps] install interaction:', iv.requiredUserInteraction);
        }
        const progress = iv?.installPlan?.currentProgress;
        if (onProgress && typeof progress === 'number') {
          onProgress({ progress });
        }
      }
    );

    // DMK can resolve Completed with `missingApplications` populated when the
    // requested name is not in the catalog. allowMissingApplication=false should
    // make DMK reject, but we double-check on this side so the adapter never
    // returns success(undefined) for an install that didn't actually install.
    if (result?.missingApplications?.length > 0) {
      throw new AppNotFoundInCatalogError(result.missingApplications);
    }
  }
}

interface DmkApplication {
  versionName: string;
  versionId: number;
  version: string;
  versionDisplayName: string | null;
  description: string | null;
  icon: string | null;
  bytes: number | null;
  currencyId: string | null;
  isDevTools: boolean;
}

function bytesToHex(bytes: Uint8Array | undefined): string {
  if (!bytes) return '';
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function applicationToMetadata(app: DmkApplication): AppMetadata {
  return {
    versionName: app.versionName,
    versionId: app.versionId,
    version: app.version,
    versionDisplayName: app.versionDisplayName,
    description: app.description,
    icon: app.icon,
    bytes: app.bytes,
    currencyId: app.currencyId,
    isDevTools: app.isDevTools,
  };
}

// Loosened DMK surface (we receive the module via dynamic importLedgerKit).
export interface LedgerKitModule {
  ListAppsWithMetadataDeviceAction: new (args: { input: unknown }) => unknown;
  InstallOrUpdateAppsDeviceAction: new (args: { input: unknown }) => unknown;
  GetOsVersionCommand: new () => unknown;
  isSuccessCommandResult: (result: unknown) => result is { data: GetOsVersionResponse };
}

interface InstallOrUpdateAppsOutput {
  successfullyInstalled: unknown[];
  alreadyInstalled: string[];
  missingApplications: string[];
}

interface DmkExecuteCapable {
  // Loose return: deviceActionToPromise narrows the observable shape per-call.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executeDeviceAction(args: { sessionId: string; deviceAction: unknown }): any;
}

// Duck-typed DeviceAction; executeDeviceAction injects InternalApi for managerApi access.

interface InternalApiLike {
  sendCommand: (command: unknown) => Promise<unknown>;
  getManagerApiService: () => {
    getAppList: (deviceInfo: GetOsVersionResponse) => {
      run: () => Promise<{ isLeft: () => boolean; extract: () => unknown }>;
    };
  };
}

type AnyState<T> =
  | { readonly status: DeviceActionStatus.NotStarted }
  | { readonly status: DeviceActionStatus.Pending; readonly intermediateValue: unknown }
  | { readonly status: DeviceActionStatus.Stopped }
  | { readonly status: DeviceActionStatus.Completed; readonly output: T }
  | { readonly status: DeviceActionStatus.Error; readonly error: unknown };

type OsVersionDeps = {
  GetOsVersionCommand: new () => unknown;
  isSuccessCommandResult: (result: unknown) => result is { data: GetOsVersionResponse };
};

// Wrapped as a DeviceAction (not raw sendCommand) so unlock-device interaction
// flows through onInteraction like every other method.
class GetOsVersionDeviceAction {
  readonly input = undefined;

  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private readonly _deps: OsVersionDeps) {}

  _execute(internalApi: { sendCommand: (cmd: unknown) => Promise<unknown> }): {
    observable: Observable<AnyState<GetOsVersionResponse>>;
    cancel: () => void;
  } {
    const subject = new Subject<AnyState<GetOsVersionResponse>>();
    let cancelled = false;

    (async () => {
      try {
        subject.next({
          status: DeviceActionStatus.Pending,
          intermediateValue: { requiredUserInteraction: 'none' },
        });
        const result = await internalApi.sendCommand(new this._deps.GetOsVersionCommand());
        if (cancelled) return;
        if (!this._deps.isSuccessCommandResult(result)) {
          const errObj = (result as { error?: { message?: string } })?.error;
          throw new Error(errObj?.message ?? 'GetOsVersionCommand failed');
        }
        subject.next({ status: DeviceActionStatus.Completed, output: result.data });
        subject.complete();
      } catch (err) {
        if (cancelled) return;
        subject.next({ status: DeviceActionStatus.Error, error: err });
        subject.complete();
      }
    })();

    return {
      observable: subject.asObservable(),
      cancel: () => {
        cancelled = true;
        subject.next({ status: DeviceActionStatus.Stopped });
        subject.complete();
      },
    };
  }
}

class ListAvailableAppsDeviceAction {
  readonly input = undefined;

  private readonly _GetOsVersionCommand: new () => unknown;

  private readonly _isSuccessCommandResult: (
    result: unknown
  ) => result is { data: GetOsVersionResponse };

  constructor(deps: OsVersionDeps) {
    this._GetOsVersionCommand = deps.GetOsVersionCommand;
    this._isSuccessCommandResult = deps.isSuccessCommandResult;
  }

  _execute(internalApi: InternalApiLike): {
    observable: Observable<AnyState<DmkApplication[]>>;
    cancel: () => void;
  } {
    const subject = new Subject<AnyState<DmkApplication[]>>();
    let cancelled = false;

    (async () => {
      try {
        subject.next({
          status: DeviceActionStatus.Pending,
          intermediateValue: { requiredUserInteraction: 'none' },
        });

        const osVersionResult = await internalApi.sendCommand(new this._GetOsVersionCommand());
        if (cancelled) return;
        if (!this._isSuccessCommandResult(osVersionResult)) {
          const errObj = (osVersionResult as { error?: { message?: string } })?.error;
          throw new Error(errObj?.message ?? 'GetOsVersionCommand failed');
        }

        const managerApi = internalApi.getManagerApiService();
        const either = await managerApi.getAppList(osVersionResult.data).run();
        if (cancelled) return;
        if (either.isLeft()) {
          const httpErr = either.extract() as { message?: string };
          throw new Error(httpErr?.message ?? 'Manager API getAppList failed');
        }

        const apps = either.extract() as DmkApplication[];
        subject.next({ status: DeviceActionStatus.Completed, output: apps });
        subject.complete();
      } catch (err) {
        if (cancelled) return;
        subject.next({ status: DeviceActionStatus.Error, error: err });
        subject.complete();
      }
    })();

    return {
      observable: subject.asObservable(),
      cancel: () => {
        cancelled = true;
        subject.next({ status: DeviceActionStatus.Stopped });
        subject.complete();
      },
    };
  }
}
